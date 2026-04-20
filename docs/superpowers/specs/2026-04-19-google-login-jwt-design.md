# Google Login JWT Design

Date: 2026-04-19
Status: Implemented in code, pending environment provisioning and live Google Console setup
Scope: authentication, onboarding, organization assignment, frontend login surface

## Objective

Add "Sign in with Google" and "Register with Google" to LMS Maritime in a way that is:

- consistent with the current stateless JWT architecture
- safe for multi-role LMS rules
- compatible with organization invite flows
- minimal in UX change but clean in backend design

The required product behavior is:

- if a user clicks Google login and has no local account, create one automatically
- auto-created accounts must not create organizations
- auto-created accounts must not silently become `ADMIN` or `ORG_ADMIN`

## Current Truth From This Repo

### Backend

- auth is JWT-based through `/api/v3/auth/*`
- registration currently returns the same `AuthResponse` shape used by login
- public registration is forced to `STUDENT` in `RegisterUserUseCaseV2`
- org assignment today is `inviteCode -> organization`, otherwise default org `WIII`
- organization creation is `ADMIN` only in `OrganizationControllerV3`
- the backend does not currently include Spring OAuth2 client dependencies

### Frontend

- login and register screens already exist
- auth state and post-login redirect logic already exist in `AuthService` and login flow
- the auth README explicitly says the social buttons are currently UI only

### Operational context

- CSP in both `Caddyfile` and `fe/nginx.conf` is currently strict enough to block Google Identity Services until explicitly allowed

## Decision Summary

### Approved direction

Use Google Identity Services on the frontend, then send the returned Google ID token to the backend for verification. After backend verification, mint the existing LMS JWT tokens and return the normal `AuthResponse`.

Flow:

`Google button -> Google ID token -> LMS backend verify -> LMS JWT access/refresh token -> existing app session`

### Why this is the right fit

- it preserves the current SPA + stateless API contract
- it avoids introducing Spring session-based auth just for one provider
- it lets the backend remain the source of truth for role and organization assignment
- it keeps future migration paths open

### Explicitly not chosen for phase 1

- `oauth2Login()` session-based Spring Security flow
- silent account linking by email match
- automatic organization creation
- inferring LMS roles from Google Workspace domain
- shipping Google One Tap first

## Design Options Considered

### Option A: Frontend GIS + backend token verification + existing JWT

Pros:

- lowest architectural disruption
- preserves current FE and BE contracts
- easy to reason about in a stateless API

Cons:

- backend must own token verification and account-link logic explicitly

Recommendation: yes

### Option B: Spring Security `oauth2Login()`

Pros:

- framework-supported OAuth login flow
- useful if the app later becomes session-based or uses many IdPs

Cons:

- poor fit for current JWT-first architecture
- would expand surface area well beyond the requested feature

Recommendation: no for phase 1

### Option C: external auth gateway or BFF first

Pros:

- strongest future extensibility

Cons:

- heavy for the current repo and team

Recommendation: no

## User-Facing Behavior

### Login page

- show a real Google sign-in button on `/auth/login`
- clicking the button signs in with Google
- on success, the frontend receives the normal LMS `AuthResponse`
- existing redirect logic continues to decide whether the user lands on `/student`, `/teacher`, `/org-admin`, or `/admin`

### Register page

- show the same Google button
- if the Google account is new to LMS, create the LMS account automatically
- if an invite code or org-join context exists, pass it through to the backend

### Existing local account with same email

Do not auto-link by email.

Instead:

- if the backend finds an existing unlinked local account with the same email, reject the Google login with a clear machine-readable error such as `ACCOUNT_LINK_REQUIRED`
- the user must authenticate with the existing local method first, then link Google in a later account-settings flow

This avoids accidental account takeover through email collisions and keeps trust boundaries explicit.

## Role and Organization Rules

### Role assignment

For a newly auto-created Google account:

- role is always `STUDENT`

Never:

- assign `ADMIN`
- assign `ORG_ADMIN`
- assign `TEACHER`
- infer role from Google domain, `hd`, or consumer vs Workspace account type

