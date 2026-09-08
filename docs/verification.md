# Verification record — 2026-09-08

## Passed locally

- `npm run check`: TypeScript, ESLint with zero warnings, and production Node/Nitro build passed.
- `NITRO_PRESET=vercel npm run build`: Vercel Build Output API generated with the Node.js 24 runtime.
- Dependency audit reported zero vulnerabilities during this run.
- Fresh PostgreSQL 18 migration, seed, RLS/RPC acceptance suite and rollback passed.
- Six overlapping database cases passed: final stock, final coupon use, identical replay, conflicting replay, double cancellation and concurrent last-admin changes.
- Production browser smoke covered home, catalog, login, cart, account, checkout, admin, password reset, help and product routes; missing route returned HTTP 404; no uncaught page errors.
- Desktop and 390px mobile homepage were inspected; the route sweep reported no horizontal overflow.
- Missing ENV displays explicit setup states rather than fake authentication, products or orders.
- Review fixes cover checkout durability, safe replay, recovered cart cleanup, zero-row address mutations, permission refresh, admin form preservation, image MIME constraints and button contrast.
- Current source/config/dependency scan contains no previous generator integration remnants; published Git history remains unchanged.

## Not Yet Verified

- A live Supabase URL/key was not supplied, so JWT/PostgREST, SMTP email and real Storage upload flows remain unverified.
- A production domain/deployment was not supplied; successful deploy builds do not mean a live deployment exists.
- Dockerfile was not built because the Docker daemon was unavailable. The isolated local PostgreSQL server is stopped.
- Bank transfers remain manually confirmed; payment settlement, carriers and refunds are out of scope.

## Operational Notes

Checkout writes a request ID to `sessionStorage` before calling the transactional RPC. Unknown outcomes retain the exact ID and payload for safe retry; explicit abandonment warns that it does not cancel any server order. Auth roles refresh on focus, visibility, admin entry and periodically, while RLS/RPCs remain authoritative.

No credentials, commits, branches or Git-history rewrites were created. Local logs/screenshots are ignored artifacts.
