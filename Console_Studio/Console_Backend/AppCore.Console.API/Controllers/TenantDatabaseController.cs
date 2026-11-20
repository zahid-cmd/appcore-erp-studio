//===============================================================
// Tenant database : api/tenants/{publicId}/database (2026-11-19)
// --------------------------------------------------------------
// The "Create database" button of the tenant page (onboarding C2).
// Design : project doc design-database-multi-product.md.
//
//   GET   the plan : server (of the tenant's product), current
//         template, database name, login name, and what is missing
//   POST  creates it :
//     1. its own login   appcore_t_<pp>_<code>  (random password)
//     2. the database    AppCore_<PP>_<CODE>    from the template,
//                        owned by that login; nobody else may connect
//     3. company details (from the customer), the current financial
//        year, the admin's first password (ERP format PBKDF2)
//     4. Control : server, database, login key, status Trial
//     Answers ONCE with the admin password.
//     The login's password is SEALED with the ERP server's public
//     key (PlatformKeys 'tenant-credentials', 2026-11-20) and kept
//     in Tenants.DbPasswordSealed : the ERP opens it, nothing to
//     paste, no redeploy. Without that key (12_... not run yet) the
//     old way : the login line is shown once for the ERP server's
//     appsettings (Tenancy:Credentials:<key>).
//
//   POST admin-password   (2026-11-20) a new password for the
//         client's admin user, shown once : for a first password
//         that was lost, or an administrator who is locked out.
//   POST login            (2026-11-20) a new password for the
//         client's own database login, sealed again with the ERP
//         server's key : after the key was replaced, or when the
//         password may have leaked.
//
// The server admin login comes from THIS Console's appsettings :
//
//   "DatabaseServers": {
//       "PG-TW-01": {                 // = DatabaseServers.CredentialKey
//           "Username": "postgres",
//           "Password": "...",
//           "Host": "100.117.11.97",  // optional : how the Console
//           "Port": 5433              // reaches it
//       }
//   }
//
// If a step fails after the database was made, the database and
// the login are removed again and Control is not changed.
//===============================================================

using System.Security.Cryptography;
using System.Text.RegularExpressions;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Npgsql;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


public record TenantDatabaseCreate(int? FinancialYearStartMonth);

// Remove leftover : the database name typed again, as the yes
public record TenantDatabaseLeftover(string? Confirm);


[ApiController]
[Authorize]
[Route("api/tenants/{publicId:guid}/database")]
public partial class TenantDatabaseController : ControllerBase
{
    private readonly ControlDbContext _db;
    private readonly Audit _audit;
    private readonly IConfiguration _config;

    public TenantDatabaseController(ControlDbContext db, Audit audit, IConfiguration config)
    {
        _db = db;
        _audit = audit;
        _config = config;
    }

    private sealed record Plan(
        Tenant Tenant,
        Customer Customer,
        Product Product,
        DatabaseServer? Server,
        ProductTemplate? Template,
        string? DatabaseName,
        string? LoginName,
        string? CredentialKey,
        List<string> Problems);

    [GeneratedRegex("^[A-Z][A-Z0-9]{1,29}$")]
    private static partial Regex DbCodePattern();

    private async Task<Plan?> PlanAsync(Guid publicId)
    {
        Tenant? t = await _db.Tenants.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (t is null)
        {
            return null;
        }

        Customer c = await _db.Customers.FirstAsync(x => x.CustomerId == t.CustomerId);
        Product p = await _db.Products.FirstAsync(x => x.ProductId == t.ProductId);

        List<string> problems = new();

        DatabaseServer? server =
            await _db.DatabaseServers
                .Where(x => x.ProductId == p.ProductId && x.Status == "Active")
                .OrderBy(x => x.ServerCode)
                .FirstOrDefaultAsync();

        ProductTemplate? template =
            await _db.ProductTemplates
                .Where(x => x.ProductId == p.ProductId && x.IsCurrent)
                .OrderByDescending(x => x.ProductTemplateId)
                .FirstOrDefaultAsync();

        string code = t.TenantCode.Replace("-", string.Empty).ToUpperInvariant();
        string? shortCode = p.ShortCode;

        string? database = null, login = null, key = null;

        if (string.IsNullOrWhiteSpace(shortCode))
        {
            problems.Add($"Product {p.ProductName} has no short code (run 06_Multi_Product_Databases.sql).");
        }
        else if (!DbCodePattern().IsMatch(code))
        {
            problems.Add("The tenant code must start with a letter and hold letters and digits only (e.g. RAHIM01).");
        }
        else
        {
            database = $"AppCore_{shortCode}_{code}";
            login = $"appcore_t_{shortCode}_{code}".ToLowerInvariant();
            key = $"{shortCode}-{code}";
        }

        if (!string.IsNullOrWhiteSpace(t.DatabaseName))
        {
            problems.Add($"This tenant already has a database ({t.DatabaseName}).");
        }

        if (t.Status is not ("Provisioning" or "Trial"))
        {
            problems.Add($"A database is created only for a tenant in Provisioning or Trial (now {t.Status}).");
        }

        if (server is null)
        {
            problems.Add($"No active database server for {p.ProductName}.");
        }
        else if (string.IsNullOrWhiteSpace(_config[$"DatabaseServers:{server.CredentialKey}:Username"]))
        {
            problems.Add($"The Console's appsettings.json has no login for server {server.ServerCode} (DatabaseServers:{server.CredentialKey}).");
        }

        if (template is null)
        {
            problems.Add($"No current template for {p.ProductName}.");
        }

        return new Plan(t, c, p, server, template, database, login, key, problems);
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid publicId)
    {
        Plan? plan = await PlanAsync(publicId);

        if (plan is null)
        {
            return NotFound();
        }

        // what a Create database that failed half way left on the
        // server (2026-11-20) : it blocks the next try until removed
        (bool leftover, string? leftoverNote) = await LeftoverAsync(plan);

        return Ok(new
        {
            plan.DatabaseName,
            plan.LoginName,
            plan.CredentialKey,
            Server = plan.Server is null ? null : $"{plan.Server.ServerCode} ({plan.Server.Host}:{plan.Server.Port})",
            Template = plan.Template?.DatabaseName,
            TemplateVersion = plan.Template?.SchemaVersion,
            plan.Problems,
            Leftover = leftover,
            LeftoverNote = leftoverNote,
            CanCreate = plan.Problems.Count == 0 && !leftover && leftoverNote is null
        });
    }

