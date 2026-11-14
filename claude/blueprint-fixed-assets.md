# Blueprint : Fixed Assets Management (new module) — draft 2026-11-14

Status : **owner answers 2026-11-14 19:2x recorded (section 10); the owner is reviewing the full blueprint before step 1. Nothing built.** Module to be created by the owner on the Navigation page (name "Fixed Assets Management", route key `fixed-assets-management`); the navigation script then adds menus / submenus by route key.

## 1. What it covers (dealer context)
- Showroom and workshop assets : furniture & fixtures, computers & IT, office equipment, workshop tools & machinery, generators / ACs, vehicles (delivery van, demo / company bikes), building renovation and interior, land / building when owned.
- From buying an asset to retiring it : register → depreciate every month → move / repair / improve → sell or write off.
- Everything posts to the books through the normal voucher engine (VoucherEntries), so the Trial Balance, Balance Sheet, Cash Flow (investing) and Ledger Statements show it at once.

## 2. Menus and submenus (proposal)
| # | Menu (route key) | Submenus (route key) |
|---|---|---|
| 1 | Asset Setup (asset-setup) | Asset Categories (asset-categories) · Asset Locations (asset-locations) · Asset Configuration (asset-configuration : switches, numbering, rules) |
| 2 | Asset Register (asset-register) | Asset Acquisitions (asset-acquisitions) · Fixed Asset Register (fixed-asset-register : the asset cards) · Opening Assets (opening-assets) |
| 3 | Asset Movements (asset-movements) | Asset Transfers (asset-transfers) · Asset Improvements (asset-improvements : added cost) · Asset Maintenance (asset-maintenance : repairs log, AMC, insurance, warranty) |
| 4 | Depreciation (depreciation) | Depreciation Runs (depreciation-runs) · Depreciation Schedule (depreciation-schedule : per asset, read only) |
| 5 | Asset Disposal (asset-disposal) | Asset Disposals (asset-disposals : sale / scrap / write-off / lost) |
| 6 | Asset Reports (asset-reports) | Fixed Asset Schedule (fixed-asset-schedule) · Asset Tags (asset-tags : QR labels) · Asset Verification (asset-verification : physical count) |

## 3. Asset Categories (the accounting rules live here)
- Code, name, parent group (e.g. Furniture & Fixtures › Showroom Furniture).
- Depreciation : method, rate % or useful life (years), residual value %, start rule.
- Ledgers (four, by code) :
  - Asset Cost ledger (CLS-002 › fixed asset group);
  - Accumulated Depreciation ledger (contra asset, Cr);
  - Depreciation Expense ledger (CLS-004);
  - Gain / Loss on Disposal ledgers (Other Income / Expense).
- Capitalisation threshold (e.g. items below Tk 5,000 are expensed, not registered) : optional.
- Tagging : one card per unit, or one card for a group with quantity.

## 4. Asset card (Fixed Asset Register)
- Asset No (FA-<branch>-<category>-00001), name, category, description, brand / model / serial no, photo + documents (invoice, warranty card).
- Branch, location (showroom floor, workshop, office), custodian (employee from HR), department.
- Supplier, purchase invoice / voucher no, purchase date, put-to-use date.
- Cost (+ improvements), residual value, method, rate / life (from the category; may be changed per asset before the first run).
- Running figures : accumulated depreciation, net book value, last run, months used, months left.
- Status : Draft · In Use · Idle · Under Repair · Disposed · Written Off · Lost.
- History : every transfer, improvement, repair, run and disposal.

