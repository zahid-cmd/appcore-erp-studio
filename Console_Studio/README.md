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
2. pgAdmin, connected to **AppCore_Control**: run `Database\02_Control_Schema.sql`.
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
- First time : pgAdmin on **AppCore_Control** : run `Database\03_Website.sql`; then
  `cd Website\AppCore_Site`, `npm install`, `npm start` (http://localhost:4400).
- After the first `npm install`, `start-console.cmd` also starts the website.