### Organization assignment

For a newly auto-created Google account:

- if a valid `inviteCode` is present, assign using the existing invite flow
- otherwise assign to the default `WIII` organization, following current registration behavior

Never:

- create a new organization
- elevate org privileges based on Google identity

This preserves the existing product rule that org management remains explicit and administrator-controlled.

## Email verification

If Google returns `email_verified=true` in the verified token:

- treat the LMS email as verified at account creation time
- do not send the ordinary local email-verification flow for that new account

If Google does not provide a verified email:

- reject account creation for phase 1

This keeps identity trust simple and avoids mixing weak and strong account proofing paths.

## Recommended Domain Model

### New persistence structure

Add a dedicated identity-link table instead of stuffing Google fields directly into `users`.

Recommended table:

`user_external_identities`

Suggested columns:

- `id`
- `user_id`
- `provider` (`GOOGLE`)
- `external_subject` (Google `sub`)
- `email_at_link`
- `email_verified_at`
- `linked_at`
- `last_login_at`
- `created_at`
- `updated_at`

Constraints:

- unique `(provider, external_subject)`
- unique `(user_id, provider)`

### Why this is preferred

- clean separation between local user profile and external identity bindings
- future-ready for additional IdPs without polluting the `users` table
- safer audit trail for linking behavior

## Password handling for Google-created accounts

Do not broaden the user model to allow null passwords in phase 1.

Instead:

- generate a cryptographically random unusable password string
- hash it with the existing `PasswordEncoder`
- store it like a normal password

This keeps the current authentication model stable while still allowing Google-only accounts.

## Backend API Contract

### New endpoint

`POST /api/v3/auth/google`

Request:

```json
{
  "idToken": "google-id-token",
  "inviteCode": "optional-org-invite"
}
```

Response:

- existing `AuthResponse`

This preserves frontend compatibility with current token handling.

### Error contract

Recommended error codes:

- `GOOGLE_TOKEN_INVALID`
- `GOOGLE_TOKEN_AUDIENCE_INVALID`
- `GOOGLE_ACCOUNT_EMAIL_UNVERIFIED`
- `ACCOUNT_LINK_REQUIRED`
- `ACCOUNT_DISABLED`
- `INVITE_INVALID`

Use stable machine-readable codes even if the human message is localized.

## Backend Workflow

The backend flow should be:

1. Verify the Google ID token.
2. Validate `aud`, `iss`, and `exp`.
3. Extract `sub`, `email`, `email_verified`, `name`, and `picture`.
4. Look up `user_external_identities` by `(provider=GOOGLE, external_subject=sub)`.
5. If linked:
   - load the LMS user
   - reject if disabled
   - update `last_login_at`
   - issue standard LMS JWT tokens
6. If not linked:
   - look up local user by email
   - if found, reject with `ACCOUNT_LINK_REQUIRED`
   - if not found, create a new LMS user as `STUDENT`
   - assign org via `inviteCode`, else default `WIII`
   - persist the Google identity link
   - issue standard LMS JWT tokens

## Backend Architectural Shape

### Application layer

Recommended new use case:

- `AuthenticateWithGoogleUseCase`

Recommended command/response DTOs:

- `AuthenticateWithGoogleCommand`
- reuse existing `AuthResponse`

### Ports

Recommended new ports:

- `GoogleIdentityVerifierPort`
- `ExternalIdentityRepository`

### Infrastructure

Recommended infrastructure pieces:

- REST controller method in `AuthControllerV3`
- Google ID token verifier adapter
- JPA entity + mapper + repository adapter for `user_external_identities`

This follows the repo's existing Clean Architecture rules without introducing a new auth framework.

## Token Verification

Use Google's official ID token verification guidance.

The backend must verify:

- signature
- `aud`
- `iss`
- `exp`

The stable key for user identity is:

- Google `sub`

Do not use email as the binding key.

## Frontend Design

### Phase 1 FE flow

