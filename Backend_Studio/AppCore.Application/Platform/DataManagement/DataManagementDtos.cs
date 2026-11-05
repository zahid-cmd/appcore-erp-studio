//===============================================================
// Data Management : DTOs
//
// Infrastructure Control › Data Management (AppCore Admin only)
//   Database Backups : pg_dump / pg_restore, two folders
//   Data Reset       : clear operational tables by group / table
//   Reset History    : backups, restores and resets (log file)
//===============================================================

namespace AppCore.Application.Platform.DataManagement;


//===============================================================
// Databases (named connection strings of appsettings.json)
//===============================================================

public class DataConnectionDto
{
    public string Name { get; set; } = string.Empty;

    public string Host { get; set; } = string.Empty;

    public int Port { get; set; }

    public string Database { get; set; } = string.Empty;

    // DefaultConnection : the database the app itself uses
    public bool IsAppDatabase { get; set; }
}


//===============================================================
// Settings (C:\ProgramData\AppCoreERP\data-management.json)
//===============================================================

public class DataSettingsDto
{
    // Folder on the PC that runs the API
    public string ThisPcFolder { get; set; } = string.Empty;

    // Shared folder of the other PC (\\PC-NAME\Share); empty = off
    public string OtherPcFolder { get; set; } = string.Empty;

    // Old setting (before the nightly rules); not used any more
    public int KeepCount { get; set; }

    // Folder of pg_dump / pg_restore; empty = found automatically
    public string ToolsFolder { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // Nightly backup of the App database (DefaultConnection)
    //-----------------------------------------------------------

    public bool NightlyEnabled { get; set; } = true;

    // HH:mm, Bangladesh time
    public string NightlyTime { get; set; } = "00:30";

    // Kept per folder; manual / client / before-restore / before-
    // reset backups are never deleted automatically
    public int KeepNightly { get; set; } = 14;

    // Friday night's run (Saturday 00:30)
    public int KeepWeekly { get; set; } = 8;

    // The run on the 1st of the month
    public int KeepMonthly { get; set; } = 12;
}


//===============================================================
// Nightly backup status (pages, dashboard, bell)
//===============================================================

public class DataNightlyStatusDto
{
    public bool Enabled { get; set; }

    public string Time { get; set; } = string.Empty;

    // Last scheduled run : Done / Failed / None
    public string LastStatus { get; set; } = "None";

    public DateTime? LastRunDate { get; set; }

    public string LastKind { get; set; } = string.Empty;

    public string LastFileName { get; set; } = string.Empty;

    public string LastError { get; set; } = string.Empty;

    public DateTime? LastSuccessDate { get; set; }

    public DateTime? NextRun { get; set; }

    // The last run failed, or no good backup for more than a day
    public bool Failing { get; set; }

    public string Message { get; set; } = string.Empty;

    public int KeepNightly { get; set; }

    public int KeepWeekly { get; set; }

    public int KeepMonthly { get; set; }

    public bool SavedOnBothPcs { get; set; }
}


//===============================================================
// Backup Center (Settings > General Settings, client side)
//===============================================================

public class BackupCenterDto
{
    public DataNightlyStatusDto Nightly { get; set; } = new();

    // Last 10 backups of the App database (read only)
    public List<DataBackupDto> Backups { get; set; } = new();

    public bool CanTakeBackup { get; set; }

    public string Database { get; set; } = string.Empty;
}


//===============================================================
// Status of the page
//===============================================================

public class DataStatusDto
{
    public List<DataConnectionDto> Connections { get; set; } = new();

    public DataNightlyStatusDto Nightly { get; set; } = new();

    public DataSettingsDto Settings { get; set; } = new();

    public bool ToolsFound { get; set; }

    public string ToolsFolder { get; set; } = string.Empty;

    public string ToolsVersion { get; set; } = string.Empty;

    public int ToolsMajor { get; set; }

    public string ToolsMessage { get; set; } = string.Empty;

    public bool ThisPcFolderOk { get; set; }

    public string ThisPcFolderMessage { get; set; } = string.Empty;

    public bool OtherPcFolderSet { get; set; }

    public bool OtherPcFolderOk { get; set; }

    public string OtherPcFolderMessage { get; set; } = string.Empty;

    public string MachineName { get; set; } = string.Empty;
}

public class DataServerInfoDto
{
    public string ConnectionName { get; set; } = string.Empty;

    public bool Reachable { get; set; }

    public string Version { get; set; } = string.Empty;

    public int Major { get; set; }

    public long SizeBytes { get; set; }

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Backups
//===============================================================

public class DataBackupDto
{
    public string FileName { get; set; } = string.Empty;

    public string ConnectionName { get; set; } = string.Empty;

    public string Host { get; set; } = string.Empty;

