export const ORGANIZATION_ENDPOINTS = {
  BASE: '/api/v3/organizations',
  STATS: '/api/v3/organizations/stats',
  BY_ID: (id: string) => `/api/v3/organizations/${id}`,
  MEMBERS: (id: string) => `/api/v3/organizations/${id}/members`,
  REMOVE_MEMBER: (id: string, userId: string) => `/api/v3/organizations/${id}/members/${userId}`,
  INVITE_CODE: (id: string) => `/api/v3/organizations/${id}/invites/code`,
  INVITE_EMAIL: (id: string) => `/api/v3/organizations/${id}/invites/email`,
  INVITES: (id: string) => `/api/v3/organizations/${id}/invites`,
  REVOKE_INVITE: (id: string, inviteId: string) => `/api/v3/organizations/${id}/invites/${inviteId}`,
  MEMBER_TOKEN_CONFIG: (orgId: string, userId: string) => `/api/v3/organizations/${orgId}/members/${userId}/token-config`,
} as const;

export const INVITE_ENDPOINTS = {
  VALIDATE_CODE: '/api/v3/invites/validate',
  VALIDATE_TOKEN: '/api/v3/invites/validate-token',
  ACCEPT: '/api/v3/invites/accept',
} as const;
