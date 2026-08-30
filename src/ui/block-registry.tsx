import { useState } from 'react';
import { ArrowRight, Box, Boxes, Braces, LockKeyhole } from 'lucide-react';
import { actionFeedbackClass, type BlockInstallIntent, type ProductUiReadModel, type UiActionResult } from './product-types';
import { TruthLabel } from './truth-label';

export function BlockRegistrySurface({
  model,
  onInstall,
  onNavigate,
}: {
  model: ProductUiReadModel;
  onInstall?: (intent: BlockInstallIntent) => Promise<UiActionResult>;
  onNavigate: (route: string) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [result, setResult] = useState<UiActionResult | null>(null);
  const registryEvidence = model.blocks[0]?.evidenceState ?? 'unavailable';

  const requestInstall = async (blockId: string) => {
    if (!onInstall) return;
    setPendingId(blockId);
    try {
      setResult(await onInstall({ blockId }));
    } catch (error) {
      setResult({
        ok: false,
        evidenceState: 'unavailable',
        message: error instanceof Error ? error.message : 'The registry adapter did not return a result.',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="product-page" data-verify="block-registry-surface">
      <header className="product-page__header">
        <div>
          <span className="product-kicker"><Boxes aria-hidden="true" /> Capability registry</span>
          <h1>Blocks in this Base registry</h1>
          <p>Registration, runtime availability and persistent installation are separate states.</p>
        </div>
        <TruthLabel state={registryEvidence} />
      </header>

      <section className="registry-list" aria-label="Registered blocks">
        {model.blocks.map((block) => (
          <article className="registry-row" key={block.id}>
            <div className="registry-row__mark"><Box aria-hidden="true" /></div>
            <div className="registry-row__identity">
              <span>{block.label}</span>
              <code>{block.id}</code>
            </div>
            <div className="registry-row__meta">
              <span><Braces aria-hidden="true" /> {block.route}</span>
              <span><LockKeyhole aria-hidden="true" /> {block.requiredCapabilities.join(', ') || 'No capability supplied'}</span>
            </div>
            <div className="registry-row__state">
              <span>{block.registryState === 'host-registry-entry' ? 'Host registry entry' : 'Registered in source'}</span>
              <TruthLabel state={block.evidenceState} compact />
            </div>
            <div className="registry-row__actions">
              <button type="button" className="ui-button ui-button--quiet" onClick={() => onNavigate(block.route)}>
                Open <ArrowRight aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ui-button ui-button--secondary"
                disabled={!onInstall || pendingId !== null}
                onClick={() => void requestInstall(block.id)}
              >
                {pendingId === block.id ? 'Requesting' : 'Request install'}
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="boundary-note" aria-label="Install authority note">
        <div>
          <strong>{onInstall ? 'Install command port supplied' : 'Install command port not connected'}</strong>
          <p>{onInstall
            ? 'The command owner must return observed evidence before the UI reports an installation.'
            : 'Source registration does not prove a tenant install, database write or persisted navigation entry.'}</p>
        </div>
        <TruthLabel state={onInstall ? 'configured-unverified' : 'unavailable'} compact />
      </aside>
      {result && <div className={actionFeedbackClass(result)} role="status" aria-live="polite" data-action-result={result.evidenceState}>{result.message}</div>}
    </div>
  );
}
