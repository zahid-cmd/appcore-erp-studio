//===============================================================
// Backup Center (Settings > General Settings) : models
//
// Client side of the backups : nightly status, the last 10
// backups of the App database (read only) and Backup Now (needs
// the "Take Backup" activity). The API answers in camelCase;
// the service maps to PascalCase.
//===============================================================

export interface BackupCenterNightly
{
    Enabled: boolean;
    Time: string;
    LastStatus: string;
    LastRunDate: string | null;
    LastKind: string;
    LastSuccessDate: string | null;
    NextRun: string | null;
    Failing: boolean;
    Message: string;
    KeepNightly: number;
    KeepWeekly: number;
    KeepMonthly: number;
    SavedOnBothPcs: boolean;
}

export interface BackupCenterItem
{
    FileName: string;
    Database: string;
    SizeBytes: number;
    Kind: string;
    Note: string;
    TakenBy: string;
    TakenDate: string;
    OnThisPc: boolean;
    OnOtherPc: boolean;
}

export interface BackupCenter
{
    Nightly: BackupCenterNightly;
    Backups: BackupCenterItem[];
    CanTakeBackup: boolean;
    Database: string;
}

export interface BackupCenterResult
{
    FileName: string;
    SizeBytes: number;
    TakenDate: string;
    SavedOnBothPcs: boolean;
    Warning: string;
}
