# Database setup and operating contract

## Files and deployment

- `supabase/migrations/202609080001_shop.sql`: transactional schema, RLS, protected RPCs, signup trigger and Storage policies. Apply once to a new Supabase project as the trusted database owner; use forward migrations for later changes.
- `supabase/seed.sql`: optional demonstration catalog with 3 categories, 7 products, 18 variants and 2 coupons. Stable UUIDs and `ON CONFLICT (id) DO NOTHING` allow reruns without resetting stock, prices or coupon usage. Review demo prices, inventory and offers before production.
- `src/lib/shop-types.ts`: shared application contract. Public table columns match their corresponding shared types; relation properties such as `order_items` and `product_variants` are joins, not JSON columns. Replay payloads live separately in `private.checkout_requests`.
- `supabase/tests/`: standalone SQL acceptance checks and a dependency-free Node concurrency runner; no new test framework or application dependency.

For hosted setup, run the migration in the Supabase SQL editor, then optionally run the seed. Alternatively initialize/link the Supabase CLI in your environment, inspect the linked project reference, and apply migrations with `supabase db push`. Never reset production. The seed is an explicit production choice, not required for schema deployment.

Seed image URLs are `/images/category-running.jpg`, `/images/velocity-tracksuit.jpg`, `/images/strength-gear.jpg`, `/images/endurance-pack.jpg`, `/images/elite-socks.jpg`, `/images/category-training.jpg`, and `/images/category-accessories.jpg`. Copy the matching existing assets to the application's public images directory. The seed does not upload files to Storage. Slugs include `velocity-runner-x1`, `velocity-tracksuit`, `endurance-pack`, `elite-socks`, `strength-gear`, `apex-training-shoe`, and `apex-essential-kit`.

Keep `private` out of the API's exposed schemas. Only the project URL and publishable/anon key belong in browser environment variables. Database passwords and service-role/secret keys must never enter browser code, checked-in files, logs, or public deployment environment variables. Inspect unrelated existing grants/policies when applying to a nonempty project; this migration targets a fresh shop schema.

## First administrator: SQL editor only

1. Register a real account through Supabase Auth and complete email verification.
2. Find that verified account's UUID in Authentication > Users. Do not trust a UUID, email or role supplied by another shopper.
3. In the project owner's SQL editor only, replace the placeholder with the verified UUID and execute:

```sql
begin;
update public.profiles
set role = 'admin', is_active = true
where id = '<verified-auth-user-uuid>'::uuid
returning id, full_name, role, is_active;
commit;
```

Exactly one row should return. Sign out/in or refresh the profile query. There is no seed administrator, default password, client bootstrap endpoint or role-from-metadata. Signup copies only bounded `full_name`; metadata `role` and `is_active` are ignored. Existing Auth users are backfilled as ordinary active users. Subsequent role changes use `admin_update_user`; the SQL editor is a privileged recovery tool that bypasses application safeguards, so restrict its access.

## Auth and email configuration

- Configure the production Site URL and exact redirect allowlist entries for deployed login/confirmation and password-reset routes. Add the exact local development origin only where needed; avoid broad wildcard production or untrusted preview domains. Ensure application-generated URLs are on the allowlist.
- Enable email confirmation. Configure real SMTP, a verified sender/domain, and provider-required SPF/DKIM/DMARC records. Store SMTP credentials in Supabase Auth configuration, never in this repository or frontend ENV.
- Exercise signup confirmation, expired links, sign-in/out, recovery and password update with real mailboxes. Check deployed return origins and email delivery before launch.
- Configure Auth abuse limits/CAPTCHA and application/gateway limits for authenticated checkout/newsletter requests. This schema does not implement IP rate limiting, outbound mail, newsletter double opt-in or unsubscribe delivery. Configure consent and unsubscribe handling before campaigns.

## Authorization and data lifecycle

Anonymous visitors read active categories, products in active categories (or uncategorized products), and active variants with visible parents. Active admins read inactive catalog rows and manage categories, products, variants, coupons and newsletter subscriptions. Catalog writes remain constrained: inventory is a nonnegative integer; SKUs and product/size/color combinations are unique; swatches are six-digit hex; VND prices are bounded whole-number numeric values.

Authenticated users read their own profile, including disabled status. Only active users read/manage their own addresses, read their orders/items or call customer RPCs. Admins read all profiles/orders, but there are no direct client writes to profiles, orders or order items, even for admins. These mutations use RPCs. Coupon `used_count` is checkout-owned; omit it from admin insert/update payloads. Percentages accept up to two decimal places; fixed discounts/prices use whole VND. Coupon codes are uppercase exact matches, not wildcard searches, and allow 1–64 characters.

