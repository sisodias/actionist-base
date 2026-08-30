import { CircleAlert, CircleCheck, FlaskConical, Unplug } from 'lucide-react';
import { EVIDENCE_LABELS, type EvidenceState } from './product-types';

export function TruthLabel({ state, compact = false }: { state: EvidenceState; compact?: boolean }) {
  const Icon = state === 'observed'
    ? CircleCheck
    : state === 'fixture'
      ? FlaskConical
      : state === 'configured-unverified'
        ? CircleAlert
        : Unplug;

  return (
    <span className={`truth-label truth-label--${state}${compact ? ' truth-label--compact' : ''}`} data-evidence-state={state}>
      <Icon aria-hidden="true" />
      <span>{EVIDENCE_LABELS[state]}</span>
    </span>
  );
}
