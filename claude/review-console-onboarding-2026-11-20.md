# Review: AppCore Console and client onboarding (2026-11-20)

Read-only review of `Console_Studio` (API, database scripts, Console UI, public website) and the ERP side that finds each client's database (`Backend_Studio ... Platform\Tenancy`). No settings file was opened; nothing was run. Items marked (checked) were confirmed a second time in the code.

Work list for the fine-tuning. Tick an item when it is fixed.

---

## 1. How onboarding works today

1. Website form -> a request (status New).
2. Console > Requests: follow up, or **Convert to customer** (makes the customer, opens Register tenant pre-filled).
3. **Register tenant**: code, name, limits, web addresses, status.
4. Tenant page: package / modules / users, then **Create database** (about a minute): makes the database login, copies the product template, sets company, financial year and the admin password, shows that password once, sets the tenant to Trial for 30 days.
5. Staff set the tenant Active by hand.
6. By hand, outside the Console: Cloudflare address, support login, brand install.

The ERP finds the client by web address, reads the Control database (cached about a minute), opens that client's own database with its own login.

Sound: every Console API needs a login and writes need Owner / Developer; database and login names are checked and quoted; passwords are random; staff passwords are hashed properly; the client database password is sealed so only the ERP server can open it; uploads, chat and caches are per client; a token of one client is refused on another client's address.

---

## 2. Must fix before more clients go live

- [x] **A1. A switched-off module is only hidden, not refused** (checked). Fixed 2026-11-20 (`AppCore.API\Platform\Tenancy\ModuleGate.cs`): the API refuses saving, changing and deleting on an off module (403); reading stays allowed because other modules look things up; the Sales address group is shared with Service and Accessories and is refused only when all three are off. Original finding: The ERP hides it in the sidebar and in permission checks, but there is no gate on the API. A logged-in user of a client whose Accounts module is off can still call `api/accounts-finance/...`. Note: since the rearrangement, Account / Product setup pages belong to Accounts / Inventory while their API stays `api/settings/...`, so the gate must go by page ownership, not only by the address.
- [x] **A2. Lost admin password cannot be re-issued.** Fixed 2026-11-20: "Reset admin password" on the tenant page (browser-tested 2026-11-20 on throwaway tenant TEST; the new password was not tried in an ERP). Shown once after Create database. A timeout, refresh or sign-out during that minute loses it; there is no "reset first admin password".
- [x] **A3. No "reset database login".** Fixed 2026-11-20: "Reset database login" on the tenant page, one client at a time (browser-tested 2026-11-20 on TEST: no error; the new login was not tried in an ERP). One unversioned key seals all client database passwords. If the key file is lost or replaced, every client is down until passwords are fixed by hand. The SQL script promises a Reset button that does not exist.
- [x] **A4. Create database twice at once breaks the client** (checked). Fixed 2026-11-20: one at a time per database (lock on the database server; the second attempt is refused). Browser-tested 2026-11-20 on TEST. No lock: a double click or two staff. The second attempt changes the login's password and fails; the first then saves a password that no longer works.
- [x] **A5. First Console owner password is only printed to a window** (checked). Fixed 2026-11-20: also written to `first-owner-password.txt` beside the Console API. Not tested on a fresh server. The live Console runs as a Windows service with no window: on a fresh server the password is lost.
- [x] **A6. Console login has no rate limit, and 5 wrong passwords lock the account.** Fixed 2026-11-20 (`Security\LoginGuard.cs`): 10 tries / 5 min per address; 5 wrong passwords lock the login from that address only, the account itself is no longer locked. Not browser-tested. Anyone can keep the only owner locked out.
- [x] **A7. A new tenant defaults to Active, which blocks Create database** (checked). Fixed 2026-11-20: default Provisioning.
- [x] **A8. Edit tenant can break a live client** (checked): code, product, server and database name stayed editable; clearing the database name took the client offline. Fixed 2026-11-20: locked once the Console has created the database (browser-tested on TEST).

## 3. Should fix

