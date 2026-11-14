# Blueprint : Final Accounts (Accounts & Finance › Financial Statements) — draft 2026-11-14

Status: **approved 2026-11-14. Step 1 (Profit & Loss + Balance Sheet) built and written to the PC 2026-11-14; not yet built / run by the owner.** Step 2 (Changes in Equity, Receipt & Payment, Cash Flow) built and written to the PC 2026-11-14; not yet built / run by the owner. Step 3 (Daily Collection, Invoice-wise Daily P&L) built and written to the PC 2026-11-14; not yet built / run by the owner. All seven pages are built. Builds on `decisions-trial-balance.md` (Trial Balance, built 2026-11-06).

## Owner answers (2026-11-14 16:39)
- **Pages (all under Financial Statements, after Trial Balance):**
  1. Profit & Loss
  2. Balance Sheet
  3. Cash Flow Statement
  4. Changes in Equity
  5. Receipt & Payment Account
  6. Daily Collection Statement
  7. Invoice-wise Daily Profit & Loss (Motor Bikes / Spare Parts / Accessories)
- **Profit & Loss layout:** both, with a switch. Vertical step-by-step is the default; the Trading + P&L Account (T-form, Dr / Cr sides) comes from the toggle.
- **Comparison:** switchable : None · Same period last year · Previous period of the same length. It shows the change in amount and %. It applies to the Profit & Loss and the Balance Sheet.
- **Gross profit by business line:** yes, a panel under the Profit & Loss.

## 1. One engine underneath (no new posting rules)
- **Source:** every statement reads the posted vouchers (VoucherEntries), exactly as the Trial Balance does.
  - The new statements call the Trial Balance engine (`TrialBalanceRepository`) for the per-ledger Opening / Period / Closing, then group and add up.
  - So the Profit & Loss, the Balance Sheet and the Trial Balance can never disagree.
- **Shared rules:**
  - **Branch:** a picker with one allotted branch or "All Allotted Branches".
  - **Cancelled vouchers:** left out unless "Show cancelled" is on.
  - **Dates** are on the voucher date.
  - **Income / expense:** the same class words as the Trial Balance (income, revenue, sale, expense, expenditure, cost); they reset each financial year.
  - **Retained Earnings:** Posting Setup `RETAINED-EARNINGS`, holding the earlier years' result.
- **Branch to business line:**
  - Motor Bikes : CLS-005 Motor Bike Sales, plus the COGS ledgers of Motor Bikes categories.
  - Spare Parts & Lubricants : CLS-006 Spare Parts Sale, plus their COGS.
  - Accessories : CLS-008 Accessories Sale, plus their COGS.
  - Service : CLS-007 Service Income.
  - A COGS ledger finds its line through the product category that owns its group number (`COGS-001-ggg-…` = `INV-001-ggg-…` of the category; CategoryType gives the line).
- **Page frame (same as the Trial Balance):**
  - command center : Refresh, Print (Excel from the print viewer);
  - a left filter with Submit;
  - a switch bar that needs no reload;
  - a head card with the key figures;
  - level picker Class / Group / Sub Group / Ledger, Expand / Collapse all, Show codes, Show zero rows;
  - a ledger row opens its Ledger Statement with the same period and branch.

## 2. Profit & Loss
- **Filter:**
  - From / To (default : the financial year start → today);
  - Branch;
  - Compare : None / Same period last year / Previous period;
  - Show cancelled.
- **Vertical view (default):**
  1. **Sales** : one line per sales class (Motor Bike Sales, Spare Parts Sale, Accessories Sale, Service Income), each opening down to Group › Sub Group › Ledger. Sales discounts and returns sit inside their classes as posted, so the figure is the net sales.
  2. **Cost of Goods Sold** (COGS-001).
  3. **= Gross Profit**, with the gross margin %.
  4. **Other Income** (CLS-009).
  5. **Operating Expenses** (CLS-004), by group (salaries, rent, bank charges…).
  6. **= Net Profit / Net Loss**, with the net margin %. Shown green for a profit, red for a loss.
- **T-form view (Trading + Profit & Loss Account):**
  - **Trading Account:** Dr side = Cost of Goods Sold and Gross Profit c/d; Cr side = Sales. Inventory is perpetual (posted through INV / COGS), so there are no opening / closing stock lines.
  - **Profit & Loss Account:** Dr side = Expenses and Net Profit; Cr side = Gross Profit b/d and Other Income.
