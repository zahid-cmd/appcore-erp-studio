//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

using AppCore.Application.Platform.CommonInterfaces;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.CodeSynchronizationEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.CodeSynchronizationEngine;


//===============================================================
// Frontend Code Synchronization Engine
//===============================================================

public class FrontendCodeSynchronizationEngine
    : IFrontendCodeSynchronizationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly ITemplateLoader
        _templateLoader;


    private readonly IPlaceholderEngine
        _placeholderEngine;


    private readonly IFileUpdater
        _fileUpdater;


    private readonly IFileRemover
        _fileRemover;



    //===========================================================
    // Constructor
    //===========================================================

    public FrontendCodeSynchronizationEngine
    (
        ITemplateLoader templateLoader,

        IPlaceholderEngine placeholderEngine,

        IFileUpdater fileUpdater,

        IFileRemover fileRemover
    )
    {
        _templateLoader =
            templateLoader;


        _placeholderEngine =
            placeholderEngine;


        _fileUpdater =
            fileUpdater;


        _fileRemover =
            fileRemover;
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<FrontendCodeSynchronizationResultDto>
        SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        try
        {
            //===================================================
            // Validate
            //===================================================

            if
            (
                synchronization == null
            )
            {
                return Failure(
                    "Submenu Synchronization data is required."
                );
            }


            //===================================================
            // Validate Pre-Set Frontend Files
            //
            // IMPORTANT:
            //
            // The engine works ONLY with the nine pre-set
            // frontend source files.
            //
            // It does NOT create frontend source files.
            //
            // It does NOT create frontend feature folders.
            //
            // It does NOT create baseline or restore folders.
            //
            // The Module Frontend Synchronization Engine is
            // responsible for creating those folders.
            //
            // This engine creates ONLY:
            //
            // 9 baseline backup files
            // 9 restore backup files
            //
            // under the folders already created by the
            // Module Frontend Synchronization Engine.
            //===================================================

            ValidatePreSetFrontendFiles(
                synchronization
            );


            //===================================================
            // Validate Frontend Menu Route File
            //
            // IMPORTANT:
            //
            // The submenu route registration is handled by
            // THIS Code Synchronization Engine.
            //
            // The Submenu Synchronization Engine does NOT
            // modify the parent menu route file.
            //===================================================

            ValidateFrontendMenuRouteFile(
                synchronization
            );


            //===================================================
            // Remove Legacy Duplicate Backup Files
            //
            // IMPORTANT:
            //
            // Older synchronization logic could create:
            //
            // filename.appcore-sync-baseline
            // filename.appcore-sync-restore
            //
            // beside the actual source files.
            //
            // These files are NOT part of the current backup
            // structure and must never remain there.
            //===================================================

            RemoveLegacyDuplicateBackupFiles(
                synchronization
            );


            //===================================================
            // Model
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Model/model.ts.tpl",

                synchronization.FrontendSubmenuModelFile,

                synchronization
            );


            //===================================================
            // Service
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Service/service.ts.tpl",

                synchronization.FrontendSubmenuServiceFile,

                synchronization
            );


            //===================================================
            // Route
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Route/route.ts.tpl",

                synchronization.FrontendSubmenuRouteFile,

                synchronization
            );


            //===================================================
            // Form TypeScript
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Page/Form/form.ts.tpl",

                synchronization.FrontendSubmenuFormTsFile,

                synchronization
            );


            //===================================================
            // Form HTML
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Page/Form/form.html.tpl",

                synchronization.FrontendSubmenuFormHtmlFile,

                synchronization
            );


            //===================================================
            // Form CSS
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Page/Form/form.css.tpl",

                synchronization.FrontendSubmenuFormCssFile,

                synchronization
            );


            //===================================================
            // List TypeScript
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Page/List/list.ts.tpl",

                synchronization.FrontendSubmenuListTsFile,

                synchronization
            );


            //===================================================
            // List HTML
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Page/List/list.html.tpl",

                synchronization.FrontendSubmenuListHtmlFile,

                synchronization
            );


            //===================================================
            // List CSS
            //===================================================

            await WriteTemplateWithBackupsAsync(
                "Frontend/Page/List/list.css.tpl",

                synchronization.FrontendSubmenuListCssFile,

                synchronization
            );


            //===================================================
            // Register Submenu Route
            //
            // IMPORTANT:
            //
            // The route file is now populated by the Code
            // Synchronization Engine BEFORE registration.
            //
            // The registration is inserted into the existing
            // parent menu route file.
            //
            // The Submenu Synchronization Engine has NO
            // responsibility for this operation.
            //===================================================

            await RegisterSubmenuRouteAsync(
                synchronization
            );


            //===================================================
            // Success
            //===================================================

            return new FrontendCodeSynchronizationResultDto
            {
                Success =
                    true,

                Message =
                    "Frontend code synchronization completed successfully.",

                TotalOperations =
                    10,

                SuccessfulOperations =
                    10,

                FailedOperations =
                    0
            };
        }
        catch
        (
            Exception exception
        )
        {
            return Failure(
                exception.Message
            );
        }
    }



    //===========================================================
    // Rollback
    //===========================================================
    //
    // IMPORTANT:
    //
    // Rollback operates ONLY on the same nine pre-set
    // frontend source files.
    //
    // It removes the centralized backup files.
    //
    // It also removes the submenu route registration created
    // by this Code Synchronization Engine.
    //
    // It does NOT create frontend source files.
    //
    // It does NOT create frontend feature folders.
    //
    // It does NOT create baseline or restore folders.
    //
    // It does NOT create duplicate backup files beside
    // frontend source files.
    //
    //===========================================================

    public async Task<FrontendCodeSynchronizationResultDto>
        RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        try
        {
            //===================================================
            // Validate
            //===================================================

            if
            (
                synchronization == null
            )
            {
                return Failure(
                    "Submenu Synchronization data is required."
                );
            }


            //===================================================
            // Validate Pre-Set Frontend Files
            //===================================================

            ValidatePreSetFrontendFiles(
                synchronization
            );


            //===================================================
            // Validate Frontend Menu Route File
            //===================================================

            ValidateFrontendMenuRouteFile(
                synchronization
            );


            //===================================================
            // Remove Submenu Route Registration
            //
            // IMPORTANT:
            //
            // This registration belongs to the Code
            // Synchronization Engine.
            //
            // Therefore rollback also removes it here.
            //===================================================

            await RemoveSubmenuRouteRegistrationAsync(
                synchronization
            );


            //===================================================
            // Model
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuModelFile
            );


            //===================================================
            // Service
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuServiceFile
            );


            //===================================================
            // Route
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuRouteFile
            );


            //===================================================
            // Form TypeScript
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuFormTsFile
            );


            //===================================================
            // Form HTML
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuFormHtmlFile
            );


            //===================================================
            // Form CSS
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuFormCssFile
            );


            //===================================================
            // List TypeScript
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuListTsFile
            );


            //===================================================
            // List HTML
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuListHtmlFile
            );


            //===================================================
            // List CSS
            //===================================================

            await ClearFileAsync(
                synchronization.FrontendSubmenuListCssFile
            );


            //===================================================
            // Remove Centralized Backup Files
            //===================================================

            await RemoveBackupFilesAsync(
                synchronization
            );


            //===================================================
            // Remove Legacy Duplicate Backup Files
            //===================================================

            RemoveLegacyDuplicateBackupFiles(
                synchronization
            );


            //===================================================
            // Success
            //===================================================

            return new FrontendCodeSynchronizationResultDto
            {
                Success =
                    true,

                Message =
                    "Frontend code rollback completed successfully.",

                TotalOperations =
                    10,

                SuccessfulOperations =
                    10,

                FailedOperations =
                    0
            };
        }
        catch
        (
            Exception exception
        )
        {
            return new FrontendCodeSynchronizationResultDto
            {
                Success =
                    false,

                Message =
                    $"Frontend code rollback failed: {exception.Message}",

                TotalOperations =
                    10,

                SuccessfulOperations =
                    0,

                FailedOperations =
                    10
            };
        }
    }



    //===========================================================
    // Validate Pre-Set Frontend Files
    //===========================================================

    private static void
        ValidatePreSetFrontendFiles
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Files
        //=======================================================

        var files =
            new[]
            {
                synchronization.FrontendSubmenuModelFile,

                synchronization.FrontendSubmenuServiceFile,

                synchronization.FrontendSubmenuRouteFile,

                synchronization.FrontendSubmenuFormTsFile,

                synchronization.FrontendSubmenuFormHtmlFile,

                synchronization.FrontendSubmenuFormCssFile,

                synchronization.FrontendSubmenuListTsFile,

                synchronization.FrontendSubmenuListHtmlFile,

                synchronization.FrontendSubmenuListCssFile
            };


        //=======================================================
        // Validate All Nine Files
        //=======================================================

        foreach
        (
            var file in files
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    file
                )
            )
            {
                throw new InvalidOperationException(
                    "One or more pre-set frontend synchronization files are not configured."
                );
            }


            var fullPath =
                Path.GetFullPath(
                    file
                );


            if
            (
                !File.Exists(
                    fullPath
                )
            )
            {
                throw new FileNotFoundException(
                    $"Pre-set frontend synchronization file was not found: {fullPath}"
                );
            }


            //===================================================
            // Target Must Be A Normal Source File
            //===================================================

            if
            (
                IsBackupFile(
                    fullPath
                )
            )
            {
                throw new InvalidOperationException(
                    $"A synchronization target cannot be a backup file: {fullPath}"
                );
            }
        }
    }



    //===========================================================
    // Validate Frontend Menu Route File
    //===========================================================

    private static void
        ValidateFrontendMenuRouteFile
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                synchronization.FrontendMenuRouteFile
            )
        )
        {
            throw new InvalidOperationException(
                "Frontend menu route file is not configured."
            );
        }


        var menuRouteFile =
            Path.GetFullPath(
                synchronization.FrontendMenuRouteFile
            );


        if
        (
            !File.Exists(
                menuRouteFile
            )
        )
        {
            throw new FileNotFoundException(
                $"Frontend menu route file was not found: {menuRouteFile}"
            );
        }


        if
        (
            IsBackupFile(
                menuRouteFile
            )
        )
        {
            throw new InvalidOperationException(
                $"Frontend menu route file cannot be a backup file: {menuRouteFile}"
            );
        }
    }



    //===========================================================
    // Register Submenu Route
    //===========================================================

    private async Task
        RegisterSubmenuRouteAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Menu Route File
        //=======================================================

        var menuRouteFile =
            Path.GetFullPath(
                synchronization.FrontendMenuRouteFile
            );


        //=======================================================
        // Load Registration Template
        //=======================================================

        var content =
            await _templateLoader.LoadTemplateAsync(
                "Frontend/Route/SubmenuRouteRegistration.tpl"
            );


        //=======================================================
        // Build Replacements
        //=======================================================

        var replacements =
            BuildReplacements(
                synchronization
            );


        //=======================================================
        // Build Relative Route Import
        //=======================================================

        var submenuRouteFile =
            Path.GetFullPath(
                synchronization.FrontendSubmenuRouteFile
            );


        var submenuRouteImport =
            BuildRelativeRouteImport(
                menuRouteFile,

                submenuRouteFile
            );


        replacements[
            "SUBMENU_ROUTE_IMPORT"
        ] =
            submenuRouteImport;


        //=======================================================
        // Apply Template Replacements
        //=======================================================

        content =
            _placeholderEngine.Replace(
                content,

                replacements
            );


        //=======================================================
        // Insert Managed Registration Block
        //
        // IMPORTANT:
        //
        // Registration is inserted into the existing
        // "children:" section of the parent menu route.
        //
        // The managed block makes the operation idempotent.
        // Re-synchronization replaces the existing block instead
        // of creating duplicate registration entries.
        //=======================================================

        await _fileUpdater.InsertManagedBlockAsync(
            menuRouteFile,

            "children:",

            content
        );
    }



    //===========================================================
    // Remove Submenu Route Registration
    //===========================================================

    private async Task
        RemoveSubmenuRouteRegistrationAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                synchronization.FrontendMenuRouteFile
            )
        )
        {
            return;
        }


        var menuRouteFile =
            Path.GetFullPath(
                synchronization.FrontendMenuRouteFile
            );


        if
        (
            !File.Exists(
                menuRouteFile
            )
        )
        {
            return;
        }


        var submenuCode =
            synchronization.SubmenuCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            return;
        }


        //=======================================================
        // Remove Managed Registration Block
        //=======================================================

        await _fileRemover.RemoveManagedBlockAsync(
            menuRouteFile,

            $"// AUTO-BEGIN : {submenuCode}",

            $"// AUTO-END : {submenuCode}"
        );
    }



    //===========================================================
    // Build Relative Route Import
    //===========================================================

    private static string
        BuildRelativeRouteImport
    (
        string menuRouteFile,

        string submenuRouteFile
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                submenuRouteFile
            )
        )
        {
            throw new InvalidOperationException(
                "Frontend submenu route file is not configured."
            );
        }


        var menuDirectory =
            Path.GetDirectoryName(
                Path.GetFullPath(
                    menuRouteFile
                )
            );


        if
        (
            string.IsNullOrWhiteSpace(
                menuDirectory
            )
        )
        {
            throw new InvalidOperationException(
                "Frontend menu route directory could not be determined."
            );
        }


        var submenuFullPath =
            Path.GetFullPath(
                submenuRouteFile
            );


        var relativePath =
            Path.GetRelativePath(
                menuDirectory,

                submenuFullPath
            );


        relativePath =
            relativePath.Replace(
                '\\',

                '/'
            );


        if
        (
            relativePath.EndsWith(
                ".ts",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            relativePath =
                relativePath[..^3];
        }


        if
        (
            !relativePath.StartsWith(
                "."
            )
        )
        {
            relativePath =
                "./"
                +
                relativePath;
        }


        return relativePath;
    }



    //===========================================================
    // Write Template With Backups
    //===========================================================

    private async Task
        WriteTemplateWithBackupsAsync
    (
        string templateRelativePath,

        string targetFile,

        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Target
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                targetFile
            )
        )
        {
            throw new InvalidOperationException(
                $"Frontend target file is not configured for template '{templateRelativePath}'."
            );
        }


        //=======================================================
        // Normalize Target
        //=======================================================

        targetFile =
            Path.GetFullPath(
                targetFile
            );


        //=======================================================
        // Target Must Be A Normal Source File
        //=======================================================

        if
        (
            IsBackupFile(
                targetFile
            )
        )
        {
            throw new InvalidOperationException(
                $"Frontend synchronization cannot write to a backup file: {targetFile}"
            );
        }


        //=======================================================
        // Target Must Already Exist
        //
        // IMPORTANT:
        //
        // File creation is NEVER performed here.
        //
        // The target file must already exist.
        //=======================================================

        if
        (
            !File.Exists(
                targetFile
            )
        )
        {
            throw new FileNotFoundException(
                $"Pre-set frontend target file was not found: {targetFile}"
            );
        }


        //=======================================================
        // Load Template
        //=======================================================

        var content =
            await _templateLoader.LoadTemplateAsync(
                templateRelativePath
            );


        //=======================================================
        // Build Replacements
        //=======================================================

        var replacements =
            BuildReplacements(
                synchronization
            );


        //=======================================================
        // Apply Template Replacements
        //=======================================================

        content =
            _placeholderEngine.Replace(
                content,

                replacements
            );


        //=======================================================
        // Build Centralized Backup Paths
        //
        // IMPORTANT:
        //
        // The backup directories MUST already exist.
        //
        // This engine does NOT create:
        //
        // baseline-files
        // restore-files
        // module folders
        //
        // Those folders are created by the Module Frontend
        // Synchronization Engine.
        //
        // This engine only creates/writes the 18 backup files:
        //
        // 9 baseline files
        // 9 restore files
        //=======================================================

        var backupPaths =
            BuildBackupPaths(
                targetFile,

                synchronization
            );


        //=======================================================
        // Verify Backup Directories Already Exist
        //=======================================================

        EnsureBackupDirectoriesExist(
            backupPaths
        );


        //=======================================================
        // Write Baseline Backup
        //=======================================================

        await File.WriteAllTextAsync(
            backupPaths.BaselineFile,

            content
        );


        //=======================================================
        // Write Restore Backup
        //=======================================================

        await File.WriteAllTextAsync(
            backupPaths.RestoreFile,

            content
        );


        //=======================================================
        // Write Code Into Existing Frontend File
        //
        // IMPORTANT:
        //
        // FileMode.Open is deliberately used.
        //
        // Therefore this method cannot create another frontend
        // source file.
        //=======================================================

        await WriteExistingFileAsync(
            targetFile,

            content
        );


        //=======================================================
        // Remove Any Legacy Duplicate Backup Files
        //
        // IMPORTANT:
        //
        // The centralized backup files above are the ONLY
        // backup files allowed to exist.
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            targetFile
        );
    }



    //===========================================================
    // Write Existing File
    //===========================================================

    private static async Task
        WriteExistingFileAsync
    (
        string filePath,

        string content
    )
    {
        await using var stream =
            new FileStream(
                filePath,

                FileMode.Open,

                FileAccess.Write,

                FileShare.Read
            );


        stream.SetLength(
            0
        );


        await using var writer =
            new StreamWriter(
                stream
            );


        await writer.WriteAsync(
            content
        );
    }



    //===========================================================
    // Build Backup Paths
    //===========================================================

    private static BackupPaths
        BuildBackupPaths
    (
        string targetFile,

        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Find Frontend Source Root
        //=======================================================

        var fullTargetFile =
            Path.GetFullPath(
                targetFile
            );


        var sourceMarker =
            $"{Path.DirectorySeparatorChar}src{Path.DirectorySeparatorChar}";


        var sourceIndex =
            fullTargetFile.IndexOf(
                sourceMarker,

                StringComparison.OrdinalIgnoreCase
            );


        if
        (
            sourceIndex < 0
        )
        {
            throw new InvalidOperationException(
                $"Frontend source root could not be determined from target file: {fullTargetFile}"
            );
        }


        var sourceRoot =
            fullTargetFile[
                ..(
                    sourceIndex
                    +
                    sourceMarker.Length
                )
            ];


        //=======================================================
        // Module Name
        //=======================================================

        var moduleName =
            synchronization.ModuleName?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                moduleName
            )
        )
        {
            throw new InvalidOperationException(
                "Module name is required to build frontend synchronization backup paths."
            );
        }


        //=======================================================
        // Normalize Module Name
        //
        // IMPORTANT:
        //
        // The module backup folder must use the same kebab-case
        // naming convention used by the Module Frontend
        // Synchronization Engine.
        //
        // Example:
        //
        // Accounts & Finance
        //          ↓
        // accounts-finance
        //
        // Settings
        //          ↓
        // settings
        //=======================================================

        moduleName =
            ToKebabCase(
                moduleName
            );


        if
        (
            string.IsNullOrWhiteSpace(
                moduleName
            )
        )
        {
            throw new InvalidOperationException(
                "Module name could not be converted to a valid backup folder name."
            );
        }


        //=======================================================
        // Target File Name
        //=======================================================

        var targetFileName =
            Path.GetFileName(
                fullTargetFile
            );


        //=======================================================
        // Baseline Directory
        //=======================================================

        var baselineDirectory =
            Path.Combine(
                sourceRoot,

                "development_backup",

                "baseline-files",

                moduleName
            );


        //=======================================================
        // Restore Directory
        //=======================================================

        var restoreDirectory =
            Path.Combine(
                sourceRoot,

                "development_backup",

                "restore-files",

                moduleName
            );


        //=======================================================
        // Backup File Names
        //=======================================================

        var baselineFile =
            Path.Combine(
                baselineDirectory,

                $"{targetFileName}.appcore-sync-baseline"
            );


        var restoreFile =
            Path.Combine(
                restoreDirectory,

                $"{targetFileName}.appcore-sync-restore"
            );


        return new BackupPaths
        {
            BaselineFile =
                baselineFile,

            RestoreFile =
                restoreFile
        };
    }



    //===========================================================
    // Ensure Backup Directories Exist
    //===========================================================
    //
    // IMPORTANT:
    //
    // This method ONLY verifies the directories.
    //
    // It NEVER creates them.
    //
    // The Module Frontend Synchronization Engine is responsible
    // for creating:
    //
    // development_backup/
    //     baseline-files/
    //         <module>/
    //
    //     restore-files/
    //         <module>/
    //
    //===========================================================

    private static void
        EnsureBackupDirectoriesExist
    (
        BackupPaths backupPaths
    )
    {
        //=======================================================
        // Baseline Directory
        //=======================================================

        var baselineDirectory =
            Path.GetDirectoryName(
                backupPaths.BaselineFile
            );


        if
        (
            string.IsNullOrWhiteSpace(
                baselineDirectory
            )
            ||
            !Directory.Exists(
                baselineDirectory
            )
        )
        {
            throw new DirectoryNotFoundException(
                $"Frontend baseline backup directory was not found: {baselineDirectory}"
            );
        }


        //=======================================================
        // Restore Directory
        //=======================================================

        var restoreDirectory =
            Path.GetDirectoryName(
                backupPaths.RestoreFile
            );


        if
        (
            string.IsNullOrWhiteSpace(
                restoreDirectory
            )
            ||
            !Directory.Exists(
                restoreDirectory
            )
        )
        {
            throw new DirectoryNotFoundException(
                $"Frontend restore backup directory was not found: {restoreDirectory}"
            );
        }
    }



    //===========================================================
    // Remove Backup Files
    //===========================================================

    private static async Task
        RemoveBackupFilesAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Model
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuModelFile,

            synchronization
        );


        //=======================================================
        // Service
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuServiceFile,

            synchronization
        );


        //=======================================================
        // Route
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuRouteFile,

            synchronization
        );


        //=======================================================
        // Form TypeScript
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuFormTsFile,

            synchronization
        );


        //=======================================================
        // Form HTML
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuFormHtmlFile,

            synchronization
        );


        //=======================================================
        // Form CSS
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuFormCssFile,

            synchronization
        );


        //=======================================================
        // List TypeScript
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuListTsFile,

            synchronization
        );


        //=======================================================
        // List HTML
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuListHtmlFile,

            synchronization
        );


        //=======================================================
        // List CSS
        //=======================================================

        await RemoveBackupFileAsync(
            synchronization.FrontendSubmenuListCssFile,

            synchronization
        );
    }



    //===========================================================
    // Remove Backup File
    //===========================================================

    private static async Task
        RemoveBackupFileAsync
    (
        string targetFile,

        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Target
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                targetFile
            )
        )
        {
            return;
        }


        //=======================================================
        // Build Backup Paths
        //=======================================================

        var backupPaths =
            BuildBackupPaths(
                targetFile,

                synchronization
            );


        //=======================================================
        // Remove Baseline
        //=======================================================

        if
        (
            File.Exists(
                backupPaths.BaselineFile
            )
        )
        {
            File.Delete(
                backupPaths.BaselineFile
            );
        }


        //=======================================================
        // Remove Restore
        //=======================================================

        if
        (
            File.Exists(
                backupPaths.RestoreFile
            )
        )
        {
            File.Delete(
                backupPaths.RestoreFile
            );
        }


        //=======================================================
        // Remove Legacy Duplicate Backup Files
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            targetFile
        );


        //=======================================================
        // Allow Async Flow
        //=======================================================

        await Task.CompletedTask;
    }



    //===========================================================
    // Remove Legacy Duplicate Backup Files
    //===========================================================
    //
    // IMPORTANT:
    //
    // These files are NOT part of the current architecture:
    //
    // filename.appcore-sync-baseline
    // filename.appcore-sync-restore
    //
    // They must never exist beside the actual source file.
    //
    // The valid copies exist ONLY under:
    //
    // development_backup/baseline-files/<Module>/
    // development_backup/restore-files/<Module>/
    //
    //===========================================================

    private static void
        RemoveLegacyDuplicateBackupFiles
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Model
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuModelFile
        );


        //=======================================================
        // Service
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuServiceFile
        );


        //=======================================================
        // Route
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuRouteFile
        );


        //=======================================================
        // Form TypeScript
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuFormTsFile
        );


        //=======================================================
        // Form HTML
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuFormHtmlFile
        );


        //=======================================================
        // Form CSS
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuFormCssFile
        );


        //=======================================================
        // List TypeScript
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuListTsFile
        );


        //=======================================================
        // List HTML
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuListHtmlFile
        );


        //=======================================================
        // List CSS
        //=======================================================

        RemoveLegacyDuplicateBackupFiles(
            synchronization.FrontendSubmenuListCssFile
        );
    }



    //===========================================================
    // Remove Legacy Duplicate Backup File
    //===========================================================

    private static void
        RemoveLegacyDuplicateBackupFiles
    (
        string targetFile
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                targetFile
            )
        )
        {
            return;
        }


        //=======================================================
        // Normalize Target
        //=======================================================

        var fullTargetFile =
            Path.GetFullPath(
                targetFile
            );


        //=======================================================
        // Target Directory
        //=======================================================

        var targetDirectory =
            Path.GetDirectoryName(
                fullTargetFile
            );


        if
        (
            string.IsNullOrWhiteSpace(
                targetDirectory
            )
        )
        {
            return;
        }


        //=======================================================
        // Target File Name
        //=======================================================

        var targetFileName =
            Path.GetFileName(
                fullTargetFile
            );


        //=======================================================
        // Legacy Baseline File
        //=======================================================

        var legacyBaselineFile =
            Path.Combine(
                targetDirectory,

                $"{targetFileName}.appcore-sync-baseline"
            );


        //=======================================================
        // Legacy Restore File
        //=======================================================

        var legacyRestoreFile =
            Path.Combine(
                targetDirectory,

                $"{targetFileName}.appcore-sync-restore"
            );


        //=======================================================
        // Remove Legacy Baseline
        //=======================================================

        if
        (
            File.Exists(
                legacyBaselineFile
            )
        )
        {
            File.Delete(
                legacyBaselineFile
            );
        }


        //=======================================================
        // Remove Legacy Restore
        //=======================================================

        if
        (
            File.Exists(
                legacyRestoreFile
            )
        )
        {
            File.Delete(
                legacyRestoreFile
            );
        }
    }



    //===========================================================
    // Is Backup File
    //===========================================================

    private static bool
        IsBackupFile
    (
        string filePath
    )
    {
        var fileName =
            Path.GetFileName(
                filePath
            );


        return
            fileName.EndsWith(
                ".appcore-sync-baseline",

                StringComparison.OrdinalIgnoreCase
            )
            ||
            fileName.EndsWith(
                ".appcore-sync-restore",

                StringComparison.OrdinalIgnoreCase
            );
    }



    //===========================================================
    // Backup Paths
    //===========================================================

    private sealed class BackupPaths
    {
        public string BaselineFile
        {
            get;
            set;
        } = string.Empty;


        public string RestoreFile
        {
            get;
            set;
        } = string.Empty;
    }



    //===========================================================
    // Clear File
    //===========================================================

    private static async Task
        ClearFileAsync
    (
        string filePath
    )
    {
        //=======================================================
        // Validate Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                filePath
            )
        )
        {
            return;
        }


        //=======================================================
        // Normalize Path
        //=======================================================

        filePath =
            Path.GetFullPath(
                filePath
            );


        //=======================================================
        // File Does Not Exist
        //=======================================================

        if
        (
            !File.Exists(
                filePath
            )
        )
        {
            return;
        }


        //=======================================================
        // Backup File Protection
        //=======================================================

        if
        (
            IsBackupFile(
                filePath
            )
        )
        {
            throw new InvalidOperationException(
                $"Frontend synchronization cannot clear a backup file: {filePath}"
            );
        }


        //=======================================================
        // Clear Existing File
        //=======================================================

        await using var stream =
            new FileStream(
                filePath,

                FileMode.Open,

                FileAccess.Write,

                FileShare.Read
            );


        stream.SetLength(
            0
        );
    }



    //===========================================================
    // Build Replacements
    //===========================================================

    private static Dictionary<string, string>
        BuildReplacements
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Basic Values
        //=======================================================

        var submenuName =
            synchronization.SubmenuName?.Trim()
            ??
            string.Empty;


        var submenuCode =
            synchronization.SubmenuCode?.Trim()
            ??
            string.Empty;


        var moduleName =
            synchronization.ModuleName?.Trim()
            ??
            string.Empty;


        var menuName =
            synchronization.MenuName?.Trim()
            ??
            string.Empty;


        //=======================================================
        // Entity Naming
        //=======================================================

        var entityClass =
            ToPascalCase(
                submenuName
            );


        var entityName =
            submenuName;


        var entityLower =
            ToCamelCase(
                submenuName
            );


        var entityPlural =
            ToPluralPascalCase(
                submenuName
            );


        var entityPluralLower =
            ToPluralCamelCase(
                submenuName
            );


        var entityPluralProperty =
            entityPluralLower;


        var routeKey =
            ToKebabCase(
                submenuName
            );


        //=======================================================
        // Service Naming
        //=======================================================

        var serviceClass =
            $"{entityClass}Service";


        var serviceProperty =
            ToCamelCase(
                serviceClass
            );


        var modelFile =
            routeKey;


        var serviceFile =
            routeKey;


        //=======================================================
        // Component Naming
        //=======================================================

        var listComponentClass =
            $"{entityClass}List";


        var formComponentClass =
            $"{entityClass}Form";


        var listSelector =
            $"{entityLower}-list";


        var formSelector =
            $"{entityLower}-form";


        //=======================================================
        // Parent
        //=======================================================

        var parentEntityProperty =
            "Menu";


        var parentProperty =
            "menu";


        //=======================================================
        // API
        //=======================================================

        var apiRoute =
            BuildApiRoute(
                moduleName,

                menuName,

                routeKey
            );


        //=======================================================
        // Routes
        //=======================================================

        var listRoute =
            "list";


        var addRoute =
            "add";


        var viewRoute =
            "view";


        var editRoute =
            "edit";


        //=======================================================
        // Generated Code
        //=======================================================

        var entityInitializer =
            BuildEntityInitializer(
                parentProperty
            );


        var createPayload =
            BuildCreatePayload(
                parentProperty
            );


        var updatePayload =
            BuildUpdatePayload(
                parentProperty
            );


        var validationCode =
            BuildValidationCode();


        var editClearCode =
            BuildEditClearCode();


        //=======================================================
        // Replacements
        //=======================================================

        return new Dictionary<string, string>
        {

            //===================================================
            // Submenu
            //===================================================

            ["SUBMENU_ID"] =
                synchronization.SubmenuId.ToString(),

            ["SUBMENU_CODE"] =
                submenuCode,

            ["SUBMENU_NAME"] =
                submenuName,

            ["SUBMENU_ROUTE"] =
                routeKey,

            ["SUBMENU_ROUTE_KEY"] =
                routeKey,

            ["SUBMENU_ROUTE_EXPORT"] =
                $"{entityClass}Routes",

            ["SUBMENU_CLASS_NAME"] =
                entityClass,

            ["SUBMENU_FILE_NAME"] =
                routeKey,

            ["SUBMENU_LIST_COMPONENT"] =
                listComponentClass,

            ["SUBMENU_FORM_COMPONENT"] =
                formComponentClass,


            //===================================================
            // Registration
            //===================================================

            ["SUBMENU_ROUTE_PATH"] =
                routeKey,

            ["SUBMENU_VARIABLE"] =
                entityClass,


            //===================================================
            // Module
            //===================================================

            ["MODULE_ID"] =
                synchronization.ModuleId.ToString(),

            ["MODULE_CODE"] =
                synchronization.ModuleCode,

            ["MODULE_NAME"] =
                moduleName,


            //===================================================
            // Menu
            //===================================================

            ["MENU_ID"] =
                synchronization.MenuId.ToString(),

            ["MENU_CODE"] =
                synchronization.MenuCode,

            ["MENU_NAME"] =
                menuName,


            //===================================================
            // Entity
            //===================================================

            ["ENTITY_NAME"] =
                entityName,

            ["ENTITY_CLASS"] =
                entityClass,

            ["ENTITY_LOWER"] =
                entityLower,

            ["ENTITY_PLURAL"] =
                entityPlural,

            ["ENTITY_PLURAL_LOWER"] =
                entityPluralLower,

            ["ENTITY_PLURAL_PROPERTY"] =
                entityPluralProperty,

            ["ENTITY_INITIALIZER"] =
                entityInitializer,


            //===================================================
            // Parent
            //===================================================

            ["PARENT_ENTITY_PROPERTY"] =
                parentEntityProperty,

            ["PARENT_PROPERTY"] =
                parentProperty,


            //===================================================
            // Model
            //===================================================

            ["MODEL_NAME"] =
                entityClass,

            ["MODEL_IMPORT"] =
                entityClass,

            ["MODEL_PATH"] =
                $"../../../models/{modelFile}.model",


            //===================================================
            // Service
            //===================================================

            ["SERVICE_NAME"] =
                serviceClass,

            ["SERVICE_CLASS"] =
                serviceClass,

            ["SERVICE_PROPERTY"] =
                serviceProperty,

            ["SERVICE_PATH"] =
                $"../../../services/{serviceFile}.service",


            //===================================================
            // Rollback Validation
            //===================================================

            ["ROLLBACK_VALIDATION_INTERFACE"] =
                $"{entityClass}RollbackValidation",


            //===================================================
            // API
            //===================================================

            ["API_ROUTE"] =
                apiRoute,


            //===================================================
            // Page
            //===================================================

            ["PAGE_TITLE"] =
                entityName,

            ["PAGE_SUBTITLE"] =
                $"Manage {entityPluralLower}",

            ["PAGE_ICON"] =
                "fas fa-list",


            //===================================================
            // Form
            //===================================================

            ["SELECTOR"] =
                formSelector,

            ["CLASS_NAME"] =
                formComponentClass,

            ["FORM_HTML_FILE"] =
                $"./{routeKey}-form.html",

            ["FORM_CSS_FILE"] =
                $"./{routeKey}-form.css",

            ["LIST_ROUTE"] =
                listRoute,

            ["CREATE_PAYLOAD"] =
                createPayload,

            ["UPDATE_PAYLOAD"] =
                updatePayload,

            ["VALIDATION_CODE"] =
                validationCode,

            ["EDIT_CLEAR_CODE"] =
                editClearCode,


            //===================================================
            // List
            //===================================================

            ["LIST_SELECTOR"] =
                listSelector,

            ["LIST_COMPONENT_CLASS"] =
                listComponentClass,

            ["LIST_HTML_FILE"] =
                $"{routeKey}-list.html",

            ["LIST_CSS_FILE"] =
                $"{routeKey}-list.css",

            ["FILTER_NAME"] =
                parentEntityProperty,

            ["FILTER_FIELD"] =
                $"{parentProperty}Id",

            ["FILTER_PLACEHOLDER"] =
                $"Filter by {parentEntityProperty}",

            ["ADD_ROUTE"] =
                addRoute,

            ["VIEW_ROUTE"] =
                viewRoute,

            ["EDIT_ROUTE"] =
                editRoute
        };
    }



    //===========================================================
    // Build API Route
    //===========================================================

    private static string BuildApiRoute
    (
        string moduleName,

        string menuName,

        string submenuRoute
    )
    {
        var moduleRoute =
            ToKebabCase(
                moduleName
            );


        var menuRoute =
            ToKebabCase(
                menuName
            );


        return
            $"{moduleRoute}/{menuRoute}/{submenuRoute}";
    }



    //===========================================================
    // Build Entity Initializer
    //===========================================================

    private static string BuildEntityInitializer
    (
        string parentProperty
    )
    {
        return
$@"{{
        id: 0,

        {parentProperty}Id: 0,

        {parentProperty}Code: '',

        {parentProperty}Name: '',

        code: '',

        name: '',

        icon: '',

        routeKey: '',

        route: '',

        displayOrder: 0,

        remarks: '',

        isActive: true
    }}";
    }



    //===========================================================
    // Build Create Payload
    //===========================================================

    private static string BuildCreatePayload
    (
        string parentProperty
    )
    {
        return
$@"{parentProperty}Id:
                    this.entity.{parentProperty}Id,

                name:
                    this.entity.name,

                icon:
                    this.entity.icon,

                routeKey:
                    this.entity.routeKey,

                displayOrder:
                    this.entity.displayOrder,

                remarks:
                    this.entity.remarks,

                isActive:
                    this.entity.isActive";
    }



    //===========================================================
    // Build Update Payload
    //===========================================================

    private static string BuildUpdatePayload
    (
        string parentProperty
    )
    {
        return
$@"id:
                this.entity.id,

            {parentProperty}Id:
                this.entity.{parentProperty}Id,

            name:
                this.entity.name,

            icon:
                this.entity.icon,

            routeKey:
                this.entity.routeKey,

            displayOrder:
                this.entity.displayOrder,

            remarks:
                this.entity.remarks,

            isActive:
                this.entity.isActive";
    }



    //===========================================================
    // Validation Code
    //===========================================================

    private static string BuildValidationCode()
    {
        return
@"if
        (
            !this.entity.name?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Name is required.'
            );

            return;
        }";
    }



    //===========================================================
    // Edit Clear Code
    //===========================================================

    private static string BuildEditClearCode()
    {
        return
@"this.loadEntity();";
    }



    //===========================================================
    // To Kebab Case
    //===========================================================

    private static string ToKebabCase
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                value
            )
        )
        {
            return string.Empty;
        }


        var result =
            new System.Text.StringBuilder();


        foreach
        (
            var character in value.Trim()
        )
        {
            if
            (
                char.IsLetterOrDigit(
                    character
                )
            )
            {
                result.Append(
                    char.ToLowerInvariant(
                        character
                    )
                );
            }
            else if
            (
                result.Length > 0
                &&
                result[^1] != '-'
            )
            {
                result.Append(
                    '-'
                );
            }
        }


        return result
            .ToString()
            .Trim('-');
    }



    //===========================================================
    // To Pascal Case
    //===========================================================

    private static string ToPascalCase
    (
        string value
    )
    {
        var kebab =
            ToKebabCase(
                value
            );


        if
        (
            string.IsNullOrWhiteSpace(
                kebab
            )
        )
        {
            return string.Empty;
        }


        var result =
            new System.Text.StringBuilder();


        var capitalize =
            true;


        foreach
        (
            var character in kebab
        )
        {
            if
            (
                character == '-'
            )
            {
                capitalize =
                    true;

                continue;
            }


            if
            (
                capitalize
            )
            {
                result.Append(
                    char.ToUpperInvariant(
                        character
                    )
                );

                capitalize =
                    false;
            }
            else
            {
                result.Append(
                    character
                );
            }
        }


        return result.ToString();
    }



    //===========================================================
    // To Camel Case
    //===========================================================

    private static string ToCamelCase
    (
        string value
    )
    {
        var pascal =
            ToPascalCase(
                value
            );


        if
        (
            string.IsNullOrWhiteSpace(
                pascal
            )
        )
        {
            return string.Empty;
        }


        return
            char.ToLowerInvariant(
                pascal[0]
            )
            +
            pascal[1..];
    }



    //===========================================================
    // To Plural Pascal Case
    //===========================================================

    private static string ToPluralPascalCase
    (
        string value
    )
    {
        var pascal =
            ToPascalCase(
                value
            );


        if
        (
            pascal.EndsWith(
                "y",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return pascal[..^1] + "ies";
        }


        if
        (
            pascal.EndsWith(
                "s",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return pascal + "es";
        }


        return pascal + "s";
    }



    //===========================================================
    // To Plural Camel Case
    //===========================================================

    private static string ToPluralCamelCase
    (
        string value
    )
    {
        return ToCamelCase(
            ToPluralPascalCase(
                value
            )
        );
    }



    //===========================================================
    // Failure
    //===========================================================

    private static FrontendCodeSynchronizationResultDto
        Failure
    (
        string message
    )
    {
        return new FrontendCodeSynchronizationResultDto
        {
            Success =
                false,

            Message =
                message,

            TotalOperations =
                0,

            SuccessfulOperations =
                0,

            FailedOperations =
                1
        };
    }

}