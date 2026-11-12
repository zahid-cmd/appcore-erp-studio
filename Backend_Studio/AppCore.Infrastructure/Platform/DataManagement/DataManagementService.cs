//===============================================================
// Data Management service
//
// Infrastructure Control › Data Management (AppCore Admin only)
//
//   Databases : the named connection strings of appsettings.json
//               (ConnectionStrings). Passwords never leave the
//               server; the page sees name, host, port, database.
//   Settings  : C:\ProgramData\AppCoreERP\data-management.json
//               (this PC folder, other PC share, keep count,
//               tools folder)
//   Backups   : pg_dump (custom format) into this PC's folder,
//               then copied to the other PC's share. Each file
//               has a sidecar <file>.json (database, kind, note,
//               who, when). The list is read from the folders, so
//               it survives a restore or reset of any database.
//   Restore   : a fresh "Before Restore" backup of the target,
//               then pg_restore --clean --single-transaction
//               (all or nothing).
//   Reset     : TRUNCATE ... RESTART IDENTITY of the chosen
//               operational / Settings tables (DataResetGroups) in
//               one transaction, plus the products' own ledgers,
//               walk-in customers, the Settings tables' own chart
//               entries (ledgers, account groups / sub groups) and
//               "Test data only" rows. Needs a backup of the same
//               database from the last 30 minutes.
//   Template  : a backup of kind "Template" (never deleted
//               automatically) : the base of a new dealer's
//               database.
//   History   : history.jsonl in both folders.
//
// One operation at a time (backup / restore / reset).
//===============================================================

using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using AppCore.Application.Platform.DataManagement;
using AppCore.Application.Platform.Tenancy;
using AppCore.Infrastructure.Persistence;

namespace AppCore.Infrastructure.Platform.DataManagement;


