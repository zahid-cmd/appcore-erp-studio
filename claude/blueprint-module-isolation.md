# Blueprint: a switched-off module disappears everywhere (2026-11-20)

Owner's rule: when a module is off for a client, everything of that module also disappears from the other modules, and those modules keep working. Core modules are always on: Settings, Security & Permission, Accounts & Finance, Inventory Management.

This file is the map (read from the code, nothing run, nothing changed) and the proposed plan. Nothing is built yet. Tick an item when it is built.

---

## 1. Where it stands today

- Off modules come from the Console (`Tenants.DisabledModules`); the ERP knows them (`ITenantLimits`, `IsModuleOff`).
- Three things use it: the sidebar, the permissions, and (since 2026-11-20) the API refuses saving on the module's own address.
- Nothing else checks it. Pages and code of other modules keep using an off module: discounts are still given, records are still created, a nightly job still posts.
- The UI has no "is this module on?" answer at all.
- No database constraint links the modules (only plain id / number columns), so switching off cannot break the database.

## 2. One rule for every module

1. Hidden: fields, columns, buttons, dropdown options, print lines and report columns of the off module.
2. Not used: no amount of the off module is calculated or posted on new documents; no record is created in its tables.
3. Still works: the other page saves normally.
4. Old documents keep what they have: figures already saved are still shown, printed, returned and cancelled correctly.
5. Switching back on: nothing is lost.

Foundation (built once, first):
- [x] API: one helper "module on?" used by every repository below. Built 2026-11-20: `ModuleSwitch.IsOff(ModuleKeys.X)` (`AppCore.Application\Platform\Tenancy\ModuleSwitch.cs`), set per request by the module gate.
- [x] UI: one shared service "module on?" filled at sign-in, used by every page below. Built 2026-11-20: `ModuleSwitchService` (`core\shell\module-switch.service.ts`), fed by the shell context.
- [x] API gate by document type where modules share one address (see Sales / Service / Accessories). Built 2026-11-20 in `ModuleGate.cs`.

---

## 3. Map, module by module

### Membership (off)
Used by: Spare Parts and Accessories invoices, Bookings, Workshop, Service Enquiry, Settings.
- [x] SP / AC invoice and Booking: no membership found for the customer -> no membership box, no membership discount, no "Less Membership Discount" line, no discount posting. Campaign discount keeps working. (One switch point: the customer lookup.)
- [x] Workshop: job type "Membership Service" and service item kind "Membership" are not offered; delivery no longer marks a membership free service as used.
- [x] Service Enquiry: membership services not listed as service items.
- [x] Settings: Chart of Services hides the "Membership Services" group; the Membership Services API (it sits under Settings) refuses saving. The sub-category type "Membership Services" is left as it is (plain Settings data, harmless).
- [x] Data reset: membership groups hidden.
- Membership step built 2026-11-20; compiled, not browser-tested.
- Keeps working: old invoices, their prints, sales returns (they use what the invoice saved), chassis number correction.
- Note: today, switching Membership off does NOT stop the discount. Active members keep getting it.

### Warranty (off)
Used by: Motor Bike invoice, Bike Delivery, Brand Pack.
- [x] MB invoice: no warranty shield / tooltip on the bike line.
- [x] Bike Delivery: no warranty record is created; no "Sales Warranty" card; no warranty section on the delivery print (a record made earlier is still shown).
- [x] Brand Pack install skips the warranty part.
- [x] Workshop job type "Warranty" is not offered (D8). Old job cards keep it.
- Warranty step built 2026-11-20; compiled, not browser-tested.
- Keeps working: voiding an old warranty record when a delivery is undone or a bike is returned.
- Stays as it is (not this module): warranty years / km of the Service Policy; workshop job type "Warranty" (owner to decide if it hides).
- No posting, report or dashboard depends on Warranty: the easiest module.

### Registration (off)
Used by: Motor Bike invoice and return, CKD Documents, Customer profile.
- [x] MB invoice: no Registration button, summary row, window or print line (the existing switch "Registration Fees on Invoice" counts as off).
- [x] MB invoice posting: no Customer File and no Registration Profile is created. (Today a Customer File is created on EVERY bike sale.)
- [x] Cancel / return of an old invoice (D7): allowed; a file or profile that has moved on is cancelled with it. Exception kept: a Customer File with fees collected still stops it (money with its own vouchers) and the message says to switch Registration on first.
- [x] "Reverse Registration" stays only on old invoices that have a registration.
- [x] CKD Documents: no "File" rows, no Customer File No column; changing a file there is refused.
- [x] Customer profile: "Registration Address" hidden (shown when one is already saved).
- Registration step built 2026-11-20; compiled, not browser-tested.
- Keeps: registration figures on old invoices and returns.

