# Blueprint: Settings rearrangement (basic Settings + every module owns its setup and switches)

Status: **Agreed by the owner 2026-11-20 (decisions in section 9). Nothing built yet. Next: step 0 check, then step 1.**

Owner's proposal (2026-11-20): "Under Settings there will be basic setups only. Then every module will be independent with its own setup and configuration. We will split the System Configuration also to dedicated, module based. Every module will get its own switches under a module config page."

---

## 1. Evaluation

**Verdict: a good move, and a cheap one for the switches. The page moves are the real work.**

Why it is right:

1. **Modules are now switched on and off per client from the Console** (Tenants > modules, built 2026-11-20). When Service Operations is off for a client, Service Settings still sits under Settings today. If each module carries its own setup, switching a module off removes everything of it in one step.
2. **A client sees only what he bought.** Settings stops being a 50-page drawer.
3. **Other products come next** (Automobiles, Real Estate, Consultancy). A module that carries its own setup can be reused or left out of a product without cutting pieces out of Settings.
4. **The switches are already stored per module.** Each row of `SystemConfigurations` has `NavigationModuleId`, `ScopeType` (Module / Menu / Submenu) and the menu / page codes. Splitting the page is a display change: no new table, no data change.

What needs care:

| Risk | What it means | How the blueprint handles it |
|---|---|---|
| Shared masters | Products, customers, suppliers, chart of accounts are used by many modules | One owner module per master; customers and suppliers stay in Settings; the owners of accounts and products can never be switched off (rule 3) |
| Permissions | Role and special permissions are tied to page codes, which change when a page moves | The move script updates every table that keeps the codes (pattern already used on 2026-11-20) |
| Switch codes | About 450 places in the code read a switch by its code (`CFG-MOD-007-0012`); the number inside is the old module | **Codes never change.** Only the module / menu columns of the row change |
| Addresses | Bookmarks, favourites and about 45 links from other modules point to `/settings/...` | Old addresses keep working (redirect); links are corrected module by module |
| Several databases | Navigation lives in every database | Each script runs on `AppCoreERP_Studio`, `AppCoreTpl_TW`, `AppCore_TW_DEMO` (and every client database made by then) |
| Other sessions | Service Operations and the UI redesign edit the same folder | One module per step, small scripts, no file moves |

---

## 2. Rules

1. **Settings = what every client needs before any module works**: the organisation (company, wings, branches, warehouses, locations), financial years, how the application looks (login page, dashboard, widgets), backup, terms, website, and the switches of Settings itself.
2. **Every module has one menu named "<Module> Setup"**, last in the module. It holds the module's masters and one page **Configuration** with the module's switches.
3. **One owner per master.** A master used by several modules lives in the module that creates it; the others only read it. If the owner module can be switched off in the Console while others still need the master, the master stays in Settings.
4. **Nothing is renamed underneath**: page files, API addresses and switch codes stay as they are. Only the menu position, the page code and the page address change, and the old address opens the new one.
5. **Never by Module / Menu / Submenu / Code Sync.** Every move is a hand-written, re-runnable SQL script the owner runs.
6. **One module per step**, each step usable on its own.

---

## 3. Where things are today

**Settings** (5 menus + Application Configuration, about 55 pages):

- General Settings: Company, Wings, Branches, Warehouses, Locations, Business Configuration, System Configurations, Financial Years, Website Configuration, Backup Center, Terms & Conditions
- Application Configuration: Login Pages, Dashboards, Widget Configuration (moved here from Infrastructure Control on 2026-11-20)
- Account Settings (16): Account Class, Account Group, Account Sub Group, General Ledgers, Chart of Accounts, Posting Setup, Cash Accounts, Bank Setup, Bank Accounts, Check Books, Card Setup, Card Charges, POS Accounts, MFS Accounts, EMI Accounts, EMI Reimbursement Schemes
- Product Settings (13): Brand Management, Product Category, Product Sub Category, Chart of Inventory, Bike Models, Motor Bike Specifications, Motor Bikes, Color Management, Spare Parts, Accessories, Bike Accessory Schemes, Model Onboarding, Parts Onboarding
- Service Settings (9): Chart of Services, Service Policy, Service Category, Service Sub Category, Scheduled Services, Labor Chart, Customized Services, Membership Services, PDI Templates
- Client Settings (2): Customer Profiles, Supplier Profiles

