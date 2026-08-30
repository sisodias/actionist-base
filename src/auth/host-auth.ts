import type { PrincipalKind } from '../host';

export type HostLoginRequest = {
  principalId: string;
};

export type AuthenticatedHostPrincipal = {
  principalId: string;
  principalKind: PrincipalKind;
  displayName?: string;
  teamIds: readonly string[];
  clientAccountIds: readonly string[];
};

export type HostAuthErrorCode = 'LOGIN_REQUEST_INVALID' | 'AUTHENTICATION_DENIED';

export class HostAuthError extends Error {
  constructor(readonly code: HostAuthErrorCode, message: string) {
    super(message);
    this.name = 'HostAuthError';
  }
}

export interface HostAuthenticator {
  login(request: HostLoginRequest): Promise<AuthenticatedHostPrincipal>;
}

/**
 * Credentialless fixture login owned by Actionist Base.
 *
 * It deliberately accepts only a predeclared synthetic principal and never
 * receives, stores or forwards donor credentials. Production authentication is
 * outside this repository's scope.
 */
export class FixtureHostAuthenticator implements HostAuthenticator {
  private readonly principals = new Map<string, AuthenticatedHostPrincipal>();

  constructor(principals: readonly AuthenticatedHostPrincipal[]) {
    for (const principal of principals) {
      const principalId = principal.principalId.trim();
      if (!principalId) throw new HostAuthError('LOGIN_REQUEST_INVALID', 'fixture principal id is required');
      if (this.principals.has(principalId)) throw new HostAuthError('LOGIN_REQUEST_INVALID', `duplicate fixture principal: ${principalId}`);
      this.principals.set(principalId, clonePrincipal({ ...principal, principalId }));
    }
  }

  async login(request: HostLoginRequest): Promise<AuthenticatedHostPrincipal> {
    const principalId = request.principalId.trim();
    if (!principalId) throw new HostAuthError('LOGIN_REQUEST_INVALID', 'principal id is required');
    const principal = this.principals.get(principalId);
    if (!principal) throw new HostAuthError('AUTHENTICATION_DENIED', 'Base fixture login denied');
    return clonePrincipal(principal);
  }
}

function clonePrincipal(principal: AuthenticatedHostPrincipal): AuthenticatedHostPrincipal {
  return {
    ...principal,
    teamIds: [...principal.teamIds],
    clientAccountIds: [...principal.clientAccountIds],
  };
}