- **Comparison columns:** This period · Comparison period · Change · Change %.
- **Panel "Gross profit by business line":**
  - one row per line : Sales · Cost of Goods Sold · Gross Profit · Margin %, plus the total;
  - a small bar chart of the four lines;
  - Service has no cost of goods (labour only), so its margin is 100 % unless a service cost class is added later.
- **Head card figures:** Sales · Gross Profit · Net Profit, each with its margin.

## 3. Balance Sheet
- **Filter:**
  - As on date (default : today);
  - Branch;
  - Compare : None / Same date last year / End of the previous financial year;
  - Show cancelled.
- **Layout (vertical):**
  - **Assets** : CLS-002 Asset, INV-001 Inventory, WIP-001 Work In Progress, by group.
  - **Liabilities** : CLS-003 Liability, by group.
  - **Equity** : CLS-001 Equity, by group. Retained Earnings already includes the earlier years.
  - **Profit for the year to date** : the not-yet-closed income − expense from the year start to the date. It goes under Equity, as its own line, until year-end closing posts it.
  - **Check line:** "Assets = Liabilities + Equity". It shows green Balanced, or the red difference (the same difference as the Trial Balance).
- **Customers and suppliers:**
  - Customer ledgers show under Assets as Trade Receivables; supplier ledgers under Liabilities as Trade Payables. They come from wherever their class puts them.
  - A customer with a credit balance stays under Assets as a negative; there is no reclassification in v1.
- **Current / non-current split** is an open question (section 9).

## 4. Changes in Equity
- **Filter:** From / To, Branch.
- **Columns:** one per equity group (e.g. Capital · Reserve & Surplus), plus Profit for the year and Total.
- **Rows:**
  - Opening balance at From;
  - Profit / loss for the period (from the Profit & Loss);
  - Capital introduced (credits to Capital ledgers);
  - Drawings / withdrawals (debits);
  - Other movements (anything else posted to equity ledgers, by voucher type);
  - Closing balance at To. It must equal the Balance Sheet's equity at To, and a check line shows that.

## 5. Cash Flow Statement (direct method)
- **Cash & cash equivalents:** every Cash, Bank and MFS ledger.
  - POS and EMI accounts count until the money is settled into the bank; this is open question 4 (section 9).
- **How it works:** every voucher line that moves cash is classified by the other ledgers on the same voucher (the contra side):
  - **Operating:** customers, sales, income, suppliers, expenses, VAT, salaries, inventory.
  - **Investing:** fixed-asset groups under CLS-002.
  - **Financing:** Equity (capital, drawings) and loan groups under CLS-003.
  - **Transfers between cash and bank** (fund transfer, deposits) cancel out and are not shown.
- **Layout:**
  - Opening cash & bank;
  - Net cash from Operating / Investing / Financing, each opening into its lines (Received from customers, Paid to suppliers, Paid for expenses, VAT paid…);
  - Net change;
  - Closing cash & bank, with a check against the ledgers' closing balance.
- **Fixed assets and loans:** these groups are found by group name words (fixed asset, property, equipment, vehicle, furniture, loan, borrowing), unless the owner prefers a tick on Account Groups (open question 2).

## 6. Receipt & Payment Account
- The classic two-sided summary of cash and bank for a period.
- **Dr (Receipts) side:** Opening balances (each Cash / Bank / MFS ledger), then every receipt grouped by the ledger it came from (Sales, Customer receipts, Other income…).
- **Cr (Payments) side:** every payment grouped by the ledger it went to (Suppliers, Expenses, Salaries, VAT…), then Closing balances.
- Both sides total the same.
- **Switches:** group level (Class / Group / Ledger), Show codes.
- Fund transfers between cash and bank are shown as contra lines, or hidden with a switch (default hidden).

## 7. Daily Collection Statement
- **Purpose:** what came in each day, and how.
- **Filter:**
  - From / To (default : today);
  - Branch;
  - Collected by (user, optional);
  - Business line (All / MB / SP / AC / Service / Other).
- **Main table, one row per day:**
  - Cash · Bank (cheque / deposit) · MFS · POS (card) · EMI · Total;
  - the day's refunds (negative);
  - the net collection.
- **Day detail (click a day):** every receipt of that day, with Time · Document (invoice / receipt voucher / booking / membership…) · Customer · Mode · Account · Amount · Collected by.
- **Totals panel:**
  - per mode;
  - per business line;
  - per source document type (Sales invoices, Receipt vouchers, Bookings, Service, Membership, Registration fees).
- **Source:** voucher debits to Cash / Bank / MFS / POS / EMI ledgers, linked back to their document through the voucher's source.