- [x] (built 2026-11-20, browser-tested the same day on TEST with a made-up leftover: tenant page finds the leftover and offers Remove leftover, name typed to confirm) **B1. Failed Create database leaves leftovers that block retry** ("database already exists"); no clean-up / adopt action.
- [x] (fixed 2026-11-20, a normal register browser-tested; a failure half way and two at once not tested: tenant, addresses and first history line are saved in one transaction; a clash at the same moment gives a clear message) **B2. Register tenant saves in two steps**; a failure in the second leaves a tenant with no address and "code already used" on retry.
- [x] **B3. Tenant code rules differ** between Register (allows `-` and a leading digit) and Create database (letter first, `-` removed): `AB-C` and `ABC` map to one database. Fixed 2026-11-20 for new / changed codes.
- [x] (built 2026-11-20 as section 3a, browser-tested the same day except Convert carrying the request numbers; branch / user numbers and the package now apply from registration) **B4. Packages are only a label.** A new tenant gets every module, unlimited users and branches; the request's branch / user numbers are not carried over; a module added to the product later switches on for every client; saving with an empty list switches every module off.
- [x] (built 2026-11-20 as section 3b; the box, look-alikes and refusals browser-tested; a real convert, a Closed request and two at once not tested) **B5. Convert always creates a new customer**, no confirm, no "use existing customer"; a double click makes two. A Closed (spam) request can still be converted.
- [x] **B6. Suspended clients keep working** (built 2026-11-20, ERP API; not tested: needs deploy) for up to a minute, and for as long as the Control database is unreachable; a removed address keeps resolving from the saved map.
- [x] (built 2026-11-20 as section 3d with B7-a (a); builds, not tested) **B7. Limits fail open**: when the Control database cannot be read (and in local mode) there is no user / branch limit and all modules are on. Two creates at the same moment can both pass the limit.
- [x] (built 2026-11-20 as section 3e; builds, not tested: needs two clients on one ERP) **B8. Request limits are per user id, not per client.** Every client's admin has the same id (same template), so one client's backup can block another's.
- [x] (built 2026-11-20 as section 3f, WARN first: Tenancy:NoCompany = Warn, set Refuse after a clean log on live; builds, not tested) **B9. Without a client (background work) the ERP silently uses the default database** in live mode. Should refuse instead.
- [x] (built 2026-11-20 as section 3g; builds, not tested) **B10. A disabled or demoted Console staff user keeps working up to 8 hours** (token is not re-checked).
- [x] (built 2026-11-20 as section 3h: README order, guard in 02-06 and 12, one-offs moved to Database\one-off; a real fresh install not run) **B11. Fresh Console install does not work from the README** (lists scripts 01-03; the code needs 05, 06, 10, 11, 12). Scripts 02-06 and 12 have no "wrong database" guard. 07 and 09 are one-off fixes sitting in the numbered list.
- [ ] (Part 1 built 2026-11-20, section 3i: the ERP locks its private key FILE every start, tried on a throwaway key; icacls lines for the two settings files in the READMEs, to be run by the owner on skyhost. Part 2 WRITTEN 2026-11-20: Deploy_Agent\AppCore.DeployAgent\secure-services.cmd (status / console / erp / lock / back, undoes itself when a service does not answer); NOT RUN anywhere: the owner runs it on skyhost, then tick this) **B12. Services run as LocalSystem** (Console, deploy agent, ERP). The key file has no restricted permission.
- [x] (built 2026-11-20 as section 3j; builds, see the report for what was tested) **B13. "Switch back to release" has no confirmation**; any signed-in role on the dev PC can deploy.
- [x] **B14. Create database card vanished silently when its check failed.** Fixed 2026-11-20: the error is shown.
- [x] (built 2026-11-20 as section 3k; Planned products left as the owner decided 2026-11-13) **B15. Public form says a subdomain "is free, we reserve it"** but nothing is reserved; two visitors get the same answer. It also offers Planned products and reads settings before they load.

## 3a. Design for B4: package and limits at registration (approved and built 2026-11-20, package required with no default; browser-tested on throwaway tenant TEST, Convert not tested)

1. Register tenant gets a **Package** box (must pick one when the product has packages) and a **Users allowed** box. On save the tenant gets the package's modules: everything outside the package is off. Today: no package, every module on, no user limit.
2. Convert a request: the request's Branches and Users numbers are put in the Register form (can be changed before saving). Today they are dropped.
3. A module added to the product later is **off** for every existing client whose package does not have it. Rule for the SQL script that adds a module: it also adds the module to those clients' off list. The ERP keeps reading only the off list (no ERP change).
4. Saving the modules with nothing ticked: the Console asks "Switch every optional module off?" first; a save that carries no module list at all is refused. Today both silently switch everything off.

