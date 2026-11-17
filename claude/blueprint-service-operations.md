# Blueprint : Service Operations (workshop and service billing) — draft 2026-11-15

Status : **THE OWNER MARKED EVERYTHING BUILT BELOW AS TESTED ON 2026-11-17 (SQL run, pages tested on screen) : read every "not yet tested" in this line as tested. Owner answers 2026-11-15 recorded (section 11). Step 1 built 2026-11-15 (Workshop Configuration, Posting Setup purposes, Job Cards with technician time stamps and print; `ServiceOperations_Workshop_Engine.sql`), not yet tested on screen. Step 2 built 2026-11-16 (Service Estimates : made from a job card, versions, Draft / Sent / Approved / Rejected / Revised, the approved estimate replaces and locks the job card lines, switch Estimate Required, print; `ServiceOperations_Estimates_Engine.sql`), not yet tested on screen. Not in step 2 : an estimate from a service enquiry before the bike arrives, VAT on the estimate (prices are before VAT), outside work lines. Steps 3 - 6 built 2026-11-16, compile-checked only, not yet tested on screen and their SQL not yet run : step 3 Parts Requisitions / Issues / Returns / Back-Orders (FIFO stock out, journal Dr Workshop WIP / Cr inventory under WPI / WPR numbers, switch Issue without Requisition; `ServiceOperations_Parts_Engine.sql`); steps 4 - 5 Service Invoices (one per job card, priced by the server from the job card labour and the parts ISSUED, outside work lines typed on the invoice, VAT from VAT Setup, discount, collection by a posted Receipt Voucher, credit only with switch Credit on Service Invoices + page action Credit Sale, delivery closes the schedule line / the enquiry / the membership window, print key `service-invoice`), Service Returns (the whole invoice reversed) and Free Service Claims (per brand, settled under an FSC voucher) (`ServiceOperations_Billing_Engine.sql`); step 6 Workshop Dashboard and the five Service Reports, read-only (`ServiceOperations_Reports_Navigation.sql` adds the menu Service Reports). Step 7 (Warranty Management) : only Sales Warranty Records is built (read-only list of the records the bike delivery makes); Sales Warranty Claims, Manufacturer Claims, Service Warranty Records and Service Warranty Claims are NOT built : they need the owner's rules first (who approves a claim, what the manufacturer pays back and how it is posted, the warranty period of our own service work).** The module exists (route key `service-operations`); the menus Workshop Management and Service Billing are in `ServiceOperations_Navigation.sql` / `Operations_Restructure.sql`. Hand-written pages : never run Menu / Submenu / Code Sync.

## 1. What exists (stock-take 2026-11-15)
- **Working** : Service Setup (Service Category, Sub Category, Service Policy + schedule, Labor Chart, Scheduled Services, Customized Services, Chart of Services; files in `features/settings/service-settings`, every service owns its income ledger) · Service Enquiries / Follow-ups / Appointments (Enquiry Management) · Service Vehicles + schedules (made on a motor bike sale) · Bookings - SP, Sales Quotations / Invoices / Returns - SP (shared sales invoice engine) · Promotional Offers - Service Center · Membership Services + service windows · Warranty Configuration · Sales Warranty Records (made on delivery; page is a placeholder) · Posting Setup purpose `VAT-SV`.
- **Waiting for the job card** : `ServiceVehicleSchedules.TakenDocType / TakenDocNo`, `ServiceEnquiries.ConvertedDocType / Id / No`, `MembershipServiceWindows.UsedReference` ("manual until job cards exist").
- **Menu entry only** : Workshop Dashboard, Service Estimates, Job Cards, Parts Requisitions, Parts Issues, Parts Returns, Parts Back-Orders, Service Invoices, Service Returns, Free Service Claims, Workshop Configuration.
- **Placeholders ("coming next")** in Warranty Management : Warranty Dashboard, Sales Warranty Records / Claims, Manufacturer Claims, Service Warranty Records / Claims.