## 8. Invoice-wise Daily Profit & Loss (MB / SP / AC)
- **Three tabs, one per line:** Motor Bikes / Spare Parts & Lubricants / Accessories.
- **Filter:** From / To (default : today), Branch, Customer (optional), Sales person (optional).
- **One row per sales invoice:**
  - Date · Invoice No · Customer · Items (count, or chassis for MB);
  - Sales (net of discounts, without VAT) · Cost (FIFO batch cost of the items sold) · Gross Profit · Margin %;
  - Discount given (shown separately).
- **Day subtotal rows,** then the grand total. The day subtotals add up to the Profit & Loss "by business line" panel for the same period (it shows a check line).
- **Motor Bikes:**
  - gift / free accessories given with the bike count as cost of that invoice;
  - registration and other fees collected for third parties are left out (they are not income);
  - membership and service income stay out (they are not product sales).
- **Sales returns** in the period show as negative rows on their own date, linked to the original invoice.
- **Click an invoice:** the lines inside, each with Qty · Rate · Discount · Net · Unit cost · Cost · Profit.
- **Cost rule:** the cost is what the stock movement of the sale carried (its batch's cost), the same figure the COGS voucher posted.

## 9. Owner answers to the open questions (2026-11-14)
- **Balance Sheet split : none for now** (Class › Group as in the chart). Cash Flow uses group-name words.
- **POS / EMI : collected on the sale day** (their own columns; cash equivalents in the Cash Flow).
- **Collected by : the user who saved the receipt.**
- **Build : start step 1.**

### The questions as asked
1. **Balance Sheet current / non-current split:**
   - (a) just Class › Group as the chart has them (v1, no setup), or
   - (b) a "Statement line" tick on Account Groups (Current Asset / Non-current Asset / Current Liability / Long-term Liability…) for a textbook layout.
2. **Cash Flow classification:**
   - by group-name words (no setup), or
   - the same Account Group tick as 1(b), with Operating / Investing / Financing.
3. **Daily Collection "Collected by":** the user who saved the receipt (voucher creator).
4. **POS / EMI money:** count it as collected on the sale day (it is in the POS / EMI ledger), or only when settled into the bank?

## 10. Build order (each step on the owner's go)
1. **Shared engine + Profit & Loss** (both views, comparison, business-line panel) + **Balance Sheet** + navigation SQL (menu items under Financial Statements) + print layouts.
2. **Changes in Equity** + **Receipt & Payment Account** + **Cash Flow Statement**.
3. **Daily Collection Statement** + **Invoice-wise Daily Profit & Loss**.

Each page:
- **API:** `api/accounts-finance/financial-statements/<page>`, with read-only GETs and the same branch check as the Trial Balance.
- **Frontend:** `src/features/accounts-finance/financial-statements/<page>/`, with a print key in the print registry.
- **SQL:** the menu / page rows in one navigation script, `FinalAccounts_Navigation.sql`.

## 11. Step 1 as built (2026-11-14)
- **API** `api/accounts-finance/financial-statements` (`FinalAccountsController`):
  - `GET year?date=` : the financial year that holds the date (P&L From default).
  - `GET profit-loss?from&to&branchId&showCancelled&compare` (none / last-year / previous).
  - `GET balance-sheet?asOn&branchId&showCancelled&compare` (none / last-year / year-end).
  - Branches come from the Trial Balance list (`trial-balance/branches`).
- **Engine:** `FinalAccountsRepository` calls `ITrialBalanceRepository` once per period / date (twice with a comparison).
  - P&L rows = income / expense ledgers, period Dr / Cr. Section by class : `COGS-` or "cost of" → cogs; income/revenue/sale + "other" → other income; income/revenue/sale → sales; else expense.
  - Sales line from the class name words (accessor / spare, lubric, part / service / bike, motor). COGS line from `ProductCategory.CogsGroupCode` → `CategoryType` (group or sub group code), else the same words.
  - "Previous period" : whole months stay whole months (1 Jul–30 Sep → 1 Apr–30 Jun), else the same number of days just before.
  - Balance Sheet : TB with From = To = the date. Section : INV/WIP → asset; equity/capital/reserve; liabilit/payable/loan/borrow; asset/receivable/inventor/stock/progress; else by mode. Retained Earnings → equity. Profit to date = −Σ nominal closings. Difference = the TB difference.
  - A period across two financial years gives a note (figures are the total of both).
- **Pages** (`financial-statements/profit-loss`, `/balance-sheet`, shared base `shared/fa-statement-page.ts`, styles `shared/final-accounts.css` on top of `trial-balance.css`):
  - P&L : filter From (FY start from the server) / To / Branch / Compare (radio list) / switches (cancelled, codes, zero rows, business-line panel); bar Vertical / T-form + level; head Sales · Gross Profit % · Net Profit % (green / red); vertical table with section headings, Gross / Net Profit bands with "% of sales", compare columns (comparison · change · change %, green = better, red = worse); T-form = Trading + P&L Account, Dr / Cr side by side, totals equal; right panel "Gross profit by business line" (bars, sales, cost, margin; under the table below 1280px).
  - Balance Sheet : As on / Branch / Compare; Assets, Liabilities, Equity. **Owner rule (2026-11-14) : the profit / loss for the year to date sits inside the Retained Earnings ledger** (its class / group / sub group totals carry it; at Ledger level an italic line "incl. profit / loss for the year to date" shows under Retained Earnings). A separate Equity line only when Retained Earnings is not set on Posting Setup. The server always sends the Retained Earnings row, even with no postings, "Total Liabilities & Equity" band and the check line; head Total Assets · Liabilities & Equity · Difference.
  - Ledger rows open the Ledger Statement in a new tab (P&L : same period; BS : FY start → date).
- **Print:** `print/final-accounts.print.ts`, keys `profit-loss` and `balance-sheet` (registry); P&L prints the chosen layout + business lines; Excel always vertical (+ business lines).
- **SQL:** `Database\FinalAccounts_Navigation.sql` : pages Profit & Loss (order 2) and Balance Sheet (order 3) under Financial Statements, activities copied from Trial Balance. Tested twice on a scratch PG (re-runnable).
- **Changed:** `DependencyInjection.cs` (one AddScoped after Trial Balance), `financial-statements.routes.ts`, `shared/print/print-registry.ts`.
- **Limits:** no current / non-current split; a customer with a credit balance stays under Assets as a negative; service margin is 100 % (no service cost class).

## 12. Step 2 as built (2026-11-14)
- **API** `FinancialFlowsController` (same base route):
  - `GET cash-flows?from&to&branchId&showCancelled` : one answer for the Receipt & Payment Account and the Cash Flow Statement.
  - `GET changes-in-equity?from&to&branchId&showCancelled`.
- **Cash engine** (`FinancialFlowsRepository`):
  - Cash & cash equivalents = posted lines whose LedgerType is Cash / Bank / MFS / POS / EMI.
  - Each voucher of the period that touches one : net per ledger; money in = Σ cash Dr − Cr. The part that moved between two cash ledgers on the voucher is a **transfer** (contra).
  - The net in / out is shared over the other side's non-cash ledgers in proportion (money in → the credited ledgers, money out → the debited ledgers). No such ledger → "No contra ledger on the voucher".
  - Opening / closing of the cash ledgers come from the Trial Balance of the same period; Difference = Opening + Receipts − Payments − Closing (0 expected).
  - Activity by group-name words : equity/capital class, loan/borrow/lease/debenture → financing; asset class with fixed asset/property/plant/equipment/machinery/vehicle/furniture/fixture/building/land/investment → investing; else operating.
- **Changes in Equity** : equity ledgers (Balance Sheet rule), credit side positive. Retained Earnings opening = TB opening (incl. earlier years) + this year's result before From; the period's result is its Profit; credits = introduced, debits = drawings. Checked against Balance Sheet equity at To (incl. profit to date). Retained Earnings missing → a "Profit & Loss (Retained Earnings not set)" line.
- **Pages:**
  - Cash Flow Statement (`cash-flow`, default FY start → today) : Opening cash (by type › ledger), Operating / Investing / Financing (Received · Paid · Net, tree of contra ledgers to the level), the three nets, net increase / decrease, Closing cash, check line.
  - Changes in Equity (`changes-in-equity`, default FY start → today) : matrix (one column per equity group, * = holds Retained Earnings, + Total; rows Opening, Profit / (loss), Capital introduced, Drawings, Closing), Balance Sheet check, "With ledgers" table.
  - Receipt & Payment Account (`receipt-payment`, default this month) : Dr Receipts | Cr Payments side by side : Opening balances (by account switch), receipts / payments by contra ledger tree, contra transfers (switch, default hidden), Closing balances; totals agree.
- **Print** `print/financial-flows.print.ts`, keys `receipt-payment`, `cash-flow`, `changes-in-equity` (header / styles shared from `final-accounts.print.ts`, now exported).
- **SQL** `Database\FinancialFlows_Navigation.sql` : Cash Flow Statement (4), Changes in Equity (5), Receipt & Payment Account (6), activities copied from Trial Balance; tested twice.
- **Limit:** a voucher that pays several contra ledgers is shared in proportion, so a mixed voucher (e.g. sale with a partial receipt) shows the receipt against the sales ledgers, not the customer.

## 13. Step 3 as built (2026-11-14)
- **API** `DailyStatementsController` (same base route) : `GET daily-collection` and `GET invoice-profit` (`?from&to&branchId&showCancelled`, empty dates = today).
- **Daily Collection** (`DailyStatementsRepository`) :
  - every voucher of the period touching a Cash / Bank / MFS / POS / EMI line; transfers between two cash ledgers on it are not collections;
  - money in = a collection, split into Cash · Bank · MFS · POS · EMI by the cash ledgers it went to;
  - money out counts only as a **refund** (negative) when it went to a customer ledger, a sales ledger, or on a sales return (SR...); other payments are left out;
  - document = the voucher's ReferenceNo (an invoice's receipt RV carries the invoice number), else the voucher; kind from its letters (SIMB = Sales Invoice - MB, RV = Receipt Voucher ...);
  - business line : MB / SP / AC from the document prefix, else the sales class of the other side (service / other);
  - collected by = VoucherEntries.PostedBy → UserProfile name; time = PostedDate + 6 h.
