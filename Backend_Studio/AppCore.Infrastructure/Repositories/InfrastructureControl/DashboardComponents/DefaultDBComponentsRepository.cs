//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.DashboardComponents;

using global::AppCore.Domain.Entities.InfrastructureControl.DashboardComponents;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DashboardComponents;


//===============================================================
// DefaultDBComponentsRepository
//===============================================================

public class DefaultDBComponentsRepository
    : IDefaultDBComponentsRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public DefaultDBComponentsRepository
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<IReadOnlyList<DefaultDBComponents>>
        GetAllAsync()
    {
        return await _context
            .Set<DefaultDBComponents>()
            .AsNoTracking()
            .Where(
                x =>
                    !x.IsDeleted
            )
            .OrderBy(
                x =>
                    x.DisplayOrder
            )
            .ThenBy(
                x =>
                    x.Name
            )
            .ToListAsync();
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<DefaultDBComponents?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<DefaultDBComponents>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x =>
                    x.Id == id
                    &&
                    !x.IsDeleted
            );
    }



    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
    (
        DefaultDBComponents entity
    )
    {
        const long userId =
            1;


        //=======================================================
        // Normalize Dashboard Component Paths
        //=======================================================

        NormalizeDashboardComponentPaths(
            entity
        );


        //=======================================================
        // Generate Code
        //=======================================================

        entity.Code =
            await GenerateNextCodeAsync();


        entity.IsActive =
            entity.Status;


        entity.IsDeleted =
            false;


        entity.CreatedBy =
            userId;


        entity.CreatedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            null;


        entity.ModifiedDate =
            null;


        await _context
            .Set<DefaultDBComponents>()
            .AddAsync(
                entity
            );


        await _context.SaveChangesAsync();


        //=======================================================
        // Create Frontend Component Files
        //=======================================================

        await CreateFrontendComponentFilesAsync(
            entity
        );


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "InfrastructureControl",

                EntityName =
                    "DefaultDBComponents",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "DefaultDBComponents Created",

                ActivityDescription =
                    $"DefaultDBComponents '{entity.Name}' was created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.Id;
    }



    //===========================================================
    // Normalize Dashboard Component Paths
    //===========================================================

    private void
        NormalizeDashboardComponentPaths
    (
        DefaultDBComponents entity
    )
    {
        entity.ComponentPath =
            NormalizeDashboardComponentPath(
                entity.ComponentPath
            );


        entity.HtmlFilePath =
            NormalizeDashboardComponentPath(
                entity.HtmlFilePath
            );


        entity.TsFilePath =
            NormalizeDashboardComponentPath(
                entity.TsFilePath
            );


        entity.CssFilePath =
            NormalizeDashboardComponentPath(
                entity.CssFilePath
            );
    }



    //===========================================================
    // Normalize Dashboard Component Path
    //===========================================================

    private string
        NormalizeDashboardComponentPath
    (
        string path
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                path
            )
        )
        {
            return path;
        }


        return
            path
                .Replace(
                    '/',
                    '\\'
                );
    }

    //===========================================================
    // Generate Next Code
    //===========================================================

    private async Task<string>
        GenerateNextCodeAsync()
    {
        var codes =
            await _context
                .Set<DefaultDBComponents>()
                .AsNoTracking()
                .Select(
                    x =>
                        x.Code
                )
                .ToListAsync();


        var highestNumber =
            0;


        foreach
        (
            var code
            in
            codes
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    code
                )
            )
            {
                continue;
            }


            var match =
                System.Text.RegularExpressions.Regex.Match(
                    code.Trim(),
                    @"^DDC-?(\d+)$",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );


            if
            (
                !match.Success
            )
            {
                continue;
            }


            if
            (
                !int.TryParse(
                    match.Groups[1].Value,
                    out var number
                )
            )
            {
                continue;
            }


            if
            (
                number >
                highestNumber
            )
            {
                highestNumber =
                    number;
            }
        }


        return
            $"DDC-{(
                highestNumber + 1
            ).ToString(
                "D3"
            )}";
    }



    //===========================================================
    // Create Frontend Component Files
    //===========================================================

    private async Task
        CreateFrontendComponentFilesAsync
    (
        DefaultDBComponents entity
    )
    {
        //=======================================================
        // Normalize Paths
        //=======================================================

        NormalizeDashboardComponentPaths(
            entity
        );


        //=======================================================
        // Validate Component Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                entity.ComponentPath
            )
        )
        {
            throw new InvalidOperationException(
                "Component path is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                entity.HtmlFilePath
            )
        )
        {
            throw new InvalidOperationException(
                "HTML file path is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                entity.TsFilePath
            )
        )
        {
            throw new InvalidOperationException(
                "TS file path is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                entity.CssFilePath
            )
        )
        {
            throw new InvalidOperationException(
                "CSS file path is required."
            );
        }


        //=======================================================
        // Find AppCore ERP Root
        //=======================================================

        var appCoreRoot =
            FindAppCoreRoot();


        if
        (
            appCoreRoot is null
        )
        {
            throw new DirectoryNotFoundException(
                "AppCore ERP root could not be located."
            );
        }


        //=======================================================
        // Build Component Directory
        //=======================================================

        var componentDirectory =
            GetSafeFrontendPath(
                appCoreRoot,
                entity.ComponentPath
            );


        //=======================================================
        // Create Component Directory
        //=======================================================

        Directory.CreateDirectory(
            componentDirectory
        );


        //=======================================================
        // Create HTML File
        //=======================================================

        await CreateEmptyFileIfNotExistsAsync(
            appCoreRoot,
            entity.HtmlFilePath
        );


        //=======================================================
        // Create TS File
        //=======================================================

        await CreateEmptyFileIfNotExistsAsync(
            appCoreRoot,
            entity.TsFilePath
        );


        //=======================================================
        // Create CSS File
        //=======================================================

        await CreateEmptyFileIfNotExistsAsync(
            appCoreRoot,
            entity.CssFilePath
        );
    }



    //===========================================================
    // Create Empty File
    //===========================================================

    private async Task
        CreateEmptyFileIfNotExistsAsync
    (
        string appCoreRoot,

        string relativeFilePath
    )
    {
        var normalizedFilePath =
            NormalizeDashboardComponentPath(
                relativeFilePath
            );


        var filePath =
            GetSafeFrontendPath(
                appCoreRoot,
                normalizedFilePath
            );


        if
        (
            File.Exists(
                filePath
            )
        )
        {
            return;
        }


        var directory =
            Path.GetDirectoryName(
                filePath
            );


        if
        (
            string.IsNullOrWhiteSpace(
                directory
            )
        )
        {
            throw new InvalidOperationException(
                "The component file directory could not be resolved."
            );
        }


        Directory.CreateDirectory(
            directory
        );


        await using var stream =
            new FileStream(
                filePath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None
            );
    }



    //===========================================================
    // Find AppCore ERP Root
    //===========================================================

    private string?
        FindAppCoreRoot()
    {
        var currentDirectory =
            new DirectoryInfo(
                AppContext.BaseDirectory
            );


        while
        (
            currentDirectory is not null
        )
        {
            var frontendStudioPath =
                Path.Combine(
                    currentDirectory.FullName,
                    "Frontend_Studio"
                );


            if
            (
                Directory.Exists(
                    frontendStudioPath
                )
            )
            {
                return currentDirectory.FullName;
            }


            currentDirectory =
                currentDirectory.Parent;
        }


        return null;
    }



    //===========================================================
    // Get Safe Frontend Path
    //===========================================================

    private string
        GetSafeFrontendPath
    (
        string appCoreRoot,

        string relativePath
    )
    {
        var normalizedPath =
            relativePath
                .Replace(
                    '\\',
                    Path.DirectorySeparatorChar
                )
                .Replace(
                    '/',
                    Path.DirectorySeparatorChar
                );


        var fullPath =
            Path.GetFullPath(
                Path.Combine(
                    appCoreRoot,
                    normalizedPath
                )
            );


        var normalizedRoot =
            Path.GetFullPath(
                appCoreRoot
            )
            .TrimEnd(
                Path.DirectorySeparatorChar
            )
            +
            Path.DirectorySeparatorChar;


        if
        (
            !fullPath.StartsWith(
                normalizedRoot,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException(
                "Frontend path is outside the AppCore ERP root."
            );
        }


        return fullPath;
    }



    //===========================================================
    // Get Deleted Component Backup Root
    //===========================================================

    private string
        GetDeletedComponentBackupRoot
    (
        string appCoreRoot
    )
    {
        return Path.Combine(
            appCoreRoot,
            "development_backup",
            "deleted-components",
            "default-dashboard-components"
        );
    }



    //===========================================================
    // Get Deleted Component Backup Path
    //===========================================================

    private string
        GetDeletedComponentBackupPath
    (
        string appCoreRoot,

        long id
    )
    {
        return Path.Combine(
            GetDeletedComponentBackupRoot(
                appCoreRoot
            ),
            id.ToString()
        );
    }



    //===========================================================
    // Backup Component Directory
    //===========================================================

    private Task
        BackupComponentDirectoryAsync
    (
        string appCoreRoot,

        DefaultDBComponents entity
    )
    {
        NormalizeDashboardComponentPaths(
            entity
        );


        if
        (
            string.IsNullOrWhiteSpace(
                entity.ComponentPath
            )
        )
        {
            throw new InvalidOperationException(
                "Component path is required."
            );
        }


        var componentDirectory =
            GetSafeFrontendPath(
                appCoreRoot,
                entity.ComponentPath
            );


        if
        (
            !Directory.Exists(
                componentDirectory
            )
        )
        {
            return Task.CompletedTask;
        }


        var backupRoot =
            GetDeletedComponentBackupRoot(
                appCoreRoot
            );


        Directory.CreateDirectory(
            backupRoot
        );


        var backupDirectory =
            GetDeletedComponentBackupPath(
                appCoreRoot,
                entity.Id
            );


        if
        (
            Directory.Exists(
                backupDirectory
            )
        )
        {
            Directory.Delete(
                backupDirectory,
                true
            );
        }


        CopyDirectory(
            componentDirectory,
            backupDirectory
        );


        return Task.CompletedTask;
    }



    //===========================================================
    // Copy Directory
    //===========================================================

    private void
        CopyDirectory
    (
        string sourceDirectory,

        string destinationDirectory
    )
    {
        Directory.CreateDirectory(
            destinationDirectory
        );


        foreach
        (
            var filePath
            in
            Directory.GetFiles(
                sourceDirectory
            )
        )
        {
            var fileName =
                Path.GetFileName(
                    filePath
                );


            var destinationFilePath =
                Path.Combine(
                    destinationDirectory,
                    fileName
                );


            File.Copy(
                filePath,
                destinationFilePath,
                true
            );
        }


        foreach
        (
            var directoryPath
            in
            Directory.GetDirectories(
                sourceDirectory
            )
        )
        {
            var directoryName =
                Path.GetFileName(
                    directoryPath
                );


            var destinationSubDirectory =
                Path.Combine(
                    destinationDirectory,
                    directoryName
                );


            CopyDirectory(
                directoryPath,
                destinationSubDirectory
            );
        }
    }



    //===========================================================
    // Delete Component Directory
    //===========================================================

    private Task
        DeleteComponentDirectoryAsync
    (
        string appCoreRoot,

        DefaultDBComponents entity
    )
    {
        NormalizeDashboardComponentPaths(
            entity
        );


        if
        (
            string.IsNullOrWhiteSpace(
                entity.ComponentPath
            )
        )
        {
            return Task.CompletedTask;
        }


        var componentDirectory =
            GetSafeFrontendPath(
                appCoreRoot,
                entity.ComponentPath
            );


        if
        (
            Directory.Exists(
                componentDirectory
            )
        )
        {
            Directory.Delete(
                componentDirectory,
                true
            );
        }


        return Task.CompletedTask;
    }



    //===========================================================
    // Restore Component Directory
    //===========================================================

    private Task
        RestoreComponentDirectoryAsync
    (
        string appCoreRoot,

        DefaultDBComponents entity
    )
    {
        NormalizeDashboardComponentPaths(
            entity
        );


        var backupDirectory =
            GetDeletedComponentBackupPath(
                appCoreRoot,
                entity.Id
            );


        if
        (
            !Directory.Exists(
                backupDirectory
            )
        )
        {
            throw new DirectoryNotFoundException(
                $"Deleted DefaultDBComponents backup was not found for Id '{entity.Id}'."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                entity.ComponentPath
            )
        )
        {
            throw new InvalidOperationException(
                "Component path is required."
            );
        }


        var componentDirectory =
            GetSafeFrontendPath(
                appCoreRoot,
                entity.ComponentPath
            );


        if
        (
            Directory.Exists(
                componentDirectory
            )
        )
        {
            Directory.Delete(
                componentDirectory,
                true
            );
        }


        var parentDirectory =
            Directory.GetParent(
                componentDirectory
            )?
            .FullName;


        if
        (
            string.IsNullOrWhiteSpace(
                parentDirectory
            )
        )
        {
            throw new InvalidOperationException(
                "The component parent folder could not be resolved."
            );
        }


        Directory.CreateDirectory(
            parentDirectory
        );


        CopyDirectory(
            backupDirectory,
            componentDirectory
        );


        Directory.Delete(
            backupDirectory,
            true
        );


        return Task.CompletedTask;
    }



    //===========================================================
    // Synchronize Updated Component Files
    //===========================================================

    private async Task
        SynchronizeUpdatedComponentFilesAsync
    (
        string appCoreRoot,

        DefaultDBComponents existing,

        DefaultDBComponents entity
    )
    {
        //=======================================================
        // Normalize Paths
        //=======================================================

        NormalizeDashboardComponentPaths(
            existing
        );


        NormalizeDashboardComponentPaths(
            entity
        );


        var componentPathChanged =
            !string.Equals(
                existing.ComponentPath,
                entity.ComponentPath,
                StringComparison.OrdinalIgnoreCase
            );


        var htmlPathChanged =
            !string.Equals(
                existing.HtmlFilePath,
                entity.HtmlFilePath,
                StringComparison.OrdinalIgnoreCase
            );


        var tsPathChanged =
            !string.Equals(
                existing.TsFilePath,
                entity.TsFilePath,
                StringComparison.OrdinalIgnoreCase
            );


        var cssPathChanged =
            !string.Equals(
                existing.CssFilePath,
                entity.CssFilePath,
                StringComparison.OrdinalIgnoreCase
            );


        if
        (
            !componentPathChanged
            &&
            !htmlPathChanged
            &&
            !tsPathChanged
            &&
            !cssPathChanged
        )
        {
            return;
        }


        if
        (
            string.IsNullOrWhiteSpace(
                existing.ComponentPath
            )
        )
        {
            throw new InvalidOperationException(
                "Existing component path is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                entity.ComponentPath
            )
        )
        {
            throw new InvalidOperationException(
                "New component path is required."
            );
        }


        var oldComponentDirectory =
            GetSafeFrontendPath(
                appCoreRoot,
                existing.ComponentPath
            );


        var newComponentDirectory =
            GetSafeFrontendPath(
                appCoreRoot,
                entity.ComponentPath
            );


        //=======================================================
        // Move Component Folder
        //=======================================================

        if
        (
            componentPathChanged
        )
        {
            if
            (
                Directory.Exists(
                    newComponentDirectory
                )
            )
            {
                throw new IOException(
                    $"The target component folder already exists: '{entity.ComponentPath}'."
                );
            }


            if
            (
                Directory.Exists(
                    oldComponentDirectory
                )
            )
            {
                var newParentDirectory =
                    Directory.GetParent(
                        newComponentDirectory
                    )?
                    .FullName;


                if
                (
                    string.IsNullOrWhiteSpace(
                        newParentDirectory
                    )
                )
                {
                    throw new InvalidOperationException(
                        "The new component parent folder could not be resolved."
                    );
                }


                Directory.CreateDirectory(
                    newParentDirectory
                );


                Directory.Move(
                    oldComponentDirectory,
                    newComponentDirectory
                );
            }
            else
            {
                Directory.CreateDirectory(
                    newComponentDirectory
                );
            }
        }
        else
        {
            if
            (
                !Directory.Exists(
                    newComponentDirectory
                )
            )
            {
                Directory.CreateDirectory(
                    newComponentDirectory
                );
            }
        }


        //=======================================================
        // Resolve Current HTML File
        //=======================================================

        var currentHtmlFilePath =
            GetCurrentMovedFilePath(
                appCoreRoot,
                existing.HtmlFilePath,
                existing.ComponentPath,
                entity.ComponentPath,
                componentPathChanged
            );


        //=======================================================
        // Resolve Current TS File
        //=======================================================

        var currentTsFilePath =
            GetCurrentMovedFilePath(
                appCoreRoot,
                existing.TsFilePath,
                existing.ComponentPath,
                entity.ComponentPath,
                componentPathChanged
            );


        //=======================================================
        // Resolve Current CSS File
        //=======================================================

        var currentCssFilePath =
            GetCurrentMovedFilePath(
                appCoreRoot,
                existing.CssFilePath,
                existing.ComponentPath,
                entity.ComponentPath,
                componentPathChanged
            );


        //=======================================================
        // Rename HTML File
        //=======================================================

        await RenameComponentFileAsync(
            appCoreRoot,
            currentHtmlFilePath,
            entity.HtmlFilePath
        );


        //=======================================================
        // Rename TS File
        //=======================================================

        await RenameComponentFileAsync(
            appCoreRoot,
            currentTsFilePath,
            entity.TsFilePath
        );


        //=======================================================
        // Rename CSS File
        //=======================================================

        await RenameComponentFileAsync(
            appCoreRoot,
            currentCssFilePath,
            entity.CssFilePath
        );


        //=======================================================
        // Ensure Required Files Exist
        //=======================================================

        await CreateEmptyFileIfNotExistsAsync(
            appCoreRoot,
            entity.HtmlFilePath
        );


        await CreateEmptyFileIfNotExistsAsync(
            appCoreRoot,
            entity.TsFilePath
        );


        await CreateEmptyFileIfNotExistsAsync(
            appCoreRoot,
            entity.CssFilePath
        );
    }



    //===========================================================
    // Get Current Moved File Path
    //===========================================================

    private string
        GetCurrentMovedFilePath
    (
        string appCoreRoot,

        string existingFilePath,

        string existingComponentPath,

        string newComponentPath,

        bool componentPathChanged
    )
    {
        existingFilePath =
            NormalizeDashboardComponentPath(
                existingFilePath
            );


        existingComponentPath =
            NormalizeDashboardComponentPath(
                existingComponentPath
            );


        newComponentPath =
            NormalizeDashboardComponentPath(
                newComponentPath
            );


        if
        (
            !componentPathChanged
        )
        {
            return existingFilePath;
        }


        var existingFileFullPath =
            GetSafeFrontendPath(
                appCoreRoot,
                existingFilePath
            );


        var fileName =
            Path.GetFileName(
                existingFileFullPath
            );


        if
        (
            string.IsNullOrWhiteSpace(
                fileName
            )
        )
        {
            throw new InvalidOperationException(
                "The existing component file name could not be resolved."
            );
        }


        var newComponentFullPath =
            GetSafeFrontendPath(
                appCoreRoot,
                newComponentPath
            );


        return Path.Combine(
            newComponentFullPath,
            fileName
        );
    }



    //===========================================================
    // Rename Component File
    //===========================================================

    private Task
        RenameComponentFileAsync
    (
        string appCoreRoot,

        string currentFilePath,

        string newRelativeFilePath
    )
    {
        newRelativeFilePath =
            NormalizeDashboardComponentPath(
                newRelativeFilePath
            );


        if
        (
            string.IsNullOrWhiteSpace(
                currentFilePath
            )
            ||
            string.IsNullOrWhiteSpace(
                newRelativeFilePath
            )
        )
        {
            return Task.CompletedTask;
        }


        var currentFullPath =
            currentFilePath;


        if
        (
            !Path.IsPathFullyQualified(
                currentFullPath
            )
        )
        {
            currentFullPath =
                GetSafeFrontendPath(
                    appCoreRoot,
                    currentFilePath
                );
        }


        var newFilePath =
            GetSafeFrontendPath(
                appCoreRoot,
                newRelativeFilePath
            );


        if
        (
            string.Equals(
                currentFullPath,
                newFilePath,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return Task.CompletedTask;
        }


        if
        (
            !File.Exists(
                currentFullPath
            )
        )
        {
            return Task.CompletedTask;
        }


        if
        (
            File.Exists(
                newFilePath
            )
        )
        {
            throw new IOException(
                $"The target component file already exists: '{newRelativeFilePath}'."
            );
        }


        var newDirectory =
            Path.GetDirectoryName(
                newFilePath
            );


        if
        (
            string.IsNullOrWhiteSpace(
                newDirectory
            )
        )
        {
            throw new InvalidOperationException(
                "The target component file directory could not be resolved."
            );
        }


        Directory.CreateDirectory(
            newDirectory
        );


        File.Move(
            currentFullPath,
            newFilePath
        );


        return Task.CompletedTask;
    }



    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
    (
        DefaultDBComponents entity
    )
    {
        const long userId =
            1;


        var existing =
            await _context
                .Set<DefaultDBComponents>()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == entity.Id
                        &&
                        !x.IsDeleted
                );


        if
        (
            existing is null
        )
        {
            throw new InvalidOperationException(
                "DefaultDBComponents record was not found."
            );
        }


        //=======================================================
        // Normalize Dashboard Component Paths
        //=======================================================

        NormalizeDashboardComponentPaths(
            existing
        );


        NormalizeDashboardComponentPaths(
            entity
        );


        //=======================================================
        // Find AppCore ERP Root
        //=======================================================

        var appCoreRoot =
            FindAppCoreRoot();


        if
        (
            appCoreRoot is null
        )
        {
            throw new DirectoryNotFoundException(
                "AppCore ERP root could not be located."
            );
        }


        //=======================================================
        // Synchronize Frontend Component Files
        //=======================================================

        await SynchronizeUpdatedComponentFilesAsync(
            appCoreRoot,
            existing,
            entity
        );


        //=======================================================
        // Generate Code For Legacy Empty Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                existing.Code
            )
        )
        {
            existing.Code =
                await GenerateNextCodeAsync();
        }


        //=======================================================
        // Update Database Entity
        //=======================================================

        existing.Name =
            entity.Name;


        existing.TabName =
            entity.TabName;


        existing.Icon =
            entity.Icon;


        existing.FolderName =
            entity.FolderName;


        existing.FeatureFolder =
            entity.FeatureFolder;


        existing.FeatureSubFolder =
            entity.FeatureSubFolder;


        existing.ComponentPath =
            entity.ComponentPath;


        existing.RegistrationFilePath =
            entity.RegistrationFilePath;


        existing.HtmlFilePath =
            entity.HtmlFilePath;


        existing.TsFilePath =
            entity.TsFilePath;


        existing.CssFilePath =
            entity.CssFilePath;


        existing.DisplayOrder =
            entity.DisplayOrder;


        existing.Status =
            entity.Status;


        existing.IsActive =
            entity.Status;


        existing.Remarks =
            entity.Remarks;


        existing.ModifiedBy =
            userId;


        existing.ModifiedDate =
            DateTime.UtcNow;


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "InfrastructureControl",

                EntityName =
                    "DefaultDBComponents",

                EntityId =
                    existing.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "DefaultDBComponents Updated",

                ActivityDescription =
                    $"DefaultDBComponents '{existing.Name}' was updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
    (
        long id
    )
    {
        const long userId =
            1;


        var entity =
            await _context
                .Set<DefaultDBComponents>()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == id
                        &&
                        !x.IsDeleted
                );


        if
        (
            entity is null
        )
        {
            return;
        }


        //=======================================================
        // Normalize Dashboard Component Paths
        //=======================================================

        NormalizeDashboardComponentPaths(
            entity
        );


        //=======================================================
        // Find AppCore ERP Root
        //=======================================================

        var appCoreRoot =
            FindAppCoreRoot();


        if
        (
            appCoreRoot is null
        )
        {
            throw new DirectoryNotFoundException(
                "AppCore ERP root could not be located."
            );
        }


        //=======================================================
        // Backup Component Directory
        //=======================================================

        await BackupComponentDirectoryAsync(
            appCoreRoot,
            entity
        );


        //=======================================================
        // Remove Component Sub Folder
        //=======================================================

        await DeleteComponentDirectoryAsync(
            appCoreRoot,
            entity
        );


        //=======================================================
        // Soft Delete
        //=======================================================

        entity.IsDeleted =
            true;


        entity.IsActive =
            false;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "InfrastructureControl",

                EntityName =
                    "DefaultDBComponents",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "DefaultDBComponents Deleted",

                ActivityDescription =
                    $"DefaultDBComponents '{entity.Name}' was deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Restore
    //===========================================================

    public async Task
        RestoreAsync()
    {
        const long userId =
            1;


        var entity =
            await _context
                .Set<DefaultDBComponents>()
                .Where(
                    x =>
                        x.IsDeleted
                )
                .OrderByDescending(
                    x =>
                        x.ModifiedDate
                )
                .FirstOrDefaultAsync();


        if
        (
            entity is null
        )
        {
            throw new InvalidOperationException(
                "No deleted DefaultDBComponents record was found to restore."
            );
        }


        //=======================================================
        // Normalize Dashboard Component Paths
        //=======================================================

        NormalizeDashboardComponentPaths(
            entity
        );


        //=======================================================
        // Find AppCore ERP Root
        //=======================================================

        var appCoreRoot =
            FindAppCoreRoot();


        if
        (
            appCoreRoot is null
        )
        {
            throw new DirectoryNotFoundException(
                "AppCore ERP root could not be located."
            );
        }


        //=======================================================
        // Restore Component Sub Folder and Files
        //=======================================================

        await RestoreComponentDirectoryAsync(
            appCoreRoot,
            entity
        );


        //=======================================================
        // Restore Database Record
        //=======================================================

        entity.IsDeleted =
            false;


        entity.IsActive =
            entity.Status;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "InfrastructureControl",

                EntityName =
                    "DefaultDBComponents",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "DefaultDBComponents Restored",

                ActivityDescription =
                    $"DefaultDBComponents '{entity.Name}' was restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Get History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync()
    {
        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "InfrastructureControl"

                    &&

                    x.EntityName ==
                    "DefaultDBComponents"
            )

            .OrderByDescending(
                x =>
                    x.PerformedDate
            )

            .Select(
                x =>
                    new ActivityHistoryDto
                    {
                        Id =
                            x.Id,

                        Module =
                            x.Module,

                        EntityName =
                            x.EntityName,

                        EntityId =
                            x.EntityId,

                        ActivityType =
                            x.ActivityType,

                        ActivityTitle =
                            x.ActivityTitle,

                        ActivityDescription =
                            x.ActivityDescription,

                        PerformedBy =
                            x.PerformedBy,

                        PerformedByName =
                            x.PerformedByName,

                        PerformedDate =
                            x.PerformedDate
                    }
            )

            .ToListAsync();
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync
    (
        long id
    )
    {
        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(
                x =>
                    x.Module ==
                    "InfrastructureControl"

                    &&

                    x.EntityName ==
                    "DefaultDBComponents"

                    &&

                    x.EntityId ==
                    id
            )

            .OrderByDescending(
                x =>
                    x.PerformedDate
            )

            .Select(
                x =>
                    new ActivityHistoryDto
                    {
                        Id =
                            x.Id,

                        Module =
                            x.Module,

                        EntityName =
                            x.EntityName,

                        EntityId =
                            x.EntityId,

                        ActivityType =
                            x.ActivityType,

                        ActivityTitle =
                            x.ActivityTitle,

                        ActivityDescription =
                            x.ActivityDescription,

                        PerformedBy =
                            x.PerformedBy,

                        PerformedByName =
                            x.PerformedByName,

                        PerformedDate =
                            x.PerformedDate
                    }
            )

            .ToListAsync();
    }

}