**Modules that already keep their own setup**: Human Resource (Human Resource Setup), Inventory (Store Setup), Membership (Membership Setup), VAT (VAT Setup), Fixed Assets (Asset Configuration), Service Operations (Workshop Configuration).

**Modules with no setup menu yet**: Procurement, Sales Operations, Accessories Operations, Registration, Warranty, EMI, Enquiry, Security & Permission.

**Switches**: one page for all modules (Settings > General Settings > System Configurations). By code prefix, the big groups are Sales Operations (`CFG-MOD-008`), Procurement (`007`), Inventory (`012`), Enquiry (`010`), Settings (`003`), Security & Permission (`006`); `004`, `011` and `013` are also in use (module names to be read from the database).

---

## 4. Target map

### Settings (basic; cannot be switched off)

| Menu | Pages |
|---|---|
| General Settings | Company, Wings, Branches, Warehouses, Locations, Business Configuration, Financial Years, Terms & Conditions, Website Configuration, Backup Center, **Configuration** (Settings' own switches only) |
| Application Configuration | Login Pages, Dashboards, Widget Configuration |
| Client Settings (unchanged) | Customer Profiles, Supplier Profiles |

### Modules

| Module | Setup menu | Pages that move in | Already there |
|---|---|---|---|
| Accounts & Finance | Accounts Setup | all 16 Account Settings pages | - |
| Inventory Management | Product Setup | all 13 Product Settings pages | Store Setup (Opening Stock, Rack Management) stays as it is |
| Service Operations | Service Setup | all 9 Service Settings pages | Workshop Configuration joins this menu |
| Human Resource | Human Resource Setup | - | Department, Designation, HR Setup, structures and policies |
| Membership | Membership Setup | - | Membership Cards, Membership Policies |
| VAT Management | VAT Setup | - | Purchase VAT, Sales VAT |
| Fixed Assets | Fixed Assets Setup | - | Asset Configuration |
| Procurement, Sales Operations, Accessories Operations, Registration, Warranty, EMI, Enquiry, Security & Permission | <Module> Setup | - | new menu with the **Configuration** page (Enquiry Setup ranges join Enquiry's menu) |

Every setup menu ends with **Configuration** (section 5).

Notes on the map:

- **Account Settings to Accounts & Finance**: every posting needs the chart of accounts, so Accounts & Finance must be a module that cannot be switched off (decision 3).
- **Product Settings to Inventory**: Procurement, Sales, Service and Accessories all read products. Inventory is their natural owner and must also stay on for any client that trades goods.
- **Membership Services** stays with Service Setup (locked decision of 2026-10-19: it holds service charges; plans belong to the Membership module).
- **EMI Accounts and EMI Reimbursement Schemes** stay with Accounts Setup (they are ledgers), not EMI Management.
- **Warehouses** stay in Settings: they are made together with branches.

---

## 5. The module Configuration page

One shared page, shown once per module:

- It is today's System Configurations workspace, **locked to one module** (the page is told its module by the route; the module picker is hidden).
- Same behaviour as today: switches grouped by menu and page, values with units, parent / child switches, critical switches, request and approval for users who cannot change them, recent changes.
- **No new table, no new API, no data change**: the workspace API already returns switches with their module; the page filters.
- **Permission per module**: the right to change Sales switches is separate from the right to change Accounts switches (each Configuration page is its own page in Role Management).
- A switch set on a page that later moves follows its page automatically (the move script updates the row's module / menu / page codes).
- Settings > General Settings > **Configuration** shows only Settings' switches.
- **All modules on one screen** stays available to AppCore staff only, under Infrastructure Control (decision 4).

New switches from now on are written against their own module from the start (the SQL pattern of `EnquiryManagement_Switches.sql`).

---

## 6. How a move is done (same pattern as `ApplicationConfiguration_To_Settings.sql`)

Per menu that moves, one script in `Backend_Studio\Database\`:

1. Find the source and target modules by route key; stop with a clear message if either is missing.
2. Move the menu: new module, new code, new route, new order. The menu keeps its Id and name.
3. For every page of the menu (deleted ones too): new code and route.
4. Carry the old codes to the new ones in every table that keeps them: `INF_MenuSynchronization`, `INF_SubmenuSynchronization`, `CodeSynchronizations`, `SystemConfigurations`, `MasterActivityPages`, `ActivityAssignmentDetails`, `SpecialAssignmentDetails`. Ticked permissions stay.
5. Safe to run again ("already under <module>"); starts with `ROLLBACK;`, ends waiting for `COMMIT;`; ASCII only.

In the code, per menu:

- Routes: the menu's route file is listed under the new module; the old address redirects to the new one.
- Links from other pages to the old address are corrected (about 45 in all: Account 10, Product 8, Service 13, Client 7, General 6).
- Page files stay in `features\settings\...`; API addresses stay `api/settings/...`.
- Not changed: activity history already written keeps the old module name in its text.

To check per step: sidebar, breadcrumb, Ctrl K search, favourites and recent, role permissions still ticked, module switched off in the Console hides the setup menu too, the module's switches still work.

---

## 7. Steps

| Step | What | Size |
|---|---|---|
| 0 | Owner decisions (section 9); read from the database the module numbers behind `CFG-MOD-004 / 011 / 013` and the switch count per module | small |
| 1 | **Module Configuration page**: the shared page locked to a module; add it to Settings and to the modules that already have a setup menu (HR, Membership, VAT, Inventory, Fixed Assets, Service) | medium |
| 2 | Setup menu + Configuration page for the modules that have none (Procurement, Sales, Accessories, Registration, Warranty, EMI, Enquiry, Security & Permission) | medium (SQL mostly) |
| 3 | Move Service Settings to Service Operations > Service Setup (smallest, one clear owner; agree timing with the Service Operations session) | medium |
| 4 | Move Account Settings to Accounts & Finance > Accounts Setup | medium |
| 5 | Move Product Settings to Inventory Management > Product Setup | medium |
| 6 | Settings clean-up: rename System Configurations to Configuration; all-modules view to Infrastructure Control (Client Settings is not touched) | small |
| 7 | Bring the template database (`AppCoreTpl_TW`) and the demo database to the same state; update the standards document | small |

Steps 1 and 2 give the owner "every module has its own switches" without moving a single existing page. Steps 3 to 5 are independent of each other.

---

## 8. What does not change

- Table names, entities, repositories, controllers, API addresses.
- Switch codes and every place that reads a switch.
- How Business Configuration, Workshop Configuration, HR Setup, Asset Configuration store their values (their own tables); they are only placed in the module's setup menu.
- The request / approval flow of switches.

---

## 9. Decisions (owner, 2026-11-20)

1. **Menu name**: "<Module> Setup" with a page "Configuration". Agreed.
2. **Customer Profiles and Supplier Profiles**: stay where they are, Settings > Client Settings, unchanged. Owner: "accessory operation will share the same customer base so don't move it, keep it as is now."
3. **Core modules**: Accounts & Finance and Inventory Management can never be switched off in the Console. Agreed. (The Console's module on / off must refuse these two; to be checked when step 4 / 5 are built.)
4. **All-modules switch screen**: kept for AppCore staff under Infrastructure Control. Agreed.
5. **Warehouses and Locations**: stay in Settings. Agreed.
6. **Order**: not answered yet; the blueprint's order (switch pages first, then Service, Accounts, Products) stands until the owner says otherwise.

Step 0 check script: `Backend_Studio\Database\SettingsRearrangement_Step0_Check.sql` (read only).

---

## 10. Not verified

Written from the code and SQL scripts only; no database access. Not checked: the exact module behind each switch number, how favourites and recent pages are stored, and whether the Console's module on / off list already treats any module as "always on".