- **Page** (`daily-collection`, default today) : filter + Collected by / Business line (no reload); By day (Cash · Bank · MFS · POS · EMI · Collected · Refunds · Net, a day opens its receipts) or Every receipt; sticky total; totals panel by mode, business line, document, collector.
- **Invoice-wise Daily P&L** : vouchers SIMB / SISP / SIAC / SRMB / SRSP / SRAC (the invoice number is its voucher number). From the journal with the P&L section rule : Sales (sales classes), Discount (expense ledgers on it), Other (other-income ledgers), Net sales = Sales − Discount + Other, Cost (COGS), Profit, Margin = Profit / Net sales. Returns negative on their own date. Customer / sales person / quantity / chassis and the lines (qty, rate, discount, net without VAT, unit cost, cost, profit) from the invoice and return tables.
- **Page** (`invoice-profit`, default today) : tabs Motor Bikes / Spare Parts & Lubricants / Accessories with counts; Sales person (no reload); day heading, document rows (open = lines), day total, sticky grand total.
- **Print** `print/daily-statements.print.ts`, keys `daily-collection`, `invoice-profit`.
- **SQL** `Database\DailyStatements_Navigation.sql` : pages 7 and 8, activities from Trial Balance; tested twice.
- **Not done (blueprint 8) :** gifts given with a bike count as cost only when they are posted on the invoice's own journal; the "day subtotals = P&L business-line panel" check line is not shown.

