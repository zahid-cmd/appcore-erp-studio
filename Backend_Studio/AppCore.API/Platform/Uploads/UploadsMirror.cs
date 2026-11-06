//===============================================================
// Namespaces
//===============================================================

using System.Collections.Concurrent;
using System.Data;
using System.Data.Common;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Platform.Uploads;


//===============================================================
// Uploads Mirror (2026-11-06)
//
// Every uploaded picture (wwwroot/uploads/...) is also kept in
// the database table "StoredFiles", so every PC that runs an API
// on the same database shows the same pictures.
//
// The upload pages are unchanged : they still save / delete files
// in wwwroot/uploads. This service mirrors them :
//
//   • A file written on this PC  -> copied into StoredFiles
//     (file watcher, within a second).
//   • A file deleted on this PC  -> its row is marked deleted
//     (other PCs then remove their copy too).
//   • Every 30 seconds (and at start) :
//       - a file only on this PC        -> added to StoredFiles
//         (the first start imports the existing pictures);
//       - a row only in StoredFiles      -> written to disk;
//       - a row marked deleted           -> its disk copy removed;
//       - both differ in size            -> the newer one wins.
//   • A request for /uploads/... whose file is not on disk yet is
//     answered from StoredFiles at once (UploadsFallbackMiddleware).
//
// Registered in Program.cs :
//     builder.Services.AddSingleton<UploadsMirror>();
//     builder.Services.AddHostedService(sp => sp.GetRequiredService<UploadsMirror>());
//     app.UseMiddleware<UploadsFallbackMiddleware>();   (before UseStaticFiles)
//
// Table : Database\StoredFiles_Table.sql. While the table does not
// exist the service only logs one warning per minute and the API
// works as before (pictures from disk only).
//===============================================================

public sealed class UploadsMirror : BackgroundService
{
    //===========================================================
    // Settings
    //===========================================================

    private static readonly TimeSpan SyncEvery =
        TimeSpan.FromSeconds(30);

    private static readonly TimeSpan EchoWindow =
        TimeSpan.FromSeconds(10);

    // Larger files are left on disk only (uploads are max 2 MB)
    private const long MaxBytes =
        20L * 1024 * 1024;

    private const string UrlPrefix =
        "/uploads/";


    //===========================================================
    // State
    //===========================================================

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<UploadsMirror> _logger;

    private readonly Channel<(string RelativePath, bool Deleted)> _changes =
        Channel.CreateUnbounded<(string, bool)>();

    // Files this service wrote / removed itself (no echo back)
    private readonly ConcurrentDictionary<string, DateTime> _ownWrites =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly SemaphoreSlim _lock =
        new(1, 1);

    private FileSystemWatcher? _watcher;

    private DateTime _lastTableWarning =
        DateTime.MinValue;


    // wwwroot/uploads of this API
    public string Root { get; }


    public UploadsMirror(
        IWebHostEnvironment environment,
        IServiceScopeFactory scopeFactory,
        ILogger<UploadsMirror> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        Root =
            Path.Combine(
                environment.WebRootPath
                ?? Path.Combine(environment.ContentRootPath, "wwwroot"),
                "uploads");

        Directory.CreateDirectory(Root);
    }


    //===========================================================
    // Run
    //===========================================================

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        StartWatcher();

        Task changes =
            ProcessChangesAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await SyncAllAsync(stoppingToken);