    //-----------------------------------------------------------
    // Leftover (2026-11-20) : a database with the tenant's planned
    // name is on the server, but the tenant has none recorded. It
    // is what a Create database that stopped half way (the Console
    // was restarted, the server went away, the undo failed) left.
    // Create refuses while it is there.
    //
    // A database that ANOTHER tenant has recorded is never a
    // leftover : the note says so and nothing can be removed.
    //-----------------------------------------------------------

    // can the Console look at the tenant's server at all ?
    private bool ServerUsable(Plan plan) =>
        plan.Server is not null
        && plan.DatabaseName is not null
        && plan.LoginName is not null
        && !string.IsNullOrWhiteSpace(_config[$"DatabaseServers:{plan.Server.CredentialKey}:Username"]);

    // the other tenant that has this database name recorded
    private Task<string?> OwnerOfAsync(Plan plan) =>
        _db.Tenants
            .Where(x => x.TenantId != plan.Tenant.TenantId && x.DatabaseName == plan.DatabaseName)
            .Select(x => x.TenantCode)
            .FirstOrDefaultAsync();

    private async Task<(bool Leftover, string? Note)> LeftoverAsync(Plan plan)
    {
        if (!string.IsNullOrWhiteSpace(plan.Tenant.DatabaseName) || !ServerUsable(plan))
        {
            return (false, null);
        }

        try
        {
            await using NpgsqlConnection cn = new(ServerConnection(plan.Server!, "postgres"));
            await cn.OpenAsync();

            if (await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_database WHERE datname = @n", ("n", plan.DatabaseName!)) == 0)
            {
                return (false, null);
            }
        }
        catch
        {
            // the server cannot be asked now : Create says why
            return (false, null);
        }

        string? owner = await OwnerOfAsync(plan);

        return owner is null
            ? (true, null)
            : (false, $"A database named {plan.DatabaseName} is on the server and belongs to tenant {owner}. It cannot be used or removed here : this tenant needs another code.");
    }

    [HttpPost("leftover/remove")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> RemoveLeftover(Guid publicId, [FromBody] TenantDatabaseLeftover request)
    {
        Plan? plan = await PlanAsync(publicId);

        if (plan is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(plan.Tenant.DatabaseName))
        {
            return BadRequest(new { message = $"This tenant has a database ({plan.Tenant.DatabaseName}) : it is not a leftover and is not removed here." });
        }

        if (!ServerUsable(plan))
        {
            return BadRequest(new { message = string.Join(" ", plan.Problems) });
        }

        DatabaseServer server = plan.Server!;
        string database = plan.DatabaseName!;
        string login = plan.LoginName!;

        if (!string.Equals(request?.Confirm?.Trim(), database, StringComparison.Ordinal))
        {
            return BadRequest(new { message = $"Type the database name exactly ({database}) to remove it." });
        }

        // same lock as Create : never while a Create is running
        NpgsqlConnection? gate;

        try
        {
            gate = await TryLockAsync(server, database);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The database server {server.ServerCode} could not be reached : {ex.Message}" });
        }

        if (gate is null)
        {
            return Conflict(new { message = $"{database} is being created right now (another click or another staff member). Wait a minute and refresh the page." });
        }

        await using NpgsqlConnection gateHeld = gate;

        // a Create may have finished while this waited
        await _db.Entry(plan.Tenant).ReloadAsync();

        if (!string.IsNullOrWhiteSpace(plan.Tenant.DatabaseName))
        {
            return BadRequest(new { message = $"This tenant now has a database ({plan.Tenant.DatabaseName}). Refresh the page." });
        }

        if (await OwnerOfAsync(plan) is { } owner)
        {
            return BadRequest(new { message = $"{database} belongs to tenant {owner} : it is not removed." });
        }

        bool databaseRemoved = false, loginRemoved = false;
        string? loginNote = null;

        try
        {
            NpgsqlConnection.ClearAllPools();

            await using NpgsqlConnection cn = new(ServerConnection(server, "postgres"));
            await cn.OpenAsync();

            if (await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_database WHERE datname = @n", ("n", database)) > 0)
            {
                await ExecAsync(cn, $"DROP DATABASE {Q(database)} WITH (FORCE)");

                databaseRemoved = true;
            }

            // The login goes too when it is a client login of the
            // Console, nobody's recorded login, and owns no database
            bool loginThere =
                await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_roles WHERE rolname = @n", ("n", login)) > 0;

            if (loginThere)
            {
                bool recorded =
                    await _db.Tenants.AnyAsync(x => x.DbUsername == login);

                long owns =
                    await ScalarAsync<long>(cn,
                        "SELECT count(*) FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba WHERE r.rolname = @n", ("n", login));

                long super =
                    await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_roles WHERE rolname = @n AND rolsuper", ("n", login));

                if (!login.StartsWith("appcore_t_", StringComparison.Ordinal) || super > 0)
                {
                    loginNote = $"The login {login} was left : it is not a client login made by the Console.";
                }
                else if (recorded || owns > 0)
                {
                    loginNote = $"The login {login} was left : it is still in use.";
                }
                else
                {
                    try
                    {
                        await ExecAsync(cn, $"DROP ROLE {Q(login)}");

                        loginRemoved = true;
                    }
                    catch (Exception ex)
                    {
                        // harmless : the next Create gives it a new password
                        loginNote = $"The login {login} was left ({ex.Message}). It does not block Create database.";
                    }
                }
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The leftover could not be removed : {ex.Message}" });
        }

        if (!databaseRemoved && !loginRemoved)
        {
            return Ok(new { DatabaseName = database, DatabaseRemoved = false, LoginName = login, LoginRemoved = false, Note = loginNote ?? "Nothing was left on the server." });
        }

        _audit.Add("Tenant.RemoveLeftoverDatabase", "Tenant", plan.Tenant.TenantCode, plan.Tenant.TenantId,
            $"{(databaseRemoved ? $"database {database} dropped" : "no database")} on {server.ServerCode}; {(loginRemoved ? $"login {login} dropped" : "login kept")} (left by a Create database that failed)");

        await _db.SaveChangesAsync();

        return Ok(new { DatabaseName = database, DatabaseRemoved = databaseRemoved, LoginName = login, LoginRemoved = loginRemoved, Note = loginNote });
    }

    [HttpPost]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Create(Guid publicId, [FromBody] TenantDatabaseCreate request)
    {
        Plan? plan = await PlanAsync(publicId);

        if (plan is null)
        {
            return NotFound();
        }

        if (plan.Problems.Count > 0)
        {
            return BadRequest(new { message = string.Join(" ", plan.Problems) });
        }

        // One at a time per database (2026-11-20) : a double click, or
        // two staff, would change the login's password under the
        // first attempt and leave the client with a password that
        // does not work.
        NpgsqlConnection? gate;

        try
        {
            gate = await TryLockAsync(plan.Server!, plan.DatabaseName!);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The database server {plan.Server!.ServerCode} could not be reached : {ex.Message}" });
        }

        if (gate is null)
        {
            return Conflict(new { message = $"{plan.DatabaseName} is being created right now (another click or another staff member). Wait a minute and refresh the page." });
        }

        await using NpgsqlConnection gateHeld = gate;

        // the other attempt may have finished while this one waited
        await _db.Entry(plan.Tenant).ReloadAsync();

        if (!string.IsNullOrWhiteSpace(plan.Tenant.DatabaseName))
        {
            return BadRequest(new { message = $"This tenant already has a database ({plan.Tenant.DatabaseName}). Refresh the page." });
        }

        int startMonth = request.FinancialYearStartMonth is >= 1 and <= 12 ? request.FinancialYearStartMonth.Value : 7;

        DatabaseServer server = plan.Server!;
        ProductTemplate template = plan.Template!;
        string database = plan.DatabaseName!;
        string login = plan.LoginName!;

        string loginPassword = RandomText(32, PasswordAlphabet);
        string adminPassword = RandomText(12, PasswordAlphabet);

        // the ERP server's public key (null : old way, line to paste)
        string? publicKey =
            await _db.PlatformKeys
                .Where(x => x.KeyName == "tenant-credentials")
                .Select(x => x.PublicKeyPem)
                .FirstOrDefaultAsync();

        string? sealedPassword = null;

        if (!string.IsNullOrWhiteSpace(publicKey))
        {
            try
            {
                sealedPassword = Seal(publicKey, loginPassword);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"The ERP server's public key in PlatformKeys cannot be used ({ex.Message}). Run 12_Tenant_Credential_Public_Key.sql again with the key from skyhost." });
            }
        }

        string adminConnection = ServerConnection(server, "postgres");

        bool roleMade = false, databaseMade = false;

        try
        {
            //---------------------------------------------------
            // 1-2. Login and database (outside a transaction :
            //      CREATE DATABASE cannot run inside one)
            //---------------------------------------------------

            await using (NpgsqlConnection cn = new(adminConnection))
            {
                await cn.OpenAsync();

                if (await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_database WHERE datname = @n", ("n", database)) > 0)
                {
                    return BadRequest(new { message = $"A database named {database} already exists on {server.ServerCode}. Refresh the page : if it was left by a Create database that failed, the page offers Remove leftover." });
                }

                if (await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_database WHERE datname = @n", ("n", template.DatabaseName)) == 0)
                {
                    return BadRequest(new { message = $"The template database {template.DatabaseName} was not found on {server.ServerCode}." });
                }

                long others = await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_stat_activity WHERE datname = @n AND pid <> pg_backend_pid()", ("n", template.DatabaseName));

                if (others > 0)
                {
                    return BadRequest(new { message = $"{others} connection(s) are open on {template.DatabaseName} (for example a pgAdmin Query Tool). Close them (in pgAdmin : right-click the database > Disconnect) and try again." });
                }

                bool roleExists = await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_roles WHERE rolname = @n", ("n", login)) > 0;

                await ExecAsync(cn, roleExists
                    ? $"ALTER ROLE {Q(login)} WITH LOGIN PASSWORD {L(loginPassword)}"
                    : $"CREATE ROLE {Q(login)} WITH LOGIN PASSWORD {L(loginPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE");

                roleMade = !roleExists;

                await ExecAsync(cn, $"CREATE DATABASE {Q(database)} WITH TEMPLATE {Q(template.DatabaseName)} OWNER {Q(login)} ENCODING 'UTF8'");

                databaseMade = true;

                await ExecAsync(cn, $"REVOKE ALL ON DATABASE {Q(database)} FROM PUBLIC");
                await ExecAsync(cn, $"GRANT CONNECT, TEMPORARY ON DATABASE {Q(database)} TO {Q(login)}");
            }

            //---------------------------------------------------
            // 3. Inside the new database : owner of everything,
            //    company, financial year, admin password
            //---------------------------------------------------

            DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));
            int startYear = today.Month >= startMonth ? today.Year : today.Year - 1;
            DateOnly fyStart = new(startYear, startMonth, 1);
            DateOnly fyEnd = fyStart.AddYears(1).AddDays(-1);
            string fyName = fyStart.Year == fyEnd.Year ? $"FY {fyStart.Year}" : $"FY {fyStart.Year}-{fyEnd.Year}";

            string adminHash = HashPassword(adminPassword);

            await using (NpgsqlConnection cn = new(ServerConnection(server, database)))
            {
                await cn.OpenAsync();

                await using NpgsqlTransaction tx = await cn.BeginTransactionAsync();

                await ExecAsync(cn,
                    $$"""
                    DO $own$
                    DECLARE r record;
                    BEGIN
                        EXECUTE format('ALTER SCHEMA public OWNER TO %I', {{L(login)}});

                        FOR r IN SELECT c.relname, c.relkind
                                 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                                 WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
                        LOOP
                            EXECUTE format(CASE r.relkind WHEN 'v' THEN 'ALTER VIEW public.%I OWNER TO %I'
                                                          WHEN 'm' THEN 'ALTER MATERIALIZED VIEW public.%I OWNER TO %I'
                                                          WHEN 'f' THEN 'ALTER FOREIGN TABLE public.%I OWNER TO %I'
                                                          ELSE 'ALTER TABLE public.%I OWNER TO %I' END,
                                           r.relname, {{L(login)}});
                        END LOOP;

                        -- sequences not owned by a column (owned ones follow their table)
                        FOR r IN SELECT c.relname
                                 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                                 WHERE n.nspname = 'public' AND c.relkind = 'S'
                                   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('a', 'i'))
                        LOOP
                            EXECUTE format('ALTER SEQUENCE public.%I OWNER TO %I', r.relname, {{L(login)}});
                        END LOOP;

                        FOR r IN SELECT p.oid::regprocedure AS sig
                                 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                                 WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
                                   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
                        LOOP
                            EXECUTE format('ALTER ROUTINE %s OWNER TO %I', r.sig, {{L(login)}});
                        END LOOP;
                    END $own$;
                    """, tx);

                Customer c = plan.Customer;

                await ExecAsync(cn,
                    """
                    UPDATE public."Companies"
                    SET "CompanyName" = @legal, "CompanyShortName" = @short,
                        "AddressLine1" = @address, "BINNo" = @bin, "TINNo" = @tin,
                        "Email" = @email, "Phone" = @phone, "ModifiedDate" = now()
                    """, tx,
                    ("legal", c.LegalName), ("short", plan.Tenant.DisplayName),
                    ("address", c.Address ?? string.Empty), ("bin", c.BinNo ?? string.Empty), ("tin", c.TinNo ?? string.Empty),
                    ("email", c.Email ?? string.Empty), ("phone", c.Phone ?? string.Empty));

                await ExecAsync(cn,
                    """
                    UPDATE public."FinancialYears"
                    SET "FinancialYearCode" = 'FY-0001', "FinancialYearName" = @name,
                        "StartDate" = @start, "EndDate" = @end,
                        "IsCurrent" = true, "YearStatus" = 'Open', "Status" = true, "IsDeleted" = false,
                        "ModifiedDate" = now()
                    WHERE "FinancialYearId" = (SELECT min("FinancialYearId") FROM public."FinancialYears");
                    DELETE FROM public."FinancialYears"
                    WHERE "FinancialYearId" <> (SELECT min("FinancialYearId") FROM public."FinancialYears");
                    """, tx,
                    ("name", fyName), ("start", fyStart), ("end", fyEnd));

                long adminId = await ScalarAsync<long>(cn, """SELECT "UserProfileId" FROM public."UserProfiles" WHERE lower("UserName") = 'admin' LIMIT 1""", tx);

                if (adminId == 0)
                {
                    throw new InvalidOperationException("The template has no user named admin.");
                }

                await ExecAsync(cn,
                    """
                    DELETE FROM public."UserCredentials" WHERE "UserProfileId" = @id;
                    INSERT INTO public."UserCredentials" ("UserProfileId", "PasswordHash", "PasswordChangedDate", "CreatedDate")
                    VALUES (@id, @hash, now(), now());
                    """, tx,
                    ("id", adminId), ("hash", adminHash));

                await tx.CommitAsync();
            }

            NpgsqlConnection.ClearAllPools();

            //---------------------------------------------------
            // 4. Control
            //---------------------------------------------------

            Tenant tenant = plan.Tenant;
            string fromStatus = tenant.Status;

            tenant.DatabaseServerId = server.DatabaseServerId;
            tenant.DatabaseName = database;
            tenant.CredentialKey = plan.CredentialKey;
            tenant.DbUsername = sealedPassword is null ? null : login;
            tenant.DbPasswordSealed = sealedPassword;
            tenant.SchemaVersion = template.SchemaVersion;
            tenant.Status = "Trial";
            tenant.TrialEndsOn ??= DateOnly.FromDateTime(DateTime.UtcNow).AddDays(30);
            tenant.ModifiedDate = DateTime.UtcNow;
            tenant.ModifiedBy = User.StaffId();

            if (fromStatus != "Trial")
            {
                _db.TenantStatusHistory.Add(new TenantStatusHistory
                {
                    TenantId = tenant.TenantId,
                    FromStatus = fromStatus,
                    ToStatus = "Trial",
                    Reason = $"Database {database} created from {template.DatabaseName}",
                    ChangedBy = User.StaffId()
                });
            }

            _audit.Add("Tenant.CreateDatabase", "Tenant", tenant.TenantCode, tenant.TenantId,
                $"{database} on {server.ServerCode} from {template.DatabaseName} {template.SchemaVersion}; login {login} ({(sealedPassword is null ? "for appsettings" : "sealed")}); {fyName}");

            await _db.SaveChangesAsync();

            // the owner's password book (dev PC only; appended, never rewritten)
            string? bookFile = AppendPasswordBook(
                plan.Tenant, plan.Customer, database, server.ServerCode, fyName, adminPassword);

            return Ok(new
            {
                DatabaseName = database,
                Server = server.ServerCode,
                LoginName = login,
                plan.CredentialKey,
                // sealed : the ERP opens it itself, nothing is shown
                Sealed = sealedPassword is not null,
                LoginPassword = sealedPassword is null ? loginPassword : null,
                AdminUser = "admin",
                AdminPassword = adminPassword,
                PasswordBookSaved = bookFile is not null,
                PasswordBook = bookFile is null ? null : Path.GetFileName(bookFile),
                FinancialYear = fyName,
                // only without the key : for the ERP server's appsettings.json (Tenancy:Credentials)
                SettingsSnippet = sealedPassword is null
                    ? $"\"{plan.CredentialKey}\": {{ \"Username\": \"{login}\", \"Password\": \"{loginPassword}\", \"Host\": \"localhost\", \"Port\": {server.Port} }}"
                    : null
            });
        }
        catch (Exception ex)
        {
            // undo : the half-made database and the new login
            bool undone = true;

            try
            {
                NpgsqlConnection.ClearAllPools();

                await using NpgsqlConnection cn = new(adminConnection);
                await cn.OpenAsync();

                if (databaseMade)
                {
                    await ExecAsync(cn, $"DROP DATABASE IF EXISTS {Q(database)} WITH (FORCE)");
                }

                if (roleMade)
                {
                    await ExecAsync(cn, $"DROP ROLE IF EXISTS {Q(login)}");
                }
            }
            catch
            {
                // the half-made database stays : the tenant page
                // finds it and offers Remove leftover
                undone = false;
            }

            return BadRequest(new
            {
                message = undone
                    ? $"The database could not be created : {ex.Message}"
                    : $"The database could not be created : {ex.Message} The half-made database could not be cleaned up either : refresh the page and use Remove leftover before trying again."
            });
        }
    }

    //-----------------------------------------------------------
    // Resets (2026-11-20) : for a tenant that has its database
    //-----------------------------------------------------------

    private const string PasswordAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    private sealed record Existing(Tenant Tenant, DatabaseServer Server);

    // the tenant, its database server and the Console's login for
    // that server; else the reason
    private async Task<(Existing? Found, IActionResult? Problem)> ExistingAsync(Guid publicId)
    {
        Tenant? t = await _db.Tenants.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (t is null)
        {
            return (null, NotFound());
        }

        if (string.IsNullOrWhiteSpace(t.DatabaseName) || t.DatabaseServerId is null)
        {
            return (null, BadRequest(new { message = "This tenant has no database yet." }));
        }

        DatabaseServer? server =
            await _db.DatabaseServers.FirstOrDefaultAsync(x => x.DatabaseServerId == t.DatabaseServerId);

        if (server is null)
        {
            return (null, BadRequest(new { message = "The tenant's database server was not found." }));
        }

        if (string.IsNullOrWhiteSpace(_config[$"DatabaseServers:{server.CredentialKey}:Username"]))
        {
            return (null, BadRequest(new { message = $"The Console's appsettings.json has no login for server {server.ServerCode} (DatabaseServers:{server.CredentialKey})." }));
        }

        return (new Existing(t, server), null);
    }

    // A new password for the client's admin user. Shown once.
    [HttpPost("admin-password")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> ResetAdminPassword(Guid publicId)
    {
        (Existing? found, IActionResult? problem) = await ExistingAsync(publicId);

        if (found is null)
        {
            return problem!;
        }

        Tenant tenant = found.Tenant;
        DatabaseServer server = found.Server;

        string adminPassword = RandomText(12, PasswordAlphabet);

        try
        {
            await using NpgsqlConnection cn = new(ServerConnection(server, tenant.DatabaseName!));
            await cn.OpenAsync();

            await using NpgsqlTransaction tx = await cn.BeginTransactionAsync();

            long adminId = await ScalarAsync<long>(cn, """SELECT "UserProfileId" FROM public."UserProfiles" WHERE lower("UserName") = 'admin' LIMIT 1""", tx);

            if (adminId == 0)
            {
                return BadRequest(new { message = $"{tenant.DatabaseName} has no user named admin." });
            }

            await ExecAsync(cn,
                """
                DELETE FROM public."UserCredentials" WHERE "UserProfileId" = @id;
                INSERT INTO public."UserCredentials" ("UserProfileId", "PasswordHash", "PasswordChangedDate", "CreatedDate")
                VALUES (@id, @hash, now(), now());
                """, tx,
                ("id", adminId), ("hash", HashPassword(adminPassword)));

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The admin password could not be reset : {ex.Message}" });
        }

        _audit.Add("Tenant.ResetAdminPassword", "Tenant", tenant.TenantCode, tenant.TenantId,
            $"New password for user admin in {tenant.DatabaseName} on {server.ServerCode}");

        await _db.SaveChangesAsync();

        Customer customer = await _db.Customers.FirstAsync(x => x.CustomerId == tenant.CustomerId);

        string? bookFile = AppendPasswordBook(
            tenant, customer, tenant.DatabaseName!, server.ServerCode, string.Empty, adminPassword, reset: true);

        return Ok(new
        {
            Kind = "admin",
            AdminUser = "admin",
            AdminPassword = adminPassword,
            PasswordBookSaved = bookFile is not null,
            PasswordBook = bookFile is null ? null : Path.GetFileName(bookFile)
        });
    }

    // A new password for the client's own database login, sealed
    // again with the ERP server's public key. Nothing is shown :
    // the ERP opens it itself within a minute.
    [HttpPost("login")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> ResetLogin(Guid publicId)
    {
        (Existing? found, IActionResult? problem) = await ExistingAsync(publicId);

        if (found is null)
        {
            return problem!;
        }

        Tenant tenant = found.Tenant;
        DatabaseServer server = found.Server;

        // the login : the one saved by Create database, else the
        // name Create database would have given
        string? login = tenant.DbUsername;

        if (string.IsNullOrWhiteSpace(login))
        {
            string? shortCode =
                await _db.Products
                    .Where(x => x.ProductId == tenant.ProductId)
                    .Select(x => x.ShortCode)
                    .FirstOrDefaultAsync();

            string code = tenant.TenantCode.Replace("-", string.Empty).ToUpperInvariant();

            login = string.IsNullOrWhiteSpace(shortCode) || !DbCodePattern().IsMatch(code)
                ? null
                : $"appcore_t_{shortCode}_{code}".ToLowerInvariant();
        }

        // only a client's own login is ever changed here, never a
        // shared or an admin login
        if (login is null || !login.StartsWith("appcore_t_", StringComparison.Ordinal))
        {
            return BadRequest(new { message = "This tenant has no own database login made by the Console (it was registered by hand), so there is nothing to reset here." });
        }

        string? publicKey =
            await _db.PlatformKeys
                .Where(x => x.KeyName == "tenant-credentials")
                .Select(x => x.PublicKeyPem)
                .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(publicKey))
        {
            return BadRequest(new { message = "The ERP server's public key is not in PlatformKeys. Run 12_Tenant_Credential_Public_Key.sql first." });
        }

        string loginPassword = RandomText(32, PasswordAlphabet);
        string sealedPassword;

        try
        {
            sealedPassword = Seal(publicKey, loginPassword);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The ERP server's public key in PlatformKeys cannot be used ({ex.Message}). Run 12_Tenant_Credential_Public_Key.sql again with the key from skyhost." });
        }

        // one at a time : two resets together could save the
        // password of the one that lost
        NpgsqlConnection? gate;

        try
        {
            gate = await TryLockAsync(server, tenant.DatabaseName!);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The database server {server.ServerCode} could not be reached : {ex.Message}" });
        }

        if (gate is null)
        {
            return Conflict(new { message = "This login is being reset right now (another click or another staff member). Wait a moment and refresh the page." });
        }

        await using NpgsqlConnection gateHeld = gate;

        try
        {
            await using NpgsqlConnection cn = new(ServerConnection(server, "postgres"));
            await cn.OpenAsync();

            if (await ScalarAsync<long>(cn, "SELECT count(*) FROM pg_roles WHERE rolname = @n AND NOT rolsuper", ("n", login)) == 0)
            {
                return BadRequest(new { message = $"The login {login} was not found on {server.ServerCode}. This tenant does not use its own login." });
            }

            await ExecAsync(cn, $"ALTER ROLE {Q(login)} WITH LOGIN PASSWORD {L(loginPassword)}");
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The database login could not be reset : {ex.Message}" });
        }

        // from here the old password is gone : the new one must be saved
        try
        {
            tenant.DbUsername = login;
            tenant.DbPasswordSealed = sealedPassword;
            tenant.ModifiedDate = DateTime.UtcNow;
            tenant.ModifiedBy = User.StaffId();

            _audit.Add("Tenant.ResetDatabaseLogin", "Tenant", tenant.TenantCode, tenant.TenantId,
                $"New sealed password for login {login} ({tenant.DatabaseName} on {server.ServerCode})");

            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"The login's password was changed on {server.ServerCode} but could not be saved in the Console ({ex.Message}). Press Reset database login again now : until then the client cannot open its database." });
        }

        return Ok(new
        {
            Kind = "login",
            LoginName = login
        });
    }

    //-----------------------------------------------------------
    // Helpers
    //-----------------------------------------------------------

    private string ServerConnection(DatabaseServer server, string database)
    {
        string section = $"DatabaseServers:{server.CredentialKey}";

        NpgsqlConnectionStringBuilder b = new()
        {
            Host = _config[$"{section}:Host"] is { Length: > 0 } host ? host : server.Host,
            Port = int.TryParse(_config[$"{section}:Port"], out int port) ? port : server.Port,
            Database = database,
            Username = _config[$"{section}:Username"],
            Password = _config[$"{section}:Password"],
            Timeout = 15,
            CommandTimeout = 300,
            Pooling = false
        };

        return b.ConnectionString;
    }

    // One job at a time per client database (2026-11-20). The lock
    // lives on the database SERVER (an advisory lock on its own
    // connection), so it also holds between two Consoles (dev PC
    // and live) and is released by itself when the job ends or the
    // Console stops. null : somebody else holds it.
    private async Task<NpgsqlConnection?> TryLockAsync(DatabaseServer server, string database)
    {
        NpgsqlConnection cn = new(ServerConnection(server, "postgres"));

        try
        {
            await cn.OpenAsync();

            bool mine = await ScalarAsync<bool>(cn,
                "SELECT pg_try_advisory_lock(hashtext(@n))", ("n", "appcore-console:" + database));

            if (mine)
            {
                return cn;
            }
        }
        catch
        {
            await cn.DisposeAsync();
            throw;
        }

        await cn.DisposeAsync();

        return null;
    }

    // identifier / literal : the names come from checked patterns,
    // quoted anyway
    private static string Q(string name) => "\"" + name.Replace("\"", "\"\"") + "\"";

    private static string L(string text) => "'" + text.Replace("'", "''") + "'";

    private static string RandomText(int length, string alphabet)
    {
        char[] chars = new char[length];

        for (int i = 0; i < length; i++)
        {
            chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
        }

        return new string(chars);
    }

    //-----------------------------------------------------------
    // Password book (owner 2026-11-20) : the first admin password
    // is ADDED to the owner's Password_Book.md on the Console PC.
    // Existing lines are never changed or removed. File :
    // appsettings "PasswordBook:File", else
    // Console_Studio\Console_Frontend\Password_Book\Password_Book.md
    // found above the API folder. Not found (e.g. the live Console
    // on the server) : nothing is written, the window says so.
    //-----------------------------------------------------------
    private string? AppendPasswordBook(Tenant tenant, Customer customer, string database, string server, string fyName, string adminPassword, bool reset = false)
    {
        try
        {
            string? file = _config["PasswordBook:File"];

            if (string.IsNullOrWhiteSpace(file))
            {
                DirectoryInfo? dir = new(AppContext.BaseDirectory);

                while (dir != null)
                {
                    string candidate = Path.Combine(dir.FullName, "Console_Frontend", "Password_Book", "Password_Book.md");

                    if (System.IO.File.Exists(candidate))
                    {
                        file = candidate;
                        break;
                    }

                    dir = dir.Parent;
                }
            }

            if (string.IsNullOrWhiteSpace(file) || !Directory.Exists(Path.GetDirectoryName(file)))
            {
                return null;
            }

            string? host = _db.TenantDomains
                .Where(d => d.TenantId == tenant.TenantId)
                .OrderByDescending(d => d.IsPrimary)
                .Select(d => d.HostName)
                .FirstOrDefault();

            DateTime local = DateTime.UtcNow.AddHours(6);

            string entry =
                "\r\n" +
                $"## {tenant.TenantCode} - {customer.LegalName} ({local:yyyy-MM-dd HH:mm})\r\n" +
                $"- Address : https://{host}\r\n" +
                "- ERP login : admin\r\n" +
                $"- {(reset ? "Admin password (reset from the Console)" : "First admin password")} : {adminPassword}\r\n" +
                $"- Database : {database} on {server}{(fyName.Length > 0 ? ", " + fyName : string.Empty)}\r\n" +
                "- Change it at the first sign-in; this line then stays only as history.\r\n";

            // append only : what is in the file stays as it is
            System.IO.File.AppendAllText(file, entry, new System.Text.UTF8Encoding(false));

            return file;
        }
        catch
        {
            // the database is made; the window still shows the password
            return null;
        }
    }

    // RSA OAEP SHA-256 with the ERP server's public key; the ERP's
    // TenantCredentialSeal opens it (same prefix)
    private static string Seal(string publicKeyPem, string password)
    {
        using RSA rsa = RSA.Create();
        rsa.ImportFromPem(publicKeyPem.Trim());
        byte[] data = rsa.Encrypt(System.Text.Encoding.UTF8.GetBytes(password), RSAEncryptionPadding.OaepSHA256);
        return "rsa-oaep-256:" + Convert.ToBase64String(data);
    }

    // The ERP's format (AuthenticationService.HashPassword) :
    // PBKDF2.<iterations>.<salt base64>.<hash base64>, SHA-256
    private static string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100000, HashAlgorithmName.SHA256, 32);

