//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine;


//===============================================================
// Migration Snapshot Manager
//===============================================================

public class MigrationSnapshotManager
{

    //===========================================================
    // Backup Snapshot
    //===========================================================

    public string BackupSnapshot
    (
        string snapshotFile
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(snapshotFile)
        )
        {
            throw new ArgumentException
            (
                "Snapshot file path is required.",
                nameof(snapshotFile)
            );
        }

        if
        (
            !File.Exists
            (
                snapshotFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Snapshot file could not be found: {snapshotFile}"
            );
        }

        var backupFile =
            $"{snapshotFile}.dbmigration-backup";

        File.Copy
        (
            snapshotFile,
            backupFile,
            true
        );

        return backupFile;
    }


    //===========================================================
    // Restore Snapshot
    //===========================================================

    public void RestoreSnapshot
    (
        string snapshotFile,
        string backupFile
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(snapshotFile)
        )
        {
            throw new ArgumentException
            (
                "Snapshot file path is required.",
                nameof(snapshotFile)
            );
        }

        if
        (
            string.IsNullOrWhiteSpace(backupFile)
        )
        {
            throw new ArgumentException
            (
                "Snapshot backup file path is required.",
                nameof(backupFile)
            );
        }

        if
        (
            !File.Exists
            (
                backupFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Snapshot backup file could not be found: {backupFile}"
            );
        }

        File.Copy
        (
            backupFile,
            snapshotFile,
            true
        );
    }


    //===========================================================
    // Remove Backup
    //===========================================================

    public void RemoveBackup
    (
        string backupFile
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(backupFile)
        )
        {
            throw new ArgumentException
            (
                "Snapshot backup file path is required.",
                nameof(backupFile)
            );
        }

        if
        (
            File.Exists
            (
                backupFile
            )
        )
        {
            File.Delete
            (
                backupFile
            );
        }
    }


    //===========================================================
    // Verify Snapshot
    //===========================================================

    public void VerifySnapshot
    (
        string snapshotFile
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(snapshotFile)
        )
        {
            throw new ArgumentException
            (
                "Snapshot file path is required.",
                nameof(snapshotFile)
            );
        }

        if
        (
            !File.Exists
            (
                snapshotFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"AppDbContextModelSnapshot.cs could not be found: {snapshotFile}"
            );
        }
    }
}