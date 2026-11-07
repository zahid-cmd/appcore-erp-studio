//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AppCore.Application.InfrastructureControl.CodeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.CodeManagement;


//===============================================================
// Agent Token Protector
//
// The agent token is stored encrypted (AES-GCM, "v1:" prefix).
// Key: configuration "Deployment:SecretKey", else "Jwt:Key".
// If that key changes, saved tokens can no longer be read: enter
// the token again on the server's page.
//===============================================================

public static class AgentTokenProtector
{
    private const string Prefix = "v1:";

    private static byte[] KeyFrom(IConfiguration configuration)
    {
        var secret =
            configuration["Deployment:SecretKey"]
            ?? configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("No Deployment:SecretKey / Jwt:Key configured.");

        return SHA256.HashData(Encoding.UTF8.GetBytes("AppCore.DeployAgent|" + secret));
    }

    public static string Protect(string plain, IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(plain))
        {
            return string.Empty;
        }

        var key = KeyFrom(configuration);
        var nonce = RandomNumberGenerator.GetBytes(12);
        var data = Encoding.UTF8.GetBytes(plain);
        var cipher = new byte[data.Length];
        var tag = new byte[16];

        using (var aes = new AesGcm(key, 16))
        {
            aes.Encrypt(nonce, data, cipher, tag);
        }

        return Prefix + Convert.ToBase64String(nonce.Concat(cipher).Concat(tag).ToArray());
    }

    // null = cannot be read (other key / damaged)
    public static string? Unprotect(string stored, IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(stored))
        {
            return string.Empty;
        }

        if (!stored.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return null;
        }

        try
        {
            var all = Convert.FromBase64String(stored.Substring(Prefix.Length));
            var nonce = all.AsSpan(0, 12);
            var tag = all.AsSpan(all.Length - 16, 16);
            var cipher = all.AsSpan(12, all.Length - 28);
            var plain = new byte[cipher.Length];

            using var aes = new AesGcm(KeyFrom(configuration), 16);

            aes.Decrypt(nonce, cipher, tag, plain);

            return Encoding.UTF8.GetString(plain);
        }
        catch
        {
            return null;
        }
    }
}


//===============================================================
// Deploy Agent Client
//
// Talks to the AppCore Deploy Agent on a server
// (Deploy_Agent\AppCore.DeployAgent). Health now; deployments,
// releases, rollback and job progress are used by the
// Deployment Center.
//===============================================================