public class DataManagementService
    : IDataManagementService
{
    //===========================================================
    // Constants
    //===========================================================

    private const string AppCoreAdminRoleCode = "RP-001";

    private const string AppConnectionName = "DefaultConnection";

    private const string HistoryFileName = "history.jsonl";

    private const string BackupExtension = ".backup";

    private const string SidecarExtension = ".json";

    public const int FreshMinutes = 30;

    public const string KindManual = "Manual";

    public const string KindClient = "Client";

    public const string KindNightly = "Nightly";

    public const string KindWeekly = "Weekly";

    public const string KindMonthly = "Monthly";

    public const string KindTemplate = "Template";

    private const string SystemUser = "System (Nightly Backup)";

    // A scheduled run that failed is tried again after this
    private static readonly TimeSpan RetryAfter =
        TimeSpan.FromMinutes(60);

    private static readonly TimeSpan ToolTimeout =
        TimeSpan.FromMinutes(60);

    private static readonly SemaphoreSlim OperationLock =
        new(1, 1);

    private static readonly object HistoryLock =
        new();

    private static readonly JsonSerializerOptions Json =
        new()
        {
            WriteIndented = true
        };

    private static readonly JsonSerializerOptions JsonLine =
        new()
        {
            WriteIndented = false
        };

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IConfiguration _configuration;

    // Tenancy:Mode = Host : this company only (its database, its
    // settings file, its backup folder; never another company's or
    // the Control database)
    private readonly ITenantContext _tenant;

    public DataManagementService
    (
        AppDbContext context,
        IConfiguration configuration,
        ITenantContext tenant
    )
    {
        _context = context;
        _configuration = configuration;
        _tenant = tenant;
    }


    //===========================================================
    // Access : role RP-001 AppCore Admin
    //===========================================================

    public async Task<bool> IsAppCoreAdminAsync
    (
        long userId
    )
    {
        if (userId <= 0)
        {
            return false;
        }

        return await
        (
            from roleAssignment in _context.RoleAssignments
            from detail in roleAssignment.Details
            join roleProfile in _context.RoleProfiles
                on detail.RoleProfileId equals roleProfile.RoleProfileId
            where
                roleAssignment.UserProfileId == userId
                && roleAssignment.IsActive
                && !roleAssignment.IsDeleted
                && detail.IsActive
                && !detail.IsDeleted
                && roleProfile.IsActive
                && !roleProfile.IsDeleted
                && roleProfile.ProfileCode == AppCoreAdminRoleCode
            select roleProfile.RoleProfileId
        )
        .AnyAsync();
    }


    //===========================================================
    // Status
    //===========================================================

    public async Task<DataStatusDto> GetStatusAsync()
    {
        DataSettingsDto settings =
            LoadSettings();

        ToolsInfo tools =
            await FindToolsAsync(settings);

        var status =
            new DataStatusDto
            {
                Connections = GetConnections(),
                Settings = settings,
                ToolsFound = tools.Found,
                ToolsFolder = tools.Folder,
                ToolsVersion = tools.Version,
                ToolsMajor = tools.Major,
                ToolsMessage = tools.Message,
                MachineName = Environment.MachineName,
                Nightly = await GetNightlyStatusAsync()
            };

        (status.ThisPcFolderOk, status.ThisPcFolderMessage) =
            await CheckFolderAsync(settings.ThisPcFolder, true);

        status.OtherPcFolderSet =
            !string.IsNullOrWhiteSpace(settings.OtherPcFolder);

        if (status.OtherPcFolderSet)
        {
            (status.OtherPcFolderOk, status.OtherPcFolderMessage) =
                await CheckFolderAsync(settings.OtherPcFolder, false);
        }
        else
        {
            status.OtherPcFolderMessage =
                "Not set : backups are kept on this PC only.";
        }

        return status;
    }

    public async Task<DataServerInfoDto> GetServerInfoAsync
    (
        string connectionName
    )
    {
        NamedConnection connection =
            GetConnection(connectionName);

        var info =
            new DataServerInfoDto
            {
                ConnectionName = connection.Name
            };

        try
        {
            await using NpgsqlConnection db =
                await OpenAsync(connection, 8);

            await using var command =
                new NpgsqlCommand(
                    "SELECT current_setting('server_version'), current_setting('server_version_num')::int, pg_database_size(current_database())",
                    db);

            await using NpgsqlDataReader reader =
                await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                info.Version = reader.GetString(0);
                info.Major = reader.GetInt32(1) / 10000;
                info.SizeBytes = reader.GetInt64(2);
            }

            info.Reachable = true;
        }
        catch (Exception ex)
        {
            info.Reachable = false;
            info.Message = $"Cannot connect : {Short(ex.Message)}";
        }

        return info;
    }

    public async Task<DataStatusDto> SaveSettingsAsync
    (
        DataSettingsDto settings
    )
    {
        var clean =
            new DataSettingsDto
            {
                ThisPcFolder = (settings.ThisPcFolder ?? string.Empty).Trim(),
                OtherPcFolder = (settings.OtherPcFolder ?? string.Empty).Trim(),
                KeepCount = settings.KeepCount,
                ToolsFolder = (settings.ToolsFolder ?? string.Empty).Trim(),
                NightlyEnabled = settings.NightlyEnabled,
                NightlyTime = (settings.NightlyTime ?? string.Empty).Trim(),
                KeepNightly = Math.Max(1, Math.Min(settings.KeepNightly, 999)),
                KeepWeekly = Math.Max(1, Math.Min(settings.KeepWeekly, 999)),
                KeepMonthly = Math.Max(1, Math.Min(settings.KeepMonthly, 999))
            };

        if (!TryParseTime(clean.NightlyTime, out _))
        {
            throw new InvalidOperationException("The nightly time must be HH:mm (24 hours), e.g. 00:30.");
        }

        if (clean.ThisPcFolder.Length == 0)
        {
            throw new InvalidOperationException("The folder on this PC is required.");
        }

        if (!Path.IsPathRooted(clean.ThisPcFolder))
        {
            throw new InvalidOperationException("The folder on this PC must be a full path, e.g. F:\\AppCore_ERP_Studio\\Backups.");
        }

        if (clean.OtherPcFolder.Length > 0 && !Path.IsPathRooted(clean.OtherPcFolder))
        {
            throw new InvalidOperationException("The other PC folder must be a full path, e.g. \\\\SERVER-PC\\AppCore_Backups.");
        }

        if (clean.ToolsFolder.Length > 0 && !File.Exists(Path.Combine(clean.ToolsFolder, ToolName("pg_dump"))))
        {
            throw new InvalidOperationException($"pg_dump was not found in {clean.ToolsFolder}. Leave it empty to find it automatically.");
        }

        string file =
            SettingsFilePath();

        Directory.CreateDirectory(Path.GetDirectoryName(file)!);

        await File.WriteAllTextAsync(
            file,
            JsonSerializer.Serialize(clean, Json));

        return await GetStatusAsync();
    }


    //===========================================================
    // Backups
    //===========================================================

    public Task<List<DataBackupDto>> GetBackupsAsync()
    {
        DataSettingsDto settings =
            LoadSettings();

        var map =
            new Dictionary<string, DataBackupDto>(StringComparer.OrdinalIgnoreCase);

        ReadFolder(settings.ThisPcFolder, true);

        if (!string.IsNullOrWhiteSpace(settings.OtherPcFolder))
        {
            ReadFolder(settings.OtherPcFolder, false);
        }

        return Task.FromResult
        (
            map.Values
                .OrderByDescending(x => x.TakenDate)
                .ToList()
        );

        void ReadFolder(string folder, bool thisPc)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(folder) || !Directory.Exists(folder))
                {
                    return;
                }

                foreach (string path in Directory.EnumerateFiles(folder, "*" + BackupExtension))
                {
                    string name =
                        Path.GetFileName(path);

                    if (!map.TryGetValue(name, out DataBackupDto? item))
                    {
                        item =
                            ReadSidecar(path)
                            ??
                            new DataBackupDto
                            {
                                FileName = name,
                                Kind = "Unknown",
                                TakenDate = File.GetLastWriteTime(path),
                                SizeBytes = new FileInfo(path).Length
                            };

                        item.FileName = name;

                        map[name] = item;
                    }

                    if (thisPc)
                    {
                        item.OnThisPc = true;
                    }
                    else
                    {
                        item.OnOtherPc = true;
                    }
                }
            }
            catch
            {
                // A folder that cannot be read lists nothing
            }
        }
    }

    public async Task<DataBackupResultDto> BackupAsync
    (
        DataBackupRequestDto request,
        string userName
    )
    {
        await OperationLock.WaitAsync();

        try
        {
            NamedConnection connection =
                GetConnection(request.ConnectionName);

            string note =
                (request.Note ?? string.Empty).Trim();

            if (request.Template && note.Length == 0)
            {
                note = "Template for new dealers";
            }

            return await BackupCoreAsync(
                connection,
                request.Template ? KindTemplate : KindManual,
                note,
                userName);
        }
        finally
        {
            OperationLock.Release();
        }
    }

    public string? FindBackupFile
    (
        string fileName
    )
    {
        string name =
            SafeFileName(fileName);

        DataSettingsDto settings =
            LoadSettings();

        foreach (string folder in new[] { settings.ThisPcFolder, settings.OtherPcFolder })
        {
            if (string.IsNullOrWhiteSpace(folder))
            {
                continue;
            }

            try
            {
                string path =
                    Path.Combine(folder, name);

                if (File.Exists(path))
                {
                    return path;
                }
            }
            catch
            {
                // try the next folder
            }
        }

        return null;
    }

    public async Task<DataBackupDto> CopyToOtherPcAsync
    (
        string fileName,
        string userName
    )
    {
        string name =
            SafeFileName(fileName);

        DataSettingsDto settings =
            LoadSettings();

        if (string.IsNullOrWhiteSpace(settings.OtherPcFolder))
        {
            throw new InvalidOperationException("The other PC folder is not set (Settings).");
        }

        string source =
            Path.Combine(settings.ThisPcFolder, name);

        string target =
            Path.Combine(settings.OtherPcFolder, name);

        if (!File.Exists(source))
        {
            // The other way round : bring it back to this PC
            (source, target) = (target, source);
        }

        if (!File.Exists(source))
        {
            throw new InvalidOperationException($"{name} was not found in either folder.");
        }

        await OperationLock.WaitAsync();

        try
        {
            await CopyWithSidecarAsync(source, target);
        }
        finally
        {
            OperationLock.Release();
        }

        DataBackupDto meta =
            ReadSidecar(source) ?? new DataBackupDto { FileName = name };

        AppendHistory(new DataHistoryDto
        {
            Action = "Copy",
            Status = "Done",
            ConnectionName = meta.ConnectionName,
            Database = meta.Database,
            FileName = name,
            Details = $"Copied to {Path.GetDirectoryName(target)}",
            By = userName
        });

        return (await GetBackupsAsync())
            .FirstOrDefault(x => string.Equals(x.FileName, name, StringComparison.OrdinalIgnoreCase))
            ?? meta;
    }

    public async Task DeleteBackupAsync
    (
        DataFileRequestDto request,
        string userName
    )
    {
        string name =
            SafeFileName(request.FileName);

        string where =
            (request.Where ?? string.Empty).Trim().ToLowerInvariant();

        if (where is not ("this" or "other" or "both"))
        {
            throw new InvalidOperationException("Choose where to delete : this PC, the other PC or both.");
        }

        DataSettingsDto settings =
            LoadSettings();

        var folders =
            new List<string>();

        if (where is "this" or "both")
        {
            folders.Add(settings.ThisPcFolder);
        }

        if (where is "other" or "both")
        {
            if (string.IsNullOrWhiteSpace(settings.OtherPcFolder))
            {
                throw new InvalidOperationException("The other PC folder is not set.");
            }

            folders.Add(settings.OtherPcFolder);
        }

        await OperationLock.WaitAsync();

        DataBackupDto? meta = null;
        int deleted = 0;

        try
        {
            foreach (string folder in folders)
            {
                string path =
                    Path.Combine(folder, name);

                meta ??= ReadSidecar(path);

                if (File.Exists(path))
                {
                    File.Delete(path);
                    deleted++;
                }

                if (File.Exists(path + SidecarExtension))
                {
                    File.Delete(path + SidecarExtension);
                }
            }
        }
        finally
        {
            OperationLock.Release();
        }

        if (deleted == 0)
        {
            throw new InvalidOperationException($"{name} was not found there.");
        }

        AppendHistory(new DataHistoryDto
        {
            Action = "Delete",
            Status = "Done",
            ConnectionName = meta?.ConnectionName ?? string.Empty,
            Database = meta?.Database ?? string.Empty,
            FileName = name,
            Details = where switch
            {
                "this" => "Deleted from this PC",
                "other" => "Deleted from the other PC",
                _ => "Deleted from both PCs"
            },
            By = userName
        });
    }

    public async Task<DataRestoreResultDto> RestoreAsync
    (
        DataRestoreRequestDto request,
        string userName
    )
    {
        NamedConnection connection =
            GetConnection(request.ConnectionName);

        CheckConfirmation(connection, request.ConfirmDatabase, request.Reason);

        string? path =
            FindBackupFile(request.FileName);

        if (path == null)
        {
            throw new InvalidOperationException($"{request.FileName} was not found in either backup folder.");
        }

        await OperationLock.WaitAsync();

        string safety = string.Empty;

        try
        {
            DataSettingsDto settings =
                LoadSettings();

            ToolsInfo tools =
                await RequireToolsAsync(settings, connection);

            // 1. Safety backup of the target database
            DataBackupResultDto before =
                await BackupCoreAsync(
                    connection,
                    "Before Restore",
                    $"Before restoring {Path.GetFileName(path)}",
                    userName);

            safety = before.Backup.FileName;

            // 2. Restore : all or nothing
            var args =
                new List<string>
                {
                    "--host", connection.Builder.Host ?? "localhost",
                    "--port", connection.Builder.Port.ToString(),
                    "--username", connection.Builder.Username ?? "postgres",
                    "--dbname", connection.Builder.Database ?? string.Empty,
                    "--clean",
                    "--if-exists",
                    "--no-owner",
                    "--no-privileges",
                    "--single-transaction",
                    "--no-password",
                    path
                };

            (int code, _, string error) =
                await RunToolAsync(
                    Path.Combine(tools.Folder, ToolName("pg_restore")),
                    args,
                    connection.Builder.Password,
                    "-c lock_timeout=60000");

            NpgsqlConnection.ClearAllPools();

            if (code != 0)
            {
                AppendHistory(new DataHistoryDto
                {
                    Action = "Restore",
                    Status = "Failed",
                    ConnectionName = connection.Name,
                    Database = connection.Builder.Database ?? string.Empty,
                    FileName = Path.GetFileName(path),
                    Reason = request.Reason.Trim(),
                    Details = $"Safety backup {safety}. Nothing was changed (single transaction).",
                    Error = Short(error),
                    By = userName
                });

                throw new InvalidOperationException($"Restore failed, nothing was changed : {Short(error)}");
            }

            AppendHistory(new DataHistoryDto
            {
                Action = "Restore",
                Status = "Done",
                ConnectionName = connection.Name,
                Database = connection.Builder.Database ?? string.Empty,
                FileName = Path.GetFileName(path),
                Reason = request.Reason.Trim(),
                Details = $"Safety backup taken first : {safety}",
                By = userName
            });
        }
        finally
        {
            OperationLock.Release();
        }

        return new DataRestoreResultDto
        {
            SafetyBackupFileName = safety,
            Message = $"{connection.Builder.Database} restored from {Path.GetFileName(path)}. A backup of the database as it was is saved as {safety}."
        };
    }


    //===========================================================
    // Data Reset
    //===========================================================

    public async Task<DataResetCatalogDto> GetResetCatalogAsync
    (
        string connectionName
    )
    {
        NamedConnection connection =
            GetConnection(connectionName);

        await using NpgsqlConnection db =
            await OpenAsync(connection, 15);

        Dictionary<uint, string> tables =
            await LoadTablesAsync(db, null);

        var catalog =
            new DataResetCatalogDto
            {
                ConnectionName = connection.Name,
                Database = connection.Builder.Database ?? string.Empty,
                FreshMinutes = FreshMinutes
            };

        foreach (DataResetGroup group in DataResetGroups.All)
        {
            var dto =
                new DataResetGroupDto
                {
                    Key = group.Key,
                    Name = group.Name,
                    Icon = group.Icon,
                    Description = group.Description,
                    IsSpecial = group.IsSpecial,
                    Section = group.Section,
                    Area = group.Area,
                    KeepInTemplate = group.KeepInTemplate,
                    SupportsTestData = group.SupportsTestData
                };

            if (group.SupportsTestData)
            {
                foreach (DataResetKey key in group.Keys)
                {
                    if (tables.Values.Contains(key.Table)
                        && await ColumnExistsAsync(db, null, key.Table, "Remarks"))
                    {
                        dto.TestRows +=
                            await ScalarLongAsync(db, null, $"SELECT count(*) FROM public.{Q(key.Table)} WHERE {TestWhere}");
                    }
                }
            }

            if (group.IsSpecial)
            {
                dto.SpecialRows =
                    (await CountWalkInAsync(db, null)).Customers;
            }
            else
            {
                foreach (string name in tables.Values.Where(group.Matches).OrderBy(x => x, StringComparer.OrdinalIgnoreCase))
                {
                    dto.Tables.Add(new DataResetTableDto
                    {
                        Name = name,
                        GroupKey = group.Key,
                        Rows = await CountAsync(db, null, name)
                    });
                }
            }

            catalog.Groups.Add(dto);
        }

        catalog.Locked =
            DataResetGroups.Locked
                .Select(x => new DataResetLockedDto { Name = x.Name, Reason = x.Reason })
                .ToList();

        DataBackupDto? last =
            await LatestBackupAsync(connection.Name);

        catalog.LastBackup = last;
        catalog.BackupFresh = IsFresh(last);

        return catalog;
    }

    public async Task<DataResetPreviewDto> PreviewResetAsync
    (
        DataResetRequestDto request
    )
    {
        NamedConnection connection =
            GetConnection(request.ConnectionName);

        await using NpgsqlConnection db =
            await OpenAsync(connection, 15);

        ResetPlan plan =
            await BuildPlanAsync(db, null, request);

        DataResetPreviewDto preview =
            plan.Preview;

        preview.BackupFresh =
            IsFresh(await LatestBackupAsync(connection.Name));

        preview.CanRun =
            preview.Blocks.Count == 0
            &&
            (preview.Tables.Count > 0 || request.WalkInCustomers || plan.Targets.Any(x => x.TestOnly))
            &&
            preview.BackupFresh;

        return preview;
    }

    public async Task<DataResetResultDto> RunResetAsync
    (
        DataResetRequestDto request,
        string userName
    )
    {
        NamedConnection connection =
            GetConnection(request.ConnectionName);

        CheckConfirmation(connection, request.ConfirmDatabase, request.Reason);

        await OperationLock.WaitAsync();

        try
        {
            DataBackupDto? backup =
                await LatestBackupAsync(connection.Name);

            if (!IsFresh(backup))
            {
                throw new InvalidOperationException($"Take a backup of {connection.Builder.Database} first : the reset needs one from the last {FreshMinutes} minutes.");
            }

            await using NpgsqlConnection db =
                await OpenAsync(connection, 15);

            await using NpgsqlTransaction transaction =
                await db.BeginTransactionAsync();

            ResetPlan plan =
                await BuildPlanAsync(db, transaction, request);

            if (plan.Preview.Blocks.Count > 0)
            {
                throw new InvalidOperationException("Nothing was changed : " + string.Join(" · ", plan.Preview.Blocks));
            }

            if (plan.Preview.Tables.Count == 0 && !request.WalkInCustomers && !plan.Targets.Any(x => x.TestOnly))
            {
                throw new InvalidOperationException("Nothing is selected.");
            }

            var result =
                new DataResetResultDto
                {
                    Tables = plan.Preview.Tables,
                    TotalRows = plan.Preview.TotalRows,
                    BackupFileName = backup!.FileName
                };

            // 1. Product ledger codes (before the products go)
            List<string> codes =
                await ProductLedgerCodesAsync(db, transaction, plan.ProductTables);

            // 2. Optional links in kept tables to Settings rows going
            //    away are emptied
            foreach (SettingsUnlink unlink in plan.Unlinks)
            {
                result.Unlinked +=
                    await ExecuteCountAsync(
                        db,
                        transaction,
                        unlink.Drop
                            ? $"DELETE FROM public.{Q(unlink.Table)} WHERE trim({Q(unlink.Column)}::text) = ANY(@values)"
                            : $"UPDATE public.{Q(unlink.Table)} SET {Q(unlink.Column)} = '' WHERE trim({Q(unlink.Column)}) = ANY(@values)",
                        unlink.Values);
            }

            // 3. Clear the tables (ids restart)
            if (plan.Preview.Tables.Count > 0)
            {
                string list =
                    string.Join(", ", plan.Preview.Tables.Select(x => "public." + Q(x.Name)));

                await ExecuteAsync(db, transaction, $"TRUNCATE TABLE {list} RESTART IDENTITY");
            }

            // 4. Settings "Test data only" rows
            foreach (SettingsTarget target in plan.Targets.Where(x => x.TestOnly))
            {
                result.TestDataRowsDeleted +=
                    await ExecuteCountAsync(
                        db,
                        transaction,
                        $"DELETE FROM public.{Q(target.Key.Table)} WHERE {TestWhere}",
                        null);
            }

            // 5. The products' own ledgers
            if (plan.ProductTables.Count > 0 && plan.HasGeneralLedgers)
            {
                result.ProductLedgersDeleted =
                    await DeleteProductLedgersAsync(db, transaction, plan.ProductTables, codes);
            }

            // 6. The Settings tables' own chart entries : ledgers,
            //    then sub groups, then groups
            if (plan.OwnedLedgers.Count > 0 && plan.HasGeneralLedgers)
            {
                result.SettingsLedgersDeleted =
                    await ExecuteCountAsync(
                        db,
                        transaction,
                        "DELETE FROM public.\"GeneralLedgers\" WHERE \"LedgerCode\" = ANY(@values)",
                        plan.OwnedLedgers.ToArray());
            }

            if (plan.OwnedSubGroupIds.Count > 0)
            {
                result.AccountSubGroupsDeleted =
                    await ExecuteCountAsync(
                        db,
                        transaction,
                        "DELETE FROM public.\"AccountSubGroups\" WHERE \"AccountSubGroupId\"::text = ANY(@values)",
                        plan.OwnedSubGroupIds.ToArray());
            }

            if (plan.OwnedGroupIds.Count > 0)
            {
                result.AccountGroupsDeleted =
                    await ExecuteCountAsync(
                        db,
                        transaction,
                        "DELETE FROM public.\"AccountGroups\" WHERE \"AccountGroupId\"::text = ANY(@values)",
                        plan.OwnedGroupIds.ToArray());
            }

            // 7. Walk-in customers
            if (request.WalkInCustomers && plan.HasWalkInColumn)
            {
                (result.WalkInCustomersDeleted, result.WalkInLedgersDeleted) =
                    await DeleteWalkInAsync(db, transaction, plan.HasGeneralLedgers);
            }

            // 8. Document / voucher numbering : every counter in
            //    VoucherSequences goes back to the highest number
            //    still used in the database (or is removed when
            //    none is left), so cleared documents start again
            //    at 00001
            result.SequencesReset =
                await RewindSequencesAsync(db, transaction);

            await transaction.CommitAsync();

            NpgsqlConnection.ClearAllPools();

            AppendHistory(new DataHistoryDto
            {
                Action = "Reset",
                Status = "Done",
                ConnectionName = connection.Name,
                Database = connection.Builder.Database ?? string.Empty,
                FileName = result.BackupFileName,
                Reason = request.Reason.Trim(),
                TotalRows = result.TotalRows,
                Tables = result.Tables,
                Details =
                    $"{result.Tables.Count} tables, {result.TotalRows:N0} rows"
                    + (result.ProductLedgersDeleted > 0 ? $", {result.ProductLedgersDeleted:N0} product ledgers" : string.Empty)
                    + (request.WalkInCustomers ? $", {result.WalkInCustomersDeleted:N0} walk-in customers" : string.Empty)
                    + (result.TestDataRowsDeleted > 0 ? $", {result.TestDataRowsDeleted:N0} test data rows" : string.Empty)
                    + (result.SettingsLedgersDeleted > 0 ? $", {result.SettingsLedgersDeleted:N0} settings ledgers" : string.Empty)
                    + (result.AccountGroupsDeleted + result.AccountSubGroupsDeleted > 0 ? $", {result.AccountGroupsDeleted:N0} account groups / {result.AccountSubGroupsDeleted:N0} sub groups" : string.Empty)
                    + (result.Unlinked > 0 ? $", {result.Unlinked:N0} links cleared" : string.Empty)
                    + (result.SequencesReset > 0 ? $", {result.SequencesReset:N0} number counters reset" : string.Empty)
                    + $". Backup used : {result.BackupFileName}",
                By = userName
            });

            return result;
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            AppendHistory(new DataHistoryDto
            {
                Action = "Reset",
                Status = "Failed",
                ConnectionName = connection.Name,
                Database = connection.Builder.Database ?? string.Empty,
                Reason = (request.Reason ?? string.Empty).Trim(),
                Details = "Nothing was changed (one transaction).",
                Error = Short(ex.Message),
                By = userName
            });

            throw new InvalidOperationException($"Reset failed, nothing was changed : {Short(ex.Message)}");
        }
        finally
        {
            OperationLock.Release();
        }
    }


    //===========================================================
    // Nightly backup (App database)
    //
    // Slot = the date of the run (Bangladesh time). The run at
    // 00:30 on Saturday is Friday night's : kind Weekly. The run on
    // the 1st : kind Monthly (wins over Weekly). Other days :
    // Nightly. If the API was off at the time, the run happens at
    // the next check (every few minutes); a slot already done is
    // never run twice; a failed slot is tried again after an hour.
    //===========================================================

    public async Task<DataNightlyStatusDto> GetNightlyStatusAsync()
    {
        DataSettingsDto settings =
            LoadSettings();

        TryParseTime(settings.NightlyTime, out TimeSpan time);

        var status =
            new DataNightlyStatusDto
            {
                Enabled = settings.NightlyEnabled,
                Time = settings.NightlyTime,
                KeepNightly = settings.KeepNightly,
                KeepWeekly = settings.KeepWeekly,
                KeepMonthly = settings.KeepMonthly,
                SavedOnBothPcs = !string.IsNullOrWhiteSpace(settings.OtherPcFolder)
            };

        List<DataHistoryDto> scheduled =
            (await GetHistoryAsync())
                .Where(x => x.Action == "Backup" && IsScheduledKind(x.Kind))
                .OrderByDescending(x => x.Date)
                .ToList();

        DataHistoryDto? last =
            scheduled.FirstOrDefault();

        DataHistoryDto? lastGood =
            scheduled.FirstOrDefault(x => x.Status == "Done");

        if (last != null)
        {
            status.LastStatus = last.Status;
            status.LastRunDate = last.Date;
            status.LastKind = last.Kind;
            status.LastFileName = last.FileName;
            status.LastError = last.Error;
        }

        status.LastSuccessDate = lastGood?.Date;

        if (settings.NightlyEnabled)
        {
            DateTime now =
                BusinessNow();

            DateTime next =
                now.Date + time;

            if (next <= now)
            {
                next = next.AddDays(1);
            }

            status.NextRun = next;

            bool lastFailed =
                last != null && last.Status == "Failed";

            bool tooOld =
                lastGood != null && DateTime.Now - lastGood.Date > TimeSpan.FromHours(26);

            status.Failing =
                lastFailed || tooOld;

            status.Message =
                lastFailed
                    ? $"Last night's backup failed : {last!.Error}"
                    : tooOld
                        ? $"No backup since {lastGood!.Date:dd-MMM-yyyy HH:mm} : check that the API is running at {settings.NightlyTime}."
                        : lastGood == null
                            ? $"The first nightly backup runs at {settings.NightlyTime}."
                            : $"Last backup {lastGood.Date:dd-MMM-yyyy HH:mm} ({lastGood.Kind}).";
        }
        else
        {
            status.Message = "Nightly backup is turned off.";
        }

        return status;
    }

    public async Task<bool> RunScheduledIfDueAsync
    (
        CancellationToken cancellationToken
    )
    {
        DataSettingsDto settings =
            LoadSettings();

        if (!settings.NightlyEnabled || !TryParseTime(settings.NightlyTime, out TimeSpan time))
        {
            return false;
        }

        // The latest slot that has started
        DateTime now =
            BusinessNow();

        DateTime slotStart =
            now.Date + time;

        if (now < slotStart)
        {
            slotStart = slotStart.AddDays(-1);
        }

        string slot =
            slotStart.ToString("yyyy-MM-dd");

        List<DataHistoryDto> runs =
            (await GetHistoryAsync())
                .Where(x => x.Action == "Backup" && IsScheduledKind(x.Kind) && x.Slot == slot)
                .ToList();

        if (runs.Any(x => x.Status == "Done"))
        {
            return false;
        }

        DataHistoryDto? lastFail =
            runs.Where(x => x.Status == "Failed").OrderByDescending(x => x.Date).FirstOrDefault();

        if (lastFail != null && DateTime.Now - lastFail.Date < RetryAfter)
        {
            return false;
        }

        string kind =
            slotStart.Day == 1
                ? KindMonthly
                : slotStart.DayOfWeek == DayOfWeek.Saturday
                    ? KindWeekly
                    : KindNightly;

        NamedConnection connection =
            GetConnection(AppConnectionName);

        await OperationLock.WaitAsync(cancellationToken);

        try
        {
            await BackupCoreAsync(
                connection,
                kind,
                kind == KindWeekly
                    ? "Friday night"
                    : kind == KindMonthly
                        ? $"Month start {slotStart:MMM yyyy}"
                        : "Nightly",
                SystemUser,
                slot);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Already in the history as Failed (or before the dump :
            // log it so the alert shows)
            List<DataHistoryDto> after =
                (await GetHistoryAsync())
                    .Where(x => x.Action == "Backup" && x.Slot == slot)
                    .ToList();

            if (after.Count == runs.Count)
            {
                AppendHistory(new DataHistoryDto
                {
                    Action = "Backup",
                    Kind = kind,
                    Slot = slot,
                    Status = "Failed",
                    ConnectionName = connection.Name,
                    Database = connection.Builder.Database ?? string.Empty,
                    Details = kind,
                    Error = Short(ex.Message),
                    By = SystemUser
                });
            }
        }
        finally
        {
            OperationLock.Release();
        }

        return true;
    }

    public async Task<DataBackupResultDto> TakeClientBackupAsync
    (
        string note,
        string userName
    )
    {
        await OperationLock.WaitAsync();

        try
        {
            return await BackupCoreAsync(
                GetConnection(AppConnectionName),
                KindClient,
                string.IsNullOrWhiteSpace(note) ? "Backup Center" : note.Trim(),
                userName);
        }
        finally
        {
            OperationLock.Release();
        }
    }

    public async Task<BackupCenterDto> GetBackupCenterAsync
    (
        bool canTakeBackup
    )
    {
        NamedConnection connection =
            GetConnection(AppConnectionName);

        List<DataBackupDto> backups =
            (await GetBackupsAsync())
                .Where(x => string.Equals(x.ConnectionName, connection.Name, StringComparison.OrdinalIgnoreCase))
                .Take(10)
                .ToList();

        // The client sees no folders or servers
        foreach (DataBackupDto item in backups)
        {
            item.Host = string.Empty;
            item.TakenOn = string.Empty;
            item.ToolsVersion = string.Empty;
        }

        return new BackupCenterDto
        {
            Nightly = await GetNightlyStatusAsync(),
            Backups = backups,
            CanTakeBackup = canTakeBackup,
            Database = connection.Builder.Database ?? string.Empty
        };
    }

    private static bool IsScheduledKind
    (
        string? kind
    )
    {
        return kind == KindNightly || kind == KindWeekly || kind == KindMonthly;
    }

    // Bangladesh time (UTC+6, no daylight saving)
    private static DateTime BusinessNow()
    {
        return DateTime.UtcNow.AddHours(6);
    }

    private static bool TryParseTime
    (
        string? text,
        out TimeSpan time
    )
    {
        time = new TimeSpan(0, 30, 0);

        Match match =
            Regex.Match((text ?? string.Empty).Trim(), @"^([01]?\d|2[0-3]):([0-5]\d)$");

        if (!match.Success)
        {
            return false;
        }

        time = new TimeSpan(int.Parse(match.Groups[1].Value), int.Parse(match.Groups[2].Value), 0);

        return true;
    }


    //===========================================================
    // History
    //===========================================================

    public Task<List<DataHistoryDto>> GetHistoryAsync()
    {
        DataSettingsDto settings =
            LoadSettings();

        var list =
            new List<DataHistoryDto>();

        foreach (string folder in new[] { settings.ThisPcFolder, settings.OtherPcFolder })
        {
            if (string.IsNullOrWhiteSpace(folder))
            {
                continue;
            }

            try
            {
                string path =
                    Path.Combine(folder, HistoryFileName);

                if (!File.Exists(path))
                {
                    continue;
                }

                foreach (string line in File.ReadLines(path))
                {
                    if (string.IsNullOrWhiteSpace(line))
                    {
                        continue;
                    }

                    try
                    {
                        DataHistoryDto? item =
                            JsonSerializer.Deserialize<DataHistoryDto>(line, JsonLine);

                        if (item != null)
                        {
                            list.Add(item);
                        }
                    }
                    catch
                    {
                        // a broken line is skipped
                    }
                }

                // This PC's log is complete; the other is the fallback
                if (list.Count > 0)
                {
                    break;
                }
            }
            catch
            {
                // try the next folder
            }
        }

        return Task.FromResult
        (
            list
                .OrderByDescending(x => x.Date)
                .Take(1000)
                .ToList()
        );
    }


    //===========================================================
    // Backup core (the caller holds the operation lock)
    //===========================================================

    private async Task<DataBackupResultDto> BackupCoreAsync
    (
        NamedConnection connection,
        string kind,
        string note,
        string userName,
        string slot = ""
    )
    {
        DataSettingsDto settings =
            LoadSettings();

        ToolsInfo tools =
            await RequireToolsAsync(settings, connection);

        (bool folderOk, string folderMessage) =
            await CheckFolderAsync(settings.ThisPcFolder, true);

        if (!folderOk)
        {
            throw new InvalidOperationException(folderMessage);
        }

        string database =
            connection.Builder.Database ?? "database";

        string marker =
            kind == KindTemplate ? "TEMPLATE_" : string.Empty;

        string fileName =
            $"{SafePart(connection.Name)}_{SafePart(database)}_{marker}{DateTime.Now:yyyy-MM-dd_HHmmss}{BackupExtension}";

        string path =
            Path.Combine(settings.ThisPcFolder, fileName);

        var args =
            new List<string>
            {
                "--host", connection.Builder.Host ?? "localhost",
                "--port", connection.Builder.Port.ToString(),
                "--username", connection.Builder.Username ?? "postgres",
                "--format=custom",
                "--no-password",
                "--file", path,
                database
            };

        (int code, _, string error) =
            await RunToolAsync(
                Path.Combine(tools.Folder, ToolName("pg_dump")),
                args,
                connection.Builder.Password,
                null);

        // Read the file back : a backup nobody checked is not a backup
        if (code == 0 && File.Exists(path))
        {
            (int listCode, _, string listError) =
                await RunToolAsync(
                    Path.Combine(tools.Folder, ToolName("pg_restore")),
                    new[] { "--list", path },
                    null,
                    null,
                    TimeSpan.FromMinutes(10));

            if (listCode != 0)
            {
                code = listCode;
                error = "The backup file could not be read back : " + listError;
            }
        }

        if (code != 0 || !File.Exists(path))
        {
            TryDelete(path);

            AppendHistory(new DataHistoryDto
            {
                Action = "Backup",
                Kind = kind,
                Slot = slot,
                Status = "Failed",
                ConnectionName = connection.Name,
                Database = database,
                FileName = fileName,
                Details = kind,
                Error = Short(error),
                By = userName
            });

            throw new InvalidOperationException($"Backup failed : {Short(error)}");
        }

        var meta =
            new DataBackupDto
            {
                FileName = fileName,
                ConnectionName = connection.Name,
                Host = connection.Builder.Host ?? string.Empty,
                Database = database,
                SizeBytes = new FileInfo(path).Length,
                Kind = kind,
                Note = note,
                TakenBy = userName,
                TakenDate = DateTime.Now,
                ToolsVersion = tools.Version,
                TakenOn = Environment.MachineName,
                OnThisPc = true
            };

        await File.WriteAllTextAsync(
            path + SidecarExtension,
            JsonSerializer.Serialize(meta, Json));

        // Copy to the other PC
        string otherMessage = string.Empty;

        if (!string.IsNullOrWhiteSpace(settings.OtherPcFolder))
        {
            try
            {
                await CopyWithSidecarAsync(
                    path,
                    Path.Combine(settings.OtherPcFolder, fileName));

                meta.OnOtherPc = true;
            }
            catch (Exception ex)
            {
                otherMessage =
                    $"Saved on this PC, but the copy to {settings.OtherPcFolder} failed : {Short(ex.Message)}";
            }
        }

        // Scheduled kinds : keep the newest N of that kind per folder
        int keep =
            KeepFor(settings, kind);

        if (keep > 0)
        {
            Prune(settings.ThisPcFolder, kind, keep, fileName);

            if (meta.OnOtherPc)
            {
                Prune(settings.OtherPcFolder, kind, keep, fileName);
            }
        }

        AppendHistory(new DataHistoryDto
        {
            Action = "Backup",
            Kind = kind,
            Slot = slot,
            Status = "Done",
            ConnectionName = connection.Name,
            Database = database,
            FileName = fileName,
            Reason = note,
            Details =
                $"{kind} · {FormatSize(meta.SizeBytes)} · "
                + (meta.OnOtherPc
                    ? "saved on both PCs"
                    : string.IsNullOrWhiteSpace(settings.OtherPcFolder)
                        ? "saved on this PC"
                        : "saved on this PC only (copy failed)"),
            By = userName
        });

        return new DataBackupResultDto
        {
            Backup = meta,
            OtherPcMessage = otherMessage
        };
    }


    //===========================================================
    // Reset plan
    //===========================================================

    private sealed class ResetPlan
    {
        public DataResetPreviewDto Preview { get; } = new();

        public List<string> ProductTables { get; } = new();

        public bool HasGeneralLedgers { get; set; }

        public bool HasWalkInColumn { get; set; }

        // Settings
        public List<SettingsTarget> Targets { get; } = new();

        public HashSet<string> OwnedLedgers { get; } = new(StringComparer.Ordinal);

        public HashSet<string> OwnedGroupIds { get; } = new(StringComparer.Ordinal);

        public HashSet<string> OwnedSubGroupIds { get; } = new(StringComparer.Ordinal);

        public List<SettingsUnlink> Unlinks { get; } = new();
    }

    // A Settings key table being cleared (all rows, or its test rows)
    private sealed class SettingsTarget
    {
        public DataResetGroup Group { get; init; } = null!;

        public DataResetKey Key { get; init; } = null!;

        public bool TestOnly { get; init; }

        public string[] Ids { get; set; } = Array.Empty<string>();

        public string[] Codes { get; set; } = Array.Empty<string>();

        public long Rows { get; set; }
    }

    private sealed class SettingsUnlink
    {
        public string Table { get; init; } = string.Empty;

        public string Column { get; init; } = string.Empty;

        public string[] Values { get; init; } = Array.Empty<string>();

        // true = delete the link rows (DropLinks), false = empty the column
        public bool Drop { get; init; }
    }

    private const string TestWhere =
        "\"Remarks\" = '" + DataResetGroups.TestDataMarker + "'";

    private async Task<ResetPlan> BuildPlanAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        DataResetRequestDto request
    )
    {
        var plan =
            new ResetPlan();

        DataResetPreviewDto preview =
            plan.Preview;

        Dictionary<uint, string> tables =
            await LoadTablesAsync(db, transaction);

        var byName =
            tables.ToDictionary(x => x.Value, x => x.Key, StringComparer.OrdinalIgnoreCase);

        plan.HasGeneralLedgers =
            byName.ContainsKey("GeneralLedgers");

        plan.HasWalkInColumn =
            await ColumnExistsAsync(db, transaction, "CustomerProfiles", "IsWalkIn");

        // 1. Requested tables : must exist and belong to a group
        var selected =
            new Dictionary<uint, bool>();   // oid -> auto added

        foreach (string requested in (request.Tables ?? new List<string>()).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!byName.TryGetValue(requested, out uint oid))
            {
                preview.Blocks.Add($"Table {requested} does not exist in this database.");
                continue;
            }

            if (DataResetGroups.GroupOf(tables[oid]) == null)
            {
                preview.Blocks.Add($"Table {tables[oid]} is protected and cannot be cleared.");
                continue;
            }

            selected[oid] = false;
        }

        // 2. Tables pointing at selected ones (foreign keys)
        List<(uint Source, uint Target)> keys =
            await LoadForeignKeysAsync(db, transaction);

        bool added = true;

        var blocked =
            new HashSet<string>();

        while (added)
        {
            added = false;

            foreach ((uint source, uint target) in keys)
            {
                if (!selected.ContainsKey(target) || selected.ContainsKey(source))
                {
                    continue;
                }

                if (!tables.TryGetValue(source, out string? sourceName))
                {
                    continue;
                }

                if (DataResetGroups.GroupOf(sourceName) != null)
                {
                    selected[source] = true;
                    added = true;
                }
                else
                {
                    blocked.Add($"Kept table {sourceName} points at {tables[target]} (foreign key) : it cannot be cleared from here, so {tables[target]} must stay.");

                    AddFix(preview, sourceName);
                }
            }
        }

        foreach (string block in blocked)
        {
            preview.Blocks.Add(block);
        }

        // 3. Product tables : kept tables must not hold product ids
        foreach (uint oid in selected.Keys)
        {
            if (DataResetGroups.ProductLedgerRemarks.ContainsKey(tables[oid]))
            {
                plan.ProductTables.Add(tables[oid]);
            }
        }

        if (plan.ProductTables.Count > 0)
        {
            var selectedNames =
                new HashSet<string>(selected.Keys.Select(x => tables[x]), StringComparer.OrdinalIgnoreCase);

            foreach ((string table, string column) in await LoadProductIdColumnsAsync(db, transaction))
            {
                // Selected tables, and the product tables themselves
                // (their own id columns)
                if (selectedNames.Contains(table)
                    || DataResetGroups.ProductLedgerRemarks.ContainsKey(table))
                {
                    continue;
                }

                long count =
                    await ScalarLongAsync(db, transaction, $"SELECT count(*) FROM public.{Q(table)} WHERE {Q(column)} IS NOT NULL");

                if (count > 0)
                {
                    preview.Blocks.Add($"Kept table {table}.{column} still holds {count:N0} product ids : add its group, or keep the products.");

                    AddFix(preview, table);
                }
            }
        }

        // 4. Rows
        foreach (KeyValuePair<uint, bool> item in selected.OrderBy(x => DataResetGroups.GroupOf(tables[x.Key])?.Key).ThenBy(x => tables[x.Key], StringComparer.OrdinalIgnoreCase))
        {
            string name =
                tables[item.Key];

            long rows =
                await CountAsync(db, transaction, name);

            preview.Tables.Add(new DataResetTableDto
            {
                Name = name,
                GroupKey = DataResetGroups.GroupOf(name)?.Key ?? string.Empty,
                Rows = rows,
                AutoAdded = item.Value
            });

            preview.TotalRows += rows;
        }

        // 5. Product ledgers
        if (plan.ProductTables.Count > 0 && plan.HasGeneralLedgers)
        {
            List<string> codes =
                await ProductLedgerCodesAsync(db, transaction, plan.ProductTables);

            preview.ProductLedgers =
                await CountProductLedgersAsync(db, transaction, plan.ProductTables, codes);
        }

        // 6. Walk-in customers
        if (request.WalkInCustomers)
        {
            if (!plan.HasWalkInColumn)
            {
                preview.Blocks.Add("Customer Profiles has no IsWalkIn column (run SalesInvoices_Engine.sql first).");
            }
            else
            {
                (preview.WalkInCustomers, preview.WalkInLedgers) =
                    await CountWalkInAsync(db, transaction);
            }
        }

        // 7. Settings tables : own chart entries, links, test rows
        await PlanSettingsAsync(
            db,
            transaction,
            request,
            plan,
            tables,
            new HashSet<string>(selected.Keys.Select(x => tables[x]), StringComparer.OrdinalIgnoreCase));

        return plan;
    }

    private static async Task<List<string>> ProductLedgerCodesAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        List<string> productTables
    )
    {
        var codes =
            new HashSet<string>(StringComparer.Ordinal);

        foreach (string table in productTables)
        {
            foreach (string column in DataResetGroups.ProductLedgerColumns)
            {
                if (!await ColumnExistsAsync(db, transaction, table, column))
                {
                    continue;
                }

                await using var command =
                    new NpgsqlCommand(
                        $"SELECT DISTINCT trim({Q(column)}) FROM public.{Q(table)} WHERE coalesce(trim({Q(column)}), '') <> ''",
                        db,
                        transaction);

                await using NpgsqlDataReader reader =
                    await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    codes.Add(reader.GetString(0));
                }
            }
        }

        return codes.ToList();
    }

    private static string ProductLedgerWhere
    (
        List<string> productTables
    )
    {
        var parts =
            new List<string>
            {
                "g.\"LedgerCode\" = ANY(@codes)"
            };

        foreach (string table in productTables)
        {
            if (DataResetGroups.ProductLedgerRemarks.TryGetValue(table, out string? remark))
            {
                parts.Add($"g.\"Remarks\" LIKE '{remark.Replace("'", "''")}'");
            }
        }

        return string.Join(" OR ", parts);
    }

    private static async Task<long> CountProductLedgersAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        List<string> productTables,
        List<string> codes
    )
    {
        await using var command =
            new NpgsqlCommand(
                $"SELECT count(*) FROM public.\"GeneralLedgers\" g WHERE {ProductLedgerWhere(productTables)}",
                db,
                transaction);

        command.Parameters.AddWithValue("codes", codes.ToArray());

        return Convert.ToInt64(await command.ExecuteScalarAsync());
    }

    private static async Task<long> DeleteProductLedgersAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction transaction,
        List<string> productTables,
        List<string> codes
    )
    {
        await using var command =
            new NpgsqlCommand(
                $"DELETE FROM public.\"GeneralLedgers\" g WHERE {ProductLedgerWhere(productTables)}",
                db,
                transaction);

        command.Parameters.AddWithValue("codes", codes.ToArray());

        return await command.ExecuteNonQueryAsync();
    }

    private static async Task<(long Customers, long Ledgers)> CountWalkInAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction
    )
    {
        if (!await ColumnExistsAsync(db, transaction, "CustomerProfiles", "IsWalkIn"))
        {
            return (0, 0);
        }

        long customers =
            await ScalarLongAsync(db, transaction, "SELECT count(*) FROM public.\"CustomerProfiles\" WHERE \"IsWalkIn\"");

        long ledgers = 0;

        if (await ColumnExistsAsync(db, transaction, "GeneralLedgers", "LedgerCode")
            && await ColumnExistsAsync(db, transaction, "CustomerProfiles", "ReceivableLedgerCode"))
        {
            ledgers =
                await ScalarLongAsync(db, transaction, WalkInLedgerSql("SELECT count(*)"));
        }

        return (customers, ledgers);
    }

    // Ledgers of walk-in customers that no other customer uses
    private static string WalkInLedgerSql
    (
        string head
    )
    {
        return
            head + @" FROM public.""GeneralLedgers"" g
              WHERE g.""LedgerCode"" IN
                    (SELECT trim(c.""ReceivableLedgerCode"") FROM public.""CustomerProfiles"" c
                     WHERE c.""IsWalkIn"" AND coalesce(trim(c.""ReceivableLedgerCode""), '') <> '')
              AND   NOT EXISTS
                    (SELECT 1 FROM public.""CustomerProfiles"" k
                     WHERE NOT k.""IsWalkIn"" AND trim(k.""ReceivableLedgerCode"") = g.""LedgerCode"")";
    }

    private static async Task<(long Customers, long Ledgers)> DeleteWalkInAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction transaction,
        bool hasGeneralLedgers
    )
    {
        long ledgers = 0;

        // Ledgers first (they are found through the customers)
        if (hasGeneralLedgers
            && await ColumnExistsAsync(db, transaction, "CustomerProfiles", "ReceivableLedgerCode"))
        {
            await using var ledgerCommand =
                new NpgsqlCommand(
                    WalkInLedgerSql("DELETE"),
                    db,
                    transaction);

            ledgers =
                await ledgerCommand.ExecuteNonQueryAsync();
        }

        await using var customerCommand =
            new NpgsqlCommand(
                "DELETE FROM public.\"CustomerProfiles\" WHERE \"IsWalkIn\"",
                db,
                transaction);

        long customers =
            await customerCommand.ExecuteNonQueryAsync();

        return (customers, ledgers);
    }


    //===========================================================
    // Settings tables
    //
    // For each Settings key table being cleared (all rows, or its
    // "TEST DATA" rows) :
    //   - its ids / codes, its own ledgers (by the ledger columns
    //     of its rows, and by "System generated from ..." remarks
    //     when the whole table goes), the account groups / sub
    //     groups it made (whole table only)
    //   - blocks : a kept table still holding one of its ids /
    //     codes, or one of its ledger / account codes, or a group
    //     / sub group code; ledgers or sub groups left under a
    //     group / sub group that goes
    //   - optional links in kept tables are emptied instead
    //===========================================================

    private static readonly string[] ChartTables =
    {
        "GeneralLedgers", "AccountGroups", "AccountSubGroups", "AccountClasses"
    };

    private async Task PlanSettingsAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        DataResetRequestDto request,
        ResetPlan plan,
        Dictionary<uint, string> tables,
        HashSet<string> selectedNames
    )
    {
        DataResetPreviewDto preview =
            plan.Preview;

        var existing =
            new HashSet<string>(tables.Values, StringComparer.Ordinal);

        //-------------------------------------------------------
        // Targets : whole tables ticked, and "Test data only"
        //-------------------------------------------------------

        var testGroups =
            new HashSet<string>(request.TestDataGroups ?? new List<string>(), StringComparer.OrdinalIgnoreCase);

        foreach (DataResetGroup group in DataResetGroups.All.Where(g => g.Section == DataResetGroups.SectionSettings))
        {
            foreach (DataResetKey key in group.Keys)
            {
                if (!existing.Contains(key.Table))
                {
                    continue;
                }

                bool whole =
                    selectedNames.Contains(key.Table);

                bool testOnly =
                    !whole && group.SupportsTestData && testGroups.Contains(group.Key);

                if (!whole && !testOnly)
                {
                    continue;
                }

                if (testOnly && !await ColumnExistsAsync(db, transaction, key.Table, "Remarks"))
                {
                    preview.Blocks.Add($"{key.Table} has no Remarks column : test data cannot be found.");
                    continue;
                }

                plan.Targets.Add(new SettingsTarget
                {
                    Group = group,
                    Key = key,
                    TestOnly = testOnly
                });
            }
        }

        foreach (string key in testGroups)
        {
            DataResetGroup? group =
                DataResetGroups.ByKey(key);

            if (group == null || !group.SupportsTestData)
            {
                preview.Blocks.Add($"'{key}' has no test data mode.");
            }
        }

        if (plan.Targets.Count == 0)
        {
            return;
        }

        Dictionary<string, List<string>> columns =
            await LoadColumnsAsync(db, transaction);

        bool HasColumn(string table, string column) =>
            columns.TryGetValue(table, out List<string>? list) && list.Contains(column);

        //-------------------------------------------------------
        // Ids, codes, rows, own ledgers, groups, sub groups
        //-------------------------------------------------------

        var ledgerCodes =
            new HashSet<string>(StringComparer.Ordinal);

        // group name -> its own ledger codes (names the owner in a block)
        var ledgerOwners =
            new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);

        HashSet<string> OwnerSet(string owner)
        {
            if (!ledgerOwners.TryGetValue(owner, out HashSet<string>? set))
            {
                ledgerOwners[owner] = set = new HashSet<string>(StringComparer.Ordinal);
            }

            return set;
        }

        var accountCodes =
            new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);   // group name -> account codes

        var groupCodes =
            new HashSet<string>(StringComparer.Ordinal);

        foreach (SettingsTarget target in plan.Targets)
        {
            DataResetKey key =
                target.Key;

            string where =
                target.TestOnly ? TestWhere : "TRUE";

            if (target.TestOnly)
            {
                target.Rows =
                    await ScalarLongAsync(db, transaction, $"SELECT count(*) FROM public.{Q(key.Table)} WHERE {where}");

                preview.TestDataRows += target.Rows;
            }

            if (HasColumn(key.Table, key.IdColumn))
            {
                target.Ids =
                    (await TextListAsync(db, transaction, $"SELECT {Q(key.IdColumn)}::text FROM public.{Q(key.Table)} WHERE {where}", null)).ToArray();
            }

            if (key.CodeColumn.Length > 0 && HasColumn(key.Table, key.CodeColumn))
            {
                target.Codes =
                    (await TextListAsync(db, transaction, $"SELECT trim({Q(key.CodeColumn)}::text) FROM public.{Q(key.Table)} WHERE {where} AND coalesce(trim({Q(key.CodeColumn)}::text), '') <> ''", null)).ToArray();

                if (key.CodeIsLedger)
                {
                    if (!accountCodes.TryGetValue(target.Group.Name, out HashSet<string>? set))
                    {
                        accountCodes[target.Group.Name] = set = new HashSet<string>(StringComparer.Ordinal);
                    }

                    set.UnionWith(target.Codes);
                }
            }

            // Own ledgers : the codes on the rows
            foreach (string column in key.LedgerColumns.Where(c => HasColumn(key.Table, c)))
            {
                List<string> found =
                    await TextListAsync(db, transaction, $"SELECT DISTINCT trim({Q(column)}) FROM public.{Q(key.Table)} WHERE {where} AND coalesce(trim({Q(column)}), '') <> ''", null);

                ledgerCodes.UnionWith(found);
                OwnerSet(target.Group.Name).UnionWith(found);
            }

            if (target.TestOnly || !plan.HasGeneralLedgers)
            {
                continue;
            }

            // Whole table : the ledgers / groups / sub groups it made
            foreach (string remark in key.LedgerRemarks)
            {
                List<string> found =
                    await TextListAsync(db, transaction, "SELECT trim(\"LedgerCode\") FROM public.\"GeneralLedgers\" WHERE \"Remarks\" LIKE @p", remark);

                ledgerCodes.UnionWith(found);
                OwnerSet(target.Group.Name).UnionWith(found);
            }

            foreach (string remark in key.GroupRemarks)
            {
                if (existing.Contains("AccountGroups"))
                {
                    plan.OwnedGroupIds.UnionWith(
                        await TextListAsync(db, transaction, "SELECT \"AccountGroupId\"::text FROM public.\"AccountGroups\" WHERE \"Remarks\" LIKE @p", remark));

                    groupCodes.UnionWith(
                        await TextListAsync(db, transaction, "SELECT trim(\"GroupCode\") FROM public.\"AccountGroups\" WHERE \"Remarks\" LIKE @p", remark));
                }
            }

            foreach (string remark in key.SubGroupRemarks)
            {
                if (existing.Contains("AccountSubGroups"))
                {
                    plan.OwnedSubGroupIds.UnionWith(
                        await TextListAsync(db, transaction, "SELECT \"AccountSubGroupId\"::text FROM public.\"AccountSubGroups\" WHERE \"Remarks\" LIKE @p", remark));

                    groupCodes.UnionWith(
                        await TextListAsync(db, transaction, "SELECT trim(\"SubGroupCode\") FROM public.\"AccountSubGroups\" WHERE \"Remarks\" LIKE @p", remark));
                }
            }
        }

        ledgerCodes.Remove(string.Empty);
        groupCodes.Remove(string.Empty);

        plan.OwnedLedgers.UnionWith(ledgerCodes);

        //-------------------------------------------------------
        // Tables that are not checked for links : the cleared
        // ones, the Settings tables of the targets, the chart
        //-------------------------------------------------------

        var skip =
            new HashSet<string>(selectedNames, StringComparer.OrdinalIgnoreCase);

        foreach (SettingsTarget target in plan.Targets)
        {
            foreach (DataResetKey key in target.Group.Keys)
            {
                skip.Add(key.Table);
            }

            foreach (string table in target.Group.Tables)
            {
                skip.Add(table);
            }
        }

        foreach (string table in ChartTables)
        {
            skip.Add(table);
        }

        //-------------------------------------------------------
        // Links : ids and codes held by kept tables
        //-------------------------------------------------------

        var blocked =
            new HashSet<string>(StringComparer.Ordinal);

        foreach (SettingsTarget target in plan.Targets)
        {
            DataResetKey key =
                target.Key;

            var unlinkColumns =
                new HashSet<string>(key.Unlinks.Concat(key.DropLinks).Select(x => x.Table + "." + x.Column), StringComparer.OrdinalIgnoreCase);

            foreach ((string table, List<string> list) in columns)
            {
                if (skip.Contains(table))
                {
                    continue;
                }

                foreach (string column in list)
                {
                    if (unlinkColumns.Contains(table + "." + column))
                    {
                        continue;
                    }

                    string lower =
                        column.ToLowerInvariant();

                    string[]? values =
                        target.Ids.Length > 0 && key.IdRefs.Contains(lower)
                            ? target.Ids
                            : target.Codes.Length > 0 && key.CodeRefs.Contains(lower)
                                ? target.Codes
                                : null;

                    if (values == null)
                    {
                        continue;
                    }

                    long used =
                        await CountInAsync(db, transaction, table, column, values);

                    if (used > 0)
                    {
                        blocked.Add($"Kept table {table}.{column} still uses {used:N0} {(target.TestOnly ? "test " : string.Empty)}rows of {target.Group.Name} ({key.Table}) : add its group too, or keep {target.Group.Name}.");

                        AddFix(preview, table);
                    }
                }
            }

            // Optional links : emptied
            foreach ((string table, string column) in key.Unlinks)
            {
                if (target.Codes.Length == 0 || !HasColumn(table, column) || skip.Contains(table))
                {
                    continue;
                }

                long used =
                    await CountInAsync(db, transaction, table, column, target.Codes);

                if (used > 0)
                {
                    plan.Unlinks.Add(new SettingsUnlink { Table = table, Column = column, Values = target.Codes });

                    preview.Unlinked += used;
                }
            }

            // Pure link rows (e.g. website brands) : deleted
            foreach ((string table, string column) in key.DropLinks)
            {
                if (target.Ids.Length == 0 || !HasColumn(table, column) || skip.Contains(table))
                {
                    continue;
                }

                long used =
                    await CountInAsync(db, transaction, table, column, target.Ids);

                if (used > 0)
                {
                    plan.Unlinks.Add(new SettingsUnlink { Table = table, Column = column, Values = target.Ids, Drop = true });

                    preview.Unlinked += used;
                }
            }
        }

        //-------------------------------------------------------
        // Ledger / account codes held by kept tables (posted
        // vouchers, posting setup, other settings ...)
        //-------------------------------------------------------

        var ledgerUse =
            new List<(string Label, string[] Codes)>();

        // One check per owner, so a block names the group whose
        // ledgers are still in use
        foreach ((string group, HashSet<string> codes) in ledgerOwners)
        {
            codes.Remove(string.Empty);

            if (codes.Count > 0)
            {
                ledgerUse.Add(("ledgers of " + group, codes.ToArray()));
            }
        }

        foreach ((string group, HashSet<string> codes) in accountCodes)
        {
            ledgerUse.Add(("accounts of " + group, codes.ToArray()));
        }

        foreach ((string label, string[] codes) in ledgerUse)
        {
            foreach ((string table, List<string> list) in columns)
            {
                if (skip.Contains(table))
                {
                    continue;
                }

                foreach (string column in list.Where(c => DataResetGroups.LedgerUseSuffixes.Any(s => c.ToLowerInvariant().EndsWith(s, StringComparison.Ordinal))))
                {
                    long used =
                        await CountInAsync(db, transaction, table, column, codes);

                    if (used > 0)
                    {
                        blocked.Add($"Kept table {table}.{column} still uses {used:N0} {label} (posted entries or links) : clear that data too (e.g. Accounting Entries / Vouchers), or keep them.");

                        AddFix(preview, table);
                    }
                }
            }
        }

        //-------------------------------------------------------
        // Account groups / sub groups going away
        //-------------------------------------------------------

        if (plan.OwnedGroupIds.Count > 0 || plan.OwnedSubGroupIds.Count > 0)
        {
            string[] groups =
                plan.OwnedGroupIds.ToArray();

            string[] subs =
                plan.OwnedSubGroupIds.ToArray();

            preview.AccountGroups = groups.Length;
            preview.AccountSubGroups = subs.Length;

            // Ledgers left under them (product ledgers of a cleared
            // product table, and own ledgers, go too)
            if (plan.HasGeneralLedgers)
            {
                List<string> productCodes =
                    plan.ProductTables.Count > 0
                        ? await ProductLedgerCodesAsync(db, transaction, plan.ProductTables)
                        : new List<string>();

                string productClause =
                    plan.ProductTables.Count > 0
                        ? $" AND NOT ({ProductLedgerWhere(plan.ProductTables)})"
                        : string.Empty;

                await using var command =
                    new NpgsqlCommand(
                        "SELECT count(*) FROM public.\"GeneralLedgers\" g " +
                        "WHERE (g.\"AccountSubGroupId\"::text = ANY(@subs) OR g.\"AccountGroupId\"::text = ANY(@groups)) " +
                        "AND NOT (trim(g.\"LedgerCode\") = ANY(@owned))" + productClause,
                        db,
                        transaction);

                command.Parameters.AddWithValue("subs", subs);
                command.Parameters.AddWithValue("groups", groups);
                command.Parameters.AddWithValue("owned", ledgerCodes.ToArray());
                command.Parameters.AddWithValue("codes", productCodes.ToArray());

                long left =
                    Convert.ToInt64(await command.ExecuteScalarAsync());

                if (left > 0)
                {
                    blocked.Add($"{left:N0} other ledgers still sit under the account groups / sub groups made by the cleared Settings tables (e.g. products or manual ledgers) : clear the Products group too, or keep the categories.");
                }
            }

            // Sub groups under a group that goes
            if (groups.Length > 0 && existing.Contains("AccountSubGroups"))
            {
                await using var command =
                    new NpgsqlCommand(
                        "SELECT count(*) FROM public.\"AccountSubGroups\" " +
                        "WHERE \"AccountGroupId\"::text = ANY(@groups) AND NOT (\"AccountSubGroupId\"::text = ANY(@subs))",
                        db,
                        transaction);

                command.Parameters.AddWithValue("groups", groups);
                command.Parameters.AddWithValue("subs", subs);

                long left =
                    Convert.ToInt64(await command.ExecuteScalarAsync());

                if (left > 0)
                {
                    blocked.Add($"{left:N0} sub groups (not made by a cleared category) still sit under the account groups being removed : keep the categories.");
                }
            }

            // Group / sub group codes held by kept tables
            if (groupCodes.Count > 0)
            {
                string[] codes =
                    groupCodes.ToArray();

                foreach ((string table, List<string> list) in columns)
                {
                    if (skip.Contains(table))
                    {
                        continue;
                    }

                    foreach (string column in list.Where(c => DataResetGroups.GroupUseSuffixes.Any(s => c.ToLowerInvariant().EndsWith(s, StringComparison.Ordinal))))
                    {
                        long used =
                            await CountInAsync(db, transaction, table, column, codes);

                        if (used > 0)
                        {
                            blocked.Add($"Kept table {table}.{column} still uses {used:N0} account groups / sub groups of the cleared categories : clear that data too, or keep the categories.");

                            AddFix(preview, table);
                        }
                    }
                }
            }
        }

        foreach (string block in blocked)
        {
            preview.Blocks.Add(block);
        }

        //-------------------------------------------------------
        // Own ledgers that exist
        //-------------------------------------------------------

        if (ledgerCodes.Count > 0 && plan.HasGeneralLedgers)
        {
            await using var command =
                new NpgsqlCommand(
                    "SELECT count(*) FROM public.\"GeneralLedgers\" WHERE trim(\"LedgerCode\") = ANY(@values)",
                    db,
                    transaction);

            command.Parameters.AddWithValue("values", ledgerCodes.ToArray());

            preview.SettingsLedgers =
                Convert.ToInt64(await command.ExecuteScalarAsync());
        }
    }

    // The way out of a block found in a kept table : its group (to
    // tick too), or the table itself when no group can clear it
    private static void AddFix
    (
        DataResetPreviewDto preview,
        string table
    )
    {
        DataResetGroup? group =
            DataResetGroups.GroupOf(table);

        DataResetFixDto? fix =
            group != null
                ? preview.Fixes.FirstOrDefault(x => x.Fixable && x.GroupKey == group.Key)
                : preview.Fixes.FirstOrDefault(x => !x.Fixable && x.Name == table);

        if (fix == null)
        {
            fix =
                new DataResetFixDto
                {
                    GroupKey = group?.Key ?? string.Empty,
                    Name = group?.Name ?? table,
                    Fixable = group != null
                };

            preview.Fixes.Add(fix);
        }

        if (!fix.Tables.Contains(table))
        {
            fix.Tables.Add(table);
        }
    }

    // Columns of every public table (exact names)
    private static async Task<Dictionary<string, List<string>>> LoadColumnsAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction
    )
    {
        var columns =
            new Dictionary<string, List<string>>(StringComparer.Ordinal);

        await using var command =
            new NpgsqlCommand(
                @"SELECT c.relname, a.attname
                  FROM   pg_attribute a
                  JOIN   pg_class c ON c.oid = a.attrelid
                  JOIN   pg_namespace n ON n.oid = c.relnamespace
                  WHERE  n.nspname = 'public'
                  AND    c.relkind IN ('r', 'p')
                  AND    a.attnum > 0
                  AND    NOT a.attisdropped",
                db,
                transaction);

        await using NpgsqlDataReader reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            string table =
                reader.GetString(0);

            if (!columns.TryGetValue(table, out List<string>? list))
            {
                columns[table] = list = new List<string>();
            }

            list.Add(reader.GetString(1));
        }

        return columns;
    }

    // Rows of table.column holding one of the values (as text)
    private static async Task<long> CountInAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        string table,
        string column,
        string[] values
    )
    {
        if (values.Length == 0)
        {
            return 0;
        }

        await using var command =
            new NpgsqlCommand(
                $"SELECT count(*) FROM public.{Q(table)} WHERE trim({Q(column)}::text) = ANY(@values)",
                db,
                transaction);

        command.Parameters.AddWithValue("values", values);

        return Convert.ToInt64(await command.ExecuteScalarAsync());
    }

    // One text column of a query (optional @p parameter)
    private static async Task<List<string>> TextListAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        string sql,
        string? parameter
    )
    {
        var list =
            new List<string>();

        await using var command =
            new NpgsqlCommand(sql, db, transaction);

        if (parameter != null)
        {
            command.Parameters.AddWithValue("p", parameter);
        }

        await using NpgsqlDataReader reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            if (!reader.IsDBNull(0))
            {
                list.Add(reader.GetString(0));
            }
        }

        return list;
    }

    // A statement with an optional @values text[] : rows changed
    private static async Task<long> ExecuteCountAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction transaction,
        string sql,
        string[]? values
    )
    {
        await using var command =
            new NpgsqlCommand(sql, db, transaction)
            {
                CommandTimeout = 600
            };

        if (values != null)
        {
            command.Parameters.AddWithValue("values", values);
        }

        return await command.ExecuteNonQueryAsync();
    }


    //===========================================================
    // Catalog helpers
    //===========================================================

    private static async Task<Dictionary<uint, string>> LoadTablesAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction
    )
    {
        var tables =
            new Dictionary<uint, string>();

        await using var command =
            new NpgsqlCommand(
                @"SELECT c.oid, c.relname
                  FROM   pg_class c
                  JOIN   pg_namespace n ON n.oid = c.relnamespace
                  WHERE  n.nspname = 'public'
                  AND    c.relkind IN ('r', 'p')",
                db,
                transaction);

        await using NpgsqlDataReader reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            tables[reader.GetFieldValue<uint>(0)] = reader.GetString(1);
        }

        return tables;
    }

    private static async Task<List<(uint Source, uint Target)>> LoadForeignKeysAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction
    )
    {
        var keys =
            new List<(uint, uint)>();

        await using var command =
            new NpgsqlCommand(
                "SELECT conrelid, confrelid FROM pg_constraint WHERE contype = 'f' AND conrelid <> confrelid",
                db,
                transaction);

        await using NpgsqlDataReader reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            keys.Add((reader.GetFieldValue<uint>(0), reader.GetFieldValue<uint>(1)));
        }

        return keys;
    }

    private static async Task<List<(string Table, string Column)>> LoadProductIdColumnsAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction
    )
    {
        var columns =
            new List<(string, string)>();

        await using var command =
            new NpgsqlCommand(
                @"SELECT c.relname, a.attname
                  FROM   pg_attribute a
                  JOIN   pg_class c ON c.oid = a.attrelid
                  JOIN   pg_namespace n ON n.oid = c.relnamespace
                  WHERE  n.nspname = 'public'
                  AND    c.relkind IN ('r', 'p')
                  AND    a.attnum > 0
                  AND    NOT a.attisdropped
                  AND    lower(a.attname) = ANY(@names)",
                db,
                transaction);

        command.Parameters.AddWithValue("names", DataResetGroups.ProductIdColumns);

        await using NpgsqlDataReader reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            columns.Add((reader.GetString(0), reader.GetString(1)));
        }

        return columns;
    }

    private static async Task<bool> ColumnExistsAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        string table,
        string column
    )
    {
        await using var command =
            new NpgsqlCommand(
                @"SELECT EXISTS
                  (
                      SELECT 1 FROM information_schema.columns
                      WHERE  table_schema = 'public'
                      AND    table_name   = @table
                      AND    column_name  = @column
                  )",
                db,
                transaction);

        command.Parameters.AddWithValue("table", table);
        command.Parameters.AddWithValue("column", column);

        return (bool)(await command.ExecuteScalarAsync() ?? false);
    }

    private static Task<long> CountAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        string table
    )
    {
        return ScalarLongAsync(db, transaction, $"SELECT count(*) FROM public.{Q(table)}");
    }

    private static async Task<long> ScalarLongAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        string sql
    )
    {
        await using var command =
            new NpgsqlCommand(sql, db, transaction);

        return Convert.ToInt64(await command.ExecuteScalarAsync());
    }

    //===========================================================
    // Rewind Sequences
    // Numbers look like PREFIX-<branch digits>-<fy>-<mm>-nnnnn
    // (CodeGenerator.GenerateVoucherNo). The highest number still
    // used is read from every text column named ...No / ...Number
    // / ...Ref / ...Reference, then each VoucherSequences row is
    // set to it, or removed when that period has no number left.
    // A counter never goes below a number that still exists.
    //===========================================================

    private static async Task<long> RewindSequencesAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction transaction
    )
    {
        const string pattern =
            "^[A-Z]{1,5}-[0-9]+-[0-9]{4}-[0-9]{2}-[0-9]{5}$";

        bool exists;

        await using (var check =
            new NpgsqlCommand(
                "SELECT to_regclass('public.\"VoucherSequences\"') IS NOT NULL",
                db,
                transaction))
        {
            exists = (bool)(await check.ExecuteScalarAsync() ?? false);
        }

        if (!exists)
        {
            return 0;
        }

        // Candidate columns, grouped by table
        var columns =
            new Dictionary<string, List<string>>(StringComparer.Ordinal);

        await using (var list =
            new NpgsqlCommand(
                "SELECT c.table_name, c.column_name " +
                "FROM information_schema.columns c " +
                "JOIN information_schema.tables t " +
                "  ON t.table_schema = c.table_schema AND t.table_name = c.table_name " +
                "WHERE c.table_schema = 'public' " +
                "  AND t.table_type = 'BASE TABLE' " +
                "  AND c.table_name <> 'VoucherSequences' " +
                "  AND c.data_type IN ('character varying', 'text', 'character') " +
                "  AND lower(c.column_name) ~ '(no|number|ref|reference)$'",
                db,
                transaction))
        await using (var reader = await list.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                string table = reader.GetString(0);

                if (!columns.TryGetValue(table, out List<string>? names))
                {
                    names = new List<string>();
                    columns[table] = names;
                }

                names.Add(reader.GetString(1));
            }
        }

        // Highest number still used, per PREFIX-branch-fy-mm
        var used =
            new Dictionary<string, int>(StringComparer.Ordinal);

        foreach (var (table, names) in columns)
        {
            string union =
                string.Join(
                    " UNION ALL ",
                    names.Select(x => $"SELECT {Q(x)}::text AS v FROM public.{Q(table)}"));

            string sql =
                "SELECT left(v, length(v) - 6), max(right(v, 5)::int) " +
                $"FROM ({union}) s " +
                $"WHERE v ~ '{pattern}' " +
                "GROUP BY 1";

            await using var command =
                new NpgsqlCommand(sql, db, transaction)
                {
                    CommandTimeout = 600
                };

            await using var reader =
                await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                string key = reader.GetString(0);

                int number = reader.GetInt32(1);

                if (!used.TryGetValue(key, out int current) || number > current)
                {
                    used[key] = number;
                }
            }
        }

        // Counters
        var rows =
            new List<(long Id, string Key, long Last)>();

        await using (var read =
            new NpgsqlCommand(
                "SELECT \"VoucherSequenceId\", " +
                "upper(trim(\"Prefix\")) || '-' || trim(\"BranchDigits\") || '-' || " +
                "trim(\"FinancialYearCode\") || '-' || lpad(\"PeriodMonth\"::text, 2, '0'), " +
                "\"LastNumber\"::bigint " +
                "FROM public.\"VoucherSequences\"",
                db,
                transaction))
        await using (var reader = await read.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                rows.Add((Convert.ToInt64(reader.GetValue(0)), reader.GetString(1), reader.GetInt64(2)));
            }
        }

        long changed = 0;

        foreach (var row in rows)
        {
            int highest =
                used.TryGetValue(row.Key, out int value) ? value : 0;

            if (highest >= row.Last)
            {
                continue;
            }

            string sql =
                highest == 0
                    ? "DELETE FROM public.\"VoucherSequences\" WHERE \"VoucherSequenceId\" = @id"
                    : "UPDATE public.\"VoucherSequences\" SET \"LastNumber\" = @last, \"ModifiedDate\" = now() WHERE \"VoucherSequenceId\" = @id";

            await using var command =
                new NpgsqlCommand(sql, db, transaction);

            command.Parameters.AddWithValue("id", row.Id);

            if (highest > 0)
            {
                command.Parameters.AddWithValue("last", highest);
            }

            changed += await command.ExecuteNonQueryAsync();
        }

        return changed;
    }

    private static async Task ExecuteAsync
    (
        NpgsqlConnection db,
        NpgsqlTransaction? transaction,
        string sql
    )
    {
        await using var command =
            new NpgsqlCommand(sql, db, transaction)
            {
                CommandTimeout = 600
            };

        await command.ExecuteNonQueryAsync();
    }

    private static string Q
    (
        string identifier
    )
    {
        return "\"" + identifier.Replace("\"", "\"\"") + "\"";
    }


    //===========================================================
    // Connections
    //===========================================================

    private sealed class NamedConnection
    {
        public string Name { get; init; } = string.Empty;

        public NpgsqlConnectionStringBuilder Builder { get; init; } = new();
    }

    private List<NamedConnection> ReadConnections()
    {
        // one company per request : only its own database
        if (_tenant.Tenant is TenantInfo company)
        {
            return
            [
                new NamedConnection
                {
                    Name = AppConnectionName,
                    Builder = new NpgsqlConnectionStringBuilder(company.ConnectionString)
                }
            ];
        }

        var list =
            new List<NamedConnection>();

        foreach (IConfigurationSection section in _configuration.GetSection("ConnectionStrings").GetChildren())
        {
            if (string.IsNullOrWhiteSpace(section.Value))
            {
                continue;
            }

            try
            {
                var builder =
                    new NpgsqlConnectionStringBuilder(section.Value);

                if (string.IsNullOrWhiteSpace(builder.Host) || string.IsNullOrWhiteSpace(builder.Database))
                {
                    continue;
                }

                list.Add(new NamedConnection
                {
                    Name = section.Key,
                    Builder = builder
                });
            }
            catch
            {
                // not a PostgreSQL connection string
            }
        }

        return list
            .OrderByDescending(x => x.Name == AppConnectionName)
            .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private List<DataConnectionDto> GetConnections()
    {
        return ReadConnections()
            .Select
            (
                x =>
                    new DataConnectionDto
                    {
                        Name = x.Name,
                        Host = x.Builder.Host ?? string.Empty,
                        Port = x.Builder.Port,
                        Database = x.Builder.Database ?? string.Empty,
                        IsAppDatabase = x.Name == AppConnectionName
                    }
            )
            .ToList();
    }

    private NamedConnection GetConnection
    (
        string name
    )
    {
        NamedConnection? connection =
            ReadConnections()
                .FirstOrDefault(x => string.Equals(x.Name, (name ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase));

        return connection
            ?? throw new InvalidOperationException($"Database \"{name}\" is not in the API's connection strings.");
    }

    private static async Task<NpgsqlConnection> OpenAsync
    (
        NamedConnection connection,
        int timeoutSeconds
    )
    {
        var builder =
            new NpgsqlConnectionStringBuilder(connection.Builder.ConnectionString)
            {
                Timeout = timeoutSeconds,
                Pooling = false,
                CommandTimeout = 600
            };

        var db =
            new NpgsqlConnection(builder.ConnectionString);

        await db.OpenAsync();

        return db;
    }

    private static void CheckConfirmation
    (
        NamedConnection connection,
        string confirm,
        string reason
    )
    {
        if (!string.Equals((confirm ?? string.Empty).Trim(), connection.Builder.Database, StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"Type the database name exactly ({connection.Builder.Database}) to confirm.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidOperationException("A reason is required.");
        }
    }


    //===========================================================
    // Tools (pg_dump / pg_restore)
    //===========================================================

    private sealed class ToolsInfo
    {
        public bool Found { get; set; }

        public string Folder { get; set; } = string.Empty;

        public string Version { get; set; } = string.Empty;

        public int Major { get; set; }

        public string Message { get; set; } = string.Empty;
    }

    private static string ToolName
    (
        string tool
    )
    {
        return OperatingSystem.IsWindows() ? tool + ".exe" : tool;
    }

    private static IEnumerable<string> ToolCandidates
    (
        DataSettingsDto settings
    )
    {
        if (!string.IsNullOrWhiteSpace(settings.ToolsFolder))
        {
            yield return settings.ToolsFolder;
            yield break;
        }

        var roots =
            new List<string>();

        if (OperatingSystem.IsWindows())
        {
            roots.Add(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles));
            roots.Add(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86));

            foreach (string root in roots.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct())
            {
                string postgres =
                    Path.Combine(root, "PostgreSQL");

                if (Directory.Exists(postgres))
                {
                    foreach (string version in Directory.GetDirectories(postgres)
                                 .OrderByDescending(x => int.TryParse(Path.GetFileName(x).Split('.')[0], out int n) ? n : 0))
                    {
                        yield return Path.Combine(version, "bin");
                    }
                }

                yield return Path.Combine(root, "pgAdmin 4", "runtime");
                yield return Path.Combine(root, "pgAdmin 4", "bin");
            }
        }
        else
        {
            if (Directory.Exists("/usr/lib/postgresql"))
            {
                foreach (string version in Directory.GetDirectories("/usr/lib/postgresql")
                             .OrderByDescending(x => int.TryParse(Path.GetFileName(x), out int n) ? n : 0))
                {
                    yield return Path.Combine(version, "bin");
                }
            }

            yield return "/usr/bin";
            yield return "/usr/local/bin";
        }
    }

    private static async Task<ToolsInfo> FindToolsAsync
    (
        DataSettingsDto settings
    )
    {
        foreach (string folder in ToolCandidates(settings))
        {
            try
            {
                string dump =
                    Path.Combine(folder, ToolName("pg_dump"));

                string restore =
                    Path.Combine(folder, ToolName("pg_restore"));

                if (!File.Exists(dump) || !File.Exists(restore))
                {
                    continue;
                }

                (int code, string output, string error) =
                    await RunToolAsync(dump, new[] { "--version" }, null, null, TimeSpan.FromSeconds(20));

                Match match =
                    Regex.Match(output + " " + error, @"(\d+)(\.\d+)?");

                if (code != 0 || !match.Success)
                {
                    continue;
                }

                return new ToolsInfo
                {
                    Found = true,
                    Folder = folder,
                    Version = match.Value,
                    Major = int.Parse(match.Groups[1].Value)
                };
            }
            catch
            {
                // try the next folder
            }
        }

        return new ToolsInfo
        {
            Found = false,
            Message =
                string.IsNullOrWhiteSpace(settings.ToolsFolder)
                    ? "pg_dump / pg_restore not found on this PC. Install the PostgreSQL 18 \"Command Line Tools\" (installer option, no server needed), or set the tools folder in Settings."
                    : $"pg_dump / pg_restore not found in {settings.ToolsFolder}."
        };
    }

    private async Task<ToolsInfo> RequireToolsAsync
    (
        DataSettingsDto settings,
        NamedConnection connection
    )
    {
        ToolsInfo tools =
            await FindToolsAsync(settings);

        if (!tools.Found)
        {
            throw new InvalidOperationException(tools.Message);
        }

        DataServerInfoDto server =
            await GetServerInfoAsync(connection.Name);

        if (!server.Reachable)
        {
            throw new InvalidOperationException(server.Message);
        }

        if (tools.Major < server.Major)
        {
            throw new InvalidOperationException($"The tools on this PC are version {tools.Version}, older than the database server ({server.Version}). Install the PostgreSQL {server.Major} Command Line Tools.");
        }

        return tools;
    }

    private static Task<(int Code, string Output, string Error)> RunToolAsync
    (
        string exe,
        IEnumerable<string> args,
        string? password,
        string? pgOptions
    )
    {
        return RunToolAsync(exe, args, password, pgOptions, ToolTimeout);
    }

    private static async Task<(int Code, string Output, string Error)> RunToolAsync
    (
        string exe,
        IEnumerable<string> args,
        string? password,
        string? pgOptions,
        TimeSpan timeout
    )
    {
        var start =
            new ProcessStartInfo(exe)
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

        foreach (string arg in args)
        {
            start.ArgumentList.Add(arg);
        }

        if (!string.IsNullOrEmpty(password))
        {
            start.Environment["PGPASSWORD"] = password;
        }

        if (!string.IsNullOrEmpty(pgOptions))
        {
            start.Environment["PGOPTIONS"] = pgOptions;
        }

        using Process process =
            Process.Start(start)
            ?? throw new InvalidOperationException($"Could not start {Path.GetFileName(exe)}.");

        Task<string> output =
            process.StandardOutput.ReadToEndAsync();

        Task<string> error =
            process.StandardError.ReadToEndAsync();

        using var cancel =
            new CancellationTokenSource(timeout);

        try
        {
            await process.WaitForExitAsync(cancel.Token);
        }
        catch (OperationCanceledException)
        {
            try
            {
                process.Kill(true);
            }
            catch
            {
                // already gone
            }

            throw new InvalidOperationException($"{Path.GetFileName(exe)} did not finish in {timeout.TotalMinutes:0} minutes and was stopped.");
        }

        return (process.ExitCode, await output, await error);
    }


    //===========================================================
    // Settings / folders / files
    //===========================================================

    private string SettingsFilePath()
    {
        string root =
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "AppCoreERP");

        // one settings file per company (Tenancy:Mode = Host)
        return _tenant.Tenant is TenantInfo company
            ? Path.Combine(root, "tenants", company.TenantCode, "data-management.json")
            : Path.Combine(root, "data-management.json");
    }

    private DataSettingsDto LoadSettings()
    {
        try
        {
            string file =
                SettingsFilePath();

            if (File.Exists(file))
            {
                DataSettingsDto? saved =
                    JsonSerializer.Deserialize<DataSettingsDto>(File.ReadAllText(file));

                if (saved != null && !string.IsNullOrWhiteSpace(saved.ThisPcFolder))
                {
                    return saved;
                }
            }
        }
        catch
        {
            // defaults below
        }

        string defaultFolder =
            OperatingSystem.IsWindows() && Directory.Exists(@"F:\AppCore_ERP_Studio")
                ? @"F:\AppCore_ERP_Studio\Backups"
                : Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "AppCoreERP",
                    "Backups");

        // one backup folder per company (Tenancy:Mode = Host)
        if (_tenant.Tenant is TenantInfo company)
        {
            defaultFolder = Path.Combine(defaultFolder, company.TenantCode);
        }

        return new DataSettingsDto
        {
            ThisPcFolder = defaultFolder,
            OtherPcFolder = string.Empty,
            KeepCount = 20,
            ToolsFolder = string.Empty
        };
    }

    private static async Task<(bool Ok, string Message)> CheckFolderAsync
    (
        string folder,
        bool create
    )
    {
        if (string.IsNullOrWhiteSpace(folder))
        {
            return (false, "Not set.");
        }

        Task<(bool, string)> check =
            Task.Run<(bool, string)>(() =>
            {
                try
                {
                    if (create)
                    {
                        Directory.CreateDirectory(folder);
                    }

                    if (!Directory.Exists(folder))
                    {
                        return (false, $"{folder} cannot be reached.");
                    }

                    string probe =
                        Path.Combine(folder, $".appcore-probe-{Guid.NewGuid():N}.tmp");

                    File.WriteAllText(probe, "ok");
                    File.Delete(probe);

                    return (true, folder);
                }
                catch (Exception ex)
                {
                    return (false, $"{folder} : {Short(ex.Message)}");
                }
            });

        Task finished =
            await Task.WhenAny(check, Task.Delay(TimeSpan.FromSeconds(10)));

        return finished == check
            ? await check
            : (false, $"{folder} did not answer in 10 seconds (PC off or share not reachable).");
    }

    private static async Task CopyWithSidecarAsync
    (
        string source,
        string target
    )
    {
        string? folder =
            Path.GetDirectoryName(target);

        if (!string.IsNullOrEmpty(folder))
        {
            Directory.CreateDirectory(folder);
        }

        await using (FileStream input = File.OpenRead(source))
        await using (FileStream output = File.Create(target))
        {
            await input.CopyToAsync(output);
        }

        // Keep the original date (the list falls back to it when a
        // file has no sidecar)
        File.SetLastWriteTime(target, File.GetLastWriteTime(source));

        if (File.Exists(source + SidecarExtension))
        {
            File.Copy(source + SidecarExtension, target + SidecarExtension, true);
        }
    }

    private static DataBackupDto? ReadSidecar
    (
        string backupPath
    )
    {
        try
        {
            string sidecar =
                backupPath + SidecarExtension;

            if (!File.Exists(sidecar))
            {
                return null;
            }

            DataBackupDto? meta =
                JsonSerializer.Deserialize<DataBackupDto>(File.ReadAllText(sidecar));

            if (meta != null)
            {
                meta.OnThisPc = false;
                meta.OnOtherPc = false;

                if (File.Exists(backupPath))
                {
                    meta.SizeBytes = new FileInfo(backupPath).Length;
                }
            }

            return meta;
        }
        catch
        {
            return null;
        }
    }

    private async Task<DataBackupDto?> LatestBackupAsync
    (
        string connectionName
    )
    {
        return (await GetBackupsAsync())
            .Where(x => string.Equals(x.ConnectionName, connectionName, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.TakenDate)
            .FirstOrDefault();
    }

    private static bool IsFresh
    (
        DataBackupDto? backup
    )
    {
        return backup != null
            && backup.TakenDate >= DateTime.Now.AddMinutes(-FreshMinutes);
    }

    // Kept per folder for a kind; 0 = never deleted automatically
    private static int KeepFor
    (
        DataSettingsDto settings,
        string kind
    )
    {
        return kind switch
        {
            KindNightly => Math.Max(1, settings.KeepNightly),
            KindWeekly => Math.Max(1, settings.KeepWeekly),
            KindMonthly => Math.Max(1, settings.KeepMonthly),
            _ => 0
        };
    }

    private static void Prune
    (
        string folder,
        string kind,
        int keep,
        string current
    )
    {
        if (keep <= 0 || string.IsNullOrWhiteSpace(folder))
        {
            return;
        }

        try
        {
            List<(string Path, DateTime Date)> files =
                Directory.EnumerateFiles(folder, "*" + BackupExtension)
                    .Select(x => (Path: x, Meta: ReadSidecar(x)))
                    .Where(x => x.Meta != null && string.Equals(x.Meta.Kind, kind, StringComparison.OrdinalIgnoreCase))
                    .Select(x => (x.Path, x.Meta!.TakenDate))
                    .OrderByDescending(x => x.Item2)
                    .ToList();

            foreach ((string path, _) in files.Skip(keep))
            {
                if (string.Equals(Path.GetFileName(path), current, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                TryDelete(path);
                TryDelete(path + SidecarExtension);
            }
        }
        catch
        {
            // pruning never fails a backup
        }
    }

    private void AppendHistory
    (
        DataHistoryDto entry
    )
    {
        entry.Id = Guid.NewGuid().ToString("N");
        entry.Date = DateTime.Now;
        entry.Machine = Environment.MachineName;

        string line =
            JsonSerializer.Serialize(entry, JsonLine) + Environment.NewLine;

        DataSettingsDto settings =
            LoadSettings();

        lock (HistoryLock)
        {
            foreach (string folder in new[] { settings.ThisPcFolder, settings.OtherPcFolder })
            {
                if (string.IsNullOrWhiteSpace(folder))
                {
                    continue;
                }

                try
                {
                    Directory.CreateDirectory(folder);
                    File.AppendAllText(Path.Combine(folder, HistoryFileName), line, Encoding.UTF8);
                }
                catch
                {
                    // the other PC may be off; this PC's log is the main one
                }
            }
        }
    }

    private static string SafeFileName
    (
        string fileName
    )
    {
        string name =
            Path.GetFileName((fileName ?? string.Empty).Trim());

        if (name.Length == 0
            || !name.EndsWith(BackupExtension, StringComparison.OrdinalIgnoreCase)
            || name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0
            || name != (fileName ?? string.Empty).Trim())
        {
            throw new InvalidOperationException("Not a backup file name.");
        }

        return name;
    }

    private static string SafePart
    (
        string text
    )
    {
        string clean =
            Regex.Replace(text ?? string.Empty, @"[^A-Za-z0-9\-]+", "-").Trim('-');

        return clean.Length == 0 ? "db" : clean;
    }

    private static void TryDelete
    (
        string path
    )
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // ignore
        }
    }

    private static string Short
    (
        string? text
    )
    {
        string value =
            (text ?? string.Empty).Trim();

        // never echo a password that a tool might print
        value =
            Regex.Replace(value, @"(?i)password=[^;\s]*", "password=***");

        return value.Length > 600 ? value[..600] + " ..." : value;
    }

    private static string FormatSize
    (
        long bytes
    )
    {
        return bytes >= 1024 * 1024
            ? $"{bytes / 1024d / 1024d:0.0} MB"
            : $"{Math.Max(1, bytes / 1024):N0} KB";
    }
}