Profiles reference Auth users with `ON DELETE RESTRICT`; addresses/orders reference profiles, items reference orders/variants, variants reference products, and products reference categories with restrictive deletion. Archive referenced catalog rows with `is_active = false` rather than deleting. Orders/items have no client deletion API. Cancellation preserves history and replay records. Product image URLs are snapshots, not image-byte copies: retain referenced files and prefer versioned uploads over replacing/deleting historical media. Coupon code and calculated discount are immutable order snapshots; later coupon edits/deletion cannot alter history. Coupon use is counted on successful checkout and **not refunded on cancellation**, preventing reservation/cancellation from recycling limited promotions.

Enable backups/PITR appropriate to deployment, test restoration, restrict SQL-editor/service-role access, and define audited personal-data retention/anonymization procedures. Disabling a profile prevents new privileged operations but does not replace revoking compromised Auth sessions. An already-authorized transaction may finish before concurrent account deactivation acquires its locks.

## RPC contract

Each public RPC explicitly grants execution only to `authenticated`, verifies the active profile, and uses `SECURITY DEFINER SET search_path = ''` with qualified application objects. Trigger/locking helpers are not client-callable. RLS helpers expose booleans, not profile rows.

### Checkout and quote

```text
checkout(p_items jsonb, p_address jsonb, p_payment_method text,
         p_coupon_code text, p_note text, p_request_id uuid,
         p_expected_total numeric) -> uuid
preview_coupon(p_code text, p_subtotal numeric) -> numeric
```

`p_expected_total` is required and non-null; there is no legacy six-argument overload. Send the total the shopper explicitly reviewed. A changed total rejects with `Checkout total changed. Review prices and coupon, then try again.` without reserving stock or consuming a coupon use. Refresh the catalog/quote and ask for review before retrying; never silently change the expected total. The quote returns only a discount, checks exact normalized code availability against the supplied subtotal, and does not reserve uses. Its subtotal is untrusted: checkout recalculates the real subtotal from locked current prices.

Items must be an array of 1–100 distinct variants, each with exactly `variant_id` and numeric integer `quantity` from 1–99. Duplicate/missing variants, numeric strings, fractional quantities, extra price fields, inactive parents/variants and insufficient stock are rejected. Address JSON must contain exactly `recipient`, `phone`, `line1`, `ward`, `district`, `city` as strings; district may be empty. Recipient/ward/city require at least two characters, street line five; phone permits common formatting with 8–15 digits. Inputs are bounded/trimmed. Payment is `cod` or `bank_transfer`; note is at most 2,000 characters; absent coupon is an empty string.

Locks proceed from active profile to per-user/request transaction advisory lock, variants sorted by UUID, products sorted by UUID, categories sorted by UUID, then the selected coupon. Numeric totals, line/address snapshots, order creation and stock changes are atomic. Shipping is 30,000 VND unless **pre-discount subtotal >= 1,500,000 VND**, then zero. Percent discounts round down to whole VND; discounts are capped at subtotal and never discount shipping. Bank transfer is manually verified; checkout never marks payment paid.

Generate one random UUID per checkout attempt and retain it across timeout/network retries. Semantic replay returns the existing order before consulting changed catalog/coupon state, including after cancellation. Reordered items and normalized whitespace/coupon casing replay safely. Changed items/address/payment/note/coupon/expected total with the same request UUID are rejected. After a definitive validation rejection and a newly reviewed cart, use a fresh UUID. Disabled accounts cannot replay while disabled. Deadlock/serialization errors (`40P01`/`40001`) are transaction failures; retry the unchanged request with bounded backoff.

### Customer and admin mutations

```text
update_my_profile(p_full_name text, p_phone text) -> void
subscribe_newsletter(p_email text) -> void
cancel_order(p_order_id uuid) -> void
admin_update_order(p_order_id uuid, p_status text, p_payment_status text) -> void
admin_update_user(p_user_id uuid, p_role text, p_is_active boolean) -> void
```

Newsletter requires active login, validates/lowercases/trims email, and returns identical void success for new/existing email. Nonadmins cannot enumerate rows or retrieve existing emails. It sends no email and does not imply double opt-in.