No SQL for points 1, 2 and 4. Existing clients are not changed.

Point 3 is a rule for future scripts, nothing was built for it: no module is being added now. A product without packages keeps every module on, as before.

## 3b. Design for B5: Convert a request (approved and built 2026-11-20, Closed requests refused; box and refusals browser-tested, no real convert done)

1. Convert to customer opens a small box first: **New customer** (as today) or **Use an existing customer** (pick from the list). Nothing is made until Confirm is pressed.
2. The box shows customers that look the same (same phone, email or BIN as the request), so a returning client is not made twice.
3. A double click or two staff at once makes one customer only: the API takes the request under a lock, and a request that already has a customer just returns it.
4. A Closed request cannot be converted: the button is hidden and the API refuses ("set the status back to New or Contacted first").

No SQL. Existing customers and requests are not changed.

## 3c. Design for B6: suspended clients keep working (built 2026-11-20; owner chose B6-a (a) keep as today)

How it is (ERP, `TenantResolver.cs`): the answer for a web address is kept 60 seconds (`Tenancy:CacheSeconds`). When AppCore_Control cannot be reached, every client keeps working from a saved file (last known map), with no time limit. An address removed in the Console stays in that file for ever.

1. A status change takes effect within 15 seconds, not 60: the ERP keeps the answer 15 seconds (default of `Tenancy:CacheSeconds`; one small read of AppCore_Control per address every 15 seconds). No setting on the servers has to change, unless one sets 60 itself.
2. An address the Console no longer has is taken out of the saved file the next time AppCore_Control answers "not registered", so it cannot come back during an outage.
3. Outage of AppCore_Control: decision B6-a. (a) Recommended: as today, clients keep working from the saved file with no time limit (a suspension made during the outage waits until AppCore_Control is back, then applies within 15 seconds). (b) After N hours without AppCore_Control every client is refused: safer against a suspended client, but one Control outage then takes all clients down.

Not in this step: the Console telling the ERP at once (needs a shared secret and the ERP address on both servers).


## 3d. Design for B7: limits fail open (built 2026-11-20; owner chose B7-a (a))

What the code does today (checked 2026-11-20):
- Tenancy Mode Host (one ERP serving clients by web address): the limits and the off-modules travel with the tenant, and during an AppCore_Control outage they come from the saved map file. So this mode does NOT fail open. Nothing to change.
- Tenancy Mode Off (one ERP for one database): `TenantResolver.LimitsOfDefaultDatabaseAsync` reads AppCore_Control every CacheSeconds. When the read fails it answers "no limits, all modules on" for 15 seconds, again and again while the outage lasts.
- Both modes: the user / branch / company checks are "count, then save" with no lock, so two saves at the same moment can both pass.

Proposed:
1. Mode Off, AppCore_Control not reachable: use the last good answer (kept in memory and in a small file beside the map file, so it survives a restart). Only an ERP that never got an answer stays without limits (decision B7-a).
2. One at a time: adding / activating / restoring a user, approving an access request, adding a branch, adding a company take a short database lock (pg_advisory_xact_lock) around "count + save". The second one waits a moment, then gets the normal limit message.
3. No tenant registered for the database (developer PC): stays without limits, as today.

Decision B7-a (ERP in Mode Off that has never reached AppCore_Control): (a) Recommended: no limits, as today (else a fresh install with a Control problem cannot be set up). (b) Refuse new users / branches until AppCore_Control answers once.


## 3e. Design for B8: request limits per client (built 2026-11-20; Mode Off keeps the old keys unchanged)

What the code does today (`AppCore.API\Security\ApiSecurityExtensions.cs`, AddRateLimits):
- Every call of a signed-in user: a bucket keyed "user:<user id>".
- Heavy work (backup, data management): one at a time, keyed "heavy-user:<user id>".
- Not signed in / login: keyed by IP address.
One ERP API serves several clients (Tenancy Mode Host), and every client's first admin has the same user id (same template). So two clients' admins share one bucket, and one client's backup refuses the other's.

Proposed:
1. The two signed-in keys get the client in front: "<tenant code>:user:<id>" and "<tenant code>:heavy-user:<id>". Tenant code from the request's tenant; when there is none (Mode Off), the web address, so nothing changes for a one-database ERP.
2. The IP keys (not signed in, login) stay per IP : they protect the server, whichever client is asked for.
3. No setting, no SQL, no UI change. Numbers (requests per minute, heavy tasks) stay as they are.


