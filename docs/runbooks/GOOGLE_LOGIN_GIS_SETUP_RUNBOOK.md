# Google Login GIS Setup Runbook

Date: 2026-04-19
Status: Ready for environment provisioning
Scope: Google Cloud console setup, staging/prod origins, deploy configuration, smoke verification

## Objective

Bring Google login live for LMS Maritime using the implementation that now exists in this repo:

- frontend Google Identity Services button
- backend ID token verification
- LMS JWT issuance through the existing auth contract
- safe auto-provisioning for new users as `STUDENT`
- no organization auto-creation

This runbook is for real environments, not proposal-stage design.

## Current implementation truth in this repo

The current code path is:

`Google button -> browser callback receives Google ID token -> POST /api/v3/auth/google -> backend verifies token -> backend issues LMS JWT`

Important implications:

- the current implementation uses JavaScript callback handling, not OAuth redirect mode
- there is no Google authorization code flow in phase 1
- there is no backend OAuth callback endpoint to register in Google Cloud
- there is no Google client secret to store in the app
- the stable Google identity key is `sub`, not email

Relevant code:

- backend auth endpoint: `backend/src/main/java/com/example/lms/identity/infrastructure/web/AuthControllerV3.java`
- backend Google verifier: `backend/src/main/java/com/example/lms/identity/infrastructure/security/GoogleIdentityVerifierAdapter.java`
- backend Google auth use case: `backend/src/main/java/com/example/lms/identity/application/usecase/AuthenticateWithGoogleUseCase.java`
- frontend GIS runtime loader: `fe/src/app/core/services/google-identity.service.ts`
- frontend reusable button: `fe/src/app/features/auth/components/google-signin-button.component.ts`

## Environment model

Decide the exact public origins before touching Google Cloud Console.

Recommended environment split:

| Environment | Exact app origin | Notes |
|---|---|---|
| Local | `http://localhost:4200` | add `http://localhost` too |
| Local optional | `http://127.0.0.1:4200` | only if the team really uses `127.0.0.1` |
| Staging | `https://<your-staging-origin>` | must be HTTPS |
| Production | `https://holilihu.online` | must be HTTPS |

Rules:

- use the exact origin only: scheme + hostname + optional port
- do not include paths such as `/auth/login`
- do not include trailing paths like `/org-admin`
- if staging domain is not finalized, stop and finalize it first

## Google Cloud console setup

### 1. Create environment-specific web clients

Recommended production-grade setup:

- one Google Cloud project or client set for local development
- one web client for staging
- one web client for production

This repo reads one `GOOGLE_WEB_CLIENT_ID` per deployment, so separate env clients map cleanly to separate deployments.

### 2. Configure OAuth branding

In Google Cloud Console -> Google Auth Platform:

1. Open `Branding`.
2. Set:
   - Application name
   - Support email
   - Application homepage
   - Privacy policy URL
   - Terms of service URL if available
3. Add the top-level authorized domains used by the app.

For example:

- `holilihu.online`

Notes:

- Google validates branding links against authorized domains
- staging subdomains usually still map to the same top-level authorized domain
- if staging uses a different root domain, that root domain must also be authorized

### 3. Configure audience and publishing status

In Google Cloud Console -> Google Auth Platform -> Audience:

- if you are still doing limited team testing, `Testing` is acceptable
- if you want real users outside the test-user list to sign in, the app must be `In production`

Practical guidance:

- local and early staging can stay in `Testing`
- production rollout should be moved to `In production`

If you keep the app in `Testing`:

- only users in the Google test-user list can use the client
- Google shows the testing/unverified flow
- this is fine for implementation validation, but not for a real launch

If Google asks for verification:

- complete branding truthfully
- keep homepage and privacy policy links live and reachable on the authorized domain
- submit verification only after the final production identity is ready

### 4. Configure scopes

For the current implementation, the default authentication identity scopes are enough:

- `openid`
- `email`
- `profile`

Do not request broader Google API scopes for phase 1.

### 5. Create Web application OAuth clients

In Google Cloud Console -> Google Auth Platform -> Clients:

1. Create client
2. Application type: `Web application`
3. Name the client clearly, for example:
   - `lms-maritime-local`
   - `lms-maritime-staging`
   - `lms-maritime-production`

### 6. Fill Authorized JavaScript origins

For each client, add only the origins that belong to that environment.

#### Local client

Add:

- `http://localhost`
- `http://localhost:4200`

Optional, only if you really use it:

- `http://127.0.0.1:4200`

#### Staging client

Add:

- `https://<your-staging-origin>`

Example:

- `https://staging.holilihu.online`

#### Production client

Add:

- `https://holilihu.online`

Optional, only if production also serves there:

- `https://www.holilihu.online`

### 7. Authorized redirect URIs

For the current repo implementation:

- no Google redirect URI is required
- leave `Authorized redirect URIs` empty

Why:

- the app uses GIS JavaScript callback mode in the browser
- the browser sends the Google ID token to the LMS backend itself
- there is no Google-to-backend redirect endpoint in this phase

Only add redirect URIs if the implementation is intentionally changed later to GIS redirect mode or OAuth code flow.

## App configuration

### Required environment variables

Set on each deployment:

