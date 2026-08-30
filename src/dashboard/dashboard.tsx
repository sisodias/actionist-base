import { ArrowUpRight, Blocks, Building2, CreditCard, LayoutDashboard } from 'lucide-react';
import type { ProductUiReadModel } from '../ui/product-types';
import { TruthLabel } from '../ui/truth-label';

export function Dashboard({ model, onNavigate }: { model: ProductUiReadModel; onNavigate: (route: string) => void }) {
  const workspace = model.workspaces.find((item) => item.id === model.currentWorkspaceId) ?? model.workspaces[0];
  const registryEvidence = model.blocks[0]?.evidenceState ?? 'unavailable';
  const sourceRegistered = model.blocks.length > 0 && model.blocks.every((block) => block.registryState === 'source-registered');
  const registryDetail = model.blocks.length === 0
    ? 'No registry readback was supplied.'
    : sourceRegistered
      ? 'All entries are registered in fixture source.'
      : 'Entries were projected from the host registry.';

  return (
    <div className="product-page" data-verify="dashboard-surface">
      <header className="product-page__header dashboard-header">
        <div>
          <span className="product-kicker"><LayoutDashboard aria-hidden="true" /> Base overview</span>
          <h1>Workspace control plane</h1>
          <p>Inspect what the shell knows, what remains a fixture and which owner must supply runtime evidence.</p>
        </div>
        <TruthLabel state={workspace?.evidenceState ?? model.session.evidenceState} />
      </header>

      <section className="readback-grid" aria-label="Current product readbacks">
        <article className="readback-card readback-card--wide">
          <div className="readback-card__icon"><Building2 aria-hidden="true" /></div>
          <div className="readback-card__body">
            <span>Current workspace</span>
            <strong>{workspace?.name ?? 'No workspace readback'}</strong>
            <p>{workspace?.detail ?? 'A tenancy adapter has not supplied a workspace.'}</p>
          </div>
          <TruthLabel state={workspace?.evidenceState ?? 'unavailable'} compact />
        </article>
        <article className="readback-card">
          <div className="readback-card__icon"><LayoutDashboard aria-hidden="true" /></div>
          <div className="readback-card__body">
            <span>Base session</span>
            <strong>{model.session.authenticated ? 'Authenticated readback' : 'No active readback'}</strong>
            <p>Status: {model.session.status}. Capabilities: {model.session.capabilityCount}.</p>
          </div>
          <TruthLabel state={model.session.evidenceState} compact />
        </article>
        <article className="readback-card">
          <div className="readback-card__icon"><Blocks aria-hidden="true" /></div>
          <div className="readback-card__body">
            <span>Block registry</span>
            <strong>{model.blocks.length} registry readbacks</strong>
            <p>{registryDetail} No persistence claim.</p>
          </div>
          <TruthLabel state={registryEvidence} compact />
        </article>
        <article className="readback-card">
          <div className="readback-card__icon"><CreditCard aria-hidden="true" /></div>
          <div className="readback-card__body">
            <span>Billing</span>
            <strong>{model.billing.subscriptionLabel}</strong>
            <p>{model.billing.detail}</p>
          </div>
          <TruthLabel state={model.billing.evidenceState} compact />
        </article>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-next-heading">
        <div className="section-heading">
          <div>
            <span className="product-kicker">Next surfaces</span>
            <h2 id="dashboard-next-heading">Move through the Base shell</h2>
          </div>
          <p>Each destination preserves the authority boundary beside its controls.</p>
        </div>
        <div className="route-card-grid">
          <button type="button" className="route-card" onClick={() => onNavigate('/workspaces')}>
            <span>01</span>
            <strong>Workspace switcher</strong>
            <p>Read tenancy choices and request a selection through an injected action.</p>
            <ArrowUpRight aria-hidden="true" />
          </button>
          <button type="button" className="route-card" onClick={() => onNavigate('/blocks')}>
            <span>02</span>
            <strong>Block registry</strong>
            <p>Inspect source registrations without presenting them as installed.</p>
            <ArrowUpRight aria-hidden="true" />
          </button>
          <button type="button" className="route-card" onClick={() => onNavigate('/settings/billing')}>
            <span>03</span>
            <strong>Billing shell</strong>
            <p>Render provider readback only when evidence exists.</p>
            <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
