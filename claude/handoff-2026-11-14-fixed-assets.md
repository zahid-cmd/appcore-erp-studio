# Session handoff (2026-11-14 evening) : Final Accounts done, Fixed Assets next

The owner continues in **Claude Code** on the PC (repo root `F:\AppCore_ERP_Studio`).
Read, in order :
1. this file;
2. `claude\blueprint-fixed-assets.md` (the next module : design + owner answers, section 10);
3. `claude\blueprint-final-accounts.md` (what was just built, for patterns and open items).

## Working rules (owner, standing)
- **Never read, open or print `appsettings.json` or any real token.**
- Discuss bigger designs before coding; small direct UI requests are done at once.
- Always list the **new / changed / deleted files with their full paths** at the end of a task. Full files, no zips.
- Commands the owner runs : **cmd**, not PowerShell.
- Source files keep **CRLF** line endings.
- Another session may edit the same files : re-read a file right before changing it; never overwrite from an old copy.
- **SQL** scripts go in `Backend_Studio\Database\`, **ASCII only** (database is WIN1252), start with `ROLLBACK;`, re-runnable (skip what exists). Navigation scripts find the module by route key and never create the module (the owner creates it on the Navigation page).
- UI : compact, shared components (PageHeader, CommandCenter, SearchBox, SearchDropdown, Datepicker, Toast, OrbitLoader), **no window / page scroll** (only areas inside a canvas scroll). List command center : Add, Refresh, Restore | divider | History; row buttons : page-specific first, then eye / pen / trash; no per-row history.
- Angular 22 standalone, signals, zoneless (pages use the `refreshView()` renderTick + detectChanges pattern), `@if` / `@for`. .NET + EF Core + Npgsql (PostgreSQL).
- Code Sync generates CRUD pages from templates (see `reference-code-sync-templates` in the Claude project) : run the sync with the baseline first, then replace the generated files; keep generated names / namespaces / paths. Hand-written read-only pages (reports) skip Code Sync.
- Domain entity files live in `AppCore.Domain\<Module>\<Menu>\<Entity>.cs` (no `Entities` folder) but keep the namespace `AppCore.Domain.Entities.<Module>.<Menu>`.

## Final Accounts : done (2026-11-14), owner testing later
Accounts & Finance › Financial Statements : Trial Balance (existing) + Profit & Loss, Balance Sheet, Cash Flow Statement, Changes in Equity, Receipt & Payment Account, Daily Collection Statement, Invoice-wise Profit & Loss.
- Backend : `AppCore.Application\AccountsFinance\FinancialStatements\` (FinalAccountsDtos, FinancialFlowsDtos, DailyStatementsDtos + interfaces), `AppCore.Infrastructure\Repositories\AccountsFinance\FinancialStatements\` (FinalAccountsRepository, FinancialFlowsRepository, DailyStatementsRepository : all built on `ITrialBalanceRepository`), controllers in `AppCore.API\Controllers\AccountsFinance\FinancialStatements\`, DI lines in `DependencyInjection.cs`.
- Frontend : `Frontend_Studio\Studio_UI\src\features\accounts-finance\financial-statements\` (models, services, shared base `fa-statement-page.ts`, shared css, one folder per page, prints in `print\`; keys in `shared\print\print-registry.ts`).
- SQL (owner to run if not yet) : `FinalAccounts_Navigation.sql`, `FinancialFlows_Navigation.sql`, `DailyStatements_Navigation.sql`; then Activity Assignment View / Print on the 7 pages.
- Not compiled by Claude (no .NET SDK there). If the build shows errors in these files, fix them first.
- Open items (owner decides later) : "Against invoice" pick on Receipt Vouchers; Balance Sheet current / non-current split and exact Cash Flow investing / financing (Account Group tick — Fixed Assets categories can feed this); service cost class; Changes in Equity comparison; Ledger Statements allotment-aware branch list; free accessories with a bike are not posted yet (MB invoice gift step paused) — post them on the invoice journal or with ReferenceNo = invoice no and Invoice-wise P&L counts them.

## Fixed Assets Management : next
- Blueprint : `claude\blueprint-fixed-assets.md`. Owner answers (2026-11-14) : both depreciation methods per category; full month of use (charge from the put-to-use month, none in the month of disposal); own **Asset Acquisition** page (posts the voucher, creates the cards); one card per item, group card with quantity allowed; current assets **already in the ledgers** (Opening Assets = cards + depreciation to date, no voucher); accounting book only; **six menus** : Asset Setup · Asset Register · Asset Movements · Depreciation · Asset Disposal · Asset Reports.
- **Owner was reviewing the blueprint before step 1.** Ask for any changes, then :
  - Step 1 : Asset Setup (Asset Categories with method / rate or life / residual % / 4 ledgers by code, Asset Locations, Asset Configuration switches + numbering), Asset Register (Asset Acquisitions, Fixed Asset Register cards, Opening Assets).
  - Step 2 : Depreciation Runs (monthly per branch, preview → post one JV per branch, undo last run) + Depreciation Schedule.
  - Step 3 : Transfers, Improvements, Disposals (gain / loss), Maintenance.
  - Step 4 : Fixed Asset Schedule report, Asset Tags (QR), Asset Verification.
- Before step 1 the owner creates the module on the Navigation page : name **Fixed Assets Management**, route key `fixed-assets-management`. Then Claude writes `Backend_Studio\Database\FixedAssets_Navigation.sql` (menus / submenus by route key; submenu names must be unique across the system), the owner runs it and Menu / Submenu Sync, then Code Sync for the CRUD pages, then the real files replace the generated ones. **After Module Sync, check that the `AUTO-BEGIN : MOD-xxx` route block landed inside the LayoutComponent children, not under the website route** (known engine bug).
- Postings go through the existing voucher posting service (`VoucherEntries`) so Trial Balance / Balance Sheet / Cash Flow pick them up; ledgers are always read by code; defaults via Posting Setup purposes.
