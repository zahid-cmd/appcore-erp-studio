//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

using AppCore.Domain.Common;
using AppCore.Domain.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Entity Alias
//===============================================================

using CodeSynchronizationEntity =
    AppCore.Domain.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Code Synchronization Repository
//===============================================================

public class CodeSynchronizationRepository
    : ICodeSynchronizationRepository
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _context;


    private readonly ICodeSynchronizationEngine
        _codeSynchronizationEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationRepository
    (
        AppDbContext context,

        ICodeSynchronizationEngine
            codeSynchronizationEngine
    )
    {
        _context =
            context;


        _codeSynchronizationEngine =
            codeSynchronizationEngine;
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<CodeSynchronizationDto>>
        GetAllAsync
    (
        string synchronizationType
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                synchronizationType
            )
        )
        {
            return [];
        }


        synchronizationType =
            synchronizationType.Trim();


        return await _context.CodeSynchronizations

            .Where
            (
                x =>

                    !x.IsDeleted

                    &&

                    _context.SubmenuSynchronizations.Any
                    (
                        submenu =>

                            submenu.Id ==
                            x.SubmenuSynchronizationId

                            &&

                            !submenu.IsDeleted

                            &&

                            submenu.SynchronizationType ==
                            synchronizationType
                    )
            )

            .OrderBy
            (
                x =>
                    x.SubmenuName
            )

            .Select
            (
                x =>
                    new CodeSynchronizationDto
                    {
                        Id =
                            x.Id,

                        SubmenuSynchronizationId =
                            x.SubmenuSynchronizationId,

                        ModuleId =
                            x.ModuleId,

                        ModuleCode =
                            x.ModuleCode,

                        ModuleName =
                            x.ModuleName,

                        MenuId =
                            x.MenuId,

                        MenuCode =
                            x.MenuCode,

                        MenuName =
                            x.MenuName,

                        SubmenuId =
                            x.SubmenuId,

                        SubmenuCode =
                            x.SubmenuCode,

                        SubmenuName =
                            x.SubmenuName,

                        SynchronizationType =
                            _context.SubmenuSynchronizations

                                .Where
                                (
                                    submenu =>

                                        submenu.Id ==
                                        x.SubmenuSynchronizationId
                                )

                                .Select
                                (
                                    submenu =>
                                        submenu.SynchronizationType
                                )

                                .FirstOrDefault(),

                        Status =
                            x.Status,

                        BuildStatus =
                            x.BuildStatus,

                        DbStatus =
                            x.DbStatus,

                        Remarks =
                            x.Remarks,

                        LastSynchronizedBy =
                            x.LastSynchronizedBy,

                        LastSynchronizedDate =
                            x.LastSynchronizedDate,

                        LastSynchronizationResult =
                            x.LastSynchronizationResult,

                        IsActive =
                            x.IsActive,

                        CreatedDate =
                            x.CreatedDate
                    }
            )

            .ToListAsync();
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CodeSynchronizationDto?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context.CodeSynchronizations

            .Where
            (
                x =>

                    x.Id ==
                    id

                    &&

                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new CodeSynchronizationDto
                    {
                        Id =
                            x.Id,

                        SubmenuSynchronizationId =
                            x.SubmenuSynchronizationId,

                        ModuleId =
                            x.ModuleId,

                        ModuleCode =
                            x.ModuleCode,

                        ModuleName =
                            x.ModuleName,

                        MenuId =
                            x.MenuId,

                        MenuCode =
                            x.MenuCode,

                        MenuName =
                            x.MenuName,

                        SubmenuId =
                            x.SubmenuId,

                        SubmenuCode =
                            x.SubmenuCode,

                        SubmenuName =
                            x.SubmenuName,

                        SynchronizationType =
                            _context.SubmenuSynchronizations

                                .Where
                                (
                                    submenu =>

                                        submenu.Id ==
                                        x.SubmenuSynchronizationId
                                )

                                .Select
                                (
                                    submenu =>
                                        submenu.SynchronizationType
                                )

                                .FirstOrDefault(),

                        Status =
                            x.Status,

                        BuildStatus =
                            x.BuildStatus,

                        DbStatus =
                            x.DbStatus,

                        Remarks =
                            x.Remarks,

                        LastSynchronizedBy =
                            x.LastSynchronizedBy,

                        LastSynchronizedDate =
                            x.LastSynchronizedDate,

                        LastSynchronizationResult =
                            x.LastSynchronizationResult,

                        IsActive =
                            x.IsActive,

                        CreatedDate =
                            x.CreatedDate
                    }
            )

            .FirstOrDefaultAsync();
    }



    //===========================================================
    // Get Generated Files
    //===========================================================

    public async Task<List<CodeSynchronizationFileDto>>
        GetFilesAsync
    (
        long id
    )
    {
        //=======================================================
        // Load Code Synchronization
        //=======================================================

        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return [];
        }


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        codeSynchronization.SubmenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            return [];
        }


        //=======================================================
        // Frontend Files
        //=======================================================

        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return await BuildFrontendFilesAsync
            (
                submenuSynchronization,

                codeSynchronization.LastSynchronizedDate
            );
        }


        //=======================================================
        // Backend Files
        //=======================================================

        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return await BuildBackendFilesAsync
            (
                submenuSynchronization,

                codeSynchronization.LastSynchronizedDate
            );
        }


        return [];
    }



    //===========================================================
    // Get Submenu Synchronization For Registration
    //===========================================================
    //
    // Loads the complete Submenu Synchronization information
    // required by the Backend Registration Engine.
    //
    // This operation does NOT perform registration.
    //
    // Registration remains a separate operation.
    //
    //===========================================================

    public async Task<SubmenuSynchronizationDto?>
        GetSubmenuSynchronizationForRegistrationAsync
    (
        long id
    )
    {
        //=======================================================
        // Load Code Synchronization
        //=======================================================

        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return null;
        }


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var synchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        codeSynchronization.SubmenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return null;
        }


        //=======================================================
        // Map Registration Data
        //=======================================================

        return new SubmenuSynchronizationDto
        {
            Id =
                synchronization.Id,

            ModuleId =
                synchronization.ModuleId,

            ModuleCode =
                synchronization.ModuleCode,

            ModuleName =
                synchronization.ModuleName,

            MenuId =
                synchronization.MenuId,

            MenuCode =
                synchronization.MenuCode,

            MenuName =
                synchronization.MenuName,

            SubmenuId =
                synchronization.SubmenuId,

            SubmenuCode =
                synchronization.SubmenuCode,

            SubmenuName =
                synchronization.SubmenuName,

            SynchronizationType =
                synchronization.SynchronizationType,

            BackendControllerFile =
                synchronization.BackendControllerFile,

            BackendSubMenuDtoFile =
                synchronization.BackendSubMenuDtoFile,

            BackendCreateSubMenuDtoFile =
                synchronization.BackendCreateSubMenuDtoFile,

            BackendUpdateSubMenuDtoFile =
                synchronization.BackendUpdateSubMenuDtoFile,

            BackendSubMenuDefaultsDtoFile =
                synchronization.BackendSubMenuDefaultsDtoFile,

            BackendSubMenuRepositoryInterfaceFile =
                synchronization.BackendSubMenuRepositoryInterfaceFile,

            BackendSubMenuEntityFile =
                synchronization.BackendSubMenuEntityFile,

            BackendSubMenuConfigurationFile =
                synchronization.BackendSubMenuConfigurationFile,

            BackendSubMenuRepositoryFile =
                synchronization.BackendSubMenuRepositoryFile
        };
    }



    //===========================================================
    // Restore File
    //===========================================================

    public async Task<bool>
        RestoreFileAsync
    (
        long id,

        string fileName
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                fileName
            )
        )
        {
            return false;
        }


        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return false;
        }


        if
        (
            !codeSynchronization.LastSynchronizedDate.HasValue
        )
        {
            return false;
        }


        var files =
            await GetSynchronizationFilePathsAsync(
                id
            );


        var filePath =
            files.FirstOrDefault
            (
                x =>
                    string.Equals
                    (
                        Path.GetFileName(x),

                        fileName,

                        StringComparison.OrdinalIgnoreCase
                    )
            );


        if
        (
            string.IsNullOrWhiteSpace(
                filePath
            )
        )
        {
            return false;
        }


        var baselinePath =
            GetBaselinePath(
                filePath
            );


        if
        (
            !File.Exists(
                baselinePath
            )
        )
        {
            return false;
        }


        var modified =
            await IsFileModifiedAsync
            (
                filePath,

                baselinePath
            );


        if
        (
            !modified
        )
        {
            return false;
        }


        File.Copy
        (
            baselinePath,

            filePath,

            true
        );


        File.SetLastWriteTimeUtc
        (
            filePath,

            File.GetLastWriteTimeUtc(
                baselinePath
            )
        );


        return true;
    }



    //===========================================================
    // Restore All
    //===========================================================

    public async Task<bool>
        RestoreAllFilesAsync
    (
        long id
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return false;
        }


        if
        (
            !codeSynchronization.LastSynchronizedDate.HasValue
        )
        {
            return false;
        }


        var files =
            await GetSynchronizationFilePathsAsync(
                id
            );


        var restored =
            false;


        foreach
        (
            var filePath in files
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    filePath
                )
            )
            {
                continue;
            }


            var baselinePath =
                GetBaselinePath(
                    filePath
                );


            if
            (
                !File.Exists(
                    baselinePath
                )
            )
            {
                continue;
            }


            var modified =
                await IsFileModifiedAsync
                (
                    filePath,

                    baselinePath
                );


            if
            (
                !modified
            )
            {
                continue;
            }


            File.Copy
            (
                baselinePath,

                filePath,

                true
            );


            File.SetLastWriteTimeUtc
            (
                filePath,

                File.GetLastWriteTimeUtc(
                    baselinePath
                )
            );


            restored =
                true;
        }


        return restored;
    }



    //===========================================================
    // Create Synchronization Baseline
    //===========================================================

    private async Task
        CreateSynchronizationBaselineAsync
    (
        long id
    )
    {
        var files =
            await GetSynchronizationFilePathsAsync(
                id
            );


        foreach
        (
            var filePath in files
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    filePath
                )
            )
            {
                continue;
            }


            if
            (
                !File.Exists(
                    filePath
                )
            )
            {
                continue;
            }


            var baselinePath =
                GetBaselinePath(
                    filePath
                );


            var directory =
                Path.GetDirectoryName(
                    baselinePath
                );


            if
            (
                !string.IsNullOrWhiteSpace(
                    directory
                )
            )
            {
                Directory.CreateDirectory(
                    directory
                );
            }


            File.Copy
            (
                filePath,

                baselinePath,

                true
            );


            File.SetLastWriteTimeUtc
            (
                baselinePath,

                File.GetLastWriteTimeUtc(
                    filePath
                )
            );
        }
    }



    //===========================================================
    // Get Synchronization File Paths
    //===========================================================

    private async Task<List<string>>
        GetSynchronizationFilePathsAsync
    (
        long id
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return [];
        }


        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        codeSynchronization.SubmenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            return [];
        }


        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return new List<string>
            {
                submenuSynchronization.FrontendSubmenuModelFile,

                submenuSynchronization.FrontendSubmenuServiceFile,

                submenuSynchronization.FrontendSubmenuRouteFile,

                submenuSynchronization.FrontendSubmenuFormTsFile,

                submenuSynchronization.FrontendSubmenuFormHtmlFile,

                submenuSynchronization.FrontendSubmenuFormCssFile,

                submenuSynchronization.FrontendSubmenuListTsFile,

                submenuSynchronization.FrontendSubmenuListHtmlFile,

                submenuSynchronization.FrontendSubmenuListCssFile
            }
            .Where(
                x =>
                    !string.IsNullOrWhiteSpace(x)
            )
            .Select(
                Path.GetFullPath
            )
            .ToList();
        }


        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return new List<string>
            {
                submenuSynchronization.BackendControllerFile,

                submenuSynchronization.BackendSubMenuDtoFile,

                submenuSynchronization.BackendCreateSubMenuDtoFile,

                submenuSynchronization.BackendUpdateSubMenuDtoFile,

                submenuSynchronization.BackendSubMenuDefaultsDtoFile,

                submenuSynchronization.BackendSubMenuRepositoryInterfaceFile,

                submenuSynchronization.BackendSubMenuEntityFile,

                submenuSynchronization.BackendSubMenuConfigurationFile,

                submenuSynchronization.BackendSubMenuRepositoryFile
            }
            .Where(
                x =>
                    !string.IsNullOrWhiteSpace(x)
            )
            .Select(
                Path.GetFullPath
            )
            .ToList();
        }


        return [];
    }



    //===========================================================
    // Get Baseline Path
    //===========================================================

    private static string
        GetBaselinePath
    (
        string filePath
    )
    {
        return
            $"{filePath}.appcore-sync-baseline";
    }



    //===========================================================
    // Determine File Modification
    //===========================================================

    private static async Task<bool>
        IsFileModifiedAsync
    (
        string filePath,

        string baselinePath
    )
    {
        if
        (
            !File.Exists(
                baselinePath
            )
        )
        {
            return false;
        }


        if
        (
            !File.Exists(
                filePath
            )
        )
        {
            return true;
        }


        var currentBytes =
            await File.ReadAllBytesAsync(
                filePath
            );


        var baselineBytes =
            await File.ReadAllBytesAsync(
                baselinePath
            );


        return !currentBytes.SequenceEqual(
            baselineBytes
        );
    }



    //===========================================================
    // Build Frontend Files
    //===========================================================

    private static async Task<List<CodeSynchronizationFileDto>>
        BuildFrontendFilesAsync
    (
        AppCore.Domain.Entities.InfrastructureControl
            .DevelopmentManagement.SubmenuSynchronization synchronization,

        DateTime? lastSynchronizedDate
    )
    {
        var files =
            new List<string>
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


        return await BuildFileListAsync
        (
            files,

            lastSynchronizedDate
        );
    }



    //===========================================================
    // Build Backend Files
    //===========================================================

    private static async Task<List<CodeSynchronizationFileDto>>
        BuildBackendFilesAsync
    (
        AppCore.Domain.Entities.InfrastructureControl
            .DevelopmentManagement.SubmenuSynchronization synchronization,

        DateTime? lastSynchronizedDate
    )
    {
        var files =
            new List<string>
            {
                synchronization.BackendControllerFile,

                synchronization.BackendSubMenuDtoFile,

                synchronization.BackendCreateSubMenuDtoFile,

                synchronization.BackendUpdateSubMenuDtoFile,

                synchronization.BackendSubMenuDefaultsDtoFile,

                synchronization.BackendSubMenuRepositoryInterfaceFile,

                synchronization.BackendSubMenuEntityFile,

                synchronization.BackendSubMenuConfigurationFile,

                synchronization.BackendSubMenuRepositoryFile
            };


        return await BuildFileListAsync
        (
            files,

            lastSynchronizedDate
        );
    }



    //===========================================================
    // Build File List
    //===========================================================

    private static async Task<List<CodeSynchronizationFileDto>>
        BuildFileListAsync
    (
        IEnumerable<string> filePaths,

        DateTime? lastSynchronizedDate
    )
    {
        var result =
            new List<CodeSynchronizationFileDto>();


        foreach
        (
            var filePath in filePaths
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    filePath
                )
            )
            {
                continue;
            }


            var fullPath =
                Path.GetFullPath(
                    filePath
                );


            var fileName =
                Path.GetFileName(
                    fullPath
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    fileName
                )
            )
            {
                continue;
            }


            DateTime?
                lastModified =
                    null;


            if
            (
                File.Exists(
                    fullPath
                )
            )
            {
                lastModified =
                    File.GetLastWriteTime(
                        fullPath
                    );
            }


            var status =
                "Clean";


            if
            (
                lastSynchronizedDate.HasValue
            )
            {
                var baselinePath =
                    GetBaselinePath(
                        fullPath
                    );


                if
                (
                    !File.Exists(
                        fullPath
                    )
                )
                {
                    status =
                        "Modified";
                }

                else if
                (
                    File.Exists(
                        baselinePath
                    )
                )
                {
                    var modified =
                        await IsFileModifiedAsync
                        (
                            fullPath,

                            baselinePath
                        );


                    if
                    (
                        modified
                    )
                    {
                        status =
                            "Modified";
                    }
                }
            }


            result.Add
            (
                new CodeSynchronizationFileDto
                {
                    FileName =
                        fileName,

                    Status =
                        status,

                    LastModified =
                        lastModified
                }
            );
        }


        return result;
    }



    //===========================================================
    // Synchronize Code
    //===========================================================

    public async Task<bool>
        SynchronizeAsync
    (
        long id
    )
    {
        var result =
            await _codeSynchronizationEngine
                .SynchronizeAsync
                (
                    id
                );


        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            throw new InvalidOperationException
            (
                "The Code Synchronization record was not found."
            );
        }


        if
        (
            string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            synchronization.BuildStatus =
                result.Success
                    ? "Successful"
                    : "Failed";


            if
            (
                string.IsNullOrWhiteSpace(
                    synchronization.DbStatus
                )
                ||
                synchronization.DbStatus ==
                "Successful"
            )
            {
                synchronization.DbStatus =
                    "N/A";
            }
        }
        else
        {
            synchronization.BuildStatus =
                "N/A";

            synchronization.DbStatus =
                "N/A";
        }


        synchronization.LastSynchronizationResult =
            result.Message;


        synchronization.Status =
            result.Success
                ? "Synchronized"
                : "Failed";


        if
        (
            !result.Success
        )
        {
            await _context.SaveChangesAsync();


            throw new InvalidOperationException
            (
                result.Message
            );
        }


        await CreateSynchronizationBaselineAsync(
            id
        );


        synchronization.LastSynchronizedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Rollback Code Synchronization
    //===========================================================

    public async Task<bool>
        RollbackAsync
    (
        long id
    )
    {
        var result =
            await _codeSynchronizationEngine
                .RollbackAsync
                (
                    id
                );


        if
        (
            !result.Success
        )
        {
            throw new InvalidOperationException
            (
                result.Message
            );
        }


        return true;
    }



    //===========================================================
    // Create From Submenu Synchronization
    //===========================================================

    public async Task<long>
        CreateFromSubmenuSynchronizationAsync
    (
        long submenuSynchronizationId
    )
    {
        const long userId =
            1;


        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        submenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            throw new InvalidOperationException
            (
                "The Submenu Synchronization record was not found."
            );
        }


        if
        (
            !string.Equals
            (
                submenuSynchronization.Status,

                "Synchronized",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization cannot be created because Submenu Synchronization for '{submenuSynchronization.SubmenuName}' is not synchronized."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.SynchronizationType
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization cannot be created because the synchronization type for '{submenuSynchronization.SubmenuName}' is not configured."
            );
        }


        var synchronizationType =
            submenuSynchronization
                .SynchronizationType
                .Trim();


        var existing =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.SubmenuSynchronizationId ==
                        submenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existing != null
        )
        {
            existing.SynchronizationType =
                synchronizationType;


            existing.ModuleId =
                submenuSynchronization.ModuleId;

            existing.ModuleCode =
                submenuSynchronization.ModuleCode;

            existing.ModuleName =
                submenuSynchronization.ModuleName;


            existing.MenuId =
                submenuSynchronization.MenuId;

            existing.MenuCode =
                submenuSynchronization.MenuCode;

            existing.MenuName =
                submenuSynchronization.MenuName;


            existing.SubmenuId =
                submenuSynchronization.SubmenuId;

            existing.SubmenuCode =
                submenuSynchronization.SubmenuCode;

            existing.SubmenuName =
                submenuSynchronization.SubmenuName;


            existing.Remarks =
                submenuSynchronization.Remarks;


            existing.BuildStatus =
                "N/A";

            existing.DbStatus =
                "N/A";


            await _context.SaveChangesAsync();


            return existing.Id;
        }


        var synchronization =
            new CodeSynchronizationEntity
            {
                SubmenuSynchronizationId =
                    submenuSynchronization.Id,


                ModuleId =
                    submenuSynchronization.ModuleId,

                ModuleCode =
                    submenuSynchronization.ModuleCode,

                ModuleName =
                    submenuSynchronization.ModuleName,


                MenuId =
                    submenuSynchronization.MenuId,

                MenuCode =
                    submenuSynchronization.MenuCode,

                MenuName =
                    submenuSynchronization.MenuName,


                SubmenuId =
                    submenuSynchronization.SubmenuId,

                SubmenuCode =
                    submenuSynchronization.SubmenuCode,

                SubmenuName =
                    submenuSynchronization.SubmenuName,


                SynchronizationType =
                    synchronizationType,


                Status =
                    "Ready",


                BuildStatus =
                    "N/A",


                DbStatus =
                    "N/A",


                Remarks =
                    submenuSynchronization.Remarks,


                LastSynchronizedBy =
                    null,

                LastSynchronizedDate =
                    null,

                LastSynchronizationResult =
                    string.Empty,


                IsActive =
                    true,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context.CodeSynchronizations.Add
        (
            synchronization
        );


        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add
        (
            new ActivityHistory
            {
                Module =
                    "Infrastructure Control",

                EntityName =
                    "Code Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Code Synchronization Created",

                ActivityDescription =
                    $"Code synchronization record created for '{synchronization.SubmenuName}'.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return synchronization.Id;
    }



    //===========================================================
    // Get History
    //===========================================================

    public async Task<List<CodeSynchronizationDto>>
        GetHistoryAsync()
    {
        return await _context.CodeSynchronizations

            .Where
            (
                x =>

                    !x.IsDeleted
            )

            .OrderByDescending
            (
                x =>
                    x.CreatedDate
            )

            .Select
            (
                x =>
                    new CodeSynchronizationDto
                    {
                        Id =
                            x.Id,

                        SubmenuSynchronizationId =
                            x.SubmenuSynchronizationId,

                        ModuleId =
                            x.ModuleId,

                        ModuleCode =
                            x.ModuleCode,

                        ModuleName =
                            x.ModuleName,

                        MenuId =
                            x.MenuId,

                        MenuCode =
                            x.MenuCode,

                        MenuName =
                            x.MenuName,

                        SubmenuId =
                            x.SubmenuId,

                        SubmenuCode =
                            x.SubmenuCode,

                        SubmenuName =
                            x.SubmenuName,

                        SynchronizationType =
                            _context.SubmenuSynchronizations

                                .Where
                                (
                                    submenu =>

                                        submenu.Id ==
                                        x.SubmenuSynchronizationId
                                )

                                .Select
                                (
                                    submenu =>
                                        submenu.SynchronizationType
                                )

                                .FirstOrDefault(),

                        Status =
                            x.Status,

                        BuildStatus =
                            x.BuildStatus,

                        DbStatus =
                            x.DbStatus,

                        Remarks =
                            x.Remarks,

                        LastSynchronizedBy =
                            x.LastSynchronizedBy,

                        LastSynchronizedDate =
                            x.LastSynchronizedDate,

                        LastSynchronizationResult =
                            x.LastSynchronizationResult,

                        IsActive =
                            x.IsActive,

                        CreatedDate =
                            x.CreatedDate
                    }
            )

            .ToListAsync();
    }

}