## 14. Daily Collection business line : owner decision (2026-11-14 18:4x)
- **A now :** money with no line splits into **Customer receipts (no invoice)** (a Receipt Voucher crediting a customer ledger : due collection, advance) and **Other money in** (loan, capital, interest ...). MB / SP / AC show only money that is certainly theirs (the receipt carries the invoice number, or credits a sales class).
- **C later (pending) :** an "Against invoice" pick on Receipt Vouchers, so a due collection carries the invoice number and falls under its line exactly.
- Option B (guess the line from the customer's invoices) was not chosen.

## 15. Finishing pass (2026-11-14 19:1x)
- **Invoice-wise P&L : linked vouchers.** Later non-money vouchers whose ReferenceNo is an invoice of the period are added to that invoice (expense → Discount, which now reads "discount / promotion", COGS → Cost, sales / other income as such); the row shows "+ n linked voucher(s)". Receipts (any money line) are left out.
  - **Free accessories with a bike are not posted anywhere yet** (decisions-bike-accessories-gifts step 5 is still paused). When that posting is built, post it either on the invoice's own journal or with ReferenceNo = the invoice number : the page then counts it automatically.
- **Invoice-wise P&L : check line** under the head card : the Profit & Loss sales / COGS of the same line and period (server `Checks`, same business-line rule as the P&L panel) vs the invoices of the tab → green "Agrees with the invoices" or amber "Not on invoices : Sales x · Cost y" (sales / cost posted by a JV or a ledger not linked to the line). Hidden while a sales person or search filters the list; also on the print.
- **P&L and Balance Sheet : Compare with** on one row (None / Last year / Previous, Year end on the BS); the full name shows under it.
- **Not done (needs an owner decision) :** Ledger Statements from "All Allotted Branches" still shows every branch. Ledger Statements itself has no allotment rule (its branch list is all branches), so the fix belongs to that page : make Ledger Statements / registers allotment-aware.
