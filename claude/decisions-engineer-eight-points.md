# Engineer's eight architecture points: status and open discussion (2026-11-06)

The engineer sent eight points (WhatsApp, Tuesday 03-11-2026, 8:37-11:51 pm). This doc records where each one stands and what is still open to discuss with him.

Related docs: decisions-public-id-uuid, decisions-api-security, decisions-saas-tenancy, reference-server-paging-public-id, checklist-paging-publicid-testing.

## Status

| # | Engineer's point (as sent) | Status | Doc |
|---|---|---|---|
| 1 | "Implement server side pagination in all pages" | **Mostly done (second pass 06-11).** The big lists page on the server, plus every list that grows with business data: all Settings lists (General, Account, Service, Product, Client), Membership Status, Opening Stock, Product Pricing. Kept in the browser on purpose: fixed setup lists (Infrastructure, roles, departments, designations, membership cards / policies, VAT rates), user assignments, Rack Management, 5 Account Settings lists with browser-built tabs, and the Check / MFS / POS reconciliation work queues (deferred). | reference-server-paging-public-id, checklist-paging-publicid-testing |
| 2 | "Implement guid edit not by number" | **Done in code** for every module: links, the address bar, view, edit and delete use the uuid (PublicId). Still on numbers: approve, post, cancel, restore and history calls, the id inside save (PUT) requests, and `by-id/{id}` routes used by boards and print documents. **Follow-up started 06-11:** Procurement (Purchases, Purchase Orders) now save and run every action by uuid; restore / history need no id. Other modules next, see checklist. Each table needs its `Database\*_PublicId.sql` run first (a list shows "Unable to Load Data" / 500 until it is). | decisions-public-id-uuid |
| 3 | "Need to implement cors policy" | **Code written** (`AppCore.API\Security\...`, `Program.cs`); waiting for build and test. Only listed addresses may call the API (localhost:4100 by default). | decisions-api-security |
| 4 | "Need to implement rate limiting" | **Code written**; waiting for build and test. Limits per user / IP, logins, wrong passwords, heavy tasks (backup, restore, reset). | decisions-api-security |
| 5 | "Data type of PostgreSQL uuid data type stores 128-bit UUIDs" | **Done.** Column type `uuid`, filled by `uuidv7()` (time-ordered, keeps indexes fast). | decisions-public-id-uuid |
| 6 | "Use primary key as uuid, not number" | **Not done - by decision (05-11).** Each in-scope table has a uuid used outside the system; joins and foreign keys keep the number inside. With one database per dealer a full key rewrite costs a lot and gains nothing. Reopen only for a concrete need (offline entry, external sync). | decisions-public-id-uuid |
| 7 | "For saas architecture, need to add one column named tenant_id in all tables of erp database" | **Replaced by a different design - not built.** One database per dealer (model C) instead of one shared database with tenant_id. Dealers can never see each other's data; backup, restore and moving are per dealer. tenant_id lives only in the control database, audit logs and support tools. | decisions-saas-tenancy |
| 8 | "Need another table named tenant for onboarding companies as subscribers" | **Planned - not built.** `Tenants` table plus TenantDomains, Plans / Subscriptions, SubscriptionPayments, TenantSchemaVersions and OnboardingRuns, in a separate control database `AppCore_Control`. | decisions-saas-tenancy |

## To discuss with the engineer
1. **Point 6 (uuid as primary key).** Show why the uuid sits beside the number instead of replacing it. Agree or decide now: changing keys after dealers go live is very expensive.
2. **Point 7 (tenant_id in every table).** Show model C (database per dealer) against his shared-database design: isolation, per-dealer backup / restore, no risk of a missed tenant filter, about 150-250 dealer databases per PostgreSQL server with PgBouncer. Agree before any SaaS code is written.
3. **Point 1 (all pages).** Every growing list is now server-paged; is keeping the fixed setup lists and the reconciliation work queues in the browser acceptable to him?
4. **Point 2 (remaining numbers).** Agree whether approve / post / cancel / restore / history and save ids must also move to uuids (planned as a follow-up, module by module).

## Suggested order (owner's choice, 06-11)
1. Owner: run every `*_PublicId.sql`, build, test with the checklist (points 1-5), including CORS and rate limiting.
2. One conversation with the engineer on points 6 and 7 (and 1 and 2 above).
3. Finish point 2: action calls and save ids by uuid, module by module.
4. Points 7 and 8: control database, Tenants, tenant from subdomain, onboarding - before a second dealer goes live.
5. Point 1 for the small lists, only if the engineer insists.