### Enquiry (off)
Used by: Workshop (job card, estimate), public website, notifications.
- [x] Job card / estimate: sold-bike search from Enquiry and the "service position" list come back empty and are hidden; Enquiry No not shown.
- [x] Service report "Service Due List" hidden (left out of the sidebar).
- [x] Public website: "Enquire", "Book test ride", "Book service" hidden, and their API refuses (today the website keeps creating enquiries for an off client).
- Notifications about website enquiries: already tied to the page permission, which an off module loses. Not changed; to confirm in the browser.
- Enquiry step built 2026-11-20; compiled, not browser-tested.
- Technical: the workshop takes its model / service item / parts lists through Enquiry's code. That code stays; it reads core tables only.

### Fixed Assets (off)
Used by: nobody. But:
- [x] The nightly depreciation job must skip a client whose Fixed Assets is off (today it keeps posting).
- [x] Cash Flow statement: a database without the Fixed Assets tables no longer breaks it. The Fixed Assets part itself is kept when the module is off, so earlier asset purchases still show as investing.
- [x] Posting Setup: ASSET-... rows hidden.
- Background jobs now know each company's off modules (`TenantScopes`). Built 2026-11-20; compiled, not tested.

### Human Resource (off)
Used by: Workshop (heavily), Fixed Assets, User Profile.
- [x] User Profile: Designation stays (no change needed): designations are always there now (D1, section 5a).
- [x] Fixed Assets: Custodian stays (no change needed): employees are always there now (D1, section 5a).
- [x] Posting Setup: PAYROLL-... and PF-... rows hidden.
- [x] Solved by D1 (section 5a, built 2026-11-20, not browser-tested): Department, Designation and Employee Profiles moved to Settings > Employee Setup and always save.

### Procurement (off)
Used by: Inventory (heavily).
- PROBLEM: Product Receiving only receives purchase invoices, so it has nothing to do. Stock could enter only through Opening Stock. New pricing "from purchase invoice" also goes. Decision needed (D2).
- [ ] If it stays switchable: hide Product Receiving, the "New (purchase invoice)" pricing choice, purchase voucher types in registers.
- Suppliers are in Settings: they stay. The chassis table is used by every bike flow: it stays.

### VAT (off)
- What is in the module today: only two pages (Sales VAT rates, Purchase VAT rates) and four switches. Mushak books and returns are planned, not built.
- VAT itself (VAT %, VAT inside prices, VAT ledgers, the VAT register) lives in core and in every invoice.
- PROBLEM: purchases and opening stock stop with an error when no VAT rate rule exists; bike sales need VAT to work out the price. Decision needed (D3).

### EMI and Reports
- No such module exists in the ERP yet (menu plans only). EMI today is: EMI Accounts (Settings), the EMI payment term on a bike invoice, the EMI receipt mode, an EMI Registers tab, the website EMI calculator. Reports is only a line in the Console.
- [x] EMI off (built 2026-11-20, not browser-tested): no EMI payment term on a new bike invoice (refused by the API too); website EMI calculator hidden. Kept on purpose: the EMI receipt mode, EMI Registers and the Daily Collection EMI column, because the dues of EMI sales made before are still collected and reported through them.
- [ ] Reports off: nothing to do (decision D5).

### Sales, Service, Accessories (one of them off)
- Spare Parts sales, Accessories sales, their bookings and promotions run on the Sales pages and the Sales API; only the menu moved to Service / Accessories.
- [x] API: refuse by document type: bike (MB) documents when Sales is off, spare parts (SP) when Service is off, accessories (AC) when Accessories is off. (Today, with Sales off and Service on, a bike invoice can still be saved through the API.)
- [x] The SP / AC rules (switches): script `Backend_Studio\Database\SystemConfigurations_FollowPages.sql` puts every page switch on the Configuration page of the module its page is in today. Owner to run.
- [x] Bike Accessory Schemes moved to Inventory Management > Product Setup (routes + `Backend_Studio\Database\BikeAccessorySchemes_To_ProductSetup.sql`, owner to run). PDI Templates stays in Sales Setup: only Bike Deliveries (Sales) uses it.
- [x] Old addresses: the Bike Accessory Schemes ones now end in core. The old Service Settings addresses still open Service Setup (open point: Service off with Enquiry on).
- [x] Bookings SP / AC customer search: checked, no change needed (it only reads, and reading has no page check, so it works with Sales off).
- [x] Console (D6): Registration or Warranty cannot be on while Sales is off. Console (D2, D3, D5): `Console_Studio\Database_Core_Modules_Procurement_Vat.sql`, owner to run.
- Step built 2026-11-20; compiled, not browser-tested, scripts not run.
- Sales off: Registration, Warranty and the sales side of Enquiry have nothing to work on. Service off: Membership free services and the service side of Enquiry have nothing to work on; Spare Parts counter sales vanish with Service. Decision D6.

