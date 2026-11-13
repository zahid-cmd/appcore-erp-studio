# Handoff : Human Resource module (2026-11-13, night)

Written by the Claude Code session that built the HR module (desktop app, folder `F:\AppCore_ERP_Studio`). Read `handoff-2026-11-07.md` first for the owner's working rules; they all still apply.

## Where it stands

All five phases are written. Backend and frontend build with no errors and the API was restarted with the code. **Only phase 1 has been seen working by the owner.** Phases 2 to 5 had not been run against the database when this note was written : expect fixes when they are tested. Nothing is committed.

| Phase | Menu | Pages | Script (`Backend_Studio\Database`) | State |
|---|---|---|---|---|
| 1 | Human Resource Setup (existing) | Shifts, Holidays, Leave Types, Salary Heads | `HumanResource_Phase1_Engine.sql` | Run; pages load |
| 1 | Employee Management (new) | Employees | same | Run; page loads |
| 2 | Attendance Management (new) | Daily Attendance, Leave Applications, Monthly Attendance | `HumanResource_Phase2_Engine.sql` | Not run, not tested |
| 3 | Payroll Management (new) | Salary Advances, Salary Sheets | `HumanResource_Phase3_Engine.sql` | Not run, not tested |
| 4 | Employee Management | Employee Movements | `HumanResource_Phase4_Engine.sql` | Not run, not tested |
| 5 | HR Reports (new) | Staff & Payroll Reports | `HumanResource_Phase5_Engine.sql` | Not run, not tested |

## Owner : to do

1. Run scripts 2 to 5 in order on `AppCoreERP_Studio` (whole script, F5; each is safe to run again).
2. Security & Permission > Activity Assignment : tick the activities on the new pages (Approve too on Leave Applications and Salary Sheets; View on Staff & Payroll Reports), then log in again.
3. Settings > Account Settings > Posting Setup : choose a ledger for the four **Payroll** rows before posting a salary sheet.
4. Test in this order : employees with a salary structure -> Daily Attendance for a month -> a leave application approved -> Monthly Attendance -> a salary advance -> Generate a salary sheet -> Approve -> Post -> check the Journal Voucher -> a payslip -> an increment on Employee Movements -> the reports.

## Where the code is

All new, all hand-written (NEVER run Code Sync for these pages).

- Backend, four projects, under `HumanResourceManangement\` : `HumanResourceSetup` (HrSetup*), `EmployeeManagement` (Employees*, EmployeeMovements*), `AttendanceManagement`, `PayrollManagement`, `HrReports`.
- Frontend : `Frontend_Studio\Studio_UI\src\features\human-resource-manangement\` : `human-resource-setup` (hr-setup files), `employee-management`, `attendance-management`, `payroll-management`, `hr-reports`.
- Shared files with a MANUAL block added (small additions only; the other Claude session edits these too) :
  - `AppCore.Infrastructure\DependencyInjection.cs` : one block per phase, above the Terms & Conditions block.
  - `AppCore.Infrastructure\Persistence\AppDbContext.cs` : a `DbSet` for every HR table, above the Sales Returns block.
  - `features\human-resource-manangement\routes\human-resource-manangement.routes.ts` : the four new menus.
  - `human-resource-setup\routes\human-resource-setup.routes.ts` : the four setup pages.

## Design decisions (do not undo without asking the owner)

- Tables are prefixed `Hr`. The folder keeps its spelling `human-resource-manangement` (renaming breaks the routes and the sync engine).
- The four setup pages share one generic list and one generic form (`human-resource-setup\pages\hr-setup`), described in `models\hr-setup.model.ts`; the backend shares `HrSetupRepositoryBase` and `HrSetupControllerBase`. A new field on a setup page = one entry in the model + the DTO / entity / `ApplyAsync`.
- An employee is separate from a user login; the link (`UserProfileId`) is optional.
- Salary heads with `SystemKey` OVERTIME / ABSENT / LATE / ADVANCE are locked on the Salary Heads page. Payroll works those amounts out itself; it does not read these rows yet.
- Attendance : one row per employee per day (`HrAttendance`); status P, L, H, A, LV, WO, HD. Present with an in time after the shift start + grace is saved as Late. A day without a row is a holiday, a weekly off day or "not marked" (unpaid).
- Leave : approving an application writes LV rows into `HrAttendance`; cancelling removes them. The leave balance of a year = the LV rows of the year, so leave marked directly on Daily Attendance counts too.
- Payroll : one sheet per branch per month, Draft -> Approved -> Posted. The rules are in the header comment of `SalarySheetsRepository.cs`. Posting writes one Journal Voucher with `IJournalVoucherRepository.CreatePostedAsync` through the purposes `PAYROLL-SALARY-EXPENSE` (Dr), `PAYROLL-STAFF-ADVANCE`, `PAYROLL-DEDUCTIONS-PAYABLE`, `PAYROLL-SALARY-PAYABLE` (Cr).
- Employee Movements : saving one changes the employee at once; it is never edited; only the employee's latest one can be deleted (the employee goes back).

## Known gaps (told to the owner)

- Paying salary and advances out is a manual Payment Voucher : `IPaymentVoucherRepository` has no `CreatePostedAsync`. Adding one means changing a core accounting file : ask the owner first.
- Payslips and the report print are a plain browser print window, not Print Engine documents (no company logo).
- No Festival Bonus page (use "Other +" on the salary sheet).
- Leave carry forward is stored on Leave Types but not worked out; the balance is one year at a time.
- No fingerprint device import; no employee photo / document upload.
- Final settlement on a Separation is a typed amount and note, not a calculation.
- The Employees page can still change designation, branch and salary directly, without a movement.
- The journal of a salary sheet has one debit and up to three credits in one group : not yet run. If Post is refused, look there first.

## Lessons from this session

- A new table needs a `DbSet` in `AppDbContext.cs` : the context applies entity configurations only for registered sets. Without it the page fails with "Cannot create a DbSet for '...' because this type is not included in the model".
- After C# changes, build and restart the API through the dev agent : `POST http://127.0.0.1:4199/build-restart` with the header `X-AppCore-Dev: 1`, then `GET /status` until `busy` is false. A plain `dotnet build` shows file-lock errors while the API runs (the code still compiles; look for `error CS`).
- New files are written with LF by the tools : convert them to CRLF afterwards.

## Other work in the tree (not from this session)

Uncommitted when this note was written : the Bookings changes (delete / restore, page history, item filters, customer card) and the other session's Terms & Conditions page and UTF8 change. Neither was touched here.
