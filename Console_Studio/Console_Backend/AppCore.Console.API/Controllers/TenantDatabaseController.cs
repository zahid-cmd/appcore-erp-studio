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

        return Ok(new
        {
            plan.DatabaseName,
            plan.LoginName,
            plan.CredentialKey,
            Server = plan.Server is null ? null : $"{plan.Server.ServerCode} ({plan.Server.Host}:{plan.Server.Port})",
            Template = plan.Template?.DatabaseName,
            TemplateVersion = plan.Template?.SchemaVersion,
            plan.Problems,
            CanCreate = plan.Problems.Count == 0
        });
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

        int startMonth = request.FinancialYearStartMonth is >= 1 and <= 12 ? request.FinancialYearStartMonth.Value : 7;

        DatabaseServer server = plan.Server!;
        ProductTemplate template = plan.Template!;
        string database = plan.DatabaseName!;
        string login = plan.LoginName!;

        string loginPassword = RandomText(32, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789");
        string adminPassword = RandomText(12, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789");

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
                    return BadRequest(new { message = $"A database named {database} already exists on {server.ServerCode}." });
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
                // the error below says what happened; a left-over is
                // visible in pgAdmin
            }

            return BadRequest(new { message = $"The database could not be created : {ex.Message}" });
        }
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
