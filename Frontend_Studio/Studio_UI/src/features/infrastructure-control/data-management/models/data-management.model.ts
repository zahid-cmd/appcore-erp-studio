//===============================================================
// Data Management : models
//
// Infrastructure Control › Data Management (AppCore Admin only)
// The API answers in camelCase; the service maps to PascalCase.
//===============================================================

export interface DataConnection
{
    Name: string;
    Host: string;
    Port: number;
    Database: string;
    IsAppDatabase: boolean;
}

export interface DataSettings
{
    ThisPcFolder: string;
    OtherPcFolder: string;
    KeepCount: number;
    ToolsFolder: string;
    NightlyEnabled: boolean;
    NightlyTime: string;
    KeepNightly: number;
    KeepWeekly: number;
    KeepMonthly: number;
}

export interface DataNightlyStatus
{
    Enabled: boolean;
    Time: string;
    LastStatus: string;
    LastRunDate: string | null;
    LastKind: string;
    LastFileName: string;
    LastError: string;
    LastSuccessDate: string | null;
    NextRun: string | null;
    Failing: boolean;
    Message: string;
    KeepNightly: number;
    KeepWeekly: number;
    KeepMonthly: number;
    SavedOnBothPcs: boolean;
}

// Backup kinds (filter on Database Backups)
export const BACKUP_KINDS:
    string[] =
    ['Nightly', 'Weekly', 'Monthly', 'Manual', 'Client', 'Template', 'Before Restore', 'Before Reset'];

export interface DataStatus
{
    Connections: DataConnection[];
    Nightly: DataNightlyStatus;
    Settings: DataSettings;
    ToolsFound: boolean;
    ToolsFolder: string;
    ToolsVersion: string;
    ToolsMajor: number;
    ToolsMessage: string;
    ThisPcFolderOk: boolean;
    ThisPcFolderMessage: string;
    OtherPcFolderSet: boolean;
    OtherPcFolderOk: boolean;
    OtherPcFolderMessage: string;
    MachineName: string;
}

export interface DataServerInfo
{
    ConnectionName: string;
    Reachable: boolean;
    Version: string;
    Major: number;
    SizeBytes: number;
    Message: string;
}

export interface DataBackup
{
    FileName: string;
    ConnectionName: string;
    Host: string;
    Database: string;
    SizeBytes: number;
    Kind: string;
    Note: string;
    TakenBy: string;
    TakenDate: string;
    ToolsVersion: string;
    TakenOn: string;
    OnThisPc: boolean;
    OnOtherPc: boolean;
}

export interface DataBackupResult
{
    Backup: DataBackup;
    OtherPcMessage: string;
}

export interface DataRestoreResult
{
    SafetyBackupFileName: string;
    Message: string;
}

export interface DataResetTable
{
    Name: string;
    GroupKey: string;
    Rows: number;
    AutoAdded: boolean;
}

export interface DataResetGroup
{
    Key: string;
    Name: string;
    Icon: string;
    Description: string;
    IsSpecial: boolean;
    SpecialRows: number;
    Tables: DataResetTable[];

    // Operations / Settings
    Section: string;

    // Settings : Client Settings / Product Settings ...
    Area: string;

    // Shared reference data : kept by "Template clean"
    KeepInTemplate: boolean;

    // "Test data only" possible (rows with Remarks 'TEST DATA')
    SupportsTestData: boolean;

    TestRows: number;
}

// A Settings page that is never cleared
export interface DataResetLocked
{
    Name: string;
    Reason: string;
}

export interface DataResetCatalog
{
    ConnectionName: string;
    Database: string;
    Groups: DataResetGroup[];
    Locked: DataResetLocked[];
    LastBackup: DataBackup | null;
    BackupFresh: boolean;
    FreshMinutes: number;
}

export interface DataResetRequest
{
    ConnectionName: string;
    Tables: string[];
    WalkInCustomers: boolean;

    // Settings groups cleared in "Test data only" mode
    TestDataGroups: string[];

    ConfirmDatabase?: string;
    Reason?: string;
}

export interface DataResetPreview
{
    Tables: DataResetTable[];
    Blocks: string[];
    TotalRows: number;
    ProductLedgers: number;
    WalkInCustomers: number;
    WalkInLedgers: number;
    TestDataRows: number;
    SettingsLedgers: number;
    AccountGroups: number;
    AccountSubGroups: number;
    Unlinked: number;
    // What to clear too so the blocks go
    Fixes?: DataResetFix[];
    BackupFresh: boolean;
    CanRun: boolean;
}

// A block's way out : tick this group too (Fixable), or a kept
// table that cannot be cleared from here
export interface DataResetFix
{
    GroupKey: string;
    Name: string;
    Tables: string[];
    Fixable: boolean;
}

export interface DataResetResult
{
    Tables: DataResetTable[];
    TotalRows: number;
    ProductLedgersDeleted: number;
    WalkInCustomersDeleted: number;
    WalkInLedgersDeleted: number;
    TestDataRowsDeleted: number;
    SettingsLedgersDeleted: number;
    AccountGroupsDeleted: number;
    AccountSubGroupsDeleted: number;
    Unlinked: number;
    BackupFileName: string;
}

export interface DataHistory
{
    Id: string;
    Action: string;
    Kind: string;
    Slot: string;
    Status: string;
    ConnectionName: string;
    Database: string;
    FileName: string;
    Reason: string;
    Details: string;
    TotalRows: number;
    Tables: DataResetTable[];
    Error: string;
    By: string;
    Date: string;
    Machine: string;
}


//===============================================================
// Helpers
//===============================================================

export function formatBytes
(
    bytes: number
):
    string
{
    const value =
        Number(bytes) || 0;

    if (value >= 1024 * 1024 * 1024)
    {
        return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    if (value >= 1024 * 1024)
    {
        return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(value / 1024)).toLocaleString('en-US')} KB`;
}

export function formatDateTime
(
    iso: string | null | undefined
):
    string
{
    if (!iso)
    {
        return '';
    }

    const date =
        new Date(iso);

    if (isNaN(date.getTime()))
    {
        return String(iso);
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const pad =
        (n: number) => String(n).padStart(2, '0');

    return `${pad(date.getDate())}-${months[date.getMonth()]}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatCount
(
    value: number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US');
}

// "DefaultConnection" -> "App database"
export function connectionLabel
(
    connection: DataConnection | null | undefined
):
    string
{
    if (!connection)
    {
        return '';
    }

    const name =
        connection.IsAppDatabase
            ? 'App database'
            : connection.Name.replace(/Connection$/i, '');

    return `${name} · ${connection.Database} @ ${connection.Host}`;
}

// API error -> text
export function apiError
(
    error: any,
    fallback: string
):
    string
{
    return error?.error?.message
        || error?.error?.Message
        || (typeof error?.error === 'string' ? error.error : '')
        || fallback;
}