---

## 4. Decisions for the owner

**Decided 2026-11-20: the owner accepted the recommended answer (a) for D1 to D7 and "hide" for D8.**

- D1. HR off, Service on. (a) Recommended: a small Employee master (employee, department, designation) is always available, the rest of HR (attendance, leave, payroll, PF) is the switchable part. (b) Service can only be on when HR is on.
- D2. Procurement. (a) Recommended: make Procurement a core module (a dealer cannot run stock without purchases). (b) Keep it switchable; stock then enters only by Opening Stock.
- D3. VAT. (a) Recommended: the two VAT rate pages become core (Accounts Setup); "VAT Management" as a switchable module means only the Mushak books / returns when they are built. (b) VAT off = a no-VAT business: no VAT anywhere. Much bigger work and bike pricing must be redesigned.
- D4. Bike Accessory Schemes and PDI Templates pages: back to core (Product Setup / Settings), because other modules need them.
- D5. Reports: (a) Recommended: remove it from the Console list until a Reports module exists. (b) "Reports off" hides the report pages inside every module.
- D6. Console rules for modules that depend on another: Registration and Warranty need Sales; Membership free services need Service. (a) Recommended: the Console refuses the combination with a clear message. (b) Allow it; the pages are simply empty.
- D7. Old invoice with a registration, Registration now off: cancel / return (a) Recommended: allowed, the Customer File is cancelled with it; (b) refused with "switch Registration on first".
- D8. Workshop job type "Warranty" when Warranty is off: hide or keep.

## 5. Proposed order

1. Foundation (API helper, UI service, gate by document type).
2. Warranty (smallest, proves the pattern).
3. Membership.
4. Registration.
5. Enquiry.
6. Fixed Assets and EMI (small).
7. Sales / Service / Accessories (switch pages, redirects, setup pages).
8. HR, Procurement, VAT: after D1-D3.

Each step: build, compile, owner tests with one module off and on, then the next.

## 5a. Design for D1: Employee master always available (approved 2026-11-20 with H1 (a) and H2 (a); built the same day, not browser-tested)

Problem: Department, Designation and Employees are pages of Human Resource. The workshop (technician, engineer, advisor), Fixed Assets (custodian) and User Profile (designation) need them. With HR off those pages are gone and their saving is refused.

Proposal:
1. New menu **Employee Setup** in a core module, with three pages moved out of HR: Department, Designation, Employees. Same page move as Account Settings / Product Settings: pages keep Id, name, permissions and favourites; old addresses open the new ones; the API addresses stay.
2. The module gate lets these three addresses save whatever HR is.
3. HR keeps everything else: shifts, holidays, leave, salary and bonus and overtime structures, employee movements, attendance, payroll, provident fund, HR reports.
4. Employee form with HR off: only the general part (identity, contact, branch, department, designation, joining date, linked user). The HR part (shift, weekly off, salary structure and lines, gross salary, overtime, bonus, leave encashment, payment and bank details) is hidden and saved with its defaults. Shift is a required number today: with HR off it is saved as 0 (no shift) and HR asks for it when it is switched on.
5. With HR off also: PAYROLL-... and PF-... rows leave Posting Setup; the "Human Resources" tile leaves the dashboard.
6. Nothing changes in Service, Fixed Assets or User Profile code: their employee lists keep working because the master is always there.

To decide:
- H1. Where the menu goes: (a) Recommended: Settings > Employee Setup. (b) Security & Permission, next to User Profile.
- H2. With HR ON, the three pages are (a) Recommended: only in the new place (one place, no double menu); (b) shown in both.

SQL: `Backend_Studio\Database\EmployeeSetup_Navigation.sql`, one run per ERP database, by the owner.

Built: routes `features\settings\employee-setup\routes\employee-setup.routes.ts` (old HR addresses open the new ones); module gate lets the three addresses save; employee form and list hide shift, weekly holiday and salary with HR off and the API keeps what is saved of them (new profile: shift 0, no salary); Posting Setup and the dashboard tile as in point 5.

Open point: an employee made with HR off has no shift. When HR is switched on later, each such profile must be opened once and given a shift before attendance or payroll is run.

## 6. Not checked

- The navigation rows and switches inside the database (which module owns each menu today).
- Home dashboard widgets (kept in the database): which belong to which module.
- Whether opening an off module's page by typing its address is blocked in the browser.
- Nothing was run; everything comes from reading the code.
