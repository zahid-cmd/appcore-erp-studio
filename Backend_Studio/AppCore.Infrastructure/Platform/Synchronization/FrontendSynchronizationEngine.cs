//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
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
// Frontend Synchronization Engine
//===============================================================

public class FrontendSynchronizationEngine
    : IFrontendSynchronizationEngine
{
    //===========================================================
    // Fields
    //===========================================================
    private readonly ITemplateLoader _templateLoader;

    private readonly IPlaceholderEngine _placeholderEngine;

    private readonly IFileGenerator _fileGenerator;
    
    //===========================================================
    // Template Root
    //===========================================================

    private const string FrontendTemplateRoot =
        "Templates/Frontend";

    //===========================================================
    // Route Registration Markers
    //===========================================================

    private const string AutoRegisterRoutesMarker =
        "<AUTO-REGISTER-ROUTES>";

    //===========================================================
    // Templates
    //===========================================================

    private const string ModelTemplate =
        "Model/Model.tpl";

    private const string ServiceTemplate =
        "Service/Service.tpl";

    private const string RouteTemplate =
        "Route/Route.tpl";

    private const string ListPageTemplate =
        "Page/ListPage.tpl";

    private const string FormPageTemplate =
        "Page/FormPage.tpl";
    //===========================================================
    // Constructor
    //===========================================================

    public FrontendSynchronizationEngine
    (
        ITemplateLoader templateLoader,

        IPlaceholderEngine placeholderEngine,

        IFileGenerator fileGenerator
    )
    {
        _templateLoader =
            templateLoader;

        _placeholderEngine =
            placeholderEngine;

        _fileGenerator =
            fileGenerator;
    }

    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> SynchronizeAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Prepare Synchronization
        //=======================================================

        await PrepareSynchronizationAsync
        (
            synchronization
        );

        //=======================================================
        // Synchronize Folder Structure
        //=======================================================

        await SynchronizeFolderStructureAsync
        (
            synchronization
        );

        //=======================================================
        // Synchronize Generated Files
        //=======================================================

        await SynchronizeGeneratedFilesAsync
        (
            synchronization
        );

        //=======================================================
        // Synchronize Application Registration
        //=======================================================

        await SynchronizeApplicationRegistrationAsync
        (
            synchronization
        );

        //=======================================================
        // Build Synchronization Result
        //=======================================================

        return await BuildSynchronizationResultAsync();
    }

    //===========================================================
    // Prepare Synchronization
    //===========================================================

    private async Task PrepareSynchronizationAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await PrepareFrontendTargetAsync
        (
            synchronization
        );
    }

    //===========================================================
    // Synchronize Folder Structure
    //===========================================================

    private async Task SynchronizeFolderStructureAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await SynchronizeFrontendStructureAsync
        (
            synchronization
        );
    }

    //===========================================================
    // Synchronize Generated Files
    //===========================================================

    private async Task SynchronizeGeneratedFilesAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await SynchronizeFrontendFilesAsync
        (
            synchronization
        );
    }

    //===========================================================
    // Synchronize Application Registration
    //===========================================================

    private async Task SynchronizeApplicationRegistrationAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await SynchronizeFrontendRoutingAsync
        (
            synchronization
        );
    }

    //===========================================================
    // Build Synchronization Result
    //===========================================================

    private async Task<ModuleSynchronizationResultDto>
    BuildSynchronizationResultAsync()
    {
        return await Task.FromResult
        (
            new ModuleSynchronizationResultDto
            {
                Success = true,

                Message =
                    "Frontend synchronization completed successfully."
            }
        );
    }

    //===========================================================
    // Synchronize Frontend Routing
    //===========================================================

    private async Task SynchronizeFrontendRoutingAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if (string.IsNullOrWhiteSpace(
            synchronization.FrontendApplicationRouteFile))
        {
            return;
        }

        //=======================================================
        // Register Route
        //=======================================================

        await InsertTextIntoFileAsync
        (
            synchronization.FrontendApplicationRouteFile,

            AutoRegisterRoutesMarker,

            BuildRouteRegistration
            (
                synchronization
            )
        );
    }

    //===========================================================
    // Prepare Frontend Target
    //===========================================================

    private async Task PrepareFrontendTargetAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Synchronization
        //=======================================================

        if (synchronization == null)
        {
            throw new Exception
            (
                "Module synchronization configuration was not provided."
            );
        }

        //=======================================================
        // Validate Frontend Solution
        //=======================================================

        if (string.IsNullOrWhiteSpace
        (
            synchronization.FrontendSolution
        ))
        {
            throw new Exception
            (
                "Frontend solution path is not configured."
            );
        }

        //=======================================================
        // Validate Frontend Project
        //=======================================================

        if (string.IsNullOrWhiteSpace
        (
            synchronization.FrontendProject
        ))
        {
            throw new Exception
            (
                "Frontend project is not configured."
            );
        }

        //=======================================================
        // Validate Source Folder
        //=======================================================

        if (string.IsNullOrWhiteSpace
        (
            synchronization.FrontendSourceFolder
        ))
        {
            throw new Exception
            (
                "Frontend source folder is not configured."
            );
        }

        //=======================================================
        // Validate Feature Folder
        //=======================================================

        if (string.IsNullOrWhiteSpace
        (
            synchronization.FrontendFeatureFolder
        ))
        {
            throw new Exception
            (
                "Frontend feature folder is not configured."
            );
        }

        //=======================================================
        // Completed
        //=======================================================

        await Task.CompletedTask;
    }
    
    //===========================================================
    // Synchronize Frontend Structure
    //===========================================================

    private async Task SynchronizeFrontendStructureAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Create Standard Folders
        //=======================================================

        await CreateModelFolderAsync(
            synchronization);

        await CreatePagesFolderAsync(
            synchronization);

        await CreateRoutesFolderAsync(
            synchronization);

        await CreateServicesFolderAsync(
            synchronization);
    }

    //===========================================================
    // Create Folder
    //===========================================================

    private async Task CreateFolderAsync
    (
        string folderPath
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if (string.IsNullOrWhiteSpace(folderPath))
        {
            return;
        }

        //=======================================================
        // Normalize Path
        //=======================================================

        folderPath =
            Path.GetFullPath(folderPath);

        //=======================================================
        // Create Folder
        //=======================================================

        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        await Task.CompletedTask;
    }

    //===========================================================
    // Create Model Folder
    //===========================================================

    private async Task CreateModelFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.FrontendModelFolder
        );
    }

    //===========================================================
    // Create Pages Folder
    //===========================================================

    private async Task CreatePagesFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.FrontendPagesFolder
        );
    }

    //===========================================================
    // Create Routes Folder
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
    // Create Services Folder
    //===========================================================

    private async Task CreateServicesFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.FrontendServicesFolder
        );
    }

    //===========================================================
    // Synchronize Frontend Files
    //===========================================================

    private async Task SynchronizeFrontendFilesAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await GenerateModelAsync
        (
            synchronization
        );

        await GenerateServiceAsync
        (
            synchronization
        );

        await GenerateRoutesAsync
        (
            synchronization
        );

        await GeneratePagesAsync
        (
            synchronization
        );
    }

    //===========================================================
    // Build Replacement Dictionary
    //===========================================================

    private async Task<Dictionary<string, string>> BuildReplacementDictionaryAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Names
        //=======================================================

        var moduleName =
            synchronization.ModuleName;

        var moduleCode =
            synchronization.ModuleCode;

        //=======================================================
        // Dictionary
        //=======================================================

        var replacements =
            new Dictionary<string, string>
            {
                //===================================================
                // Module
                //===================================================

                ["{{ModuleId}}"] =
                    synchronization.ModuleId.ToString(),

                ["{{ModuleCode}}"] =
                    moduleCode,

                ["{{ModuleName}}"] =
                    moduleName,

                ["{{ModuleDisplayName}}"] =
                    moduleName,

                //===================================================
                // Frontend
                //===================================================

                ["{{ModelName}}"] =
                    moduleName,

                ["{{ServiceName}}"] =
                    $"{moduleName}Service",

                ["{{RouteName}}"] =
                    $"{moduleName.ToLower()}-routes",

                ["{{ListPageName}}"] =
                    $"{moduleName.ToLower()}-list",

                ["{{FormPageName}}"] =
                    $"{moduleName.ToLower()}-form",

                //===================================================
                // Routing
                //===================================================

                ["{{RoutePath}}"] =
                    synchronization.FrontendRoutePath,

                //===================================================
                // Folder
                //===================================================

                ["{{FeatureFolder}}"] =
                    synchronization.FrontendFeatureFolder,

                ["{{ModuleFolder}}"] =
                    synchronization.FrontendModuleFolder,

                //===================================================
                // Namespace
                //===================================================

                ["{{FrontendNamespace}}"] =
                    $"AppCore.{moduleName}"
            };

        return await Task.FromResult
        (
            replacements
        );
    }
    
    //===========================================================
    // Build Route Registration
    //===========================================================

    private string BuildRouteRegistration
    (
        ModuleSynchronizationDto synchronization
    )
    {
        return
            $@"    {{
                    path: '{synchronization.FrontendRoutePath}',

                    loadChildren: () =>
                        import(
                            '{BuildRouteImportPath(synchronization)}'
                        )
                        .then
                        (
                            m =>
                                m.{BuildRouteExportName(synchronization)}
                        )
                }},";
    }

    //===========================================================
    // Build Route Import Path
    //===========================================================

    private string BuildRouteImportPath
    (
        ModuleSynchronizationDto synchronization
    )
    {
        return
            $"./{synchronization.ModuleName.ToLower()}/{synchronization.ModuleName.ToLower()}.routes";
    }

    //===========================================================
    // Build Route Export Name
    //===========================================================

    private string BuildRouteExportName
    (
        ModuleSynchronizationDto synchronization
    )
    {
        return
            $"{char.ToLowerInvariant(synchronization.ModuleName[0])}{synchronization.ModuleName.Substring(1)}Routes";
    }

    //===========================================================
    // Insert Text Into File
    //===========================================================

    private async Task InsertTextIntoFileAsync
    (
        string filePath,

        string marker,

        string textToInsert
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if (string.IsNullOrWhiteSpace(filePath))
        {
            return;
        }

        if (!File.Exists(filePath))
        {
            return;
        }

        //=======================================================
        // Read File
        //=======================================================

        var content =
            await File.ReadAllTextAsync
            (
                filePath
            );

        //=======================================================
        // Already Registered
        //=======================================================

        if (content.Contains(textToInsert))
        {
            return;
        }

        //=======================================================
        // Marker Not Found
        //=======================================================

        if (!content.Contains(marker))
        {
            throw new Exception
            (
                $"Marker '{marker}' was not found in '{filePath}'."
            );
        }

        //=======================================================
        // Insert Text
        //=======================================================

        content =
            content.Replace
            (
                marker,

                $"{textToInsert}{Environment.NewLine}{Environment.NewLine}{marker}"
            );

        //=======================================================
        // Save File
        //=======================================================

        await File.WriteAllTextAsync
        (
            filePath,
            content
        );
    }

    //===========================================================
    // Generate Frontend File
    //===========================================================

    private async Task GenerateFrontendFileAsync
    (
        string templateName,

        string outputFolder,

        string fileName,

        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Template
        //=======================================================

        var templateFile =
            Path.Combine
            (
                FrontendTemplateRoot,
                templateName
            );

        var template =
            await _templateLoader.LoadTemplateAsync
            (
                templateFile
            );

        //=======================================================
        // Replacements
        //=======================================================

        var replacements =
            await BuildReplacementDictionaryAsync
            (
                synchronization
            );

        //=======================================================
        // Apply Placeholders
        //=======================================================

        var content =
            _placeholderEngine.Replace
            (
                template,
                replacements
            );

        //=======================================================
        // Output File
        //=======================================================

        var outputFile =
            Path.Combine
            (
                outputFolder,
                fileName
            );

        //=======================================================
        // Generate
        //=======================================================

        await _fileGenerator.GenerateAsync
        (
            outputFile,
            content
        );
    }

    //===========================================================
    // Generate Model
    //===========================================================

    private async Task GenerateModelAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await GenerateFrontendFileAsync
        (
            ModelTemplate,

            synchronization.FrontendModelFolder,

            $"{synchronization.ModuleName}.ts",

            synchronization
        );
    }

    //===========================================================
    // Generate Service
    //===========================================================

    private async Task GenerateServiceAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await GenerateFrontendFileAsync
        (
            ServiceTemplate,

            synchronization.FrontendServicesFolder,

            $"{synchronization.ModuleName}Service.ts",

            synchronization
        );
    }

    //===========================================================
    // Generate Pages
    //===========================================================

    private async Task GeneratePagesAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // List Page
        //=======================================================

        await GeneratePageAsync
        (
            ListPageTemplate,
            $"{synchronization.ModuleName.ToLower()}-list.ts",
            synchronization
        );

        //=======================================================
        // Form Page
        //=======================================================

        await GeneratePageAsync
        (
            FormPageTemplate,
            $"{synchronization.ModuleName.ToLower()}-form.ts",
            synchronization
        );
    }

    //===========================================================
    // Generate Page
    //===========================================================

    private async Task GeneratePageAsync
    (
        string templateName,

        string fileName,

        ModuleSynchronizationDto synchronization
    )
    {
        await GenerateFrontendFileAsync
        (
            templateName,

            synchronization.FrontendPagesFolder,

            fileName,

            synchronization
        );
    }

    //===========================================================
    // Generate Routes
    //===========================================================

    private async Task GenerateRoutesAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await GenerateFrontendFileAsync
        (
            RouteTemplate,

            synchronization.FrontendRoutesFolder,

            $"{synchronization.ModuleName.ToLower()}-routes.ts",

            synchronization
        );
    }

    //===========================================================
    // Rollback
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> RollbackAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Prepare Rollback
        //=======================================================

        await PrepareFrontendTargetAsync
        (
            synchronization
        );

        //=======================================================
        // Rollback Generated Files
        //=======================================================

        await RollbackGeneratedFilesAsync
        (
            synchronization
        );

        //=======================================================
        // Rollback Folder Structure
        //=======================================================

        await RollbackFolderStructureAsync
        (
            synchronization
        );

        //=======================================================
        // Rollback Application Registration
        //=======================================================

        await RollbackApplicationRegistrationAsync
        (
            synchronization
        );

        //=======================================================
        // Completed
        //=======================================================

        return new ModuleSynchronizationResultDto
        {
            Success = true,

            Message =
                "Frontend rollback completed successfully."
        };
    }

    //===========================================================
    // Rollback Generated Files
    //===========================================================

    private async Task RollbackGeneratedFilesAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await Task.CompletedTask;
    }

    //===========================================================
    // Rollback Folder Structure
    //===========================================================

    private async Task RollbackFolderStructureAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await Task.CompletedTask;
    }

    //===========================================================
    // Rollback Application Registration
    //===========================================================

    private async Task RollbackApplicationRegistrationAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await Task.CompletedTask;
    }

}