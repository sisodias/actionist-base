import { Braces, Layers3, LogIn } from 'lucide-react';
import { Dashboard } from '../dashboard/dashboard';
import { BlockRegistrySurface } from '../ui/block-registry';
import type { ProductUiActions, ProductUiReadModel } from '../ui/product-types';
import { SettingsShell } from '../ui/settings-shell';
import { TruthLabel } from '../ui/truth-label';
import { WorkspaceSwitcher } from '../ui/workspace-switcher';

const PRODUCT_ROUTES = new Set([
  '/',
  '/dashboard',
  '/workspaces',
  '/blocks',
  '/settings',
  '/settings/account',
  '/settings/billing',
  '/shell',
]);

export function isProductRoute(path: string): boolean {
  return PRODUCT_ROUTES.has(path);
}

function ShellContractSurface({ onNavigate }: { onNavigate: (route: string) => void }) {
  return (
    <div className="product-page" data-verify="shell-contract-surface">
      <header className="product-page__header">
        <div>
          <span className="product-kicker"><Layers3 aria-hidden="true" /> Checked-in product spine</span>
          <h1>Replaceable shell contract</h1>
          <p>The exact SISOCRM-derived rail remains the Base chrome while routes and product readbacks stay injectable.</p>
        </div>
        <TruthLabel state="fixture" />
      </header>
      <section className="contract-grid">
        <article><span>Geometry</span><strong>232 / 52 / 16</strong><p>Expanded width, compact width and desktop inset in pixels.</p></article>
        <article><span>Composition</span><strong>ShellProps</strong><p>Recipe, active route, workspace readback, navigation callback and children.</p></article>
        <article><span>Authority</span><strong>Host owned</strong><p>Capabilities, block lifecycle, tenancy, session and provider commands remain outside shell markup.</p></article>
      </section>
      <div className="contract-actions">
        <button type="button" className="ui-button ui-button--secondary" onClick={() => onNavigate('/login')}><LogIn aria-hidden="true" /> Open login variants</button>
        <button type="button" className="ui-button ui-button--quiet" onClick={() => onNavigate('/blocks')}><Braces aria-hidden="true" /> Inspect registry</button>
      </div>
    </div>
  );
}

export function ProductSurface({
  path,
  model,
  actions,
  onNavigate,
}: {
  path: string;
  model: ProductUiReadModel;
  actions: ProductUiActions;
  onNavigate: (route: string) => void;
}) {
  if (path === '/' || path === '/dashboard') return <Dashboard model={model} onNavigate={onNavigate} />;
  if (path === '/workspaces') return <WorkspaceSwitcher model={model} onSelect={actions.selectWorkspace} />;
  if (path === '/blocks') return <BlockRegistrySurface model={model} onInstall={actions.installBlock} onNavigate={onNavigate} />;
  if (path.startsWith('/settings')) return <SettingsShell path={path} model={model} onNavigate={onNavigate} />;
  return <ShellContractSurface onNavigate={onNavigate} />;
}