## 3f. Design for B9: no client, default database (built 2026-11-20, owner chose B9-a (b) warn first; point 2 not built: in Mode Host the Code Management addresses are refused for every address, so DeploymentRunner cannot run there)

What the code does today (`AppCore.Infrastructure\DependencyInjection.cs`, AddDbContext): the database is "the request's company, or else ConnectionStrings:DefaultConnection". In Tenancy Mode Host, any work with no company (a scope made outside a request) therefore opens the default database without a word.
- Background jobs go through `TenantScopes.ForEachAsync` and get each company's database : fine.
- `UploadsMirror` sets the company on its scope : fine.
- `DeploymentRunner` (save progress, refresh server : 2 places) makes a plain scope : default database.
- Anything written later the same way would do the same, silently.

Proposed:
1. Mode Host and no company on the scope : AppDbContext does not fall back. Mode Off : unchanged.
2. DeploymentRunner carries the company of the request that started the deployment into its scopes.
3. Decision B9-a, how strict from day one. (a) Refuse at once (clear error "No client company for this work"). (b) Recommended: first only a warning line in the ERP log each time it happens (what asked for the database), still using the default database; after a week of a clean log on live, switch to refuse (one setting, Tenancy:NoCompany = Warn / Refuse). Reason : Mode Host cannot be run on the owner's PC, so a refusal I could not test might stop something on live that nobody knows about.


## 3g. Design for B10: disabled Console staff keeps working (built 2026-11-20)

What the code does today (Console API `Program.cs`, `Security\StaffTokens.cs`): signing in gives a token good for 8 hours (Jwt:Hours) that carries the staff id and the role. After that only the token is checked : `StaffUsers.Status` and the role are read at sign-in only. A staff user set to not Active, or moved to a lower role, keeps full use until the token runs out. (The Console has no staff page : staff are changed in the database.)

Proposed:
1. Every signed-in call re-checks the staff user : still there, Status = Active, and the role is the one in the token. If not : 401 "Please sign in again." (the Console UI already goes to the sign-in page on 401; to be confirmed when building).
2. The answer is kept in memory for 30 seconds per staff user, so it is one small read of AppCore_Control per staff user per half minute, not per call. A change therefore takes effect within 30 seconds.
3. No SQL, no new setting, no UI change. Token life (8 hours) stays.
Not in this change: signing other devices out when a password is changed (needs a new column; say if wanted).


## 3h. Design for B11: fresh Console install (built 2026-11-20; owner chose B11-a (a) move)

What is there today (`Console_Studio\Database`, checked 2026-11-20): scripts 00 to 14 plus two TEST_ helpers. `Console_Studio\README.md` names only 01, 02, 03. Scripts 02, 03, 04, 05, 06 and 12 have no check that pgAdmin is on AppCore_Control (07 to 11, 13, 14 have one). 00, 07 and 09 are one-off fixes (undo, remove one registration, delete one request), not part of an install.

