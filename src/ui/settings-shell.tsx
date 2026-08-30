import { Building2, ChevronRight, CircleUserRound, CreditCard, Settings2, ShieldCheck } from 'lucide-react';
import type { ProductUiReadModel } from './product-types';
import { TruthLabel } from './truth-label';

const SETTINGS_ROUTES = [
  { route: '/settings', label: 'Overview', icon: Settings2 },
  { route: '/settings/account', label: 'Account', icon: CircleUserRound },
  { route: '/settings/billing', label: 'Billing', icon: CreditCard },
];

function SettingsOverview({ model }: { model: ProductUiReadModel }) {
  const workspace = model.workspaces.find((item) => item.id === model.currentWorkspaceId);
  return (
    <section className="settings-content" aria-labelledby="settings-overview-heading">
      <span className="product-kicker">Configuration boundary</span>
      <h2 id="settings-overview-heading">Settings overview</h2>
      <p className="settings-content__lead">These rows expose readbacks only. Save, provider and permission commands remain outside this UI shell.</p>
      <div className="settings-summary-list">
        <div>
          <span><CircleUserRound aria-hidden="true" /> Account</span>
          <strong>{model.account.displayLabel}</strong>
          <TruthLabel state={model.account.evidenceState} compact />
        </div>
        <div>
          <span><Building2 aria-hidden="true" /> Workspace</span>
          <strong>{workspace?.name ?? 'No workspace readback'}</strong>
          <TruthLabel state={workspace?.evidenceState ?? 'unavailable'} compact />
        </div>
        <div>
          <span><CreditCard aria-hidden="true" /> Billing</span>
          <strong>{model.billing.subscriptionLabel}</strong>
          <TruthLabel state={model.billing.evidenceState} compact />
        </div>
      </div>
    </section>
  );
}

function AccountSettings({ model }: { model: ProductUiReadModel }) {
  return (
    <section className="settings-content" aria-labelledby="account-settings-heading" data-verify="account-settings-surface">
      <span className="product-kicker">Account readback</span>
      <h2 id="account-settings-heading">Account</h2>
      <p className="settings-content__lead">Identity and profile mutation belong to an auth or account provider, not to this presentation.</p>
      <dl className="readback-table">
        <div><dt>Display label</dt><dd>{model.account.displayLabel}</dd></div>
        <div><dt>Opaque reference</dt><dd>{model.account.reference ?? 'Not supplied'}</dd></div>
        <div><dt>Provider</dt><dd>{model.account.providerLabel}</dd></div>
        <div><dt>Evidence</dt><dd><TruthLabel state={model.account.evidenceState} compact /></dd></div>
      </dl>
      <aside className="boundary-note">
        <div><strong>No profile save action</strong><p>{model.account.detail}</p></div>
        <TruthLabel state="unavailable" compact />
      </aside>
    </section>
  );
}

function BillingSettings({ model }: { model: ProductUiReadModel }) {
  const usageKnown = typeof model.billing.seatLimit === 'number' && typeof model.billing.seatsUsed === 'number';
  return (
    <section className="settings-content" aria-labelledby="billing-settings-heading" data-verify="billing-settings-surface">
      <span className="product-kicker">Provider readback</span>
      <h2 id="billing-settings-heading">Billing</h2>
      <p className="settings-content__lead">Subscription state appears only when the platform adapter supplies evidence.</p>
      <div className="billing-plan-card">
        <div className="billing-plan-card__heading">
          <div>
            <span>Plan</span>
            <strong>{model.billing.planLabel ?? 'Not supplied'}</strong>
          </div>
          <TruthLabel state={model.billing.evidenceState} />
        </div>
        <dl className="readback-table">
          <div><dt>Subscription</dt><dd>{model.billing.subscriptionLabel}</dd></div>
          <div><dt>Interval</dt><dd>{model.billing.billingInterval ?? 'Not supplied'}</dd></div>
          <div><dt>Seats</dt><dd>{usageKnown ? `${model.billing.seatsUsed} of ${model.billing.seatLimit}` : 'Not supplied'}</dd></div>
          <div><dt>Period end</dt><dd>{model.billing.periodEndsAt ?? 'Not supplied'}</dd></div>
        </dl>
      </div>
      <aside className="boundary-note">
        <div><strong>No checkout or billing portal action</strong><p>{model.billing.detail}</p></div>
        <TruthLabel state="unavailable" compact />
      </aside>
    </section>
  );
}

export function SettingsShell({ path, model, onNavigate }: { path: string; model: ProductUiReadModel; onNavigate: (route: string) => void }) {
  return (
    <div className="product-page" data-verify="settings-surface">
      <header className="product-page__header">
        <div>
          <span className="product-kicker"><ShieldCheck aria-hidden="true" /> Inspectable settings</span>
          <h1>Product settings</h1>
          <p>Account and billing states stay visibly tied to their evidence.</p>
        </div>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SETTINGS_ROUTES.map((item) => {
            const active = path === item.route;
            const Icon = item.icon;
            return (
              <button type="button" key={item.route} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.route)}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
                <ChevronRight aria-hidden="true" />
              </button>
            );
          })}
        </nav>
        <div className="settings-panel">
          {path === '/settings/account'
            ? <AccountSettings model={model} />
            : path === '/settings/billing'
              ? <BillingSettings model={model} />
              : <SettingsOverview model={model} />}
        </div>
      </div>
    </div>
  );
}
