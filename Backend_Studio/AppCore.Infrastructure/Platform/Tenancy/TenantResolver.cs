//===============================================================
// Tenant Resolver (singleton)
//===============================================================
//
// Web address -> client company, from AppCore_Control (read only):
//
//     TenantDomains.HostName -> Tenants (status, database name,
//                                       company / branch limits)
//                            -> DatabaseServers (host, port, key)
//
// The login for the company's database comes from this server's
// appsettings (Tenancy:Credentials:<CredentialKey>), never from
// AppCore_Control. Each company has its own login (2026-11-19) :
// Tenants.CredentialKey, else the server's CredentialKey. Answers
// are cached for Tenancy:CacheSeconds (an unknown address for 15
// seconds), so the Control database is asked about once a minute
// per address, not on every request.
//
// Last known map (2026-11-19) : every company found is also kept
// in a file (Tenancy:MapFile; no passwords in it). When
// AppCore_Control cannot be reached, the companies keep working
// from that file; an address never seen before gets 503.
//
//===============================================================

using System.Collections.Concurrent;
using System.Text.Json;

using Microsoft.Extensions.Configuration;

using Npgsql;

using AppCore.Application.Platform.Tenancy;

namespace AppCore.Infrastructure.Platform.Tenancy;


public sealed record TenantLookup(TenantInfo? Tenant, string? Problem)
{
    public bool Found => Tenant is not null;
}


