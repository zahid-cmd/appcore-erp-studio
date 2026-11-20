# AppCore Deploy Agent

Small Windows service on the live server (skyhost). The Deployment Center
in AppCore Studio sends it a release; the agent backs up the database,
installs the release and switches the live site to it. If the new release
does not answer, it switches back on its own.

Reached over Tailscale only (firewall rule: 100.64.0.0/10).

## Build (on the development PC, cmd)

```
cd /d F:\AppCore_ERP_Studio\Deploy_Agent\AppCore.DeployAgent
dotnet publish -c Release -o publish
```

Copy the `publish` folder to skyhost (any folder, e.g. `C:\Temp\agent`).

## Install / update (on skyhost, cmd "Run as administrator")

```
cd /d C:\Temp\agent
install-agent.cmd
```

First time only: open `C:\AppCore\agent\appsettings.json` and set

* `Agent:Token` - a long random secret (the Server Management page needs the same value).
  Make one with: `powershell -c "[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')"`
* `Agent:Database:Password` - the postgres password (used by pg_dump for the backup)

then `sc start AppCoreDeployAgent`.

Updating later: publish again, copy, run `install-agent.cmd` again. The
server's `appsettings.json` (token, password) is kept.

## Folders (C:\AppCore)

| Folder       | What                                                       |
|--------------|------------------------------------------------------------|
| `agent\`     | the agent itself                                           |
| `releases\`  | one folder per release (R-0001, R-0002 ...), last 5 kept   |
| `current`    | link to the live release (the AppCoreERP service runs it)  |
| `shared\`    | server-only files copied into every release, e.g. `appsettings.Production.json` |
| `backups\`   | database backups taken before each deployment, last 10 kept |
| `logs\`      | one log file per deployment / rollback                     |

## Check it works (from the development PC)

```
curl -H "X-Agent-Token: <token>" http://100.117.11.97:5099/agent/health
```

## API (all calls need `X-Agent-Token`)

| Call                        | What                                       |
|-----------------------------|--------------------------------------------|
| `GET  /agent/health`        | agent, disk, live service, current release |
| `GET  /agent/releases`      | releases on the server                     |
| `POST /agent/deployments`   | multipart: `package` (zip), `release`, `commit`, `by` -> `{ jobId }` |
| `POST /agent/rollback`      | `{ "release": "R-0006", "by": "Zahid" }` -> `{ jobId }` |
| `GET  /agent/jobs/{jobId}`  | status, step, percent, log                 |

The release zip must have `AppCore.API.exe` at its top level (the API
publish output with the Angular build in `wwwroot`). The Deployment Center
builds it.

## Services under their own accounts (once, on skyhost)
By default the ERP and the Console run as LocalSystem (full control of the
server), and every Windows user of the server can read `C:\AppCore`
(settings files with passwords). `secure-services.cmd` (in the published
agent folder) changes that. cmd "Run as administrator", at a quiet hour,
one line at a time, trying the site after each :

    secure-services.cmd status
    secure-services.cmd console
    secure-services.cmd erp
    secure-services.cmd lock

- `console` / `erp` : the service gets its own small Windows account
  (`NT SERVICE\AppCoreConsole`, `NT SERVICE\AppCoreERP`) with rights on its
  own folders only. The service is asked if it answers; if not, it goes
  back to LocalSystem by itself.
- `lock` : `C:\AppCore`, `C:\ProgramData\AppCore` and `C:\ProgramData\AppCoreERP`
  can be opened only by the system, administrators and the two services.
  Both services are restarted and asked; if one does not answer, the
  folders are opened again by themselves. After this, edit a settings
  file with Notepad started "Run as administrator".
- Everything back as it was :  `secure-services.cmd back`
- The Deploy Agent stays LocalSystem : it must stop, change and start
  services and write the release folders.

After `erp`, also try once : a database backup from the ERP, and a
picture upload. After `console` : Create database for a test tenant
(the password book file may need its own right, see the message).

## Server security from the Console (2026-11-21)

Console, Deployments page, button **Server security** (Owner only). The agent does the work on the server (`ServerSecurity.cs`):

- Shows the Windows account of each service and whether `C:\AppCore` is closed to other Windows users.
- Runs one step of `secure-services.cmd` (console, erp, lock, back). Same file as by hand; it checks the service and undoes itself.
- ERP "work with no company": the ERP keeps `C:\ProgramData\AppCore\no-company.json` (what asked, how often, when). The agent sets `Tenancy__NoCompany` (Refuse / Warn) as an environment value of the `AppCoreERP` service and restarts it with a health check; not healthy = put back. The ERP settings file is never touched.
- By itself: after `Agent:NoCompanyCleanDays` (7) clean days the agent sets Refuse at `Agent:NoCompanyAutoHour` (3, server clock). `Agent:NoCompanyAuto` false = never by itself. A failed try or "Back to Warn" stops it until "Let the agent switch by itself" is pressed.
- Every step has a log file in `C:\AppCore\logs` (`..._security_<step>.log`, `..._nocompany_<mode>.log`).