            try
            {
                await Task.Delay(SyncEvery, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _watcher?.Dispose();

        await changes;
    }


    //===========================================================
    // File watcher : writes and deletes of this PC
    //===========================================================

    private void StartWatcher()
    {
        try
        {
            _watcher =
                new FileSystemWatcher(Root)
                {
                    IncludeSubdirectories = true,
                    NotifyFilter =
                        NotifyFilters.FileName |
                        NotifyFilters.LastWrite |
                        NotifyFilters.Size
                };

            _watcher.Created += (_, e) => Queue(e.FullPath, false);
            _watcher.Changed += (_, e) => Queue(e.FullPath, false);
            _watcher.Deleted += (_, e) => Queue(e.FullPath, true);

            _watcher.Renamed +=
                (_, e) =>
                {
                    Queue(e.OldFullPath, true);
                    Queue(e.FullPath, false);
                };

            _watcher.EnableRaisingEvents = true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Uploads mirror : file watcher not started; changes are picked up every 30 seconds.");
        }
    }


    private void Queue(
        string fullPath,
        bool deleted)
    {
        string? relative =
            RelativeOf(fullPath);

        if (relative == null || IsOwnWrite(relative))
        {
            return;
        }

        _changes.Writer.TryWrite((relative, deleted));
    }


    private async Task ProcessChangesAsync(
        CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var change in _changes.Reader.ReadAllAsync(stoppingToken))
            {
                // Let the writer finish the file first
                await Task.Delay(400, stoppingToken);

                await _lock.WaitAsync(stoppingToken);

                try
                {
                    await using Lease lease =
                        await OpenAsync(stoppingToken);

                    DbConnection connection =
                        lease.Connection;

                    string fullPath =
                        FullPathOf(change.RelativePath);

                    if (change.Deleted || !File.Exists(fullPath))
                    {
                        if (!File.Exists(fullPath))
                        {
                            await MarkDeletedAsync(connection, change.RelativePath, stoppingToken);
                        }
                    }
                    else
                    {
                        await PushAsync(connection, change.RelativePath, stoppingToken);
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    LogDbProblem(ex, change.RelativePath);
                }
                finally
                {
                    _lock.Release();
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Shutting down
        }
    }


    //===========================================================
    // Full sync (start + every 30 seconds)
    //===========================================================

    private async Task SyncAllAsync(
        CancellationToken stoppingToken)
    {
        await _lock.WaitAsync(stoppingToken);

        try
        {
            await using Lease lease =
                await OpenAsync(stoppingToken);

            DbConnection connection =
                lease.Connection;

            Dictionary<string, StoredRow> rows =
                await ListRowsAsync(connection, stoppingToken);

            Dictionary<string, FileInfo> files =
                Directory
                    .EnumerateFiles(Root, "*", SearchOption.AllDirectories)
                    .Select(x => new FileInfo(x))
                    .Where(x => RelativeOf(x.FullName) != null)
                    .GroupBy(x => KeyOf(RelativeOf(x.FullName)!))
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);

            int pushed = 0;
            int pulled = 0;
            int removed = 0;

            // Files on this PC
            foreach (var (key, file) in files)
            {
                string relative =
                    RelativeOf(file.FullName)!;

                if (!rows.TryGetValue(key, out StoredRow? row))
                {
                    pushed += await PushAsync(connection, relative, stoppingToken) ? 1 : 0;
                    continue;
                }

                if (row.IsDeleted)
                {
                    // Deleted on another PC (a newer local write wins)
                    if (file.LastWriteTimeUtc > row.ModifiedDate.AddSeconds(2))
                    {
                        pushed += await PushAsync(connection, relative, stoppingToken) ? 1 : 0;
                    }
                    else
                    {
                        RemoveLocal(relative);
                        removed++;
                    }

                    continue;
                }

                if (row.Length != file.Length)
                {
                    if (file.LastWriteTimeUtc > row.ModifiedDate)
                    {
                        pushed += await PushAsync(connection, relative, stoppingToken) ? 1 : 0;
                    }
                    else
                    {
                        pulled += await PullAsync(connection, row, stoppingToken) ? 1 : 0;
                    }
                }
            }

            // Rows not on this PC
            foreach (var (key, row) in rows)
            {
                if (!row.IsDeleted && !files.ContainsKey(key))
                {
                    pulled += await PullAsync(connection, row, stoppingToken) ? 1 : 0;
                }
            }

            if (pushed + pulled + removed > 0)
            {
                _logger.LogInformation(
                    "Uploads mirror : {Pushed} file(s) saved to the database, {Pulled} downloaded, {Removed} removed.",
                    pushed, pulled, removed);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down
        }
        catch (Exception ex)
        {
            LogDbProblem(ex, null);
        }
        finally
        {
            _lock.Release();
        }
    }


    //===========================================================
    // One file for a request (UploadsFallbackMiddleware) :
    // true when it is on disk now
    //===========================================================

    public async Task<bool> EnsureLocalAsync(
        string requestPath,
        CancellationToken cancellationToken)
    {
        if (!requestPath.StartsWith(UrlPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        string relative =
            Uri.UnescapeDataString(requestPath.Substring(UrlPrefix.Length)).Replace('\\', '/');

        if (relative.Length == 0 || relative.Contains(".."))
        {
            return false;
        }

        string fullPath =
            FullPathOf(relative);

        if (File.Exists(fullPath))
        {
            return true;
        }

        try
        {
            await using Lease lease =
                await OpenAsync(cancellationToken);

            DbConnection connection =
                lease.Connection;

            StoredRow? row =
                await GetRowAsync(connection, KeyOf(relative), cancellationToken);

            if (row == null || row.IsDeleted)
            {
                return false;
            }

            return await PullAsync(connection, row, cancellationToken);
        }
        catch (Exception ex)
        {
            LogDbProblem(ex, relative);

            return false;
        }
    }


    //===========================================================
    // Database
    //===========================================================

    private sealed class StoredRow
    {
        public string Path { get; init; } = string.Empty;

        public long Length { get; init; }

        public bool IsDeleted { get; init; }

        public DateTime ModifiedDate { get; init; }
    }


    // A scope with its own DbContext; its connection is opened
    // here and closed with the scope
    private sealed class Lease : IAsyncDisposable
    {
        public IServiceScope Scope { get; init; } = null!;

        public DbConnection Connection { get; init; } = null!;

        public async ValueTask DisposeAsync()
        {
            try
            {
                if (Connection.State != ConnectionState.Closed)
                {
                    await Connection.CloseAsync();
                }
            }
            finally
            {
                Scope.Dispose();
            }
        }
    }


    private async Task<Lease> OpenAsync(
        CancellationToken cancellationToken)
    {
        IServiceScope scope =
            _scopeFactory.CreateScope();

        try
        {
            AppDbContext context =
                scope.ServiceProvider.GetRequiredService<AppDbContext>();

            DbConnection connection =
                context.Database.GetDbConnection();

            await connection.OpenAsync(cancellationToken);

            return new Lease
            {
                Scope = scope,
                Connection = connection
            };
        }
        catch
        {
            scope.Dispose();

            throw;
        }
    }


    private static DbCommand Command(
        DbConnection connection,
        string sql,
        params (string Name, object? Value)[] parameters)
    {
        DbCommand command =
            connection.CreateCommand();

        command.CommandText = sql;

        foreach (var (name, value) in parameters)
        {
            DbParameter parameter =
                command.CreateParameter();

            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;

            command.Parameters.Add(parameter);
        }

        return command;
    }


    private static async Task<Dictionary<string, StoredRow>> ListRowsAsync(
        DbConnection connection,
        CancellationToken cancellationToken)
    {
        Dictionary<string, StoredRow> rows =
            new(StringComparer.Ordinal);

        await using DbCommand command =
            Command(
                connection,
                "SELECT \"PathKey\", \"Path\", \"Length\", \"IsDeleted\", \"ModifiedDate\" FROM public.\"StoredFiles\"");

        await using DbDataReader reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            rows[reader.GetString(0)] =
                new StoredRow
                {
                    Path = reader.GetString(1),
                    Length = reader.GetInt64(2),
                    IsDeleted = reader.GetBoolean(3),
                    ModifiedDate = DateTime.SpecifyKind(reader.GetDateTime(4), DateTimeKind.Utc)
                };
        }

        return rows;
    }


    private static async Task<StoredRow?> GetRowAsync(
        DbConnection connection,
        string key,
        CancellationToken cancellationToken)
    {
        await using DbCommand command =
            Command(
                connection,
                "SELECT \"Path\", \"Length\", \"IsDeleted\", \"ModifiedDate\" FROM public.\"StoredFiles\" WHERE \"PathKey\" = @k",
                ("k", key));

        await using DbDataReader reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new StoredRow
        {
            Path = reader.GetString(0),
            Length = reader.GetInt64(1),
            IsDeleted = reader.GetBoolean(2),
            ModifiedDate = DateTime.SpecifyKind(reader.GetDateTime(3), DateTimeKind.Utc)
        };
    }


    // Disk -> database
    private async Task<bool> PushAsync(
        DbConnection connection,
        string relative,
        CancellationToken cancellationToken)
    {
        string fullPath =
            FullPathOf(relative);

        FileInfo info =
            new(fullPath);

        if (!info.Exists || info.Length > MaxBytes)
        {
            return false;
        }

        byte[] content;

        try
        {
            content =
                await ReadSharedAsync(fullPath, cancellationToken);
        }
        catch (IOException)
        {
            // Still being written : the next sync takes it
            return false;
        }

        await using DbCommand command =
            Command(
                connection,
                "INSERT INTO public.\"StoredFiles\" " +
                "(\"Path\", \"PathKey\", \"ContentType\", \"Length\", \"Content\", \"IsDeleted\", \"ModifiedDate\", \"MachineName\") " +
                "VALUES (@p, @k, @t, @l, @c, false, @m, @n) " +
                "ON CONFLICT (\"PathKey\") DO UPDATE SET " +
                "\"Path\" = EXCLUDED.\"Path\", \"ContentType\" = EXCLUDED.\"ContentType\", " +
                "\"Length\" = EXCLUDED.\"Length\", \"Content\" = EXCLUDED.\"Content\", " +
                "\"IsDeleted\" = false, \"ModifiedDate\" = EXCLUDED.\"ModifiedDate\", " +
                "\"MachineName\" = EXCLUDED.\"MachineName\"",
                ("p", UrlPrefix + relative),
                ("k", KeyOf(relative)),
                ("t", ContentTypeOf(relative)),
                ("l", (long)content.Length),
                ("c", content),
                ("m", DateTime.SpecifyKind(info.LastWriteTimeUtc, DateTimeKind.Utc)),
                ("n", Environment.MachineName));

        await command.ExecuteNonQueryAsync(cancellationToken);

        return true;
    }


    // Database -> disk
    private async Task<bool> PullAsync(
        DbConnection connection,
        StoredRow row,
        CancellationToken cancellationToken)
    {
        if (!row.Path.StartsWith(UrlPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        string relative =
            row.Path.Substring(UrlPrefix.Length);

        if (relative.Contains(".."))
        {
            return false;
        }

        await using DbCommand command =
            Command(
                connection,
                "SELECT \"Content\" FROM public.\"StoredFiles\" WHERE \"PathKey\" = @k AND \"IsDeleted\" = false",
                ("k", KeyOf(relative)));

        object? value =
            await command.ExecuteScalarAsync(cancellationToken);

        if (value is not byte[] content)
        {
            return false;
        }

        string fullPath =
            FullPathOf(relative);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        MarkOwnWrite(relative);

        await File.WriteAllBytesAsync(fullPath, content, cancellationToken);

        File.SetLastWriteTimeUtc(fullPath, row.ModifiedDate);

        return true;
    }


    private static async Task MarkDeletedAsync(
        DbConnection connection,
        string relative,
        CancellationToken cancellationToken)
    {
        await using DbCommand command =
            Command(
                connection,
                "UPDATE public.\"StoredFiles\" SET \"IsDeleted\" = true, \"Content\" = NULL, \"Length\" = 0, " +
                "\"ModifiedDate\" = now(), \"MachineName\" = @n " +
                "WHERE \"PathKey\" = @k AND \"IsDeleted\" = false",
                ("k", KeyOf(relative)),
                ("n", Environment.MachineName));

        await command.ExecuteNonQueryAsync(cancellationToken);
    }


    private void RemoveLocal(
        string relative)
    {
        string fullPath =
            FullPathOf(relative);

        if (File.Exists(fullPath))
        {
            MarkOwnWrite(relative);

            File.Delete(fullPath);
        }
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static async Task<byte[]> ReadSharedAsync(
        string fullPath,
        CancellationToken cancellationToken)
    {
        await using FileStream stream =
            new(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);

        using MemoryStream memory =
            new();

        await stream.CopyToAsync(memory, cancellationToken);

        return memory.ToArray();
    }


    // "motor-bike-images/x.png" (forward slashes) or null when
    // outside the uploads folder
    private string? RelativeOf(
        string fullPath)
    {
        string full =
            Path.GetFullPath(fullPath);

        string root =
            Path.GetFullPath(Root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        string relative =
            full.Substring(root.Length).Replace('\\', '/');

        return relative.Length == 0 || relative.EndsWith('/')
            ? null
            : relative;
    }


    private string FullPathOf(
        string relative)
    {
        return Path.Combine(
            Root,
            relative.Replace('/', Path.DirectorySeparatorChar));
    }


    // Case-insensitive key (Windows paths)
    private static string KeyOf(
        string relative)
    {
        return (UrlPrefix + relative.Replace('\\', '/')).ToLowerInvariant();
    }


    private void MarkOwnWrite(
        string relative)
    {
        _ownWrites[KeyOf(relative)] = DateTime.UtcNow;
    }


    private bool IsOwnWrite(
        string relative)
    {
        string key =
            KeyOf(relative);

        if (_ownWrites.TryGetValue(key, out DateTime at))
        {
            if (DateTime.UtcNow - at < EchoWindow)
            {
                return true;
            }

            _ownWrites.TryRemove(key, out _);
        }

        return false;
    }


    private static string ContentTypeOf(
        string relative)
    {
        return Path.GetExtension(relative).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            ".ico" => "image/x-icon",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }


    private void LogDbProblem(
        Exception ex,
        string? relative)
    {
        // Table not made yet (42P01) : one warning per minute
        if (ex is DbException db && (db.SqlState == "42P01" || db.Message.Contains("StoredFiles")))
        {
            if (DateTime.UtcNow - _lastTableWarning > TimeSpan.FromMinutes(1))
            {
                _lastTableWarning = DateTime.UtcNow;

                _logger.LogWarning("Uploads mirror : table StoredFiles not found. Run Database\\StoredFiles_Table.sql; until then pictures stay on this PC only.");
            }

            return;
        }

        _logger.LogError(ex, "Uploads mirror failed{For}; it is tried again at the next sync.",
            relative == null ? string.Empty : $" for {relative}");
    }
}


//===============================================================
// /uploads/... not on this PC yet : fetch it from StoredFiles,
// then the static files step serves it as usual
//===============================================================

public sealed class UploadsFallbackMiddleware
{
    private readonly RequestDelegate _next;

    public UploadsFallbackMiddleware(
        RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        UploadsMirror mirror)
    {
        if ((HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method))
            && context.Request.Path.StartsWithSegments("/uploads"))
        {
            await mirror.EnsureLocalAsync(
                context.Request.Path.Value ?? string.Empty,
                context.RequestAborted);
        }

        await _next(context);
    }
}
