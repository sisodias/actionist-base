import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BlockRegistry,
  can,
  fixtureBindings,
  runBlockLifecycle,
  workspaceMatches,
  type Health,
  type HostContext,
  type ProductRecipe,
  type ShellComponent,
} from './host';
import { affineBlock, fixtureBlock } from './blocks';
import { DefaultShell } from './shell';
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
        { id: 'overview', label: 'Overview', route: '/', icon: 'home' },
        { id: 'knowledge', label: 'Knowledge', route: '/knowledge', icon: 'knowledge', blockId: 'actionist/affine-workspace', capability: 'knowledge.view' },
      ],
    },
    {
      id: 'capabilities',
      label: 'Capabilities',
      collapsible: false,
      items: [
        { id: 'fixture', label: 'Fixture block', route: '/fixture', icon: 'fixture', blockId: 'actionist/fixture', capability: 'fixture.view' },
        { id: 'shell', label: 'Shell contract', route: '/shell', icon: 'layers' },
      ],
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

function pathWithoutWorkspace(pathname: string): string {
  return pathname.replace(/^\/w\/[^/]+/, '') || '/';
}

function Surface({ title, detail, kind }: { title: string; detail: string; kind: string }) {
  return (
    <div data-verify={`state-${kind}`} className="surface">
      <div className="eyebrow">{kind}</div>
      <h1>{title}</h1>
      <p>{detail}</p>
    </div>
  );
}

export type AppProps = { Shell?: ShellComponent; recipe?: ProductRecipe };

export function App({ Shell = DefaultShell, recipe: selectedRecipe = recipe }: AppProps = {}) {
  const [path, setPath] = useState(() => pathWithoutWorkspace(location.pathname));
  const [health, setHealth] = useState<Health>({ status: 'healthy' });
  const lifecycleRunRef = useRef(0);
  const block = useMemo(() => registry.resolve(path), [path]);
  const pathWorkspace = location.pathname.match(/^\/w\/([^/]+)/)?.[1] ?? context.workspaceId;
  const allowed = !block || can(context, block.capability, grants);
  const settingsRoute = selectedRecipe.settings?.route;

  useEffect(() => {
    const onPopState = () => setPath(pathWithoutWorkspace(location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const runId = lifecycleRunRef.current + 1;
    lifecycleRunRef.current = runId;
    let disposed = false;
    let unmount: (() => void | Promise<void>) | null = null;
    const target = document.querySelector<HTMLElement>('[data-verify="block-mount"]');
    if (!target || !block || !allowed || !workspaceMatches(pathWorkspace, context)) return;

    void runBlockLifecycle(block, target, context, fixtureBindings, (nextHealth) => {
      if (!disposed) setHealth(nextHealth);
    }, () => !disposed && lifecycleRunRef.current === runId).then((nextUnmount) => {
      if (!disposed && lifecycleRunRef.current === runId) unmount = nextUnmount;
      else void Promise.resolve(nextUnmount()).catch(() => undefined);
    }).catch((error) => {
      if (!disposed && lifecycleRunRef.current === runId) {
        setHealth({ status: 'error', detail: error instanceof Error ? error.message : 'Block failed' });
        target.replaceChildren();
      }
    });

    return () => {
      disposed = true;
      if (unmount) void Promise.resolve(unmount()).catch(() => undefined);
      if (lifecycleRunRef.current === runId) lifecycleRunRef.current += 1;
      target.replaceChildren();
    };
  }, [allowed, block, pathWorkspace]);

  const navigate = useCallback((route: string) => {
    const next = `/w/${context.workspaceId}${route === '/' ? '' : route}`;
    if (location.pathname !== next) history.pushState({}, '', next);
    setPath(route);
  }, []);

  let body;
  if (pathWorkspace !== context.workspaceId) {
    body = <Surface kind="denied" title="Workspace denied" detail="This session cannot open another workspace." />;
  } else if (block && !allowed) {
    body = <Surface kind="denied" title="Access denied" detail="The host denies this capability by default." />;
  } else if (settingsRoute && path === settingsRoute) {
    body = <Surface kind="unavailable" title="Settings unavailable" detail="The fixture exposes the settings entry, but production settings storage is not installed." />;
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
    body = <Surface kind="ready" title="Your workspace" detail="Choose a capability from the rail. Blocks mount into this canvas." />;
  }

  return (
    <Shell
      recipe={selectedRecipe}
      active={path}
      workspace={{ id: context.workspaceId, name: 'Demo workspace', detail: 'Fixture session' }}
      onNavigate={navigate}
    >
      {body}
    </Shell>
  );
}
