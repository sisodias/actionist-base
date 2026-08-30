export type EvidenceState = 'fixture' | 'configured-unverified' | 'observed' | 'unavailable';

export type UiActionResult = {
  ok: boolean;
  evidenceState: EvidenceState;
  message: string;
};

export type LoginIntent = {
  email: string;
  password: string;
};

export type WorkspaceSelectionIntent = {
  tenantId: string;
  workspaceId: string;
};

export type BlockInstallIntent = {
  blockId: string;
};

export type ProductUiActions = {
  login?: (intent: LoginIntent) => Promise<UiActionResult>;
  selectWorkspace?: (intent: WorkspaceSelectionIntent) => Promise<UiActionResult>;
  installBlock?: (intent: BlockInstallIntent) => Promise<UiActionResult>;
};

export type AccountReadback = {
  displayLabel: string;
  reference?: string;
  providerLabel: string;
  evidenceState: EvidenceState;
  detail: string;
};

export type WorkspaceReadback = {
  tenantId: string;
  id: string;
  name: string;
  detail: string;
  evidenceState: EvidenceState;
};

export type SessionReadback = {
  status: 'missing' | 'active' | 'expired' | 'revoked' | 'logged_out';
  authenticated: boolean;
  principalLabel?: string;
  tenantId?: string;
  workspaceId?: string;
  capabilityCount: number;
  expiresAt?: string;
  evidenceState: EvidenceState;
};

export type BillingReadback = {
  planLabel?: string;
  subscriptionLabel: string;
  billingInterval?: 'month' | 'year';
  seatLimit?: number;
  seatsUsed?: number;
  periodEndsAt?: string;
  evidenceState: EvidenceState;
  detail: string;
};

export type BlockReadback = {
  id: string;
  label: string;
  route: string;
  requiredCapabilities: readonly string[];
  registryState: 'source-registered' | 'host-registry-entry';
  evidenceState: EvidenceState;
};

export type ProductUiReadModel = {
  session: SessionReadback;
  account: AccountReadback;
  currentWorkspaceId: string;
  workspaces: WorkspaceReadback[];
  billing: BillingReadback;
  blocks: BlockReadback[];
};

export const EVIDENCE_LABELS: Record<EvidenceState, string> = {
  fixture: 'Fixture data',
  'configured-unverified': 'Configured, not verified',
  observed: 'Observed runtime',
  unavailable: 'Runtime unavailable',
};

export function actionFeedbackClass(result: UiActionResult): string {
  if (result.ok && result.evidenceState === 'observed') return 'action-feedback is-success';
  if (result.evidenceState === 'fixture' || result.evidenceState === 'configured-unverified') return 'action-feedback is-neutral';
  return 'action-feedback';
}
