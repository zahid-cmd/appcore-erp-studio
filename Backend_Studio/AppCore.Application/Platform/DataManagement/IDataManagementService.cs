//===============================================================
// Data Management service (AppCore Admin only)
//
// Every call is checked by the controller with
// IsAppCoreAdminAsync (role RP-001 AppCore Admin, by code).
// A failed rule throws InvalidOperationException (answer 400).
//===============================================================

namespace AppCore.Application.Platform.DataManagement;


public interface IDataManagementService
{
    // Role RP-001 (AppCore Admin), active assignment
    Task<bool> IsAppCoreAdminAsync(
        long userId);

    //===========================================================
    // Status / settings
    //===========================================================

    Task<DataStatusDto> GetStatusAsync();

    Task<DataServerInfoDto> GetServerInfoAsync(
        string connectionName);

    Task<DataStatusDto> SaveSettingsAsync(
        DataSettingsDto settings);

    //===========================================================
    // Backups
    //===========================================================

    Task<List<DataBackupDto>> GetBackupsAsync();

    Task<DataBackupResultDto> BackupAsync(
        DataBackupRequestDto request,
        string userName);

    // Full path of a backup file (this PC first), or null
    string? FindBackupFile(
        string fileName);

    Task<DataBackupDto> CopyToOtherPcAsync(
        string fileName,
        string userName);

    Task DeleteBackupAsync(
        DataFileRequestDto request,
        string userName);

    Task<DataRestoreResultDto> RestoreAsync(
        DataRestoreRequestDto request,
        string userName);

    //===========================================================
    // Data Reset
    //===========================================================

    Task<DataResetCatalogDto> GetResetCatalogAsync(
        string connectionName);

    Task<DataResetPreviewDto> PreviewResetAsync(
        DataResetRequestDto request);

    Task<DataResetResultDto> RunResetAsync(
        DataResetRequestDto request,
        string userName);

    //===========================================================
    // Nightly backup (background job) and Backup Center
    //===========================================================

    Task<DataNightlyStatusDto> GetNightlyStatusAsync();

    // Runs the App database's scheduled backup when its slot is
    // due and not done yet; false when nothing was due
    Task<bool> RunScheduledIfDueAsync(
        CancellationToken cancellationToken);

    // Client "Take Backup" : App database, kind Client
    Task<DataBackupResultDto> TakeClientBackupAsync(
        string note,
        string userName);

    Task<BackupCenterDto> GetBackupCenterAsync(
        bool canTakeBackup);

    //===========================================================
    // History
    //===========================================================

    Task<List<DataHistoryDto>> GetHistoryAsync();
}
