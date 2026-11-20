# AppCore Console (Console_Studio)

AppCore's own back office: products (industries), customers, tenants
(one per customer + product, each with its own database and web
address), Console staff. Built apart from the dealer ERP.

| Part | Folder | Dev address |
|---|---|---|
| Control database | `Database\` | `AppCore_Control` (PostgreSQL) |
| Console API | `Console_Backend\AppCore.Console.API` | http://localhost:5300 |
| Console UI | `Console_Frontend\Console_UI` | http://localhost:4300 |
| Website (appcoretech.net) | `Website\AppCore_Site` | http://localhost:4400 |

## First time
1. pgAdmin, connected to the **postgres** database: run `Database\01_Create_AppCore_Control.sql`.
2. pgAdmin, connected to **AppCore_Control** (the Query Tool title must start with
   `AppCore_Control/`): run the scripts of `Database\` below, in this order, each one whole (F5).
   All can be run again. Each stops by itself on another database.

   | Script | What it is for |
   |---|---|
   | `02_Control_Schema.sql` | the tables : products, customers, tenants, staff, audit log |
   | `03_Website.sql` | website settings and website requests |
   | `04_Four_Products.sql` | the four product names and the company-wide home page text |
   | `05_Tenant_Limits.sql` | company and branch limits of a tenant |
   | `06_Multi_Product_Databases.sql` | database servers and templates per product, own login per client |
   | `08_Erp_Control_Reader.sql` | the ERP's read-only login (set its password in pgAdmin afterwards) |
   | `10_Modules_Packages_Users.sql` | modules, packages and the user limit |
   | `11_Sealed_Tenant_Logins.sql` | client database logins kept sealed |
   | `12_Tenant_Credential_Public_Key.sql` | the ERP server's public key : paste it in first (see the file), so after the ERP's first start |
   | `13_Core_Modules.sql` | Accounts & Finance and Inventory are always on |
   | `14_Core_Modules_Procurement_Vat.sql` | Procurement and VAT are always on |

   `Database\one-off\` holds fixes that were needed once (00, 07, 09) and test helpers.
   They are NOT part of an install : do not run them.
3. Edit `Console_Backend\AppCore.Console.API\appsettings.json` : `ConnectionStrings:Control`
   (host, port, user, password of your PostgreSQL). Do not share this file.
4. API: `cd Console_Backend\AppCore.Console.API` then `dotnet run`.
   The first start prints the one-time **owner** password in the window (shown once).
5. UI: `cd Console_Frontend\Console_UI` then `npm install` (first time) and `npm start`.
6. Open http://localhost:4300, sign in as **owner**, set your own password.

## Every day
Double-click `start-console.cmd` (API + UI in two windows).

## Website (AppCore Technologies)
- Content : Console > **Settings > Website settings** (company, contact, home page, requests, pricing, about).
- Requests from the site : Console > **Clients > Requests** (follow-up, Convert to customer, Register tenant).
- First time (after the scripts of "First time" above) :
  `cd Website\AppCore_Site`, `npm install`, `npm start` (http://localhost:4400).
- After the first `npm install`, `start-console.cmd` also starts the website.

## Live server : own account and closed folders (once)
On skyhost the Console service and its settings file (database password,
sign-in key) are protected with `secure-services.cmd` :
see `Deploy_Agent\AppCore.DeployAgent\README.md`, "Services under their own accounts".
