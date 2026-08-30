import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { affineBlock, fixtureBlock } from './blocks';
import {
  BlockRegistry,
  can,
  cleanupBlockMount,
  fixtureBindings,
  runBlockLifecycle,
  workspaceMatches,
  type Health,
  type HostContext,
  type ProductRecipe,
  type ShellComponent,
} from './host';
import { LoginSurface, type LoginVariant } from './login/login-variants';
import { isProductRoute, ProductSurface } from './routes/product-routes';
import { DefaultShell } from './shell';
import type { ProductUiActions, ProductUiReadModel } from './ui/product-types';
import './style.css';

export const recipe: ProductRecipe = {
  id: 'actionist-base',
  name: 'Actionist',
  subtitle: 'Base workspace',
  theme: { mode: 'dark' },
  navigation: [
    {
      id: 'workspace',
      label: 'Workspace',
      collapsible: false,
      items: [
        { id: 'overview', label: 'Dashboard', route: '/', icon: 'home' },
        { id: 'workspaces', label: 'Workspaces', route: '/workspaces', icon: 'users' },
      ],
    },
    {
      id: 'capabilities',
      label: 'Capabilities',
      collapsible: false,
      items: [
        { id: 'blocks', label: 'Block registry', route: '/blocks', icon: 'grid' },
        { id: 'knowledge', label: 'Knowledge', route: '/knowledge', icon: 'knowledge', blockId: 'actionist/affine-workspace', capability: 'knowledge.view' },
        { id: 'fixture', label: 'Fixture block', route: '/fixture', icon: 'fixture', blockId: 'actionist/fixture', capability: 'fixture.view' },
      ],
    },
    {
      id: 'system',
      label: 'System',
      collapsible: true,
      items: [{ id: 'shell', label: 'Shell contract', route: '/shell', icon: 'layers' }],
    },
  ],
  settings: { id: 'settings', label: 'Settings', route: '/settings', icon: 'settings' },
};

export const registry = new BlockRegistry();
registry.register(fixtureBlock);
registry.register(affineBlock());

const context: HostContext = {
  tenantId: 'tenant-demo',
  workspaceId: 'knowledge-local-workspace',
  principalId: 'knowledge-local-user',
  principalKind: 'employee',
  teamIds: [],
  clientAccountIds: [],
  correlationId: 'fixture-run',
};

const grants = { 'knowledge-local-user': ['fixture.view', 'knowledge.view'] };

export function fixtureUiReadModel(): ProductUiReadModel {
  return {
    session: {
      status: 'missing',
      authenticated: false,
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      capabilityCount: 0,
      evidenceState: 'fixture',
    },
    account: {
      displayLabel: 'Local source fixture',
      reference: 'fixture-account',
      providerLabel: 'No account provider',
      evidenceState: 'fixture',
      detail: 'This label is checked-in fixture copy. No account profile or provider record was read.',
    },
    currentWorkspaceId: context.workspaceId,
    workspaces: [{
      tenantId: context.tenantId,
      id: context.workspaceId,
      name: 'Demo workspace',
      detail: 'Single checked-in tenancy fixture',
      evidenceState: 'fixture',
    }],
    billing: {
      subscriptionLabel: 'No subscription readback',
      evidenceState: 'unavailable',
      detail: 'A billing provider adapter has not supplied current evidence.',
    },
    blocks: registry.list().map((block) => ({
      id: block.id,
      label: block.label,
      route: block.route,
      requiredCapabilities: [block.capability],
      registryState: 'source-registered' as const,
      evidenceState: 'fixture' as const,
    })),
  };
}

function pathWithoutWorkspace(pathname: string): string {
  return pathname.replace(/^\/w\/[^/]+/, '') || '/';
}

function isLoginRoute(path: string): boolean {
  return path === '/login' || path.startsWith('/login/');
}

function loginVariant(path: string): LoginVariant {
  if (path === '/login/split') return 'split';
  if (path === '/login/compact') return 'compact';
  return 'focused';
}

function Surface({ title, detail, kind, children }: { title: string; detail: string; kind: string; children?: ReactNode }) {
  return (
    <div data-verify={`state-${kind}`} className="surface">
      <div className="eyebrow">{kind}</div>
      <h1>{title}</h1>
      <p>{detail}</p>
      {children}
    </div>
  );
}

export type AppProps = {
  Shell?: ShellComponent;
  recipe?: ProductRecipe;
  uiModel?: ProductUiReadModel;
  uiActions?: ProductUiActions;
};

