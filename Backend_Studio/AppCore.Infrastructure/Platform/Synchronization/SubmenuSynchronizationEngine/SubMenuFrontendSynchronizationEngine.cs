//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

using AppCore.Application.Platform.CommonInterfaces;
using AppCore.Application.Platform.SubmenuFrontendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;


//===============================================================
// Submenu Frontend Synchronization Engine
//===============================================================

public class SubmenuFrontendSynchronizationEngine
    : ISubmenuFrontendSynchronizationEngine
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

    public SubmenuFrontendSynchronizationEngine
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

    public async Task<SubmenuSynchronizationResultDto> SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
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


        return new SubmenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Submenu frontend synchronization completed successfully."
        };
    }



    //===========================================================
    // Prepare Frontend Target
    //===========================================================

    private async Task PrepareFrontendTargetAsync
    (
        SubmenuSynchronizationDto synchronization
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
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Create Submenu Folder
        //=======================================================

        await CreateFolderAsync
        (
            synchronization.FrontendSubmenuFolder
        );


        //=======================================================
        // Create Pages Folder
        //=======================================================

        await CreateFolderAsync
        (
            synchronization.FrontendPagesFolder
        );


        //=======================================================
        // Create Form Folder
        //=======================================================

        await CreateFolderAsync
        (
            synchronization.FrontendFormFolder
        );


        //=======================================================
        // Create List Folder
        //=======================================================

        await CreateFolderAsync
        (
            synchronization.FrontendListFolder
        );


        //=======================================================
        // Generate Model File
        //=======================================================

        await GenerateSubmenuModelFileAsync
        (
            synchronization
        );


        //=======================================================
        // Generate Service File
        //=======================================================

        await GenerateSubmenuServiceFileAsync
        (
            synchronization
        );


        //=======================================================
        // Generate Submenu Route File
        //=======================================================

        await GenerateSubmenuRouteFileAsync
        (
            synchronization
        );


        //=======================================================
        // Register Submenu Into Existing Menu Route
        //=======================================================

        await RegisterSubmenuMenuRouteAsync
        (
            synchronization
        );


        //=======================================================
        // Generate Form Files
        //=======================================================

        await GenerateSubmenuFormFilesAsync
        (
            synchronization
        );


        //=======================================================
        // Generate List Files
        //=======================================================

        await GenerateSubmenuListFilesAsync
        (
            synchronization
        );
    }



    //===========================================================
    // Generate Submenu Model File
    //===========================================================

    private async Task GenerateSubmenuModelFileAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendSubmenuModelFile
            )
        )
        {
            return;
        }


        if
        (
            File.Exists
            (
                synchronization.FrontendSubmenuModelFile
            )
        )
        {
            return;
        }


        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Frontend/Submenu/SubmenuModel.tpl"
            );


        var submenuVariable =
            CreateTypescriptVariableName
            (
                synchronization.SubmenuCode
            );


        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{SubmenuCode}}",
                        synchronization.SubmenuCode
                    },

                    {
                        "{{SubmenuVariable}}",
                        submenuVariable
                    },

                    {
                        "{{SubmenuName}}",
                        synchronization.SubmenuName
                    }
                }
            );


        await _fileGenerator.GenerateAsync
        (
            synchronization.FrontendSubmenuModelFile,

            content
        );
    }



    //===========================================================
    // Generate Submenu Service File
    //===========================================================

    private async Task GenerateSubmenuServiceFileAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendSubmenuServiceFile
            )
        )
        {
            return;
        }


        if
        (
            File.Exists
            (
                synchronization.FrontendSubmenuServiceFile
            )
        )
        {
            return;
        }


        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Frontend/Submenu/SubmenuService.tpl"
            );


        var submenuVariable =
            CreateTypescriptVariableName
            (
                synchronization.SubmenuCode
            );


        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{SubmenuCode}}",
                        synchronization.SubmenuCode
                    },

                    {
                        "{{SubmenuVariable}}",
                        submenuVariable
                    },

                    {
                        "{{SubmenuName}}",
                        synchronization.SubmenuName
                    }
                }
            );


        await _fileGenerator.GenerateAsync
        (
            synchronization.FrontendSubmenuServiceFile,

            content
        );
    }



    //===========================================================
    // Generate Submenu Route File
    //===========================================================

    private async Task GenerateSubmenuRouteFileAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendSubmenuRouteFile
            )
        )
        {
            return;
        }


        if
        (
            File.Exists
            (
                synchronization.FrontendSubmenuRouteFile
            )
        )
        {
            return;
        }


        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Frontend/Route/SubmenuRoute.tpl"
            );


        var submenuVariable =
            CreateTypescriptVariableName
            (
                synchronization.SubmenuCode
            );


        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{SubmenuCode}}",
                        synchronization.SubmenuCode
                    },

                    {
                        "{{SubmenuVariable}}",
                        submenuVariable
                    },

                    {
                        "{{SubmenuName}}",
                        synchronization.SubmenuName
                    }
                }
            );


        await _fileGenerator.GenerateAsync
        (
            synchronization.FrontendSubmenuRouteFile,

            content
        );
    }



    //===========================================================
    // Register Submenu Into Existing Menu Route
    //===========================================================

    private async Task RegisterSubmenuMenuRouteAsync
    (
        SubmenuSynchronizationDto synchronization
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


        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Frontend/Route/SubmenuMenuRouteRegistration.tpl"
            );


        var submenuRoutePath =
            new DirectoryInfo
            (
                synchronization.FrontendSubmenuFolder
            )
            .Name;


        var submenuRouteFile =
            Path.GetFileNameWithoutExtension
            (
                synchronization.FrontendSubmenuRouteFile
            );


        var submenuRouteImport =
            "../"
            +
            submenuRoutePath
            +
            "/routes/"
            +
            submenuRouteFile;


        var submenuVariable =
            CreateTypescriptVariableName
            (
                synchronization.SubmenuCode
            );


        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{SubmenuCode}}",
                        synchronization.SubmenuCode
                    },

                    {
                        "{{SubmenuName}}",
                        synchronization.SubmenuName
                    },

                    {
                        "{{SubmenuRoutePath}}",
                        submenuRoutePath
                    },

                    {
                        "{{SubmenuRouteFile}}",
                        submenuRouteFile
                    },

                    {
                        "{{SubmenuRouteImport}}",
                        submenuRouteImport
                    },

                    {
                        "{{SubmenuVariable}}",
                        submenuVariable
                    }
                }
            );


        await _fileUpdater.InsertManagedBlockAsync
        (
            synchronization.FrontendMenuRouteFile,

            "Menu Routes",

            content
        );
    }



    //===========================================================
    // Generate Submenu Form Files
    //===========================================================

    private async Task GenerateSubmenuFormFilesAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        await GenerateFileAsync
        (
            synchronization.FrontendSubmenuFormTsFile,

            "Templates/Frontend/Submenu/SubmenuForm.ts.tpl",

            synchronization
        );


        await GenerateFileAsync
        (
            synchronization.FrontendSubmenuFormHtmlFile,

            "Templates/Frontend/Submenu/SubmenuForm.html.tpl",

            synchronization
        );


        await GenerateFileAsync
        (
            synchronization.FrontendSubmenuFormCssFile,

            "Templates/Frontend/Submenu/SubmenuForm.css.tpl",

            synchronization
        );
    }



    //===========================================================
    // Generate Submenu List Files
    //===========================================================

    private async Task GenerateSubmenuListFilesAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        await GenerateFileAsync
        (
            synchronization.FrontendSubmenuListTsFile,

            "Templates/Frontend/Submenu/SubmenuList.ts.tpl",

            synchronization
        );


        await GenerateFileAsync
        (
            synchronization.FrontendSubmenuListHtmlFile,

            "Templates/Frontend/Submenu/SubmenuList.html.tpl",

            synchronization
        );


        await GenerateFileAsync
        (
            synchronization.FrontendSubmenuListCssFile,

            "Templates/Frontend/Submenu/SubmenuList.css.tpl",

            synchronization
        );
    }



    //===========================================================
    // Generate File
    //===========================================================

    private async Task GenerateFileAsync
    (
        string filePath,

        string templatePath,

        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(filePath)
        )
        {
            return;
        }


        if
        (
            File.Exists(filePath)
        )
        {
            return;
        }


        var template =
            await _templateLoader.LoadTemplateAsync
            (
                templatePath
            );


        var submenuVariable =
            CreateTypescriptVariableName
            (
                synchronization.SubmenuCode
            );


        var content =
            _placeholderEngine.Replace
            (
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{SubmenuCode}}",
                        synchronization.SubmenuCode
                    },

                    {
                        "{{SubmenuName}}",
                        synchronization.SubmenuName
                    },

                    {
                        "{{SubmenuVariable}}",
                        submenuVariable
                    },

                    {
                        "{{MenuCode}}",
                        synchronization.MenuCode
                    },

                    {
                        "{{MenuName}}",
                        synchronization.MenuName
                    }
                }
            );


        await _fileGenerator.GenerateAsync
        (
            filePath,

            content
        );
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<SubmenuSynchronizationResultDto> RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        await DeleteFrontendStructureAsync
        (
            synchronization
        );


        return new SubmenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Submenu frontend rollback completed successfully."
        };
    }



    //===========================================================
    // Delete Frontend Structure
    //===========================================================

    private async Task DeleteFrontendStructureAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Remove Submenu Registration From Menu Route
        //=======================================================

        await UnregisterSubmenuMenuRouteAsync
        (
            synchronization
        );


        //=======================================================
        // Delete Submenu Route File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuRouteFile
        );


        //=======================================================
        // Delete List Folder
        //=======================================================

        await DeleteFolderAsync
        (
            synchronization.FrontendListFolder
        );


        //=======================================================
        // Delete Form Folder
        //=======================================================

        await DeleteFolderAsync
        (
            synchronization.FrontendFormFolder
        );


        //=======================================================
        // Delete Pages Folder
        //=======================================================

        await DeleteFolderAsync
        (
            synchronization.FrontendPagesFolder
        );


        //=======================================================
        // Delete Submenu Folder
        //=======================================================

        await DeleteFolderAsync
        (
            synchronization.FrontendSubmenuFolder
        );
    }



    //===========================================================
    // Unregister Submenu From Existing Menu Route
    //===========================================================

    private async Task UnregisterSubmenuMenuRouteAsync
    (
        SubmenuSynchronizationDto synchronization
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


        await _fileRemover.RemoveManagedBlockAsync
        (
            synchronization.FrontendMenuRouteFile,

            $"// AUTO-BEGIN : {synchronization.SubmenuCode}",

            $"// AUTO-END : {synchronization.SubmenuCode}"
        );
    }



    //===========================================================
    // Delete File
    //===========================================================

    private async Task DeleteFileAsync
    (
        string filePath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(filePath)
        )
        {
            return;
        }


        if
        (
            !File.Exists(filePath)
        )
        {
            return;
        }


        await _fileRemover.DeleteFileAsync
        (
            filePath
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
            string.IsNullOrWhiteSpace(folderPath)
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
            string.IsNullOrWhiteSpace(folderPath)
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


        Directory.Delete
        (
            folderPath
        );


        await Task.CompletedTask;
    }

}