public sealed class TenantResolver
{
    // statuses that may open the ERP (ReadOnly : look, not change)
    private static readonly HashSet<string> OpenStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "Trial", "Active", "Grace", "ReadOnly" };

    private readonly TenancyOptions _options;

    private readonly string? _controlConnection;

    private readonly string? _defaultConnection;

    private readonly ConcurrentDictionary<string, (TenantLookup Lookup, DateTime Until)> _cache =
        new(StringComparer.OrdinalIgnoreCase);

    // last known map : host -> the company's row from Control
    private readonly ConcurrentDictionary<string, TenantRow> _known =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly object _fileLock = new();

    private readonly string _mapFile;


    public TenantResolver(TenancyOptions options, IConfiguration configuration)
    {
        _options = options;
        _controlConnection = configuration.GetConnectionString("Control");
        _defaultConnection = configuration.GetConnectionString("DefaultConnection");
        _mapFile = string.IsNullOrWhiteSpace(options.MapFile)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "AppCore", "tenant-map.json")
            : options.MapFile;

        ReadMapFile();
    }


    //===========================================================
    // Host name -> company
    //===========================================================

    public async Task<TenantLookup> ResolveAsync(string host, CancellationToken ct = default)
    {
        string key = (host ?? string.Empty).Trim().TrimEnd('.').ToLowerInvariant();

        if (key.Length == 0)
        {
            return new TenantLookup(null, "No web address.");
        }

        if (_cache.TryGetValue(key, out var hit) && hit.Until > DateTime.UtcNow)
        {
            return hit.Lookup;
        }

        TenantLookup lookup;

        try
        {
            lookup = await LoadAsync(key, ct);
        }
        catch (Exception) when (!ct.IsCancellationRequested && !string.IsNullOrWhiteSpace(_controlConnection))
        {
            // AppCore_Control not reachable : the last known map
            if (_known.TryGetValue(key, out TenantRow? row))
            {
                lookup = Build(row);

                _cache[key] = (lookup, DateTime.UtcNow.AddSeconds(15));

                return lookup;
            }

            throw;
        }

        int seconds = lookup.Found ? Math.Max(5, _options.CacheSeconds) : 15;

        _cache[key] = (lookup, DateTime.UtcNow.AddSeconds(seconds));

        return lookup;
    }


    //===========================================================
    // Company code -> company (used for http://localhost :
    // Tenancy:LocalHostTenant). Takes its primary address.
    //===========================================================

    public async Task<TenantLookup> ResolveByCodeAsync(string tenantCode, CancellationToken ct = default)
    {
        string key = "code:" + tenantCode.Trim().ToUpperInvariant();

        if (_cache.TryGetValue(key, out var hit) && hit.Until > DateTime.UtcNow)
        {
            return hit.Lookup;
        }

        string? host = null;

        if (!string.IsNullOrWhiteSpace(_controlConnection))
        {
            try
            {
                host = await PrimaryHostAsync(tenantCode, ct);
            }
            catch (Exception) when (!ct.IsCancellationRequested)
            {
                // AppCore_Control not reachable : the last known map
                host = _known.Values
                    .Where(r => string.Equals(r.TenantCode, tenantCode.Trim(), StringComparison.OrdinalIgnoreCase))
                    .Select(r => r.HostName)
                    .FirstOrDefault();
            }
        }

        TenantLookup lookup = host is null
            ? new TenantLookup(null, $"Company {tenantCode} has no web address.")
            : await ResolveAsync(host, ct);

        _cache[key] = (lookup, DateTime.UtcNow.AddSeconds(lookup.Found ? Math.Max(5, _options.CacheSeconds) : 15));

        return lookup;
    }


    private async Task<string?> PrimaryHostAsync(string tenantCode, CancellationToken ct)
    {
        {
            await using NpgsqlConnection cn = new(_controlConnection);
            await cn.OpenAsync(ct);

            await using NpgsqlCommand cmd = new(
                """
                SELECT lower(d."HostName")
                FROM public."TenantDomains" d
                JOIN public."Tenants" t ON t."TenantId" = d."TenantId"
                WHERE upper(t."TenantCode") = @code
                ORDER BY d."IsPrimary" DESC, d."TenantDomainId"
                LIMIT 1
                """, cn);

            cmd.Parameters.AddWithValue("code", tenantCode.Trim().ToUpperInvariant());
            return await cmd.ExecuteScalarAsync(ct) as string;
        }
    }


    //===========================================================
    // Every company that may open the ERP (background jobs run
    // once per company). Read fresh each time (jobs run rarely).
    //===========================================================

    public async Task<List<TenantInfo>> ListOpenAsync(CancellationToken ct = default)
    {
        var list = new List<TenantInfo>();

        if (string.IsNullOrWhiteSpace(_controlConnection))
        {
            return list;
        }

        var hosts = new List<string>();

        try
        {
        await using (NpgsqlConnection cn = new(_controlConnection))
        {
            await cn.OpenAsync(ct);

            // one address per company (its primary one)
            await using NpgsqlCommand cmd = new(
                """
                SELECT DISTINCT ON (t."TenantId") lower(d."HostName")
                FROM public."Tenants" t
                JOIN public."TenantDomains" d ON d."TenantId" = t."TenantId"
                WHERE t."Status" IN ('Trial', 'Active', 'Grace', 'ReadOnly')
                  AND t."DatabaseName" IS NOT NULL
                ORDER BY t."TenantId", d."IsPrimary" DESC, d."TenantDomainId"
                """, cn);

            await using NpgsqlDataReader r = await cmd.ExecuteReaderAsync(ct);

            while (await r.ReadAsync(ct))
            {
                hosts.Add(r.GetString(0));
            }
        }
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            // AppCore_Control not reachable : the companies of the
            // last known map (one address each)
            hosts = _known.Values
                .GroupBy(r => r.TenantCode, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First().HostName)
                .ToList();
        }

        foreach (string host in hosts)
        {
            TenantLookup lookup = await ResolveAsync(host, ct);

            if (lookup.Tenant is TenantInfo t && !list.Any(x => x.TenantCode == t.TenantCode))
            {
                list.Add(t);
            }
        }

        return list;
    }


    // after a change in the Console (later : called by the Console)
    public void Forget()
    {
        _cache.Clear();
        _defaultLimits = null;
    }


    //===========================================================
    // Tenancy:Mode = Off : the limits of the tenant whose database
    // is ConnectionStrings:DefaultConnection. Cached like a tenant.
    // No Control connection, no such tenant, or AppCore_Control
    // not reachable : null (nothing is limited, the ERP keeps
    // working).
    //===========================================================

    private (TenantLimits? Limits, DateTime Until)? _defaultLimits;

    public async Task<TenantLimits?> LimitsOfDefaultDatabaseAsync(CancellationToken ct = default)
    {
        if (_defaultLimits is { } hit && hit.Until > DateTime.UtcNow)
        {
            return hit.Limits;
        }

        TenantLimits? limits = null;

        bool found = false;

        try
        {
            string? database =
                string.IsNullOrWhiteSpace(_defaultConnection)
                    ? null
                    : new NpgsqlConnectionStringBuilder(_defaultConnection).Database;

            if (!string.IsNullOrWhiteSpace(_controlConnection) && !string.IsNullOrWhiteSpace(database))
            {
                await using NpgsqlConnection cn = new(_controlConnection);
                await cn.OpenAsync(ct);

                await using NpgsqlCommand cmd = new(
                    """
                    SELECT (to_jsonb(t) ->> 'MaxCompanies')::int,
                           (to_jsonb(t) ->> 'MaxBranches')::int
                    FROM public."Tenants" t
                    WHERE lower(t."DatabaseName") = lower(@database)
                    ORDER BY t."TenantId"
                    LIMIT 1
                    """, cn);

                cmd.Parameters.AddWithValue("database", database);

                await using NpgsqlDataReader r = await cmd.ExecuteReaderAsync(ct);

                if (await r.ReadAsync(ct))
                {
                    found = true;

                    limits = new TenantLimits(
                        r.IsDBNull(0) ? 1 : Math.Max(1, r.GetInt32(0)),
                        r.IsDBNull(1) ? null : r.GetInt32(1));
                }
            }
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            limits = null;
        }

        _defaultLimits = (limits, DateTime.UtcNow.AddSeconds(found ? Math.Max(5, _options.CacheSeconds) : 15));

        return limits;
    }


    //===========================================================
    // Read AppCore_Control
    //===========================================================

    // The limits and the company's own login key are read through
    // to_jsonb so this still works on a Control database where
    // 05_Tenant_Limits.sql / 06_Multi_Product_Databases.sql have not
    // run yet (then : 1 company, no branch limit, the server's key).
    private const string Sql =
        """
        SELECT t."TenantCode", t."DisplayName", t."Status", t."DatabaseName",
               s."Host", s."Port",
               COALESCE(NULLIF(to_jsonb(t) ->> 'CredentialKey', ''), s."CredentialKey") AS "CredentialKey",
               s."Status" AS "ServerStatus",
               (to_jsonb(t) ->> 'MaxCompanies')::int AS "MaxCompanies",
               (to_jsonb(t) ->> 'MaxBranches')::int AS "MaxBranches"
        FROM public."TenantDomains" d
        JOIN public."Tenants" t ON t."TenantId" = d."TenantId"
        LEFT JOIN public."DatabaseServers" s ON s."DatabaseServerId" = t."DatabaseServerId"
        WHERE lower(d."HostName") = @host
        LIMIT 1
        """;

    private async Task<TenantLookup> LoadAsync(string host, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_controlConnection))
        {
            return new TenantLookup(null, "ConnectionStrings:Control is not set on this server.");
        }

        await using NpgsqlConnection cn = new(_controlConnection);
        await cn.OpenAsync(ct);

        await using NpgsqlCommand cmd = new(Sql, cn);
        cmd.Parameters.AddWithValue("host", host);

        await using NpgsqlDataReader r = await cmd.ExecuteReaderAsync(ct);

        if (!await r.ReadAsync(ct))
        {
            return new TenantLookup(null, "This address is not registered.");
        }

        TenantRow row = new()
        {
            HostName = host,
            TenantCode = r.GetString(0),
            DisplayName = r.GetString(1),
            Status = r.GetString(2),
            DatabaseName = r.IsDBNull(3) ? null : r.GetString(3),
            ServerHost = r.IsDBNull(4) ? null : r.GetString(4),
            ServerPort = r.IsDBNull(5) ? 5432 : r.GetInt32(5),
            CredentialKey = r.IsDBNull(6) ? null : r.GetString(6),
            MaxCompanies = r.IsDBNull(8) ? 1 : Math.Max(1, r.GetInt32(8)),
            MaxBranches = r.IsDBNull(9) ? null : r.GetInt32(9)
        };

        Remember(row);

        return Build(row);
    }


    //===========================================================
    // A company's row -> its connection (or why it cannot open)
    //===========================================================

    private TenantLookup Build(TenantRow row)
    {
        string host = row.HostName;
        string code = row.TenantCode;
        string name = row.DisplayName;
        string status = row.Status;
        string? database = row.DatabaseName;
        string? serverHost = row.ServerHost;
        int serverPort = row.ServerPort;
        string? credentialKey = row.CredentialKey;
        int maxCompanies = row.MaxCompanies;
        int? maxBranches = row.MaxBranches;

        if (!OpenStatuses.Contains(status))
        {
            return new TenantLookup(null, $"This company is {status.ToLowerInvariant()}.");
        }

        if (string.IsNullOrWhiteSpace(database) || string.IsNullOrWhiteSpace(serverHost) || string.IsNullOrWhiteSpace(credentialKey))
        {
            return new TenantLookup(null, "This company has no database yet.");
        }

        if (!_options.Credentials.TryGetValue(credentialKey, out TenancyCredential? login) || string.IsNullOrWhiteSpace(login.Username))
        {
            return new TenantLookup(null, $"Tenancy:Credentials:{credentialKey} is not set on this server.");
        }

        // start from DefaultConnection so its options (timeouts ...) carry over
        NpgsqlConnectionStringBuilder b = new(_defaultConnection ?? string.Empty)
        {
            Host = login.Host ?? serverHost,
            Port = login.Port ?? serverPort,
            Database = database,
            Username = login.Username,
            Password = login.Password
        };

        if (b.KeepAlive == 0)
        {
            b.KeepAlive = 30;
        }

        if (b.ConnectionIdleLifetime == 300)
        {
            b.ConnectionIdleLifetime = 60;
        }

        return new TenantLookup(new TenantInfo(code, name, status, host, database, b.ConnectionString, maxCompanies, maxBranches), null);
    }


    //===========================================================
    // Last known map (file; no passwords)
    //===========================================================

    public sealed class TenantRow
    {
        public string HostName { get; set; } = string.Empty;
        public string TenantCode { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? DatabaseName { get; set; }
        public string? ServerHost { get; set; }
        public int ServerPort { get; set; } = 5432;
        public string? CredentialKey { get; set; }
        public int MaxCompanies { get; set; } = 1;
        public int? MaxBranches { get; set; }
    }

    private static readonly JsonSerializerOptions MapJson = new() { WriteIndented = true };

    private void ReadMapFile()
    {
        try
        {
            if (!File.Exists(_mapFile))
            {
                return;
            }

            List<TenantRow>? rows =
                JsonSerializer.Deserialize<List<TenantRow>>(File.ReadAllText(_mapFile));

            foreach (TenantRow row in rows ?? new List<TenantRow>())
            {
                if (!string.IsNullOrWhiteSpace(row.HostName))
                {
                    _known[row.HostName.ToLowerInvariant()] = row;
                }
            }
        }
        catch (Exception)
        {
            // a damaged file is ignored : it is written again on the
            // next lookup
        }
    }

    private void Remember(TenantRow row)
    {
        if (_known.TryGetValue(row.HostName, out TenantRow? old)
            && JsonSerializer.Serialize(old) == JsonSerializer.Serialize(row))
        {
            return;
        }

        _known[row.HostName] = row;

        try
        {
            lock (_fileLock)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(_mapFile)!);

                string temp = _mapFile + ".tmp";

                File.WriteAllText(
                    temp,
                    JsonSerializer.Serialize(_known.Values.OrderBy(r => r.HostName).ToList(), MapJson));

                File.Move(temp, _mapFile, true);
            }
        }
        catch (Exception)
        {
            // the map is a safety net : never stop a request for it
        }
    }
}
