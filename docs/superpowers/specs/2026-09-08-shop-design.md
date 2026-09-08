# Apex Velocity shop design

Approved: retain the sports UI and React/TanStack Start; use Supabase PostgreSQL/Auth/Storage and Vercel. COD and manually verified bank transfers only.

Public catalog: search, categories, sorting, product variants. Customers: registration, login, recovery, profile, addresses, cart, transactional checkout, own orders and pending-order cancellation. Admins: dashboard, categories, products, variants, inventory, coupons, orders, customers and subscriptions. Preserve order history.

RLS enforces ownership and roles from protected profiles, never mutable auth metadata. Checkout RPC locks stock/coupons, recomputes prices and shipping, stores immutable snapshots and decrements stock atomically. Request IDs prevent duplicate orders. Privileged order transitions and role changes use protected RPCs. Storage permits only admin image writes.

Retain Barlow, orange accents, monochrome surfaces and photography. Missing ENV must show setup guidance and never fake authentication/payment. Remove generator integration from the current tree without rewriting Git history. Deliver migration, seed, env template and deployment/acceptance instructions. Live Supabase and deployment verification require user credentials.

Run typecheck, lint, build, browser checks and database integration checks where available. Existing repository has no automated suite; do not add a new test framework.
