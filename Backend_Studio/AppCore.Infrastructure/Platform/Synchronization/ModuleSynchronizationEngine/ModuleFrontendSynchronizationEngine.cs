//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

using AppCore.Application.Platform.CommonInterfaces;
using AppCore.Application.Platform.FrontendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;


//===============================================================
// Module Frontend Synchronization Engine
//===============================================================

public class ModuleFrontendSynchronizationEngine
    : IFrontendSynchronizationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly ITemplateLoader
        _templateLoader;


    private readonly IPlaceholderEngine
        _placeholderEngine;


    private readonly IFileGenerator
        _fileGenerator;


    private readonly IFileUpdater
        _fileUpdater;


    private readonly IFileRemover
        _fileRemover;



    //===========================================================
    // Constructor
    //===========================================================

    public ModuleFrontendSynchronizationEngine
    (
        ITemplateLoader templateLoader,

        IPlaceholderEngine placeholderEngine,

        IFileGenerator fileGenerator,

        IFileUpdater fileUpdater,

        IFileRemover fileRemover
    )
    {
        _templateLoader =
            templateLoader;


        _placeholderEngine =
            placeholderEngine;


        _fileGenerator =
            fileGenerator;


        _fileUpdater =
            fileUpdater;


        _fileRemover =
            fileRemover;
    }



    //===========================================================
    // Create Typescript Variable Name
    //===========================================================

    private static string CreateTypescriptVariableName
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                value
            )
        )
        {
            return string.Empty;
        }


        var parts =
            value.Split
            (
                '-',
                StringSplitOptions.RemoveEmptyEntries
            );


        var result =
            string.Empty;


        foreach
        (
            var part
            in parts
        )
        {
            var cleaned =
                new string
                (
                    part
                        .Where(char.IsLetterOrDigit)
                        .ToArray()
                );


            if
            (
                string.IsNullOrWhiteSpace
                (
                    cleaned
                )
            )
            {
                continue;
            }


            if
            (
                result.Length == 0
            )
            {
                result =
                    cleaned.ToLowerInvariant();
            }
            else
            {
                result +=
                    char.ToUpperInvariant
                    (
                        cleaned[0]
                    )
                    +
                    cleaned
                        .Substring(1)
                        .ToLowerInvariant();
            }
        }


        return result;
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> SynchronizeAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization == null
        )
        {
            throw new ArgumentNullException
            (
                nameof(synchronization)
            );
        }


        await PrepareFrontendTargetAsync
        (
            synchronization
        );


        await CreateFrontendStructureAsync
        (
            synchronization
        );


        return new ModuleSynchronizationResultDto
        {
            Success =
                true,


            Message =
                "Frontend synchronization completed successfully."
        };
    }



    //===========================================================
    // Frontend Preparation
    //===========================================================

    private async Task PrepareFrontendTargetAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendSolution
            )
        )
        {
            throw new InvalidOperationException
            (
                "Frontend solution path is not configured."
            );
        }


        if
        (
            !Directory.Exists
            (
                synchronization.FrontendSolution
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Frontend solution was not found: {synchronization.FrontendSolution}"
            );
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Create Frontend Structure
    //===========================================================

    private async Task CreateFrontendStructureAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Module Folder
        //=======================================================

        await CreateModuleFolderAsync
        (
            synchronization
        );


        //=======================================================
        // Routes Folder
        //=======================================================

        await CreateRoutesFolderAsync
        (
            synchronization
        );


        //=======================================================
        // Module Route File
        //=======================================================

        await GenerateModuleRouteFileAsync
        (
            synchronization
        );


        //=======================================================
        // Application Route Registration
        //=======================================================

        await RegisterApplicationRouteAsync
        (
            synchronization
        );
    }



    //===========================================================
    // Module Folder
    //===========================================================

    private async Task CreateModuleFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.FrontendModuleFolder
        );
    }



    //===========================================================
    // Routes Folder
    //===========================================================

    private async Task CreateRoutesFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.FrontendRoutesFolder
        );
    }



    //===========================================================
    // Generate Module Route File
    //===========================================================

    private async Task GenerateModuleRouteFileAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendModuleRouteFile
            )
        )
        {
            return;
        }


        //=======================================================
        // Load Template
        //=======================================================

        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Frontend/Route/ModuleRoute.tpl"
            );


        //=======================================================
        // Replace Placeholders
        //=======================================================

        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{ModuleVariable}}",

                        CreateTypescriptVariableName
                        (
                            synchronization
                                .FrontendFeatureFolder
                        )
                    }
                }
            );


        //=======================================================
        // Validate Placeholder Replacement
        //=======================================================

        EnsureNoUnresolvedPlaceholders
        (
            content,

            synchronization.FrontendModuleRouteFile
        );


        //=======================================================
        // Existing File
        //=======================================================

        if
        (
            File.Exists
            (
                synchronization.FrontendModuleRouteFile
            )
        )
        {
            var existingContent =
                await File.ReadAllTextAsync
                (
                    synchronization.FrontendModuleRouteFile
                );


            //===================================================
            // Existing File Is Valid
            //===================================================

            if
            (
                !ContainsUnresolvedPlaceholder
                (
                    existingContent
                )
            )
            {
                return;
            }


            //===================================================
            // Existing File Is Broken
            //===================================================

            await _fileRemover.DeleteFileAsync
            (
                synchronization.FrontendModuleRouteFile
            );
        }


        //=======================================================
        // Generate File
        //=======================================================

        await _fileGenerator.GenerateAsync
        (
            synchronization.FrontendModuleRouteFile,

            content
        );
    }



    //===========================================================
    // Delete Module Route File
    //===========================================================

    private async Task DeleteModuleRouteFileAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendModuleRouteFile
            )
        )
        {
            return;
        }


        if
        (
            !File.Exists
            (
                synchronization.FrontendModuleRouteFile
            )
        )
        {
            return;
        }


        await _fileRemover.DeleteFileAsync
        (
            synchronization.FrontendModuleRouteFile
        );
    }



    //===========================================================
    // Register Application Route
    //===========================================================

    private async Task RegisterApplicationRouteAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendApplicationRouteFile
            )
        )
        {
            return;
        }


        //=======================================================
        // Application Route Exists
        //=======================================================

        if
        (
            !File.Exists
            (
                synchronization.FrontendApplicationRouteFile
            )
        )
        {
            return;
        }


        //=======================================================
        // Remove Broken Placeholder Registration
        //=======================================================

        await RemoveBrokenPlaceholderRegistrationAsync
        (
            synchronization
        );


        //=======================================================
        // Load Registration Template
        //=======================================================

        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Frontend/Route/ModuleRegistration.tpl"
            );


        //=======================================================
        // Replace Placeholders
        //=======================================================

        var registration =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{ModuleCode}}",

                        synchronization.ModuleCode
                    },


                    {
                        "{{ModuleName}}",

                        synchronization.ModuleName
                    },


                    {
                        "{{ModuleVariable}}",

                        CreateTypescriptVariableName
                        (
                            synchronization
                                .FrontendFeatureFolder
                        )
                    },


                    {
                        "{{ModuleRoutePath}}",

                        synchronization.FrontendFeatureFolder
                    },


                    {
                        "{{ModuleRouteFile}}",

                        $"{synchronization.FrontendFeatureFolder}.routes"
                    }
                }
            );


        //=======================================================
        // Validate Placeholder Replacement
        //=======================================================

        EnsureNoUnresolvedPlaceholders
        (
            registration,

            synchronization.FrontendApplicationRouteFile
        );


        //=======================================================
        // Register In Children Collection
        //=======================================================

        await _fileUpdater.InsertManagedBlockAsync
        (
            synchronization.FrontendApplicationRouteFile,

            "children:",

            registration
        );
    }



    //===========================================================
    // Remove Broken Placeholder Registration
    //===========================================================

    private async Task RemoveBrokenPlaceholderRegistrationAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendApplicationRouteFile
            )
        )
        {
            return;
        }


        if
        (
            !File.Exists
            (
                synchronization.FrontendApplicationRouteFile
            )
        )
        {
            return;
        }


        //=======================================================
        // Remove Generic Placeholder Block
        //=======================================================

        await _fileRemover.RemoveManagedBlockAsync
        (
            synchronization.FrontendApplicationRouteFile,

            "// AUTO-BEGIN : {{ModuleCode}}",

            "// AUTO-END : {{ModuleCode}}"
        );


        //=======================================================
        // Remove Module-Specific Broken Block
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace
            (
                synchronization.ModuleCode
            )
        )
        {
            await _fileRemover.RemoveManagedBlockAsync
            (
                synchronization.FrontendApplicationRouteFile,

                $"// AUTO-BEGIN : {synchronization.ModuleCode}",

                $"// AUTO-END : {synchronization.ModuleCode}"
            );
        }
    }



    //===========================================================
    // Unregister Application Route
    //===========================================================

    private async Task UnregisterApplicationRouteAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendApplicationRouteFile
            )
        )
        {
            return;
        }


        if
        (
            !File.Exists
            (
                synchronization.FrontendApplicationRouteFile
            )
        )
        {
            return;
        }


        //=======================================================
        // Remove Normal Registration
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace
            (
                synchronization.ModuleCode
            )
        )
        {
            await _fileRemover.RemoveManagedBlockAsync
            (
                synchronization.FrontendApplicationRouteFile,

                $"// AUTO-BEGIN : {synchronization.ModuleCode}",

                $"// AUTO-END : {synchronization.ModuleCode}"
            );
        }


        //=======================================================
        // Remove Broken Placeholder Registration
        //=======================================================

        await _fileRemover.RemoveManagedBlockAsync
        (
            synchronization.FrontendApplicationRouteFile,

            "// AUTO-BEGIN : {{ModuleCode}}",

            "// AUTO-END : {{ModuleCode}}"
        );
    }



    //===========================================================
    // Create Folder
    //===========================================================

    private async Task CreateFolderAsync
    (
        string folderPath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                folderPath
            )
        )
        {
            return;
        }


        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        if
        (
            !Directory.Exists
            (
                folderPath
            )
        )
        {
            Directory.CreateDirectory
            (
                folderPath
            );
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> RollbackAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization == null
        )
        {
            throw new ArgumentNullException
            (
                nameof(synchronization)
            );
        }


        await DeleteFrontendStructureAsync
        (
            synchronization
        );


        return new ModuleSynchronizationResultDto
        {
            Success =
                true,


            Message =
                "Frontend rollback completed successfully."
        };
    }



    //===========================================================
    // Delete Frontend Structure
    //===========================================================

    private async Task DeleteFrontendStructureAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Unregister Application Route
        //=======================================================

        await UnregisterApplicationRouteAsync
        (
            synchronization
        );


        //=======================================================
        // Delete Module Route File
        //=======================================================

        await DeleteModuleRouteFileAsync
        (
            synchronization
        );


        //=======================================================
        // Delete Routes Folder
        //=======================================================

        await DeleteRoutesFolderAsync
        (
            synchronization
        );


        //=======================================================
        // Delete Module Folder
        //=======================================================

        await DeleteModuleFolderAsync
        (
            synchronization
        );
    }



    //===========================================================
    // Module Folder
    //===========================================================

    private async Task DeleteModuleFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteFolderAsync
        (
            synchronization.FrontendModuleFolder
        );
    }



    //===========================================================
    // Routes Folder
    //===========================================================

    private async Task DeleteRoutesFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteFolderAsync
        (
            synchronization.FrontendRoutesFolder
        );
    }



    //===========================================================
    // Delete Folder
    //===========================================================

    private async Task DeleteFolderAsync
    (
        string folderPath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                folderPath
            )
        )
        {
            return;
        }


        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        if
        (
            !Directory.Exists
            (
                folderPath
            )
        )
        {
            return;
        }


        if
        (
            Directory.GetFileSystemEntries
            (
                folderPath
            ).Length == 0
        )
        {
            Directory.Delete
            (
                folderPath
            );
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Contains Unresolved Placeholder
    //===========================================================

    private static bool ContainsUnresolvedPlaceholder
    (
        string content
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                content
            )
        )
        {
            return false;
        }


        return
            content.Contains
            (
                "{{ModuleCode}}",
                StringComparison.Ordinal
            )
            ||
            content.Contains
            (
                "{{ModuleName}}",
                StringComparison.Ordinal
            )
            ||
            content.Contains
            (
                "{{ModuleVariable}}",
                StringComparison.Ordinal
            )
            ||
            content.Contains
            (
                "{{ModuleRoutePath}}",
                StringComparison.Ordinal
            )
            ||
            content.Contains
            (
                "{{ModuleRouteFile}}",
                StringComparison.Ordinal
            );
    }



    //===========================================================
    // Ensure No Unresolved Placeholders
    //===========================================================

    private static void EnsureNoUnresolvedPlaceholders
    (
        string content,

        string targetFile
    )
    {
        if
        (
            ContainsUnresolvedPlaceholder
            (
                content
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Frontend synchronization generated unresolved module placeholders for: {targetFile}"
            );
        }
    }

}