## 2. Flow
Appointment "Arrived" or walk-in → **Job Card** (the engineer writes the basic requirement) → **Service Estimate** (in most cases; the job card then follows it) → technicians work (time stamps) → **Parts Requisition / Issue** from the service center store → work done → QC → **Service Invoice** + collection → delivery.
Delivery closes the bike's schedule line (Taken), the service enquiry (Converted) and the membership window (Used) automatically.

## 3. Menus and submenus
| # | Menu (route key) | Submenus |
|---|---|---|
| 1 | Service Setup (service-setup) | existing 7 pages + **Workshop Configuration** (bays, technicians from HR, check-in checklist, switches) |
| 2 | Workshop Management (workshop-management) | Workshop Dashboard · Service Estimates · Job Cards · Parts Requisitions · Parts Issues · Parts Returns · Parts Back-Orders |
| 3 | Service Billing (service-billing) | Service Invoices · Service Returns · Free Service Claims |
| 4 | Service Reports (service-reports) **new** | Service History (per bike / customer) · Job Card Register · Technician Performance · Parts Consumption · Service Due List |

## 4. Job card
- Check-in : bike by chassis / registration / mobile (Service Vehicles; a bike not sold by us, any brand, is added at check-in), km, fuel level, customer complaints, basic requirement (engineer), check-in checklist, service advisor, promised delivery, pick-up / drop flag.
- Job type : Free Service · Paid Scheduled Service · General Repair · Warranty · Membership Free Service · Rework (free redo) · Internal (own stock bike).
- Lines : labour (Scheduled Services / Labor Chart / Customized Services), parts, outside work. When an estimate is approved the job card lines are taken from it and follow it; extra work = a revised estimate.
- Technicians : each labour line has one or more work entries (technician, bay, start, end); one technician may work on several jobs, each with its own time stamps.
- Status : Open → Estimated → In Progress → Waiting Parts → Work Done → Ready (QC) → Invoiced → Delivered; Cancelled.
- Print : job card through the Print Engine (operational header with QR).

## 5. Service Estimate
- **Changed by the owner on 2026-11-16 : the estimate is open, not job card driven.** It is made for a customer and a bike (found among the bikes the service center knows, or typed; the customer can be picked from Customer Profiles) : labour, parts, totals, validity.
- Status : Draft → Sent → Approved by customer / Rejected → Revised (new version); **Converted** when a job card was made from it (button Create Job Card : the job card starts with its customer, bike, labour and parts, and can be changed there).
- **Estimate Charge** : a customized service (Service Setup) selected in Workshop Configuration, with its rate and income ledger. The user decides each time whether to collect it (when the customer takes the estimate but not the service) : Cash / Bank / MFS, a Receipt Voucher, journal under the estimate number (Dr customer receivable, Cr income, Cr VAT). A collected charge comes off the service invoice if the estimate later becomes a job card.
- **Printed only when the Estimate Charge was collected or a job card was made from it** (or no charge is set).
- Switch **A job card only from an estimate** (was Estimate Required) : ON = a paying job card is made from an estimate only, work and parts issue start when it was made from one; OFF = optional.
- SQL : `ServiceOperations_Estimates_Open.sql` (after the Workshop and Estimates engines).
- **Observations and diagnoses (owner, 2026-11-16; built, marked tested by the owner 2026-11-17).** Workshop Configuration has the tabs **Observations** (OBS-0001 : the problems of a bike) and **Diagnoses** (DGN-0001 : what was found; for one observation or any; can suggest labour and parts). The estimate has the tab **Observations** : pick an observation, pick its diagnosis, write a note. Switch **A diagnosis puts its labour and parts on the estimate** (Workshop Configuration, off by default) : ON = picking a diagnosis adds its suggested lines at the catalogue rates (lines already there are left alone). Page action **Add Observation** on Service Estimates : who has it can add a new observation or diagnosis to the lists from the estimate. The observations are printed on the estimate and become the complaints of the job card ("Observation : Diagnosis"). SQL : `ServiceOperations_Diagnosis_Engine.sql` (after `ServiceOperations_Estimates_Open.sql`). Open, not decided : diagnosis on the job card itself (the owner said "need more discussion").