Owners/active admins cancel only pending/unpaid orders. The order row lock and sorted variant locks ensure exactly-once restock; repeated authorized cancellation is a no-op. Paid or confirmed/shipped/completed orders cannot be cancelled here. Refunds/returns are deliberately not represented by the shared types; do not set paid orders back to unpaid as a workaround.

Admin transitions are `pending -> confirmed -> shipping -> completed`; same-state updates may record verified payment. Cancelled/completed are terminal. Payment is monotonic `unpaid -> paid`; completion requires paid. Bank transfers must be paid before confirmation/shipping; COD may remain unpaid until completion. Pass both intended status and payment status. Admin cancellation calls the same guarded cancellation function.

User management serializes membership changes with an advisory lock and consistent profile locks, then rechecks the caller. The last active admin cannot be demoted/deactivated, including self-change. Self-demotion/deactivation is allowed only if another active admin remains. Only `user`/`admin` and a non-null boolean are accepted.

## Product image Storage

The `product-images` bucket is public-read with a 5 MiB (`5242880` byte) per-file limit and `image/jpeg`, `image/png`, `image/webp`, `image/avif` allowlist. SVG/HTML/arbitrary documents are not allowed. Only active admins insert/update/delete objects. Frontend checks are convenience; Supabase Storage enforces upload limits/policies. Do not add permissive overlapping object policies. A MIME allowlist alone is not malware scanning or byte-level image decoding.

## Local acceptance: SQL only

Use a **disposable, empty, owner-controlled** database, never production. Acceptance creates synthetic Auth users and assumes only its admin fixtures exist. It catches expected failures, verifies outcomes, and rolls back all fixtures. Set `ON_ERROR_STOP=1` so unexpected failures fail the process.

For local Supabase, apply real migration/seed, then:

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/acceptance.sql
```

Use standard PostgreSQL connection environment variables or a local profile. For plain PostgreSQL without Supabase services, first run the separate stubs in a fresh database:

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap-postgres.sql \
  -f supabase/migrations/202609080001_shop.sql \
  -f supabase/seed.sql -f supabase/tests/acceptance.sql
```

`bootstrap-postgres.sql` supplies roles, `auth.uid()` driven by `request.jwt.claim.sub`, and minimal Auth/Storage tables. **Never apply stubs to Supabase or a real application database.** They do not implement JWT verification, Auth HTTP APIs, email, Storage bytes, PostgREST or upload validation. For ephemeral PGlite, load bootstrap, migration, seed, acceptance in order and remove psql backslash-metacommand lines before executing SQL. PGlite is not evidence for real multi-session concurrency or live Supabase integration.

Acceptance verifies exact columns, public/owner/admin RLS, metadata privilege injection, protected fields, profile/address validation, malformed quantities, inactive parents, rollback on stock/coupon/expected-total errors, totals/rounding/shipping threshold, replay conflicts, immutable snapshots, cross-account isolation, repeated cancellation, admin transitions, last-admin guard, disabled accounts, function grants/search paths, restrictive FKs and Storage metadata/policies.

### Concurrent PostgreSQL sessions

After migration/seed/rollback acceptance in a fresh disposable database, configure `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` and local authentication, then:

```sh
node supabase/tests/run-concurrency.mjs
```

`PSQL` optionally selects an absolute executable; on this Windows environment it was `C:/Program Files/PostgreSQL/18/bin/psql.exe`. This Node-builtins-only runner creates **committed disposable fixtures** and requires a fresh database per run. It launches overlapping sessions to verify last-stock contention, last-coupon contention with disjoint variants, identical/conflicting replays, double cancellation and concurrent admin self-demotion. Keep its database local and discard it through your normal disposable-database lifecycle.

### Verification and remaining deployment checks

On September 8, 2026, migration + seed + rollback acceptance executed against fresh local PostgreSQL 18 with explicit stubs. Sequential acceptance and all six overlapping stock/coupon/replay/cancellation/last-admin checks passed. Rerunning the seed inserted zero rows and did not reset live fixture inventory. No hosted credentials were used. Docker's daemon was unavailable; this was not a full Supabase integration run.

Before release, repeat on real local/staging Supabase: sign in as two real users/admin/disabled user; exercise REST RLS and all RPCs with real JWTs; confirm stale expected totals create no orders; upload allowed images and reject >5 MiB/forbidden MIME as admin; reject nonadmin uploads; test public image reads; verify SMTP/redirects/recovery; inspect logs and backup restoration. Never infer payment settlement from checkout success or a UI redirect.