public sealed class DeployAgentClient
{
    private static readonly HttpClient Http =
        new(new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(2) })
        {
            // uploads of a release can be long; each call sets its own limit
            Timeout = Timeout.InfiniteTimeSpan
        };

    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web);

    private readonly string _baseUrl;

    private readonly string _token;

    public DeployAgentClient(string hostAddress, int agentPort, string token)
    {
        _baseUrl = $"http://{hostAddress.Trim()}:{agentPort}";
        _token = token;
    }

    public string BaseUrl => _baseUrl;


    //===========================================================
    // Health -> Test Connection result
    //===========================================================

    public async Task<ServerConnectionTestDto> TestAsync()
    {
        var result = new ServerConnectionTestDto
        {
            CheckedDate = DateTime.UtcNow
        };

        var watch = Stopwatch.StartNew();

        try
        {
            using var request = NewRequest(HttpMethod.Get, "/agent/health");
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
            using var response = await Http.SendAsync(request, timeout.Token);

            result.ResponseMs = (int)watch.ElapsedMilliseconds;

            var body = await response.Content.ReadAsStringAsync(timeout.Token);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                result.Status = "Token rejected";
                result.Message = "The agent answered, but the token does not match Agent:Token on the server.";
                return result;
            }

            if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                result.Status = "Not configured";
                result.Message = MessageOf(body) ?? "The agent token is not configured on the server.";
                return result;
            }

            if (!response.IsSuccessStatusCode)
            {
                result.Status = "Offline";
                result.Message = $"The agent answered {(int)response.StatusCode}: {MessageOf(body) ?? body}";
                return result;
            }

            var health = JsonSerializer.Deserialize<AgentHealth>(body, Json) ?? new AgentHealth();

            result.Success = true;
            result.Status = "Online";
            result.AgentVersion = health.AgentVersion ?? string.Empty;
            result.Machine = health.Machine ?? string.Empty;
            result.DiskFreeGb = health.DiskFreeGb;
            result.BaseFolder = health.BaseFolder ?? string.Empty;
            result.ServiceName = health.ServiceName ?? string.Empty;
            result.ServiceStatus = health.ServiceStatus ?? string.Empty;
            result.AppUrls = health.AppUrls ?? string.Empty;
            result.CurrentRelease = health.CurrentRelease ?? string.Empty;
            result.KeepReleases = health.KeepReleases;
            result.BackupBeforeDeploy = health.BackupBeforeDeploy;
            result.PgDumpFound = health.PgDumpFound;
            result.Busy = health.Busy;

            var notes = new List<string>();

            if (!health.PgDumpFound && health.BackupBeforeDeploy)
            {
                notes.Add("pg_dump was not found (database backup would fail)");
            }

            if (health.DiskFreeGb is < 5)
            {
                notes.Add($"only {health.DiskFreeGb:0.#} GB free");
            }

            result.Message =
                $"Agent {result.AgentVersion} on {result.Machine} answered in {result.ResponseMs} ms. "
                + $"Live site: {(string.IsNullOrEmpty(result.CurrentRelease) ? "no release yet" : result.CurrentRelease)} ({result.ServiceStatus})."
                + (notes.Count > 0 ? " Note: " + string.Join("; ", notes) + "." : string.Empty);
        }
        catch (OperationCanceledException)
        {
            result.ResponseMs = (int)watch.ElapsedMilliseconds;
            result.Status = "Offline";
            result.Message = $"No answer from {_baseUrl} within 20 seconds. Is the agent running and Tailscale connected?";
        }
        catch (HttpRequestException ex)
        {
            result.ResponseMs = (int)watch.ElapsedMilliseconds;
            result.Status = "Offline";
            result.Message = $"Cannot reach {_baseUrl}: {ex.Message}";
        }

        return result;
    }


    //===========================================================
    // Generic calls (used by the Deployment Center)
    //===========================================================

    public async Task<(bool Ok, int StatusCode, string Body)> GetAsync(string path, TimeSpan timeout)
    {
        using var request = NewRequest(HttpMethod.Get, path);

        return await SendAsync(request, timeout);
    }

    public async Task<(bool Ok, int StatusCode, string Body)> PostJsonAsync(string path, object body, TimeSpan timeout)
    {
        using var request = NewRequest(HttpMethod.Post, path);

        request.Content = new StringContent(JsonSerializer.Serialize(body, Json), Encoding.UTF8, "application/json");

        return await SendAsync(request, timeout);
    }

    public async Task<(bool Ok, int StatusCode, string Body)> PostFormAsync(string path, MultipartFormDataContent form, TimeSpan timeout)
    {
        using var request = NewRequest(HttpMethod.Post, path);

        request.Content = form;

        return await SendAsync(request, timeout);
    }

    private static async Task<(bool Ok, int StatusCode, string Body)> SendAsync(HttpRequestMessage request, TimeSpan timeout)
    {
        using var cancel = new CancellationTokenSource(timeout);
        using var response = await Http.SendAsync(request, cancel.Token);

        var body = await response.Content.ReadAsStringAsync(cancel.Token);

        return (response.IsSuccessStatusCode, (int)response.StatusCode, body);
    }

    private HttpRequestMessage NewRequest(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, _baseUrl + path);

        request.Headers.Add("X-Agent-Token", _token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        return request;
    }

    public static string? MessageOf(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);

            return doc.RootElement.TryGetProperty("message", out var message)
                ? message.GetString()
                : null;
        }
        catch
        {
            return null;
        }
    }

    private sealed class AgentHealth
    {
        public string? AgentVersion { get; set; }
        public string? Machine { get; set; }
        public double? DiskFreeGb { get; set; }
        public string? BaseFolder { get; set; }
        public string? ServiceName { get; set; }
        public string? ServiceStatus { get; set; }
        public string? AppUrls { get; set; }
        public string? CurrentRelease { get; set; }
        public int KeepReleases { get; set; }
        public bool BackupBeforeDeploy { get; set; }
        public bool PgDumpFound { get; set; }
        public bool Busy { get; set; }
    }
}