export function App({ Shell = DefaultShell, recipe: selectedRecipe = recipe, uiModel, uiActions = {} }: AppProps = {}) {
  const [path, setPath] = useState(() => pathWithoutWorkspace(location.pathname));
  const [health, setHealth] = useState<Health>({ status: 'healthy' });
  const lifecycleRunRef = useRef(0);
  const defaultUiModel = useMemo(fixtureUiReadModel, []);
  const model = uiModel ?? defaultUiModel;
  const block = useMemo(() => registry.resolve(path), [path]);
  const pathWorkspace = location.pathname.match(/^\/w\/([^/]+)/)?.[1] ?? context.workspaceId;
  const allowed = !block || can(context, block.capability, grants);

  useEffect(() => {
    const onPopState = () => setPath(pathWithoutWorkspace(location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const runId = ++lifecycleRunRef.current;
    let disposed = false;
    let unmount: (() => void | Promise<void>) | null = null;
    const target = document.querySelector<HTMLElement>('[data-verify="block-mount"]');
    if (!target || !block || !allowed || !workspaceMatches(pathWorkspace, context)) return;

    void runBlockLifecycle(
      block,
      target,
      context,
      fixtureBindings,
      (nextHealth) => { if (!disposed) setHealth(nextHealth); },
      () => !disposed && lifecycleRunRef.current === runId,
    ).then((nextUnmount) => {
      if (!disposed && lifecycleRunRef.current === runId) unmount = nextUnmount;
      else void cleanupBlockMount(target, nextUnmount).catch(() => undefined);
    }).catch((error) => {
      if (!disposed && lifecycleRunRef.current === runId) {
        setHealth({ status: 'error', detail: error instanceof Error ? error.message : 'Block failed' });
        target.replaceChildren();
      }
    });

    return () => {
      disposed = true;
      if (unmount) void cleanupBlockMount(target, unmount).catch(() => undefined);
      else target.replaceChildren();
      if (lifecycleRunRef.current === runId) lifecycleRunRef.current += 1;
    };
  }, [allowed, block, pathWorkspace]);

  const navigate = useCallback((route: string) => {
    const next = isLoginRoute(route)
      ? route
      : `/w/${context.workspaceId}${route === '/' ? '' : route}`;
    if (location.pathname !== next) history.pushState({}, '', next);
    setPath(pathWithoutWorkspace(next));
  }, []);

  if (isLoginRoute(path)) {
    return (
      <LoginSurface
        variant={loginVariant(path)}
        onVariantChange={(variant) => navigate(`/login/${variant}`)}
        onSubmit={uiActions.login}
        onOpenFixture={() => navigate('/')}
      />
    );
  }

  let body: ReactNode;
  if (pathWorkspace !== context.workspaceId) {
    body = <Surface kind="denied" title="Workspace denied" detail="This fixture cannot open a workspace outside its checked-in host context." />;
  } else if (block && !allowed) {
    body = <Surface kind="denied" title="Access denied" detail="The host denies this capability by default." />;
  } else if (isProductRoute(path)) {
    body = <ProductSurface path={path} model={model} actions={uiActions} onNavigate={navigate} />;
  } else if (block) {
    body = (
      <>
        <div data-verify="active-block" data-block-id={block.id} className="block-title">
          <span>{block.label}</span>
          <span data-verify="health" data-health={health.status}>{health.status}</span>
        </div>
        <div data-verify="block-mount" />
        {health.status === 'unavailable' && <Surface kind="unavailable" title="Block unavailable" detail="This block is not configured in the fixture." />}
        {health.status === 'error' && <Surface kind="error" title="Block error" detail={health.detail ?? 'The block failed to load.'} />}
      </>
    );
  } else {
    body = <Surface kind="unavailable" title="Route unavailable" detail="This path is not registered by the Base source fixture." />;
  }

  const workspace = model.workspaces.find((item) => item.id === model.currentWorkspaceId);
  return (
    <Shell
      recipe={selectedRecipe}
      active={path}
      workspace={{
        id: workspace?.id ?? context.workspaceId,
        name: workspace?.name ?? 'Workspace unavailable',
        detail: workspace?.evidenceState === 'observed'
          ? 'Observed workspace'
          : workspace?.evidenceState === 'fixture'
            ? 'Fixture readback'
            : workspace?.evidenceState === 'configured-unverified'
              ? 'Configured, not verified'
              : 'Runtime unavailable',
      }}
      onNavigate={navigate}
    >
      {body}
    </Shell>
  );
}