## 5. Postings (through the voucher engine)
| Event | Debit | Credit |
|---|---|---|
| Acquisition (bought on credit) | Asset Cost | Supplier |
| Acquisition (paid now) | Asset Cost | Cash / Bank / MFS |
| Opening asset (migration) | Asset Cost | Accumulated Depreciation (to date) + Opening Balance / Retained Earnings ledger (NBV) |
| Improvement (adds value) | Asset Cost | Supplier / Cash / Bank |
| Monthly depreciation | Depreciation Expense | Accumulated Depreciation |
| Transfer to another branch | (new branch) Asset Cost, (old branch) Accumulated Depreciation | (old branch) Asset Cost, (new branch) Accumulated Depreciation — cost and depreciation move together |
| Sale | Cash / Bank / Customer (price) + Accumulated Depreciation | Asset Cost + Gain on Disposal (or Dr Loss) |
| Scrap / write-off / lost | Accumulated Depreciation + Loss on Disposal | Asset Cost |
| Repair / maintenance (no added value) | Repair & Maintenance expense | Cash / Bank / Supplier (not capitalised) |

## 6. Depreciation run
- Monthly, per branch (or all allotted), for one month at a time, in order (no gaps; cannot run a month twice).
- Preview first : every asset with cost, opening accumulated, this month's charge, closing, NBV; assets that reach the residual stop.
- Post : one Journal Voucher per branch (one line pair per category); the run is locked; **Undo last run** reverses it while no later run exists.
- Disposal in the middle of a month : depreciation up to the disposal date (rule per question 2).

## 7. Reports
- **Fixed Asset Schedule** (the notes-to-accounts table) : per category — Cost : opening, additions, disposals, transfers, closing; Depreciation : opening, charge, on disposals, closing; NBV opening / closing. Print / Excel.
- Depreciation Schedule per asset (month by month, to the end of its life).
- Assets by branch / location / custodian; idle and fully-depreciated assets; disposals with gain / loss.
- Asset Tags : QR / barcode labels (asset no, name, branch) for sticking on the item; scanning opens the card.
- Asset Verification : physical count per location against the register (found / missing / extra).

## 8. Links to what exists
- Ledgers by code, Posting Setup purposes for defaults (e.g. ASSET-DISPOSAL-GAIN / LOSS).
- Payment Vouchers / Supplier : acquisitions post through the same engine (a supplier due appears in Supplier statements).
- HR : custodian = employee.
- Final accounts : the Cash Flow can read the category ledgers to put asset buys / sales under **Investing exactly** (replacing the group-name words).

## 9. Questions for the owner
1. Depreciation method : straight-line, reducing balance, or both (chosen per category)?
2. When does depreciation start / stop : full month of purchase, from the next month, or day by day (pro-rata)?
3. How does an asset come in : its own **Asset Acquisition** document (posts the voucher and creates the cards), or capitalised from an existing Payment Voucher / supplier bill?
4. One card per unit (each chair / each computer, with tags) or allow one card for a group with a quantity?
5. Opening assets : do the current assets already sit in a ledger (cost and accumulated depreciation posted), or should Opening Assets post them?
6. Tax depreciation (Bangladesh Income Tax Third Schedule rates) as a second book, or accounting book only for now?
7. Menus : agree with the six menus above, or fewer (e.g. merge Asset Movements into Asset Register)?
8. Build order proposal : Step 1 Setup + Register + Acquisitions + Opening Assets; Step 2 Depreciation Runs + Schedule; Step 3 Transfers / Improvements / Disposals; Step 4 Reports, Tags, Verification, Maintenance.

## 10. Owner answers (2026-11-14)
1. **Method : both, per category** (straight-line or reducing balance chosen on each Asset Category).
2. **Start / stop : full month of use** : charged from the put-to-use month; no charge in the month it is sold / scrapped.
3. **Acquisition : its own Asset Acquisition page** (supplier or cash payment, items, cost) : posts the voucher and creates the cards.
4. **Cards : one per item, a group card with a quantity allowed** for small items (chairs, etc.).
5. **Opening : the current assets are already in the ledgers** : Opening Assets creates the cards and their depreciation to date, matched to the ledger balances, with **no new voucher**.
6. **Accounting book only** for now (no tax book).
7. **Six menus as proposed.**
8. Build order : the owner reviews this blueprint first, then step 1.