        return string.Join('.', "PBKDF2", "100000", Convert.ToBase64String(salt), Convert.ToBase64String(hash));
    }

    private static async Task ExecAsync(NpgsqlConnection cn, string sql, NpgsqlTransaction? tx = null, params (string Name, object Value)[] args)
    {
        await using NpgsqlCommand cmd = new(sql, cn, tx);

        foreach ((string name, object value) in args)
        {
            cmd.Parameters.AddWithValue(name, value);
        }

        await cmd.ExecuteNonQueryAsync();
    }

    private static Task ExecAsync(NpgsqlConnection cn, string sql)
        => ExecAsync(cn, sql, null);

    private static async Task<T> ScalarAsync<T>(NpgsqlConnection cn, string sql, params (string Name, object Value)[] args)
        => await ScalarAsync<T>(cn, sql, null, args);

    private static async Task<T> ScalarAsync<T>(NpgsqlConnection cn, string sql, NpgsqlTransaction? tx, params (string Name, object Value)[] args)
    {
        await using NpgsqlCommand cmd = new(sql, cn, tx);

        foreach ((string name, object value) in args)
        {
            cmd.Parameters.AddWithValue(name, value);
        }

        object? result = await cmd.ExecuteScalarAsync();

        return result is null or DBNull ? default! : (T)Convert.ChangeType(result, typeof(T));
    }
}
