import { useState } from 'react';
import { ArrowRight, Building2, Check, ChevronsUpDown } from 'lucide-react';
import { actionFeedbackClass, type ProductUiReadModel, type UiActionResult, type WorkspaceSelectionIntent } from './product-types';
import { TruthLabel } from './truth-label';

export function WorkspaceSwitcher({
  model,
  onSelect,
}: {
  model: ProductUiReadModel;
  onSelect?: (intent: WorkspaceSelectionIntent) => Promise<UiActionResult>;
}) {
  const [result, setResult] = useState<UiActionResult | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const currentWorkspace = model.workspaces.find((workspace) => workspace.id === model.currentWorkspaceId);

  const requestSelection = async (workspaceId: string) => {
    if (!onSelect) return;
    setPendingId(workspaceId);
    try {
      const workspace = model.workspaces.find((item) => item.id === workspaceId);
      if (!workspace) {
        setResult({ ok: false, evidenceState: 'unavailable', message: 'The requested workspace is not present in the tenancy readback.' });
        return;
      }
      setResult(await onSelect({ tenantId: workspace.tenantId, workspaceId }));
    } catch (error) {
      setResult({
        ok: false,
        evidenceState: 'unavailable',
        message: error instanceof Error ? error.message : 'The tenancy adapter did not return a result.',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="product-page" data-verify="workspace-switcher-surface">
      <header className="product-page__header">
        <div>
          <span className="product-kicker"><ChevronsUpDown aria-hidden="true" /> Tenancy readback</span>
          <h1>Choose a workspace</h1>
          <p>Only workspaces supplied by the Base tenancy directory may appear here.</p>
        </div>
        <TruthLabel state={currentWorkspace?.evidenceState ?? 'unavailable'} />
      </header>

      <section className="workspace-list" aria-label="Available workspace readbacks">
        {model.workspaces.map((workspace) => {
          const current = workspace.id === model.currentWorkspaceId;
          const disabled = current || !onSelect || pendingId !== null;
          return (
            <article className={`workspace-option${current ? ' is-current' : ''}`} key={workspace.id}>
              <div className="workspace-option__mark"><Building2 aria-hidden="true" /></div>
              <div className="workspace-option__copy">
                <div>
                  <strong>{workspace.name}</strong>
                  {current && <span className="inline-state"><Check aria-hidden="true" /> Current</span>}
                </div>
                <p>{workspace.detail}</p>
                <code>{workspace.tenantId} / {workspace.id}</code>
              </div>
              <TruthLabel state={workspace.evidenceState} compact />
              <button
                type="button"
                className="ui-button ui-button--secondary"
                disabled={disabled}
                onClick={() => void requestSelection(workspace.id)}
                aria-label={current ? `${workspace.name} is current` : `Request ${workspace.name}`}
              >
                <span>{current ? 'Current' : pendingId === workspace.id ? 'Requesting' : 'Switch'}</span>
                {!current && <ArrowRight aria-hidden="true" />}
              </button>
            </article>
          );
        })}
      </section>

      <aside className="boundary-note" aria-label="Workspace authority note">
        <div>
          <strong>{onSelect ? 'Selection adapter supplied' : 'Selection adapter not connected'}</strong>
          <p>{onSelect
            ? 'A request can be sent, but this UI will display only the adapter result.'
            : 'The fixture cannot change workspace membership, selection or capability grants.'}</p>
        </div>
        <TruthLabel state={onSelect ? 'configured-unverified' : 'unavailable'} compact />
      </aside>
      {result && <div className={actionFeedbackClass(result)} role="status" aria-live="polite" data-action-result={result.evidenceState}>{result.message}</div>}
    </div>
  );
}