    public string Database { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    // Manual / Before Restore / Before Reset
    public string Kind { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public string TakenBy { get; set; } = string.Empty;

    public DateTime TakenDate { get; set; }

    public string ToolsVersion { get; set; } = string.Empty;

    public string TakenOn { get; set; } = string.Empty;

    public bool OnThisPc { get; set; }

    public bool OnOtherPc { get; set; }
}

public class DataBackupRequestDto
{
    public string ConnectionName { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    // Save as Template : kind "Template" (never deleted
    // automatically), the base for a new dealer's database
    public bool Template { get; set; }
}

public class DataBackupResultDto
{
    public DataBackupDto Backup { get; set; } = new();

    // Empty when the copy to the other PC worked (or is off)
    public string OtherPcMessage { get; set; } = string.Empty;
}

public class DataFileRequestDto
{
    public string FileName { get; set; } = string.Empty;

    // this / other / both (delete)
    public string Where { get; set; } = string.Empty;
}

public class DataRestoreRequestDto
{
    public string FileName { get; set; } = string.Empty;

    public string ConnectionName { get; set; } = string.Empty;

    public string ConfirmDatabase { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}

public class DataRestoreResultDto
{
    public string SafetyBackupFileName { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Data Reset
//===============================================================

public class DataResetTableDto
{
    public string Name { get; set; } = string.Empty;

    public string GroupKey { get; set; } = string.Empty;

    public long Rows { get; set; }

    // Pulled in by Preview (a selected table depends on it)
    public bool AutoAdded { get; set; }
}

public class DataResetGroupDto
{
    public string Key { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Icon { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    // walk-in : no tables, deletes walk-in customers
    public bool IsSpecial { get; set; }

    public long SpecialRows { get; set; }

    public List<DataResetTableDto> Tables { get; set; } = new();

    // Operations / Settings
    public string Section { get; set; } = string.Empty;

    // Settings : Client Settings / Product Settings ...
    public string Area { get; set; } = string.Empty;

    // Shared reference data : kept by "Template clean"
    public bool KeepInTemplate { get; set; }

    // "Test data only" possible (rows with Remarks 'TEST DATA')
    public bool SupportsTestData { get; set; }

    public long TestRows { get; set; }
}

// A Settings page that is never cleared
public class DataResetLockedDto
{
    public string Name { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}

public class DataResetCatalogDto
{
    public string ConnectionName { get; set; } = string.Empty;

    public string Database { get; set; } = string.Empty;

    public List<DataResetGroupDto> Groups { get; set; } = new();

    public List<DataResetLockedDto> Locked { get; set; } = new();

    // Latest backup of this database (any kind)
    public DataBackupDto? LastBackup { get; set; }

    // A backup of this database in the last 30 minutes
    public bool BackupFresh { get; set; }

    public int FreshMinutes { get; set; }
}

public class DataResetRequestDto
{
    public string ConnectionName { get; set; } = string.Empty;

    public List<string> Tables { get; set; } = new();

    public bool WalkInCustomers { get; set; }

    // Settings groups cleared in "Test data only" mode (their
    // rows with Remarks 'TEST DATA'; the tables are not emptied)
    public List<string> TestDataGroups { get; set; } = new();

    // Run only
    public string ConfirmDatabase { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}

public class DataResetPreviewDto
{
    public List<DataResetTableDto> Tables { get; set; } = new();

    public List<string> Blocks { get; set; } = new();

    public long TotalRows { get; set; }

    public long ProductLedgers { get; set; }

    public long WalkInCustomers { get; set; }

    public long WalkInLedgers { get; set; }

    // Settings : test rows, own ledgers, account groups / sub
    // groups made by the cleared Settings tables, links emptied
    public long TestDataRows { get; set; }

    public long SettingsLedgers { get; set; }

    public long AccountGroups { get; set; }

    public long AccountSubGroups { get; set; }

    public long Unlinked { get; set; }

    // What to clear too so the blocks go (one per group), and the
    // kept tables that cannot be cleared from here
    public List<DataResetFixDto> Fixes { get; set; } = new();

    public bool BackupFresh { get; set; }

    public bool CanRun { get; set; }
}

// A block's way out : tick this group too (Fixable), or a kept
// table that cannot be cleared here (not Fixable)
public class DataResetFixDto
{
    public string GroupKey { get; set; } = string.Empty;

    // Group name, or the table name when not Fixable
    public string Name { get; set; } = string.Empty;

    // The kept tables of this group that hold the links
    public List<string> Tables { get; set; } = new();

    public bool Fixable { get; set; }
}

public class DataResetResultDto
{
    public List<DataResetTableDto> Tables { get; set; } = new();

    public long TotalRows { get; set; }

    public long ProductLedgersDeleted { get; set; }

    public long WalkInCustomersDeleted { get; set; }

    public long WalkInLedgersDeleted { get; set; }

    public long TestDataRowsDeleted { get; set; }

    public long SettingsLedgersDeleted { get; set; }

    public long AccountGroupsDeleted { get; set; }

    public long AccountSubGroupsDeleted { get; set; }

    public long Unlinked { get; set; }

    public string BackupFileName { get; set; } = string.Empty;
}


//===============================================================
// History (history.jsonl in the backup folders)
//===============================================================

public class DataHistoryDto
{
    public string Id { get; set; } = string.Empty;

    // Backup / Restore / Reset / Delete / Copy
    public string Action { get; set; } = string.Empty;

    // Backup kind : Manual / Client / Nightly / Weekly / Monthly /
    // Before Restore / Before Reset
    public string Kind { get; set; } = string.Empty;

    // Scheduled runs : the date of the run slot (yyyy-MM-dd)
    public string Slot { get; set; } = string.Empty;

    // Done / Failed
    public string Status { get; set; } = string.Empty;

    public string ConnectionName { get; set; } = string.Empty;

    public string Database { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string Details { get; set; } = string.Empty;

    public long TotalRows { get; set; }

    public List<DataResetTableDto> Tables { get; set; } = new();

    public string Error { get; set; } = string.Empty;

    public string By { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public string Machine { get; set; } = string.Empty;
}
