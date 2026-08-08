//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

using AppCore.Application.Platform.CommonInterfaces;
using AppCore.Application.Platform.MenuFrontendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;


//===============================================================
// Menu Frontend Synchronization Engine
//===============================================================

public class MenuFrontendSynchronizationEngine
    : IMenuFrontendSynchronizationEngine
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


    private readonly IFileRemover
        _fileRemover;


    private readonly IFileUpdater
        _fileUpdater;



    //===========================================================
    // Constructor
    //===========================================================

    public MenuFrontendSynchronizationEngine
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
            string.IsNullOrWhiteSpace(value)
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
            var part in parts
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
                string.IsNullOrWhiteSpace(cleaned)
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

    public async Task<MenuSynchronizationResultDto> SynchronizeAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        await PrepareFrontendTargetAsync
        (
            synchronization
        );


        await CreateFrontendStructureAsync
        (
            synchronization
        );


        return new MenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Menu frontend synchronization completed successfully."
        };
    }



    //===========================================================
    // Prepare Frontend Target
    //===========================================================

    private async Task PrepareFrontendTargetAsync
    (
        MenuSynchronizationDto synchronization
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
        MenuSynchronizationDto synchronization
    )
    {

        await CreateFolderAsync
        (
            synchronization.FrontendMenuFolder
        );


        await CreateFolderAsync
        (
            synchronization.FrontendModelsFolder
        );


        await CreateFolderAsync
        (
            synchronization.FrontendServicesFolder
        );


        await CreateFolderAsync
        (
            synchronization.FrontendPagesFolder
        );


        await CreateFolderAsync
        (
            synchronization.FrontendFormFolder
        );


        await CreateFolderAsync
        (
            synchronization.FrontendListFolder
        );


        await CreateFolderAsync
        (
            synchronization.FrontendRoutesFolder
        );


        //=======================================================
        // Generate Menu Route File
        //=======================================================

        await GenerateMenuRouteFileAsync
        (
            synchronization
        );


        //=======================================================
        // Register Menu Into Existing Module Route
        //=======================================================

        await RegisterMenuModuleRouteAsync
        (
            synchronization
        );
    }

    //===========================================================
    // Generate Menu Route File
    //===========================================================

    private async Task GenerateMenuRouteFileAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        //=======================================================
        // Validate Menu Route File
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendMenuRouteFile
            )
        )
        {
            return;
        }


        //=======================================================
        // File Already Exists
        //=======================================================

        if
        (
            File.Exists
            (
                synchronization.FrontendMenuRouteFile
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
                "Templates/Frontend/Route/MenuRoute.tpl"
            );


        //=======================================================
        // Create Menu Variable
        //=======================================================

        var menuVariable =
            CreateTypescriptVariableName
            (
                synchronization.MenuCode
            );


        //=======================================================
        // Replace Placeholders
        //=======================================================

        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string,string>
                {
                    {
                        "{{MenuCode}}",

                        synchronization.MenuCode
                    },


                    {
                        "{{MenuVariable}}",

                        menuVariable
                    },


                    {
                        "{{MenuName}}",

                        synchronization.MenuName
                    }
                }
            );


        //=======================================================
        // Generate File
        //=======================================================

        await _fileGenerator.GenerateAsync
        (
            synchronization.FrontendMenuRouteFile,

            content
        );
    }



    //===========================================================
    // Register Menu Into Existing Module Route
    //===========================================================

    private async Task RegisterMenuModuleRouteAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        //=======================================================
        // Validate Module Route File
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
        // Module Route Exists
        //=======================================================

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


        //=======================================================
        // Load Registration Template
        //=======================================================

        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Frontend/Route/MenuModuleRouteRegistration.tpl"
            );


        //=======================================================
        // Prepare Route Information
        //=======================================================

        var menuRoutePath =
            new DirectoryInfo
            (
                synchronization.FrontendMenuFolder
            )
            .Name;


        var menuRouteFile =
            Path.GetFileNameWithoutExtension
            (
                synchronization.FrontendMenuRouteFile
            );


        var menuRouteImport =
            "../"
            +
            menuRoutePath
            +
            "/routes/"
            +
            menuRouteFile;


        var menuVariable =
            CreateTypescriptVariableName
            (
                synchronization.MenuCode
            );


        //=======================================================
        // Replace Placeholders
        //=======================================================

        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string,string>
                {
                    {
                        "{{MenuCode}}",

                        synchronization.MenuCode
                    },


                    {
                        "{{MenuName}}",

                        synchronization.MenuName
                    },


                    {
                        "{{MenuRoutePath}}",

                        menuRoutePath
                    },


                    {
                        "{{MenuRouteFile}}",

                        menuRouteFile
                    },


                    {
                        "{{MenuRouteImport}}",

                        menuRouteImport
                    },


                    {
                        "{{MenuVariable}}",

                        menuVariable
                    }
                }
            );


        //=======================================================
        // Insert Into Existing Module Route
        //=======================================================

        await _fileUpdater.InsertManagedBlockAsync
        (
            synchronization.FrontendModuleRouteFile,

            "Module Routes",

            content
        );
    }
    //===========================================================
    // Rollback
    //===========================================================

    public async Task<MenuSynchronizationResultDto> RollbackAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        await DeleteFrontendStructureAsync
        (
            synchronization
        );


        return new MenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Menu frontend rollback completed successfully."
        };
    }

    //===========================================================
    // Delete Frontend Structure
    //===========================================================

    private async Task DeleteFrontendStructureAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        //=======================================================
        // Remove Menu Registration From Existing Module Route
        //=======================================================

        await UnregisterMenuModuleRouteAsync
        (
            synchronization
        );


        //=======================================================
        // Delete Menu Route File
        //=======================================================

        await DeleteMenuRouteFileAsync
        (
            synchronization
        );


        await DeleteFolderAsync
        (
            synchronization.FrontendRoutesFolder
        );


        await DeleteFolderAsync
        (
            synchronization.FrontendListFolder
        );


        await DeleteFolderAsync
        (
            synchronization.FrontendFormFolder
        );


        await DeleteFolderAsync
        (
            synchronization.FrontendPagesFolder
        );


        await DeleteFolderAsync
        (
            synchronization.FrontendServicesFolder
        );


        await DeleteFolderAsync
        (
            synchronization.FrontendModelsFolder
        );


        await DeleteFolderAsync
        (
            synchronization.FrontendMenuFolder
        );
    }
    
    //===========================================================
    // Unregister Menu From Existing Module Route
    //===========================================================

    private async Task UnregisterMenuModuleRouteAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        //=======================================================
        // Validate Module Route File
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
        // Module Route File Exists
        //=======================================================

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


        //=======================================================
        // Remove Managed Block
        //=======================================================

        await _fileRemover.RemoveManagedBlockAsync
        (
            synchronization.FrontendModuleRouteFile,

            $"// AUTO-BEGIN : {synchronization.MenuCode}",

            $"// AUTO-END : {synchronization.MenuCode}"
        );
    }

    //===========================================================
    // Delete Menu Route File
    //===========================================================

    private async Task DeleteMenuRouteFileAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendMenuRouteFile
            )
        )
        {
            return;
        }



        if
        (
            !File.Exists
            (
                synchronization.FrontendMenuRouteFile
            )
        )
        {
            return;
        }



        await _fileRemover.DeleteFileAsync
        (
            synchronization.FrontendMenuRouteFile
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



        //=======================================================
        // Delete Folder Content
        //=======================================================

        foreach
        (
            var file
            in Directory.GetFiles
            (
                folderPath
            )
        )
        {
            File.Delete
            (
                file
            );
        }



        foreach
        (
            var directory
            in Directory.GetDirectories
            (
                folderPath
            )
        )
        {
            Directory.Delete
            (
                directory,

                true
            );
        }



        //=======================================================
        // Delete Root Folder
        //=======================================================

        Directory.Delete
        (
            folderPath
        );


        await Task.CompletedTask;
    }

}