Proposed (no change to what any script does, nothing to run on live):
1. README : the full order for a new install. On postgres : 01. On AppCore_Control : 02, 03, 04, 05, 06, 08, 10, 11, 12, 13, 14. With one line each on what it is for.
2. Scripts 02, 03, 04, 05, 06, 12 get the same "wrong database" stop at the top as the newer ones (stops with a clear message unless the database is AppCore_Control). 01 cannot have it : it runs on postgres and makes the database.
3. One-off scripts (00, 07, 09, TEST_Tenant_Delete, TEST_Tenant_Make_Leftover) : decision B11-a. (a) Recommended: move them to `Console_Studio\Database\one-off\`, so the numbered list is only the install. (b) Leave them where they are and only mark them in the README.
Not in this change: running a fresh install to prove the order (needs an empty PostgreSQL; the owner runs SQL).


## 3i. Design for B12: services as LocalSystem, key file open (Part 1 built 2026-11-20, the private key file is locked, not the folder: a custom Tenancy:CredentialKeyFile may sit in a shared folder; Part 2 open)

What is there today (checked 2026-11-20): `Console_Studio\server\install-console.cmd` and `Deploy_Agent\AppCore.DeployAgent\install-agent.cmd` make their services with `sc create` and no account, so they run as LocalSystem (full control of the server); the ERP service is the same. `TenantCredentialSeal` writes the private key `%ProgramData%\AppCore\keys\tenant-credentials.pem` with the folder's normal rights : every Windows user of the server can read it (it opens every sealed client database password).

Proposed, in two parts:
Part 1 (small, safe):
1. The ERP locks the `keys` folder when it starts : only SYSTEM and Administrators may read it (also repairs the existing folder on the next start, so nothing to do by hand).
2. Same lock for the Console's and the agent's appsettings is NOT done by code (they are edited by hand); the README gets one `icacls` line for each.
Part 2 (bigger, on the live server):
3. Console and ERP services run as their own small Windows service accounts (`NT SERVICE\AppCoreConsole`, `NT SERVICE\<ERP service>`) with rights only on their own folders (program, uploads, logs, backups, keys, Password_Book). One cmd per service to switch, and one line to switch back.
4. The Deploy Agent stays LocalSystem : it must stop, change and start services and write the release folders. It is reachable over Tailscale only and needs its token.

Decision B12-a: (a) Recommended: build Part 1 now; Part 2 as a planned job on the server at a quiet hour, one service at a time (a missed folder right stops that service for the clients, and it cannot be tried on the owner's PC). (b) Build both now; the owner runs the Part 2 scripts when ready.


## 3j. Design for B13: Switch back and who may deploy (built 2026-11-20)

What is there today (Console UI `pages\deployments\deployments.ts`, `Console_Studio\dev-agent\console-agent.js`): "Deploy to live" asks "Yes, deploy now"; "Switch back" on a release starts at once. The dev agent on the development PC takes /deploy/start, /deploy/rollback and /deploy/settings from the Console page with no check of who is signed in : any Console role (Support, Billing) can deploy, and the "by" name in the history is whatever the page sends.

Proposed:
1. Switch back asks first, in the same kind of box as Deploy : the release it goes back to, and "clients on live get this older version at once".
2. Only Owner and Developer may deploy, switch back or change the server connection. Other roles see the list and the logs, the buttons are not shown.
3. The dev agent checks it itself : the page sends the staff sign-in, the agent asks the Console API on the same PC who that is (api/auth/me) and refuses other roles. The name in the history comes from that answer, not from the page.
4. No SQL, no new setting. Reading (list, status, log, server state) stays open to every signed-in role.


## 3k. Design for B15: the public request form (built 2026-11-20)

What is there today (Console API `PublicController.cs`, website `pages\request.ts`): the address check only looks at registered tenant addresses, so a name another visitor already asked for still shows "is free", and the hint says "We reserve it for you" although nothing is held. The form reads the website settings when it opens, which can be before they have arrived from the server (it then decides Demo / Purchase from the built-in defaults). The product list shows every product that is not Retired, so Planned ones too.

Proposed:
1. A name asked for in a request that is still open (New, Contacted, Demo booked, or Converted but not registered yet) counts as taken, in the check and when the form is sent : "That address is already asked for. Try another." A Closed request lets its name go. So "we hold it for you" becomes true from the moment the request is in.
2. Wording : "... is free" stays; the hint becomes "Where your team will open AppCore. We hold it for you once your request is in."
3. The form waits for the website settings before it picks Demo / Purchase and the product.
4. Planned products stay on the form : owner decision of 2026-11-13 (04_Four_Products.sql, "the website takes enquiries for all four"). No change.
5. No SQL, no Console screen change. Two visitors sending the same name in the very same second can still both get through; the staff see it when registering (the address must be unique there).


## 3l. Design: the deploy backup covers every client database (built 2026-11-21 in the Deploy Agent; owner chose BK-a (b) 10 per database; needs the agent published and installed again; not run on the server)

Found 2026-11-21 in the log of ERP deploy R-0038: the Deploy Agent backs up ONE database before an ERP deploy (`Agent:Database:Name`, default AppCoreERP_Studio; `BackupDatabaseAsync` in `Deploy_Agent\AppCore.DeployAgent\Program.cs`). The other client databases the same ERP serves (Tenancy Mode Host) are not in it. `CleanUp` keeps the newest 10 dump files in all.

Proposed:
1. Before an ERP deploy the agent asks AppCore_Control (same PostgreSQL, same login it already has) for the databases of every tenant that is not Cancelled, adds the one from its settings, and backs up each of them (pg_dump, as today). One line in the deploy log per database.
2. One backup fails, or AppCore_Control cannot be read : the deploy stops, nothing is changed (as today for the one database).
3. Old backups : decision BK-a. Today "newest 10 files" would mean only 2 deploys with 4 databases. (a) Recommended: the newest 5 per database. (b) The newest 10 per database (more disk).
4. Switch back does not put a database back (as today); the dumps are for restoring by hand.
5. Console deploys are unchanged (they already back up AppCore_Control). No SQL, no screen change. Needs the agent published and installed on the server again.
Each deploy takes longer by the time of the extra dumps.


## 3m. Design: server security steps and the NoCompany switch from the Console (built 2026-11-21; owner chose SEC-a (b) the agent switches by itself; a pop-up, not a card; dry-tested on a scratch agent only, NOT run on the server)

Why: two leftovers need the owner to sit at the live server (run `secure-services.cmd`; read the ERP log for a week, then edit the live settings file). The Deploy Agent is already on that server with full rights, and the Deployments page already talks to it.

Facts found: the agent has only health / releases / jobs / deployments / rollback endpoints. The live ERP is a Windows service (`AddWindowsService`), so its warning lines go to the Windows Event Viewer, not to a file; "look in the log" is awkward today.

Proposed:
1. Deployments page, new card "Server security" (Owner only). Shows what `secure-services.cmd status` says : the account of each service and whether the folders are locked.
2. Four buttons, one step at a time, each with a confirm box : Console account, ERP account, Lock folders, Put everything back. The agent runs the same `secure-services.cmd` that is already written (its health check and automatic switch-back stay). The output is shown on the page and kept in the agent log. Refused while a deploy is running.
3. NoCompany : the ERP also keeps a small file beside the tenant map (`no-company.json` : which code asked, how many times, last time; no client data). The card shows "Work with no company in the last 7 days : N" and the list.
4. Button "Refuse from now" (Owner only, confirm box), offered when the count is 0 for 7 days; with a count above 0 it warns first. The agent sets `Tenancy__NoCompany=Refuse` on the AppCoreERP service (service environment, the standard .NET way) and restarts the ERP with its usual health check; unhealthy : it takes the setting away and restarts again. Button "Back to Warn" undoes it. The live settings file is never opened or edited.
5. Decision SEC-a, the Refuse switch : (a) Recommended: the owner presses the button. (b) The agent switches by itself after 7 clean days.

Changes: Deploy Agent (2 endpoints + the script gets a no-question mode), dev agent `console-agent.js` (pass-through with the same Owner check as deploys), Console UI Deployments page (one card), ERP `NoCompanyGuard.cs` (the small file). No SQL. Needs: agent published and installed again, one ERP deploy, dev agent restart.

Risk said plainly: if a step goes wrong in a way the automatic undo does not catch, the owner must still sign in to the server by hand. Do the steps at a quiet hour.

## 4. Smaller

- [ ] Every tenant is forced to Trial + 30 days by Create database, also a purchase; nothing acts on the trial end date.
- [ ] Any-to-any status change with one click (reason only); history does not show who.
- [ ] Role checks in the Console UI hide buttons only; opening a form by address then gives "Something went wrong" instead of "no permission".
- [ ] Request / customer numbers are count-based (two at once can clash).
- [ ] Branches 0 is saved as "no limit".
- [ ] Unknown web addresses: each costs a Control query and a permanent cache entry (no cap).
- [ ] Background jobs post into Read-Only clients.
- [ ] The first admin password is appended in plain text to `Password_Book.md` on the dev PC (folder is git-ignored).
- [ ] Internal server notes (tunnel name, script paths) ship inside the Console's production files.
- [ ] Lists load everything and page in the browser.

## 5. Not built yet

- Staff management (add, disable, unlock, reset) : only "owner" can exist.
- Delete / cancel / archive for requests, customers, tenants; drop database; spam marking.
- Customer page (tenants per customer); link from a request to its tenant.
- Onboarding wizard (today a read-only guide); domain / DNS check; database health on the tenant page.
- Trial expiry and status automation; Billing, Support, Monitoring ("Soon").
- Console screens for database servers, templates, products, modules, packages (SQL only).
- Brands per tenant (table exists, unused).
- Modules and packages are seeded for Two Wheeler only; the other three products have no server, template or modules.
- More than one company per client (the ERP caps at 1 whatever the Console says).
- ERP install script, scripted Control database setup, dedicated service accounts.
- Console -> ERP "refresh now" (changes wait for the one-minute cache).