## 6. Parts
- **Parts Requisition** : the technician / advisor asks the store for parts of a job card (filled from the estimate).
- **Parts Issue** : the store issues FIFO batches from the service center's spare parts warehouse; stock goes out, cost moves to Workshop WIP. Switch **Issue without Requisition** : ON = direct issue on the job card.
- **Parts Return** : unused parts back to the same batches.
- **Parts Back-Orders** : requested parts not in stock, for procurement.

- **Parts Outsourcing (owner, 2026-11-17; built, compile-checked, not tested, SQL `ServiceOperations_Outsourced_Parts.sql` not run yet).** A part the store cannot give is bought from a local vendor for ONE job card : no PO, no PI, no stock. Entry on the job card, tab Parts Needed, button Parts Outsourcing (a saved card only) : the part is one of the product lists (the same branded part) or typed; the vendor is a Supplier Profile or a typed name; purchase rate and selling rate. Posted at once under WOP : Dr Workshop WIP, Cr the supplier's payable ledger (typed vendor : Posting Setup OUTSOURCED-PARTS-PAYABLE). Nothing is paid there (Payment Voucher later). The service invoice bills it at the selling rate and moves the cost to cost of goods sold (typed part : Posting Setup OUTSOURCED-PARTS-COST, income = Other Service Income). Selling rate starts at the price of Price Setup; above it only with the page action Sell Above MRP on Job Cards. Cancel reverses the journal, not after the invoice. Table JobCardOutsourcedParts, files `WorkshopOutsourcedParts*.cs`. The button Typed Part keeps the old typed line (no vendor, no cost). On the estimate Outside Works / Parts Outsourcing are still typed quote lines. Not built : a register report of outsourced parts; vendor and cost for Outside Works on the job card (owner did not answer).

## 7. Service Invoice and credit
- One invoice per job card, its own document (parts stock already moved at issue), using the same voucher, VAT and receipt services as the sales invoices.
- Free service : only the designated service charge of that schedule position is waived for the customer; spare parts, lubricants and any other service are billed.
- Paid at delivery. Credit : only with approval of a manager / owner, controlled by a system switch the same way as the sales invoice pages.
- VAT : from VAT Setup under VAT Management (purpose `VAT-SV` for services, `VAT-SP` for parts).
- Service Return : reverses an invoice (parts back to stock, journal reversed).
- Free Service Claims : the waived free service charges collected per brand into a claim; settlement by receipt or adjustment against the brand's supplier account.

## 8. Postings (through the voucher engine, ledgers from Posting Setup)
| Event | Debit | Credit |
|---|---|---|
| Parts issued to a job card | Workshop WIP | Spare Parts Inventory (FIFO cost) |
| Parts returned to store | Spare Parts Inventory | Workshop WIP |
| Service invoice : sale | Customer receivable; discounts | each service's income ledger; Spare Parts Sales; VAT |
| Service invoice : cost | Cost of Goods Sold | Workshop WIP |
| Collection (Receipt Voucher) | Cash / Bank / MFS | Customer receivable |
| Free service charge waived | Brand free service claim ledger (Service Policy) | Scheduled service income (brand reimbursement) |
| Brand settles a claim | Bank, or the brand's supplier account | Brand free service claim ledger |
| Membership free service | Membership service expense ledger | Membership service income ledger |
| Outside work | Outside Work ledger (Posting Setup) | Vendor / Cash |
| Internal job | Workshop expense | Workshop WIP |

New Posting Setup purposes : Workshop WIP, Outside Work (owner creates the ledger and selects it), Outside Work Income, service discounts.

