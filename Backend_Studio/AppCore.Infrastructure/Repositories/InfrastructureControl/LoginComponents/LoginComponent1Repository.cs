//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.LoginComponents;

using global::AppCore.Domain.Entities.InfrastructureControl.LoginComponents;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.LoginComponents;


//===============================================================
// LoginComponent1Repository
//===============================================================

public class LoginComponent1Repository
    : ILoginComponent1Repository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;



    //===========================================================
    // Constructor
    //===========================================================

    public LoginComponent1Repository
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

    public async Task<IReadOnlyList<LoginComponent1>>
        GetAllAsync()
    {
        return await _context
            .Set<LoginComponent1>()
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

    public async Task<LoginComponent1?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<LoginComponent1>()
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
        LoginComponent1 entity
    )
    {
        const long userId =
            1;


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
            .Set<LoginComponent1>()
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
                    "LoginComponent1",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "LoginComponent1 Created",

                ActivityDescription =
                    $"LoginComponent1 '{entity.Name}' was created.",

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
    // Generate Next Code
    //===========================================================

    private async Task<string>
        GenerateNextCodeAsync()
    {
        var codes =
            await _context
                .Set<LoginComponent1>()
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
                    @"^LC1-?(\d+)$",
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
            $"LC1-{(
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
        LoginComponent1 entity
    )
    {
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
        var filePath =
            GetSafeFrontendPath(
                appCoreRoot,
                relativeFilePath
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
            "login-component-1"
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

        LoginComponent1 entity
    )
    {
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

        LoginComponent1 entity
    )
    {
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

        LoginComponent1 entity
    )
    {
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
                $"Deleted LoginComponent1 backup was not found for Id '{entity.Id}'."
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

        LoginComponent1 existing,

        LoginComponent1 entity
    )
    {
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


        var existingComponentFullPath =
            GetSafeFrontendPath(
                appCoreRoot,
                existingComponentPath
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
        LoginComponent1 entity
    )
    {
        const long userId =
            1;


        var existing =
            await _context
                .Set<LoginComponent1>()
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
                "LoginComponent1 record was not found."
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
                    "LoginComponent1",

                EntityId =
                    existing.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "LoginComponent1 Updated",

                ActivityDescription =
                    $"LoginComponent1 '{existing.Name}' was updated.",

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
                .Set<LoginComponent1>()
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
                    "LoginComponent1",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "LoginComponent1 Deleted",

                ActivityDescription =
                    $"LoginComponent1 '{entity.Name}' was deleted.",

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
                .Set<LoginComponent1>()
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
                "No deleted LoginComponent1 record was found to restore."
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
                    "LoginComponent1",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "LoginComponent1 Restored",

                ActivityDescription =
                    $"LoginComponent1 '{entity.Name}' was restored.",

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
                    "LoginComponent1"
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
                    "LoginComponent1"

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