- load Google Identity Services only on login/register surfaces
- render the official Sign in with Google button
- on credential callback, call `POST /api/v3/auth/google`
- feed the returned response into the existing auth storage flow

This should be implemented by adding a dedicated method such as `loginWithGoogle()` in `AuthService`, while reusing the current token and redirect logic.

## Invite propagation

If the user starts from:

- register page with invite code
- join-org page
- future invite acceptance route

the frontend should pass that invite code to the Google auth endpoint.

## What to defer

Defer to a later phase:

- Google One Tap
- account-link management UI
- unlink flow
- multiple social providers

## Security and Edge Requirements

### CSP updates

Update both:

- `Caddyfile`
- `fe/nginx.conf`

to allow Google Identity Services resources.

Minimum required origins from Google's setup guidance:

- `script-src https://accounts.google.com/gsi/client`
- `frame-src https://accounts.google.com/gsi/`
- `connect-src https://accounts.google.com/gsi/`
- `style-src https://accounts.google.com/gsi/style`

### COOP / popup behavior

If popup mode is used and FedCM is not handling the popup path automatically, ensure the required COOP behavior is compatible with GIS guidance.

Recommendation for phase 1:

- start with the official GIS button flow only
- keep the FE implementation conservative
- verify popup behavior in Chrome and Safari before enabling broader variations

### Audit and abuse controls

Add:

- auth audit events for Google success and failure
- rate limiting on the Google auth endpoint
- structured logs without storing raw ID tokens

Do not log the raw Google credential payload.

## Database Migration Plan

Add a new Flyway migration to create:

- `user_external_identities`

Do not rewrite existing `users` schema beyond the minimum required for verified-email support if that field already exists.

If the current user record lacks an explicit verified-email flag, add it only if needed for consistent downstream behavior.

## Testing Plan

### Backend tests

- valid Google token for existing linked account
- valid Google token for new account auto-creation
- invalid token
- wrong audience
- expired token
- existing email but unlinked local account
- disabled user
- invite code valid
- invite code invalid
- role remains `STUDENT`
- org is never auto-created

### Frontend tests

- Google success path stores LMS JWT tokens
- redirect after Google login follows current role routing
- invite code is forwarded
- `ACCOUNT_LINK_REQUIRED` is surfaced clearly

## Manual smoke

- login with a brand-new Google account -> LMS account created as student
- login again with same Google account -> existing linked LMS account reused
- local account with same email but no link -> blocked with explicit link-required message
- org-admin and admin accounts are never created automatically

## Rollout Plan

### Phase 1

- backend token verification endpoint
- identity-link table
- login/register FE button
- auto-create student accounts
- invite/default-org assignment

### Phase 2

- link existing local account from profile settings
- unlink flow
- optional One Tap

## Success Criteria

- users can sign in or sign up with Google
- new Google users are created automatically as `STUDENT`
- org assignment follows invite or default `WIII`
- `ORG_ADMIN` and `ADMIN` are never auto-created
- no organization is auto-created
- existing local accounts are not silently linked by email
- frontend continues to use the standard LMS JWT session model

## References

Official sources used:

- Google Identity Services setup: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- Google button guide: https://developers.google.com/identity/gsi/web/guides/display-button
- Google backend auth: https://developers.google.com/identity/sign-in/web/backend-auth
- Google OpenID Connect validation: https://developers.google.com/identity/openid-connect/openid-connect
- Spring Security OAuth2 login reference: https://docs.spring.io/spring-security/reference/servlet/oauth2/login/advanced.html

Repo sources used:

- `backend/src/main/java/com/example/lms/identity/infrastructure/web/AuthControllerV3.java`
- `backend/src/main/java/com/example/lms/identity/application/usecase/RegisterUserUseCaseV2.java`
- `backend/src/main/java/com/example/lms/identity/infrastructure/web/OrganizationControllerV3.java`
- `backend/pom.xml`
- `fe/src/app/features/auth/README.md`
- `fe/src/app/features/auth/login/login.component.ts`
- `fe/src/app/core/services/auth.service.ts`
- `Caddyfile`
- `fe/nginx.conf`