## 9. Tables
- Setup : WorkshopBays, WorkshopTechnicians, WorkshopChecklistItems.
- Job card : JobCards, JobCardComplaints, JobCardServices, JobCardWorkEntries (technician time stamps), JobCardParts, JobCardOutsideWorks, JobCardChecklist, JobCardStatusHistory.
- Estimate : ServiceEstimates, ServiceEstimateLines.
- Parts : PartsRequisitions (+ lines), PartsIssues (+ lines), PartsReturns (+ lines), PartsBackOrders.
- Billing : ServiceInvoices (+ lines, payments), ServiceReturns (+ lines), FreeServiceClaims (+ lines).

## 10. Build order
1. Workshop Configuration + Posting Setup purposes + Job Cards (check-in, lines, technician time stamps, print).
2. Service Estimates (the job card follows the approved estimate).
3. Parts Requisitions, Issues, Returns, Back-Orders (stock + WIP).
4. Service Invoices, collection, credit approval, delivery, Service Returns; closing of schedule / enquiry / membership window.
5. Free Service Claims, outside work.
6. Workshop Dashboard and Service Reports.
7. Warranty Management pages (service / sales warranty claims, manufacturer claims) : separate step.

## 11. Owner answers (2026-11-15)
1. **Outside bikes : yes** (any bike can be serviced).
2. **Estimate in most cases** : the engineer puts the basic requirement on the job card; once the estimate is made the job card follows it.
3. **Parts accounting : Workshop WIP** at issue.
4. **Free service : only the designated service charge is waived** for the customer; not spare parts, not lubricants, not other services.
5. **Both ways, configurable** by page-level / system switch (Estimate Required; Issue without Requisition).
6. **A technician can work on more than one job, with time stamps.**
7. **Outside work : yes**; the owner creates a ledger and selects it in Posting Setup.
8. **Paid at delivery; credit only on manager / owner approval**, controlled by a system switch as on the sales pages.
9. **The service center controls the workshop** (its branch, its spare parts store). **VAT follows VAT Setup** under VAT Management.
10. **Extras : as recommended** : pick-up / drop as a flag on the job card (charge = a Customized Service line); washing = a Customized Service; a "Ready for delivery" list in the app first; SMS and insurance / accident jobs later.

## 12. Assumed (not answered; change if wrong)
- The brand settles a free service claim either by payment or by adjustment against purchase dues : the Free Service Claims page allows both.
- No technician incentive to payroll for now; the time stamps feed the Technician Performance report so it can be added later.
- No advance on the job card in the first build; collection is on the service invoice.
- Estimate Charge (2026-11-16) : its amount is not changed on the estimate (the rate of the service); collecting it needs a Customer Profiles customer (posted to the receivable ledger); a collection cannot be cancelled from the estimate; the job card lines are no longer locked by an estimate.

## Outside Works list (2026-11-17, built, not tested)

- The works done outside the workshop are a list : Workshop Configuration, tab Outside Works (table `WorkshopOutsideWorks`, codes OW-0001, usual charge). SQL : `Backend_Studio/Database/ServiceOperations_Outside_Works.sql`.
- Never typed on a page. Estimate : Outsourcing > Outside Works opens the list; the work becomes a labour line (kind Other, ItemCode = the OW code), the charge can be changed. New Work goes to Workshop Configuration (`?tab=outsideworks`).
- Job card, tab Service / Labour > Outside Works : the work, the vendor (supplier or typed), the vendor charge and the customer charge. Saved in `JobCardOutsourcedParts` with ItemKind `OutsideWork`, posted at once (voucher WOP) : Dr Workshop WIP, Cr the supplier payable ledger or Posting Setup OUTSIDE-WORK-PAYABLE. The quoted line of the same work (from the estimate) leaves the card.
- Service invoice : those entries are billed as outside work (income OUTSIDE-WORK-INCOME; cost Dr OUTSIDE-WORK-COST, Cr Workshop WIP). The outside work typed on the invoice still works as before.