- `GOOGLE_AUTH_ENABLED=true`
- `GOOGLE_WEB_CLIENT_ID=<the web client id for that exact environment>`

Examples:

```env
GOOGLE_AUTH_ENABLED=true
GOOGLE_WEB_CLIENT_ID=123456789012-abcdefg123456.apps.googleusercontent.com
```

This repo already exposes these values in:

- `.env.dev.example`
- `.env.prod.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`

For staging, mirror the same pattern in `.env.staging` or the staging environment secret store.

### Important deployment note

The Angular app does not need the Google client ID at build time.

The frontend reads it at runtime from:

- `GET /api/v3/auth/google/config`

That means:

- changing only `GOOGLE_WEB_CLIENT_ID` is primarily a backend config change
- a backend restart is enough for config changes
- a full stack deploy is still recommended after initial rollout

## Security and browser requirements

### HTTPS

Required for staging and production.

Only localhost is allowed to use HTTP.

Before testing staging or prod, verify:

- DNS resolves correctly
- TLS certificate is valid
- the final origin matches the origin configured in Google Cloud Console exactly

### CSP

This repo now includes Google Identity Services CSP allowances in:

- `Caddyfile`
- `fe/nginx.conf`

Current allowlist intent:

- `script-src` allows Google GIS script
- `style-src` allows Google GIS style and Google-hosted stylesheets
- `connect-src` allows Google GIS endpoints
- `font-src` allows Google-hosted fonts

If the browser console still reports blocked GIS resources, compare the blocked URL against the current CSP header before touching app code.

### FedCM

The frontend now enables FedCM for the Google button flow by default.

Why this matters:

- it is the preferred direction for new web apps
- it reduces popup communication issues in supported Chrome versions

If a specific browser or enterprise configuration disables FedCM, popup behavior can fall back to older browser mechanics. In that case, review Google COOP guidance before changing app logic.

### COOP fallback note

Google's current setup guidance says that when FedCM is disabled, popup-based GIS flows may require COOP changes and can otherwise fail with a blank popup window.

Do not change COOP by default for this repo unless a real browser-specific failure is reproduced.

## Backend behavior to verify

The expected backend behavior is:

### Existing linked Google account

- sign-in succeeds
- existing LMS user is loaded by `(provider, sub)`
- LMS JWT tokens are issued

### New Google account with no LMS user

- LMS user is auto-created
- role is always `STUDENT`
- no organization is created
- if invite code is present, assign to invited org
- otherwise follow the repo's current default org fallback

### Existing LMS password account with same email but no Google link

- sign-in is rejected with `ACCOUNT_LINK_REQUIRED`
- no silent account linking occurs

### Disabled account

- sign-in is rejected

## Smoke checklist

### Before browser testing

1. Confirm backend config endpoint:

```bash
curl -s https://<app-origin>/api/v3/auth/google/config
```

Expected:

- `enabled: true`
- correct `clientId`

2. Confirm the login page is served from the same origin you registered in Google Cloud.

### Browser smoke

Run these in a clean browser profile:

1. Open `/auth/login`
2. Confirm the Google button renders
3. Confirm no CSP errors are shown for GIS resources
4. Sign in with a Google account that is already linked
5. Confirm redirect lands in the correct LMS portal
6. Sign in with a brand-new Google account
7. Confirm the new LMS user is created as `STUDENT`
8. Confirm no organization was created
9. Open `/auth/register?invite=<valid-invite>`
10. Sign in with a brand-new Google account there
11. Confirm the user joins the invited organization
12. Try a Google account whose email already exists in LMS as an unlinked password account
13. Confirm the app surfaces the backend error instead of silently merging accounts

### Optional data checks

Verify in the database:

- a row exists in `user_external_identities`
- `provider = GOOGLE`
- `external_subject` stores the Google `sub`
- no extra organizations were created

## What the user must do

These steps cannot be completed from inside this repo alone.

### Required from you

1. Finalize the exact staging origin you want to use.
2. Create the Google Cloud OAuth Web clients for local, staging, and production.
3. Fill the branding links in Google Auth Platform:
   - homepage
   - privacy policy
   - terms of service if available
4. Register the exact JavaScript origins for each environment.
5. Send or install the correct client IDs into:
   - staging deployment config
   - production deployment config
6. Turn on:
   - `GOOGLE_AUTH_ENABLED=true`
   - `GOOGLE_WEB_CLIENT_ID=<environment client id>`
7. Redeploy or restart the relevant stack.

### Nice to have from you

1. Confirm whether production should also support `www.holilihu.online`
2. Confirm whether the team truly uses `127.0.0.1:4200` locally
3. Confirm the final staging hostname so the docs can be de-placeholdered later

## Non-goals for phase 1

These are intentionally not part of the current implementation:

- Google One Tap rollout
- account linking UI in profile settings
- Google Workspace domain-based role elevation
- OAuth authorization code flow
- Google API access beyond identity

## References

- Google setup guide: <https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid>
- Google button guide: <https://developers.google.com/identity/gsi/web/guides/display-button>
- Google server-side token verification: <https://developers.google.com/identity/gsi/web/guides/verify-google-id-token>
- Google FedCM migration guidance: <https://developers.google.com/identity/gsi/web/guides/fedcm-migration>
