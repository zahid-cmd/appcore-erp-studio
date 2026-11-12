//===============================================================
// Tenant Resolver (singleton)
//===============================================================
//
// Web address -> client company, from AppCore_Control (read only):
//
//     TenantDomains.HostName -> Tenants (status, database name)
//                            -> DatabaseServers (host, port, key)
//
// The login for the company's database comes from this server's
// appsettings (Tenancy:Credentials:<CredentialKey>), never from
// AppCore_Control. Answers are cached for Tenancy:CacheSeconds
// (an unknown address for 15 seconds), so the Control database is
// asked about once a minute per address, not on every request.
//
//===============================================================

using System.Collections.Concurrent;

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


    public TenantResolver(TenancyOptions options, IConfiguration configuration)
    {
        _options = options;
        _controlConnection = configuration.GetConnectionString("Control");
        _defaultConnection = configuration.GetConnectionString("DefaultConnection");
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

        TenantLookup lookup = await LoadAsync(key, ct);

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
            host = await cmd.ExecuteScalarAsync(ct) as string;
        }

        TenantLookup lookup = host is null
            ? new TenantLookup(null, $"Company {tenantCode} has no web address.")
            : await ResolveAsync(host, ct);

        _cache[key] = (lookup, DateTime.UtcNow.AddSeconds(lookup.Found ? Math.Max(5, _options.CacheSeconds) : 15));

        return lookup;
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
    public void Forget() => _cache.Clear();


    //===========================================================
    // Read AppCore_Control
    //===========================================================

    private const string Sql =
        """
        SELECT t."TenantCode", t."DisplayName", t."Status", t."DatabaseName",
               s."Host", s."Port", s."CredentialKey", s."Status" AS "ServerStatus"
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

        string code = r.GetString(0);
        string name = r.GetString(1);
        string status = r.GetString(2);
        string? database = r.IsDBNull(3) ? null : r.GetString(3);
        string? serverHost = r.IsDBNull(4) ? null : r.GetString(4);
        int serverPort = r.IsDBNull(5) ? 5432 : r.GetInt32(5);
        string? credentialKey = r.IsDBNull(6) ? null : r.GetString(6);

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

        return new TenantLookup(new TenantInfo(code, name, status, host, database, b.ConnectionString), null);
    }
}
