# Checklist: server paging + PublicId (test later, owner 2026-11-05)

The owner is entering real data now, so pages are written without waiting for a test. Test each page later and tick it here.

**Before testing:** run every `Database\<Table>_PublicId.sql` listed below (rerun-safe; the check query must show two equal numbers), rebuild the API, refresh the UI.

**Standard test for a page**
1. List loads; the summary line below the canvas shows the counts.
2. Tabs / filters change the rows and the counts the way the note says.
3. Search (wait 300 ms), including names from other tables (category, brand ...).
4. Sort every sortable column both ways; page sizes 10 / 20 / 50 / 100; last page after a delete.
5. View / Edit / Add / Delete: the address bar shows a uuid (PublicId pages only).
6. Page-specific items below.

**Small-list pages ("client" in the Paging column):** the list still loads all rows and filters in the browser; only PublicId links and the summary line (Total / Active / Inactive of all records) were added. For these, test 1 and 5: open, edit, save, delete, add (the new row must open by uuid).

| Module | Page | Paging | PublicId | SQL | Extra checks | Tested |
|---|---|---|---|---|---|---|
| Settings › Client | Customer Profiles | ✅ | ✅ | CustomerProfiles_PublicId.sql | - | ✅ |
| Settings › Client | Supplier Profiles | ✅ | ✅ | SupplierProfiles_PublicId.sql | - | ✅ |
| Settings › Product | Spare Parts & Lubricants | ✅ | ✅ | SpareParts_PublicId.sql | SP / LB tabs; search by warehouse / rack; Movement sorts fastest first; locations in the form | ⬜ |
| Settings › Product | Accessories | ✅ | ✅ | Accessories_PublicId.sql | locations in the form | ⬜ |
| Settings › Product | Motor Bikes | ✅ | ✅ | MotorBikes_PublicId.sql | add / remove photo on new and existing bikes; search by color | ⬜ |
| Settings › Product | Colors | ✅ | ✅ | ColorManagements_PublicId.sql | - | ⬜ |
| Settings › Product | Product Categories | ✅ | ✅ | ProductCategories_PublicId.sql | status filter; name "<Type> - <Brand>" (other session's change kept) | ⬜ |
| Settings › Product | Product Sub Categories | ✅ | ✅ | ProductSubCategories_PublicId.sql | status filter; Category column now from the server (sortable, searchable) | ⬜ |
| Settings › Product | Brands | ✅ | ✅ | BrandManagements_PublicId.sql | brand image upload / delete on new and existing brands; search by supplier | ⬜ |
| Settings › Service | Service Categories | ✅ | ✅ | ServiceCategories_PublicId.sql |  category type tabs on the server; status filter; summary = Total / Active / Inactive with search + filters (server counts) | ⬜ |
| Settings › Service | Service Sub Categories | ✅ | ✅ | ServiceSubCategories_PublicId.sql |  sub category type tabs on the server; status filter; summary = Total / Active / Inactive with search + filters (server counts) | ⬜ |
| Settings › Service | Customized Services | ✅ | ✅ | CustomizedServices_PublicId.sql |  sub category filter on the server | ⬜ |
| Settings › Service | Labor Chart | ✅ | ✅ | LaborCharts_PublicId.sql |  brand / section filters on the server; brand names synced before each page | ⬜ |
| Settings › Service | Membership Services | ✅ | ✅ | MembershipServices_PublicId.sql |  card / readiness filters (rows built on the server, then paged); default order = card rank | ⬜ |
| Settings › Service | Scheduled Services | ✅ | ✅ | ScheduledServices_PublicId.sql |  readiness tabs + brand filter on the server; Configure (PUT by uuid); default order = brand, sequence | ⬜ |
| Settings › Service | Service Policies | ✅ | ✅ | ServicePolicies_PublicId.sql |  rows built on the server (live ledger names), then paged | ⬜ |
| Settings › Account | Account Classes | ✅ | ✅ | AccountClasses_PublicId.sql |  view / edit from the list; status filter; summary = Total / Active / Inactive with search + filters (server counts) | ⬜ |
| Settings › Account | Account Groups | client | ✅ | AccountGroups_PublicId.sql | auto tabs still read only | ⬜ |
| Settings › Account | Account Sub Groups | client | ✅ | AccountSubGroups_PublicId.sql | auto tabs still read only | ⬜ |
| Settings › Account | Bank Setup | ✅ | ✅ | BankSetup_PublicId.sql |  Active = Status on; status filter; summary = Total / Active / Inactive with search + filters (server counts) | ⬜ |
| Settings › Account | Bank Accounts | ✅ | ✅ | BankAccounts_PublicId.sql |  branch filter on the server; delete from the list | ⬜ |
| Settings › Account | Card Setup | ✅ | ✅ | CardSetup_PublicId.sql |  status filter; summary = Total / Active / Inactive with search + filters (server counts) | ⬜ |
| Settings › Account | Cash Accounts | ✅ | ✅ | CashAccounts_PublicId.sql |  branch filter on the server; delete from the list | ⬜ |
| Settings › Account | EMI Accounts | client | ✅ | EmiAccounts_PublicId.sql | platform tabs; "platform already used" check in the form | ⬜ |
| Settings › Account | EMI Reimbursement Schemes | client | ✅ | EmiReimbursementSchemes_PublicId.sql | active / expired tabs | ⬜ |
| Settings › Account | MFS Accounts | ✅ | ✅ | MFSAccounts_PublicId.sql |  branch filter on the server; open / delete from the list | ⬜ |
| Settings › Account | POS Accounts | ✅ | ✅ | POSAccounts_PublicId.sql |  branch filter on the server; search by linked bank account | ✅ |
| Settings › Account | Card Charges | client | ✅ (POS Account's uuid) | - (uses POSAccounts_PublicId.sql) | view / edit / delete from the list; add still picks the POS account | ⬜ |
| Settings › Account | General Ledgers | ✅ | ✅ | GeneralLedgers_PublicId.sql | 3 tabs split on the server by ledger code (Auto Accounts registry); class / group / sub group filters offer only what the tab holds; summary = tab + filters + search; auto tabs read only | ⬜ |
| Settings › General | Company | ✅ | ✅ | Companies_PublicId.sql | logo upload on new and existing company | ⬜ |
| Settings › General | Wings | ✅ | ✅ | Wings_PublicId.sql | - | ⬜ |
| Settings › General | Branches | ✅ | ✅ | Branches_PublicId.sql | new branch still creates its warehouse; view / edit from the list (empty id in the address bar fixed 06-11) | ⬜ |
| Settings › General | Warehouses | ✅ | ✅ | Warehouses_PublicId.sql |  wing / branch filters on the server; status filter; summary = Total / Active / Inactive with search + filters (server counts) | ⬜ |
| Settings › General | Locations | ✅ | ✅ | Locations_PublicId.sql |  division / district filters on the server; status filter; summary = Total / Active / Inactive with search + filters (server counts) | ⬜ |
| Settings › General | Financial Years | ✅ | ✅ | FinancialYears_PublicId.sql |  newest first by default; year status filter; open / delete from the list ("Missing Id" toast must not show) | ⬜ |
| Settings › General | Business Configuration | - | not changed | - | overview page, not a record list | - |
| Settings › General | System Configurations | cards (unchanged) | ✅ edit link / get / delete / create | SystemConfigurations_PublicId.sql | edit from a card opens by uuid; on/off switches, Review & Apply and approvals still use the internal id (not in links) | ⬜ |
| Settings › General | Website Configuration / Backup Center | - | not changed | - | special pages, no record links | - |
| Infrastructure › App Config | Dashboards | client | ✅ | Dashboards_PublicId.sql | - | ⬜ |
| Infrastructure › App Config | Login Pages | client | ✅ | LoginPages_PublicId.sql | login pages 1-5 still load by internal id (by-id route) | ⬜ |
| Infrastructure › App Config | Widget Configuration | client | ✅ | WidgetConfigurations_PublicId.sql | - | ⬜ |
| Infrastructure › Code | Deployment Center | client | ✅ | DeploymentCenter_PublicId.sql | - | ⬜ |
| Infrastructure › Code | Server Management | client | ✅ | ServerManagement_PublicId.sql | - | ⬜ |
| Infrastructure › Code | Source Control | client | ✅ | SourceControl_PublicId.sql | Git operation page still loads by internal id (by-id route) | ⬜ |
| Infrastructure › Components | Application / Control / Layout / Utility Components | client | ✅ | one *_PublicId.sql each | card pages: summary line sits under the cards | ⬜ |
| Infrastructure › Components | Default DB / Role Based DB Components | client | ✅ | one *_PublicId.sql each | card pages: summary line sits under the cards | ⬜ |
| Infrastructure › Login | Core / Sub-ordinate Components | client | ✅ | one *_PublicId.sql each | login pages read Sub-ordinate by internal id (by-id route) | ⬜ |
| Infrastructure › Navigation | Modules | client | ✅ | NavigationModules_PublicId.sql | view / edit / delete from the list; dropdowns, sidebar and sync pages keep the internal id | ⬜ |
| Infrastructure › Navigation | Menus | client | ✅ | NavigationMenus_PublicId.sql | same as Modules | ⬜ |
| Infrastructure › Navigation | Submenus | client | ✅ | NavigationSubmenus_PublicId.sql | same as Modules | ⬜ |
| Infrastructure › Navigation | Master Activities | client | ✅ | MasterActivities_PublicId.sql | same as Modules | ⬜ |
| Security › Role | Role Profiles | client | ✅ | RoleProfiles_PublicId.sql | Dashboards form still lists role profiles | ⬜ |
| Security › Role | Activity Assignments | client | ✅ | ActivityAssignments_PublicId.sql | edit: save keeps the same record; delete from the form | ⬜ |
| Security › User | User Profiles | ✅ | ✅ | UserProfiles_PublicId.sql | search / sort on the server (Primary Role too); summary = search applied; photo upload / remove on new and existing users; top bar + welcome widgets still show the signed-in user (by-id route) | ⬜ |
| Security › User | Branch Assignments | client | ✅ | BranchAssignments_PublicId.sql | edit: save keeps the same record; delete from the form | ⬜ |
| Security › User | Role Assignments | client | ✅ | RoleAssignments_PublicId.sql | same as Branch Assignments | ⬜ |
| Security › User | Special Assignments | client | ✅ | SpecialAssignments_PublicId.sql | same as Branch Assignments (PUT still by internal id, not in links) | ⬜ |
| HR › Setup | Departments | client | ✅ | Departments_PublicId.sql | edit: save keeps the same record | ⬜ |
| HR › Setup | Designations | client | ✅ | Designations_PublicId.sql | edit: save keeps the same record; User Profile form still lists designations | ⬜ |
| Membership › Setup | Membership Cards | client | ✅ | MembershipCards_PublicId.sql | edit: save keeps the same record (ledgers / complimentary service untouched) | ⬜ |
| Membership › Setup | Membership Policies | client | ✅ | MembershipPolicies_PublicId.sql | edit: save keeps the same record | ⬜ |
| Membership › Assignment | Membership Status | ✅ | ✅ | MembershipStatus_PublicId.sql |  tabs Pending / Active / Expired / Suspended / Cancelled counted on the server; card filter lists every card; search by membership no, chassis, engine, card, customer code / name, bike; summary = card + search applied; window use / undo / approve still work after opening by uuid | ⬜ |
| Membership › Assignment | Membership Fees Collection | client | ✅ | MembershipFeesCollection_Table.sql then MembershipFeesCollection_PublicId.sql | page is still the cloned template; save / restore still by internal id (not in links) | ⬜ |
| Inventory › Store Setup | Rack Management | client | ✅ | RackManagements_PublicId.sql | summary = Total / Active / Inactive; rack map / zones / labels still load (internal id inside the form) | ⬜ |
| Inventory › Store Setup | Opening Stock | ✅ | ✅ | OpeningStock_PublicId.sql |  tabs Draft / Posted / Cancelled and type buttons counted on the server; date search 25-10-2026; search by branch, warehouse, ledger; Lines / Quantity / Value sort; newest first; print from list and form | ⬜ |
| Inventory › Pricing | Product Pricing | ✅ | ✅ | ProductPricing_PublicId.sql |  same as Opening Stock; search by supplier / purchase no too | ⬜ |
| Inventory › Pricing | Price Adjustment | ✅ | ✅ | PriceAdjustments_PublicId.sql | type buttons count live documents (search applied); Deleted tab + row Restore; Restore command restores the newest deleted draft; date search 25-10-2026; summary = Total / Draft / Posted / Cancelled | ⬜ |
| Inventory › Stock Movement | Mass Storing | ✅ | ✅ | MassStorings_PublicId.sql | same as Price Adjustment; search by warehouse name | ⬜ |
| Inventory › Stock Movement | Product Transfer | ✅ | ✅ | ProductTransfers_PublicId.sql | same as Price Adjustment; tabs In Transit / Completed / Received; search by from / to warehouse; summary shows each status | ⬜ |
| Inventory › Receiving | Motor Bike / Spare Parts & Lubricants / Accessories Receiving (one shared list) | ✅ | ✅ | MotorBikeReceiving_ / SparePartsLubricantsReceiving_ / AccessoriesReceiving_PublicId.sql | each page shows only its own receivings; Lines column sorts; search by purchase no, supplier, invoice, 6.3, warehouse; summary = Total / Posted / Cancelled | ⬜ |
| Procurement | Purchase Orders (MB / SP / AC, one shared list) | ✅ | ✅ | PurchaseOrdersMb_ / Sp_ / Ac_PublicId.sql | tabs Draft / Approved / Placed / Completed / Closed (Closed Short + Cancelled) counted on the server; supplier filter now comes from the server (all suppliers on the page, not only this page of rows); date search 25-10-2026 matches order or expected date; print from the form opens by uuid | ⬜ |
| Procurement | Purchases (MB / SP / AC, one shared list) | ✅ | ✅ | PurchasesMb_ / Sp_ / Ac_PublicId.sql | tabs Draft / Approved / Posted / Cancelled; search by invoice, Mushak, DO, gate pass, voucher no, PO no; date search matches purchase, invoice or Mushak date; print from the form opens by uuid | ⬜ |
| Procurement | Purchase Returns (MB / SP / AC) | client | ✅ | PurchaseReturnsMb_ / Sp_ / Ac_PublicId.sql | still the cloned template page (table may not exist yet: the SQL then only prints a notice) | ⬜ |
| Procurement | Purchase Adjustments (MB / SP / AC) | client | ✅ | PurchaseAdjustmentsMb_ / Sp_ / Ac_PublicId.sql | same as Purchase Returns | ⬜ |
| VAT › VAT Setup | Purchase VAT | client | ✅ | PurchaseVat_PublicId.sql | summary = Total / Active / Inactive (Active = Status on); Extend and Restore unchanged; purchase forms still read the rate (rate route unchanged) | ⬜ |
| VAT › VAT Setup | Sales VAT | client | ✅ | SalesVat_PublicId.sql | same as Purchase VAT | ⬜ |
| Sales › Spare Parts & Lubricants | Sales Invoices (shared list) | ✅ | ✅ | SalesInvoicesSp_PublicId.sql | tabs Draft / Approved / Posted / Cancelled counted on the server; search by invoice no, customer name / code / phone / type, warehouse, sales person, "walk-in", date 25-10-2026; Lines column sorts; "N invoices · Due Tk" on the toolbar = all pages (tab + search); after save / post the Print / Receipt links on the list notice open by uuid; Print After Posting opens by uuid | ⬜ |
| Accounts › Reconciliation | Check Reconciliations | client | ✅ print links | ReceiptVoucherPayments_ / PaymentVoucherPayments_ / CheckReconciliationVouchers_ / CheckDepositSlips_PublicId.sql | Print Preview of a check opens /print-viewer/check-received/<uuid> (issued too) with all its documents; after Deposit the slip print and after Clear / Dishonour the voucher print open by uuid | ⬜ |
| Accounts › Reconciliation | MFS Reconciliations | client | ✅ print links | MfsReconciliationVouchers_PublicId.sql (+ ReceiptVoucherPayments) | Print Preview opens /print-viewer/mfs-received/<uuid>; after Settle / Reject the voucher print opens by uuid | ⬜ |
| Accounts › Reconciliation | POS Reconciliations | client | ✅ print links | PosReconciliationVouchers_PublicId.sql (+ ReceiptVoucherPayments) | same as MFS (pos-received) | ⬜ |
| Accounts › Reconciliation | EMI Reconciliations | client | ✅ | EmiReconciliations_PublicId.sql | still the cloned template page | ⬜ |
| Accounts › Vouchers | Receipt Voucher | ✅ | ✅ | ReceiptVoucher_PublicId.sql | status tabs; ledger type filter; date search 25-10-2026; newest first | ⬜ |
| Accounts › Vouchers | Payment Voucher | ✅ | ✅ | PaymentVoucher_PublicId.sql | same as RV | ⬜ |
| Accounts › Vouchers | Journal Voucher | ✅ | ✅ | JournalVoucher_PublicId.sql | Groups column sorts; Mixed filter | ⬜ |
| Accounts › Vouchers | Fund Transfer | ✅ | ✅ | FundTransfer_PublicId.sql | From Cash / Bank / MFS filter; Transfer Type sorts | ⬜ |
| Enquiry › Profiles | Sales Enquiries | ✅ (rows built on the server, then filtered / paged) | ✅ | SalesEnquiries_PublicId.sql | tabs All / Open / Due / Lapsed / Matured / Suspended and the Website pill; interest chips count tab + search (server); search by mobile, model, colour, executive, "Unassigned", date 05-11-2026; sort every column (Due / Lapsed default oldest follow-up first); Print prints the whole view (all pages); Test Rides pill still lists on this page; the Test Rides board's "open enquiry" still works (by-id route); summary = Total / Open / Due Today / Lapsed / Matured / Suspended | ⬜ |
| Enquiry › Profiles | Service Enquiries | ✅ (same way) | ✅ | ServiceEnquiries_PublicId.sql | tabs All / Open / Due / Converted / Suspended, Website pill, Service / Parts chips (server counts); search by registration, chassis, part name / code; due service enquiries still raised on open / Refresh (not on every page change); Appointments and Sold Bikes pills unchanged; Appointments board's "open enquiry" works (by-id route); summary = Total / Open / Due / Converted / Suspended | ⬜ |
| Enquiry › Setup | Enquiry Setup | client | not changed | - | summary line under the list (Total / Active / Inactive of the open tab); it narrows with the list when the form panel opens | ⬜ |
| Infrastructure › Development | Module / Menu / Submenu Synchronization | client | ✅ | INF_ModuleSynchronization_ / INF_MenuSynchronization_ / INF_SubmenuSynchronization_PublicId.sql | view / edit / synchronize open by uuid; Analyze, Sync, Rollback still work after opening by uuid (internal id inside the form); summary = Total / Synchronized / Pending of the open tab | ⬜ |
| Infrastructure › Development | Code Synchronization / Page Cloning | client | no id in links | - | summary line only (Code: Total / Synchronized / Ready / Failed; Page Cloning: Total / Draft / Applied / Build Failed) | ⬜ |

**Infrastructure Control:** complete — PublicId and the summary line (Total / Active / Inactive of all records; Active = isActive or status) on all 18 record lists. Development Management added 06-11 (sync pages by uuid, summary lines). Data Reset / Backups excluded.

**Security & Permission:** complete — PublicId and the summary line on all 6 lists; User Profiles also server-paged. Forms load by the uuid from the address bar, then keep the record's internal id for save / photo calls.

**Human Resource:** complete — Departments and Designations (PublicId + summary line).

**Membership:** complete — Cards, Policies, Status, Fees Collection (PublicId + summary line).

**Inventory Management:** complete — PublicId on Rack Management, Opening Stock, Product Pricing, Price Adjustment, Mass Storing, Product Transfer and the 3 Receiving pages (form, list, print links and the print viewer accept uuids). Server paging on Price Adjustment, Mass Storing, Product Transfer and Receiving (tab / type / search / sort / page on the server; summary from the server counts). Stock-status pages, Product Ledgers, Barcode Management and Price List are reports — unchanged. Post / cancel / restore / history still use the internal id (not in links).

**Procurement:** complete — PublicId and the summary line on all 12 lists; Purchase Orders and Purchases server-paged (one shared list each for MB / SP / AC). Point 2 done 06-11 for Purchases and Purchase Orders: save and every action go by uuid (see the Point 2 table below). Purchase Returns / Adjustments are still template pages and keep the internal id.

**VAT:** complete — Purchase VAT and Sales VAT (PublicId + summary line).

**Sales:** complete — Sales Invoices (SP) PublicId, summary line and server paging. Approve / return to draft / post / cancel / restore still use the internal id (not in links).

**Accounts & Finance:** complete — Receipt / Payment / Journal Voucher and Fund Transfer open, edit, delete and print by uuid (their lists were already paged with a summary). Approve / post / cancel / restore still by internal id. The Check / MFS / POS reconciliation print documents still load the source voucher by its internal id (new route by-id/{id}) - test: print a Received check / MFS / POS document and see the source voucher on it. Step 2 done: the reconciliation print links (documents, deposit slips, reconciliation vouchers) use uuids; the actions (deposit / clear / settle ...) still send internal ids in the request body (not in links).

**Enquiry Management:** complete — Sales and Service Enquiries open, edit and delete by uuid with server paging and a summary line; Enquiry Setup got the summary line. Follow-ups, test rides and appointments are inside the enquiry pages and keep the internal id (boards open an enquiry through by-id/{id}). The server builds every live enquiry (interest by days left, stage) and then pages them - fine for thousands of rows; if the lists get very large this can move to SQL later.

**Data Reset (Settings groups)** — tested by the owner except: "Clear these too" after a Brands preview, WebsiteBrands / WebsiteBranchBrands rows removed with brands, Membership Cards group. ⬜

**Second pass (06-11): server paging for the small lists, module by module.** Settings › General (6 lists), Settings › Account (7 lists) and Settings › Service (7 lists) now page on the server (GET .../paged; summary from the server counts). Account Groups, Account Sub Groups, Card Charges, EMI Accounts and EMI Reimbursement Schemes stay client-paged on purpose (auto-code tabs worked out in the browser / rows already built in memory on the server). Owner chose (06-11) to server-page only the lists that grow with business data: done so far Membership Status, Opening Stock, Product Pricing. Kept client-paged on purpose: fixed setup lists (Infrastructure, Role Profiles, Departments, Designations, Membership Cards / Policies, Purchase / Sales VAT); Branch / Role / Special Assignments (one row per user, the list joins all user profiles in the browser); Rack Management (bounded by the store, rack map built from all racks); Membership Fees Collection and Purchase Returns / Adjustments (still cloned template pages). Check / MFS / POS Reconciliations deferred by the owner (06-11): they are work queues (status chips with counts, amount total, branch / wallet / bank filters built from the rows, undo counts across the whole voucher) and default to Open items only; revisit when check volume grows. EMI Reconciliations is still a template page. The second paging pass is complete.

**Module plan (module by module):** Settings (complete) → Infrastructure Control (complete) → Security & Permission (complete) → Human Resource (complete) → Membership (complete) → Inventory (complete) → Procurement (complete) → VAT (complete) → Sales (complete) → Accounts & Finance (complete) → Enquiry Management (complete). Service Operations has no pages yet. All modules done; Ledger / Auto Journal Registers and stock-status pages are reports (unchanged).

Rows are added here as each page is written (see reference-server-paging-public-id.md for the technical details).

## Point 2: actions and save by uuid (06-11, module by module)

Written to the PC 06-11, not yet built / tested. Rebuild the API and refresh the UI first. The old number routes (`{id}/approve` ...) are removed, so a page that still sends a number gets a 404.

**Standard test for point 2:** open a record by uuid, then: edit + save (the same record changes, no new row); every workflow button below; in the browser's Network tab the request address shows the uuid, never the number. Restore and History take no record id (restore = newest deleted; history = whole page) and are unchanged.

| Module | Page | Save (PUT) | Actions by uuid | Still a number (on purpose) | Tested |
|---|---|---|---|---|---|
| Procurement | Purchases (MB / SP / AC) | `PUT .../{uuid}` | approve (incl. approve + post), return to draft, post, cancel (reason) | linked PO no and line ids inside the body; Mushak / bike-number checks' "this purchase" id; open-orders keepOrderId | ⬜ |
| Procurement | Purchase Orders (MB / SP / AC) | `PUT .../{uuid}` | approve, return to draft, place, close short (reason), cancel (reason) | line ids inside the body | ⬜ |
| Procurement | Purchase Returns / Adjustments (MB / SP / AC) | - | - | template pages: wait until real | - |
| Inventory | Opening Stock | `PUT .../{uuid}` | post (incl. save + post), cancel (reason); record history `GET .../{uuid}/history` | the "this document" id in the bike-number check | ⬜ |
| Inventory | Receiving (MB / SP / AC) | - (saved = posted, no edit) | cancel (reason) | the purchase picked inside the body | ⬜ |
| Inventory | Product Pricing | `PUT .../{uuid}` | post (incl. save + post), cancel (reason); record history | - | ⬜ |
| Inventory | Price Adjustment | `PUT .../{uuid}` (create answers id + uuid) | post (incl. save + post), cancel, restore a deleted draft; record history | - | ⬜ |
| Inventory | Mass Storing | `PUT .../{uuid}` (create answers id + uuid) | post (incl. save + post), cancel, restore a deleted draft (both restore addresses); record history | - | ⬜ |
| Inventory | Product Transfer | `PUT .../{uuid}` (create answers id + uuid) | post (send), receive, cancel, restore a deleted draft; record history | - | ⬜ |
| Sales | Sales Invoices (SP / AC) | `PUT .../{uuid}` | approve, return to draft, post, cancel (reason) | product / customer ids inside the body | ⬜ |
| Sales | Sales Quotations / Returns (SP / AC) | - | - | template pages: wait until real | - |
| Accounts & Finance | Fund Transfer, Journal / Payment / Receipt Vouchers | `PUT .../{uuid}` (create already answered id + uuid) | approve (incl. approve + post when the switch is on), return to draft, post, cancel (date + reason) | `by-id/{id}` GET kept for the reconciliation print documents; account / ledger ids inside the body | ⬜ |
| Accounts & Finance | Check / MFS / POS Reconciliations | - (work queues, no draft to save) | none to change: deposit, clear, dishonour, re-present, void, settle, reject, undo, auto-run are bulk POSTs with the picked payment ids in the body; print links already open by uuid | the payment ids in the body; `vouchers/{id}` and `deposit-slips/{id}` GETs used inside the print documents (rows carry only the internal voucher id) | - |
| Accounts & Finance | EMI Reconciliations | - | - | template page: wait until real | - |
| HR | Departments, Designations | `PUT .../{uuid}` | - (no workflow) | - | ⬜ |
| VAT | Purchase VAT, Sales VAT | `PUT .../{uuid}` | extend (`PUT .../{uuid}/extend`) | - | ⬜ |
| Membership | Membership Cards, Membership Policies | `PUT .../{uuid}` | - | - | ⬜ |
| Membership | Membership Status | `PUT .../{uuid}` | free service: taken / undo taken / reschedule (`.../{uuid}/windows/{windowId}/...`) | the window id (a line inside the membership) | ⬜ |
| Security | Role Profiles | `PUT .../{uuid}` | - | - | ⬜ |
| Settings | Card Charges | unchanged | - | keyed by POS account (no own uuid) - left on purpose | - |
| Enquiry | Sales Enquiries, Service Enquiries | `PUT .../{uuid}` | record history `GET .../{uuid}/history` | follow-ups, test rides, appointments, service vehicles and `by-id/{id}` stay numbers (the boards open them) | ⬜ |
| Enquiry | Enquiry Setup | unchanged | - | the setup rows have no uuid column yet | - |
| Settings | Rack Management | `PUT .../{uuid}` | - | zones (`zones/{id}`) and the rack map (`{id}/bins`, used by other pages) stay numbers | ⬜ |
| Settings | System Configurations | `PUT .../{uuid}` | on / off `PUT .../{uuid}/enabled` | approve / reject requests (`requests/{id}`, a separate request row) | ⬜ |
| Settings | Business Configuration, Website Configuration | unchanged | - | single-setting pages, no uuid column | - |
| Security | Role / Branch / Activity / Special Assignments | `PUT .../{uuid}` | record history `GET .../{uuid}/history` | `user-profile/{id}` and `role-profile/{id}` lookups (pickers) | ⬜ |
| Security | User Profiles | `PUT .../{uuid}` | - | photo routes (`{id}/photo`, the welcome widget loads the photo by the user id) and `by-id/{id}` | ⬜ |

Files (06-11): `Backend_Studio\AppCore.API\Controllers\Procurement\Shared\PurchaseControllerBase.cs`, `...\PurchaseOrderControllerBase.cs`; `Frontend_Studio\Studio_UI\src\features\procurement\shared\purchase\purchase.service.ts`, `...\purchase\form\purchase-form.ts`, `...\purchase-order\purchase-order.service.ts`, `...\purchase-order\form\purchase-order-form.ts`.

Inventory batch 1 (07-11) : Opening Stock and the three Receiving pages - files : `Backend_Studio\AppCore.API\Controllers\InventoryManagement\StoreSetup\OpeningStockController.cs`, `...\ProductReceiving\ReceivingControllerBase.cs`; `Frontend_Studio\Studio_UI\src\features\inventory-management\store-setup\services\opening-stock.service.ts`, `...\store-setup\pages\opening-stock\form\opening-stock-form.ts`, `...\product-receiving\shared\receiving.service.ts`, `...\product-receiving\shared\form\receiving-form.ts`.

Inventory batch 2 (07-11) : Product Pricing, Price Adjustment, Mass Storing, Product Transfer - controllers in `Backend_Studio\AppCore.API\Controllers\InventoryManagement\PricingLabels\` and `...\StockMovement\`; services, forms and lists in `Frontend_Studio\Studio_UI\src\features\inventory-management\pricing-labels\` and `...\stock-movement\`. Test tip : save a NEW draft and post it in one go (save + post) - that path uses the uuid the create now returns.

Inventory is done for point 2.

Sales (07-11) : Sales Invoices SP / AC - `Backend_Studio\AppCore.API\Controllers\SalesOperations\Shared\SalesInvoiceControllerBase.cs`; `Frontend_Studio\Studio_UI\src\features\sales-operations\shared\sales-invoice\sales-invoice.service.ts`, `...\sales-invoice\form\sales-invoice-form.ts`.

Accounts & Finance batch 1 (07-11) : Fund Transfer, Journal / Payment / Receipt Vouchers - controllers in `Backend_Studio\AppCore.API\Controllers\AccountsFinance\VoucherManagement\`; services in `Frontend_Studio\Studio_UI\src\features\accounts-finance\voucher-management\services\` and forms in `...\voucher-management\pages\<page>\form\`. Open / delete were already by uuid and the lists needed no change. Test tip : after these, also open a voucher from a Check / MFS / POS reconciliation print (uses by-id) to make sure it still loads.

Accounts & Finance batch 2 (07-11) : checked, no code change - the reconciliation pages have no per-record actions (see the rows above). Accounts & Finance is done for point 2.

Rest batch A (07-11) : HR, VAT, Membership, Role Profiles - controllers `Backend_Studio\AppCore.API\Controllers\HumanResourceManangement\HumanResourceSetup\DepartmentController.cs`, `DesignationController.cs`; `...\VATManagement\VATSetup\PurchaseVATController.cs`, `SalesVATController.cs`; `...\MembershipManagement\MembershipSetup\MembershipCardsController.cs`, `MembershipPoliciesController.cs`; `...\MembershipManagement\MembershipAssignment\MembershipStatusController.cs`; `...\SecurityPermission\RoleManagement\RoleProfileController.cs`. Frontend : the matching `services\*.service.ts` and `pages\<page>\form\*-form.ts` under `Frontend_Studio\Studio_UI\src\features\human-resource-manangement\`, `vat-management\`, `membership-management\`, `security-permission\role-management\`. Test : edit + save each page; VAT : extend a rule; Membership Status : mark a free service taken, undo it, reschedule a lapsed one.

Rest batch B (07-11) : Sales / Service Enquiries, Rack Management, System Configurations, Role / Branch / Activity / Special Assignments, User Profiles. Controllers in `Backend_Studio\AppCore.API\Controllers\EnquiryManagement\EnquiryProfiles\`, `...\Settings\ProductSettings\RackManagementController.cs`, `...\Settings\GeneralSettings\SystemConfigurationsController.cs`, `...\SecurityPermission\UserManagement\` and `...\SecurityPermission\RoleManagement\ActivityAssignmentController.cs`. Frontend : the matching services and `form` pages (Rack Management form is under `inventory-management\store-setup\pages\rack-management\form\`; its service is `settings\product-settings\services\rack-management.service.ts`). Test : edit + save on each page; System Configurations : edit a switch in its form.

Next for point 2 (last) : Infrastructure tools - Navigation Module / Menu / Submenu, Master Activity, Widget Configuration (save by body id), Source Control (`{id}/pull`, `push`, `commit` ...). Developer-only pages; owner to decide if worth it.


## Night 06/07-11 : Inventory Status and Enquiry Dashboard (written to the PC, not yet tested)

Rebuild the API, refresh the UI, then test.

| Page | What changed | How to test | Tested |
|---|---|---|---|
| Motor Bike Stock > Models | Hover picture : the big number is On Hand (was Total); Colour column = motorcycle icon painted in the colour (name on hover); "Motor Bikes - " left out of the model | Hover an image; hover a colour icon; sort by Colour | ⬜ |
| Motor Bike Stock > Technical Records | Tab renamed (was Bike Units); columns Model, Colour, Purchase No, Stock In, then Chassis / Engine / Key / Battery; denser cells so every value shows whole | Check that no value is cut off | ⬜ |
| Motor Bike Stock > Technical Records | Edit Bike Numbers : pencil per row; live duplicate check as on Purchases / Receiving; save also updates transfer lines, barcode label lines and (sold bikes) service vehicle, memberships, service enquiries | Run `Backend_Studio\Database\InventoryStatus_EditBikeNumbers_Switches.sql`; switch ON `CFG-MOD-012-0090` (and `0091` for sold bikes); edit a number to one already used (error under the field), then to a free one and save | ⬜ |
| Motor Bike Stock | History button : Technical Record History, one card per edit ("Engine No Changed", old -> new per line, model, purchase, user) | Open History after an edit | ⬜ |
| System Configurations | Display Style : Classic / Card / List (List = one row per switch) | Click List; reload : the choice is remembered | ⬜ |
| Enquiry Dashboard (new page) | Period tabs, branch, executive; six figures; funnel, sources, interest, trend, top models, today's agenda, lost reasons, executives | Open Enquiry Management > Enquiry Profiles > Enquiry Dashboard (tick it in Activity Assignment if missing); change period / branch; click a figure and an agenda line | ⬜ |

Shared components touched (other pages should look the same) : `list-table` (dotIcon option, --list-cell-font / --list-cell-pad), `history-drawer.css` (description keeps line breaks).

## Source Control - git reliability fix (07-11)

File : `Backend_Studio\AppCore.Infrastructure\Repositories\InfrastructureControl\CodeManagement\SourceControlRepository.cs` (only `ExecuteGitCommandAsync` and four new helpers below it).

- One git command at a time per repository (no clash with itself).
- Auto retry x3 (0.7 s, 1.4 s) when git says the repo is busy: `index.lock`, another git process, file in use / permission denied. Fetch / pull / push retry only on lock errors.
- A `.git\index.lock` older than 10 minutes is removed (left by a crashed git).
- Git never waits for a console prompt (`GIT_TERMINAL_PROMPT=0`, stdin closed); time limit 2 min (local) / 5 min (fetch, pull, push), then stopped with a clear message.

| Test | Expected | Done |
|---|---|---|
| Commit with VS Code open on the repo (change a few files, commit at once) | first try succeeds; API console may show `[GIT] Busy repository ... retrying` | ⬜ |
| Pull when nothing changed locally | Pull Completed / Already up to date | ⬜ |
| Pull with local changes | Pull Blocked (by design - commit first) | ⬜ |
| Push after commit | Push Completed | ⬜ |
