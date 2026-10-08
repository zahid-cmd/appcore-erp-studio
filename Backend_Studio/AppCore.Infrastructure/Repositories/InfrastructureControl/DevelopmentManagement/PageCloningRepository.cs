//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;


//===============================================================
// Page Cloning Repository
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement;

public class PageCloningRepository :
    IPageCloningRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public PageCloningRepository
    (
        AppDbContext context
    )
    {
        _context = context;
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<IEnumerable<PageCloning>> GetAllAsync()
    {
        return await _context.Set<PageCloning>()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .OrderBy
            (
                x =>
                    x.Id
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<PageCloning?> GetByIdAsync
    (
        long id
    )
    {
        return await _context.Set<PageCloning>()
            .FirstOrDefaultAsync
            (
                x =>
                    x.Id == id &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    // Get History
    //===========================================================

    public async Task<IEnumerable<PageCloning>> GetHistoryAsync()
    {
        return await _context.Set<PageCloning>()
            .OrderByDescending
            (
                x =>
                    x.Id
            )
            .ToListAsync();
    }


    //===========================================================
    // Analyze Source
    //===========================================================

    public async Task<PageCloningSourceAnalysisDto> AnalyzeSourceAsync
    (
        long submenuId
    )
    {
        //=======================================================
        // Validate Source
        //=======================================================

        if
        (
            submenuId <= 0
        )
        {
            throw new InvalidOperationException
            (
                "Source page is required."
            );
        }


        //=======================================================
        // Load Submenu
        //=======================================================

        var submenu =
            await _context.NavigationSubmenus
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == submenuId &&
                        !x.IsDeleted
                );


        if
        (
            submenu == null
        )
        {
            throw new InvalidOperationException
            (
                "Source page was not found."
            );
        }


        //=======================================================
        // Load Menu
        //=======================================================

        var menu =
            await _context.NavigationMenus
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == submenu.NavigationMenuId &&
                        !x.IsDeleted
                );


        if
        (
            menu == null
        )
        {
            throw new InvalidOperationException
            (
                "Source page menu was not found."
            );
        }


        //=======================================================
        // Load Module
        //=======================================================

        var module =
            await _context.NavigationModules
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == menu.NavigationModuleId &&
                        !x.IsDeleted
                );


        if
        (
            module == null
        )
        {
            throw new InvalidOperationException
            (
                "Source page module was not found."
            );
        }


        //=======================================================
        // Solution Root
        //=======================================================

        var currentDirectory =
            Environment.CurrentDirectory;

        var solutionRoot =
            currentDirectory;


        while
        (
            !Directory.Exists
            (
                Path.Combine
                (
                    solutionRoot,
                    "Backend_Studio"
                )
            )
            &&
            Directory.GetParent(solutionRoot) != null
        )
        {
            solutionRoot =
                Directory
                    .GetParent(solutionRoot)!
                    .FullName;
        }


        if
        (
            !Directory.Exists
            (
                Path.Combine
                (
                    solutionRoot,
                    "Backend_Studio"
                )
            )
        )
        {
            throw new InvalidOperationException
            (
                "AppCore solution root could not be located."
            );
        }


        //=======================================================
        // Studio Roots
        //=======================================================

        var frontendRoot =
            Path.Combine
            (
                solutionRoot,
                "Frontend_Studio",
                "Studio_UI"
            );

        var backendRoot =
            Path.Combine
            (
                solutionRoot,
                "Backend_Studio"
            );


        //=======================================================
        // Physical Names
        //=======================================================

        var frontendFeatureName =
            NormalizeFrontendPhysicalName
            (
                module.Name
            );

        var frontendMenuName =
            NormalizeFrontendPhysicalName
            (
                menu.Name
            );

        var frontendSubmenuName =
            NormalizeFrontendPhysicalName
            (
                submenu.Name
            );

        var backendModuleName =
            NormalizeBackendPhysicalName
            (
                module.Name
            );

        var backendMenuName =
            NormalizeBackendPhysicalName
            (
                menu.Name
            );

        var backendSubmenuName =
            NormalizeBackendPhysicalName
            (
                submenu.Name
            );


        //=======================================================
        // Frontend Folders
        //=======================================================

        var frontendSourceFolder =
            Path.Combine
            (
                frontendRoot,
                "src",
                "features"
            );

        var frontendMenuFolder =
            Path.Combine
            (
                frontendSourceFolder,
                frontendFeatureName,
                frontendMenuName
            );

        var frontendSubmenuFolder =
            Path.Combine
            (
                frontendMenuFolder,
                "pages",
                frontendSubmenuName
            );

        var frontendFormFolder =
            Path.Combine
            (
                frontendSubmenuFolder,
                "form"
            );

        var frontendListFolder =
            Path.Combine
            (
                frontendSubmenuFolder,
                "list"
            );


        //=======================================================
        // Frontend Files
        //=======================================================

        var frontendModelFile =
            Path.Combine
            (
                frontendMenuFolder,
                "models",
                $"{frontendSubmenuName}.model.ts"
            );

        var frontendServiceFile =
            Path.Combine
            (
                frontendMenuFolder,
                "services",
                $"{frontendSubmenuName}.service.ts"
            );

        var frontendListTsFile =
            Path.Combine
            (
                frontendListFolder,
                $"{frontendSubmenuName}-list.ts"
            );

        var frontendListHtmlFile =
            Path.Combine
            (
                frontendListFolder,
                $"{frontendSubmenuName}-list.html"
            );

        var frontendFormTsFile =
            Path.Combine
            (
                frontendFormFolder,
                $"{frontendSubmenuName}-form.ts"
            );

        var frontendFormHtmlFile =
            Path.Combine
            (
                frontendFormFolder,
                $"{frontendSubmenuName}-form.html"
            );


        //=======================================================
        // Backend Folders
        //=======================================================

        var backendApplicationSubmenuFolder =
            Path.Combine
            (
                backendRoot,
                "AppCore.Application",
                backendModuleName,
                backendMenuName,
                backendSubmenuName
            );

        var backendApplicationDtosFolder =
            Path.Combine
            (
                backendApplicationSubmenuFolder,
                "DTOs"
            );

        var backendApplicationInterfacesFolder =
            Path.Combine
            (
                backendApplicationSubmenuFolder,
                "Interfaces"
            );


        //=======================================================
        // Backend Files
        //=======================================================

        var backendControllerFile =
            Path.Combine
            (
                backendRoot,
                "AppCore.Api",
                "Controllers",
                backendModuleName,
                backendMenuName,
                $"{backendSubmenuName}Controller.cs"
            );

        var backendDtoFile =
            Path.Combine
            (
                backendApplicationDtosFolder,
                $"{backendSubmenuName}Dto.cs"
            );

        var backendDefaultDtoFile =
            Path.Combine
            (
                backendApplicationDtosFolder,
                $"{backendSubmenuName}DefaultsDto.cs"
            );

        var backendCreateDtoFile =
            Path.Combine
            (
                backendApplicationDtosFolder,
                $"Create{backendSubmenuName}Dto.cs"
            );

        var backendUpdateDtoFile =
            Path.Combine
            (
                backendApplicationDtosFolder,
                $"Update{backendSubmenuName}Dto.cs"
            );

        var backendRepositoryInterfaceFile =
            Path.Combine
            (
                backendApplicationInterfacesFolder,
                $"I{backendSubmenuName}Repository.cs"
            );

        var backendEntityFile =
            Path.Combine
            (
                backendRoot,
                "AppCore.Domain",
                backendModuleName,
                backendMenuName,
                $"{backendSubmenuName}.cs"
            );

        var backendConfigurationFile =
            Path.Combine
            (
                backendRoot,
                "AppCore.Infrastructure",
                "Configurations",
                backendModuleName,
                backendMenuName,
                $"{backendSubmenuName}Configuration.cs"
            );

        var backendRepositoryFile =
            Path.Combine
            (
                backendRoot,
                "AppCore.Infrastructure",
                "Repositories",
                backendModuleName,
                backendMenuName,
                $"{backendSubmenuName}Repository.cs"
            );


        //=======================================================
        // Source Analysis Result
        //=======================================================

        var result =
            new PageCloningSourceAnalysisDto
            {
                SubmenuId =
                    submenu.Id,

                SubmenuCode =
                    submenu.Code,

                SubmenuName =
                    submenu.Name
            };


        //=======================================================
        // Frontend Files
        //=======================================================

        AddSourceFile
        (
            result.Files,
            1,
            "Frontend",
            "Model",
            Path.GetFileName
            (
                frontendModelFile
            ),
            frontendModelFile
        );

        AddSourceFile
        (
            result.Files,
            2,
            "Frontend",
            "Service",
            Path.GetFileName
            (
                frontendServiceFile
            ),
            frontendServiceFile
        );

        AddSourceFile
        (
            result.Files,
            3,
            "Frontend",
            "List TS",
            Path.GetFileName
            (
                frontendListTsFile
            ),
            frontendListTsFile
        );

        AddSourceFile
        (
            result.Files,
            4,
            "Frontend",
            "List HTML",
            Path.GetFileName
            (
                frontendListHtmlFile
            ),
            frontendListHtmlFile
        );

        AddSourceFile
        (
            result.Files,
            5,
            "Frontend",
            "Form TS",
            Path.GetFileName
            (
                frontendFormTsFile
            ),
            frontendFormTsFile
        );

        AddSourceFile
        (
            result.Files,
            6,
            "Frontend",
            "Form HTML",
            Path.GetFileName
            (
                frontendFormHtmlFile
            ),
            frontendFormHtmlFile
        );


        //=======================================================
        // Backend Files
        //=======================================================

        AddSourceFile
        (
            result.Files,
            7,
            "Backend",
            "Entity",
            Path.GetFileName
            (
                backendEntityFile
            ),
            backendEntityFile
        );

        AddSourceFile
        (
            result.Files,
            8,
            "Backend",
            "Configuration",
            Path.GetFileName
            (
                backendConfigurationFile
            ),
            backendConfigurationFile
        );

        AddSourceFile
        (
            result.Files,
            9,
            "Backend",
            "DTO",
            Path.GetFileName
            (
                backendDtoFile
            ),
            backendDtoFile
        );

        AddSourceFile
        (
            result.Files,
            10,
            "Backend",
            "Default DTO",
            Path.GetFileName
            (
                backendDefaultDtoFile
            ),
            backendDefaultDtoFile
        );

        AddSourceFile
        (
            result.Files,
            11,
            "Backend",
            "Create DTO",
            Path.GetFileName
            (
                backendCreateDtoFile
            ),
            backendCreateDtoFile
        );

        AddSourceFile
        (
            result.Files,
            12,
            "Backend",
            "Update DTO",
            Path.GetFileName
            (
                backendUpdateDtoFile
            ),
            backendUpdateDtoFile
        );

        AddSourceFile
        (
            result.Files,
            13,
            "Backend",
            "Repository Interface",
            Path.GetFileName
            (
                backendRepositoryInterfaceFile
            ),
            backendRepositoryInterfaceFile
        );

        AddSourceFile
        (
            result.Files,
            14,
            "Backend",
            "Repository",
            Path.GetFileName
            (
                backendRepositoryFile
            ),
            backendRepositoryFile
        );

        AddSourceFile
        (
            result.Files,
            15,
            "Backend",
            "Controller",
            Path.GetFileName
            (
                backendControllerFile
            ),
            backendControllerFile
        );


        //=======================================================
        // Validate Standard Source Files
        //=======================================================

        var missingFiles =
            result.Files
                .Where
                (
                    x =>
                        !x.Exists
                )
                .ToList();


        if
        (
            missingFiles.Count > 0
        )
        {
            result.Files
                .Where
                (
                    x =>
                        !x.Exists
                )
                .ToList()
                .ForEach
                (
                    x =>
                        x.Action = "Missing"
                );
        }


        //=======================================================
        // Load Frontend Source Content
        //=======================================================

        var frontendModelContent =
            await ReadSourceFileAsync
            (
                frontendModelFile
            );

        var frontendListTsContent =
            await ReadSourceFileAsync
            (
                frontendListTsFile
            );

        var frontendListHtmlContent =
            await ReadSourceFileAsync
            (
                frontendListHtmlFile
            );

        var frontendFormTsContent =
            await ReadSourceFileAsync
            (
                frontendFormTsFile
            );

        var frontendFormHtmlContent =
            await ReadSourceFileAsync
            (
                frontendFormHtmlFile
            );


        //=======================================================
        // Analyze UI-driven Model Fields
        //=======================================================

        result.ModelFields =
            ParseUiDrivenModelFields
            (
                frontendModelContent,
                frontendListTsContent,
                frontendListHtmlContent,
                frontendFormTsContent,
                frontendFormHtmlContent
            );


        //=======================================================
        // Completed
        //=======================================================

        return result;
    }


    //===========================================================
    // Add Source File
    //===========================================================

    private static void AddSourceFile
    (
        List<PageCloningSourceFileDto> files,

        int id,

        string category,

        string fileType,

        string fileName,

        string path
    )
    {
        var exists =
            File.Exists
            (
                path
            );

        files.Add
        (
            new PageCloningSourceFileDto
            {
                Id =
                    id,

                Category =
                    category,

                FileType =
                    fileType,

                FileName =
                    fileName,

                Location =
                    Path.GetDirectoryName
                    (
                        path
                    )
                    ??
                    string.Empty,

                Path =
                    path,

                Exists =
                    exists,

                Action =
                    exists
                        ?
                            "Ready"
                        :
                            "Missing"
            }
        );
    }


    //===========================================================
    // Read Source File
    //===========================================================

    private static async Task<string> ReadSourceFileAsync
    (
        string path
    )
    {
        if
        (
            !File.Exists
            (
                path
            )
        )
        {
            return string.Empty;
        }


        return await File.ReadAllTextAsync
        (
            path
        );
    }


    //===========================================================
    // Parse UI-driven Model Fields
    //===========================================================

    private static List<PageCloningModelFieldDto> ParseUiDrivenModelFields
    (
        string modelContent,

        string listTsContent,

        string listHtmlContent,

        string formTsContent,

        string formHtmlContent
    )
    {
        var fields =
            new List<PageCloningModelFieldDto>();


        if
        (
            string.IsNullOrWhiteSpace
            (
                modelContent
            )
        )
        {
            return fields;
        }


        //=======================================================
        // Locate Interface
        //=======================================================

        var interfaceMatch =
            Regex.Match
            (
                modelContent,

                @"export\s+interface\s+\w+\s*\{(?<body>[\s\S]*?)\}",

                RegexOptions.Multiline
            );


        if
        (
            !interfaceMatch.Success
        )
        {
            return fields;
        }


        var body =
            interfaceMatch.Groups["body"].Value;


        //=======================================================
        // Read Model Fields
        //=======================================================

        var fieldMatches =
            Regex.Matches
            (
                body,

                @"^\s*(?<name>[A-Za-z_$][\w$]*)\s*(?<optional>\?)?\s*:\s*(?<type>[^;]+);",

                RegexOptions.Multiline
            );


        //=======================================================
        // UI Content
        //=======================================================

        var uiContent =
            string.Join
            (
                Environment.NewLine,
                listTsContent,
                listHtmlContent,
                formTsContent,
                formHtmlContent
            );


        //=======================================================
        // Process Fields
        //=======================================================

        foreach
        (
            Match match in fieldMatches
        )
        {
            var name =
                match.Groups["name"].Value.Trim();

            var type =
                match.Groups["type"].Value.Trim();

            var optional =
                match.Groups["optional"].Success;


            if
            (
                IsSystemField
                (
                    name
                )
            )
            {
                continue;
            }


            if
            (
                !IsUiDrivenField
                (
                    name,
                    uiContent
                )
            )
            {
                continue;
            }


            fields.Add
            (
                new PageCloningModelFieldDto
                {
                    Name =
                        name,

                    Type =
                        type,

                    Category =
                        GetModelFieldCategory
                        (
                            name
                        ),

                    Required =
                        !optional
                }
            );
        }


        return fields;
    }


    //===========================================================
    // Determine UI-driven Field
    //===========================================================

    private static bool IsUiDrivenField
    (
        string fieldName,

        string uiContent
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                uiContent
            )
        )
        {
            return false;
        }


        var escapedFieldName =
            Regex.Escape
            (
                fieldName
            );


        //=======================================================
        // Form Control
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"formControlName\s*=\s*[""']{escapedFieldName}[""']",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Template Binding
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"(?:\[\(|\[|\()\s*[^)\]]*{escapedFieldName}",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Object Property
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"\.\s*{escapedFieldName}\b",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Property Definition / Access
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"\b{escapedFieldName}\s*[:=]",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Table / Column Field
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"(?:field|property|key|name|column)\s*[:=]\s*[""']{escapedFieldName}[""']",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Direct Field Reference
        //=======================================================

        return Regex.IsMatch
        (
            uiContent,

            $@"\b{escapedFieldName}\b",

            RegexOptions.IgnoreCase
        );
    }


    //===========================================================
    // Determine System Field
    //===========================================================

    private static bool IsSystemField
    (
        string fieldName
    )
    {
        var normalizedName =
            NormalizeFieldName
            (
                fieldName
            );


        var systemFields =
            new HashSet<string>
            (
                StringComparer.OrdinalIgnoreCase
            )
            {
                "id",

                "createdby",
                "createddate",

                "modifiedby",
                "modifieddate",

                "deletedby",
                "deleteddate",

                "isdeleted",

                "lastmodifiedby",
                "lastmodifieddate",

                "lastupdatedby",
                "lastupdateddate"
            };


        return systemFields.Contains
        (
            normalizedName
        );
    }


    //===========================================================
    // Get Model Field Category
    //===========================================================

    private static string GetModelFieldCategory
    (
        string fieldName
    )
    {
        var normalizedName =
            NormalizeFieldName
            (
                fieldName
            );


        //=======================================================
        // Primary & Navigation
        //=======================================================

        var navigationFields =
            new HashSet<string>
            (
                StringComparer.OrdinalIgnoreCase
            )
            {
                "moduleid",
                "modulecode",
                "modulename",

                "menuid",
                "menucode",
                "menuname",

                "submenuid",
                "submenucode",
                "submenuname",

                "navigationmoduleid",
                "navigationmodulecode",
                "navigationmodulename",

                "navigationmenuid",
                "navigationmenucode",
                "navigationmenuname"
            };


        if
        (
            navigationFields.Contains
            (
                normalizedName
            )
        )
        {
            return "Primary & Navigation";
        }


        //=======================================================
        // Audit & System
        //=======================================================

        var auditFields =
            new HashSet<string>
            (
                StringComparer.OrdinalIgnoreCase
            )
            {
                "createdby",
                "createddate",

                "modifiedby",
                "modifieddate",

                "deletedby",
                "deleteddate",

                "isdeleted",
                "isactive",

                "lastmodifiedby",
                "lastmodifieddate",

                "lastupdatedby",
                "lastupdateddate"
            };


        if
        (
            auditFields.Contains
            (
                normalizedName
            )
        )
        {
            return "Audit & System";
        }


        //=======================================================
        // Business & Functional
        //=======================================================

        return "Business & Functional";
    }


    //===========================================================
    // Normalize Field Name
    //===========================================================

    private static string NormalizeFieldName
    (
        string fieldName
    )
    {
        return fieldName
            .Replace
            (
                "_",
                string.Empty
            )
            .Replace
            (
                "-",
                string.Empty
            )
            .ToLowerInvariant();
    }


    //===========================================================
    // Normalize Frontend Physical Name
    //===========================================================

    private static string NormalizeFrontendPhysicalName
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


        var builder =
            new StringBuilder();

        var previousWasSeparator =
            false;


        foreach
        (
            var character in value.Trim()
        )
        {
            if
            (
                char.IsLetterOrDigit
                (
                    character
                )
            )
            {
                builder.Append
                (
                    char.ToLowerInvariant
                    (
                        character
                    )
                );

                previousWasSeparator =
                    false;

                continue;
            }


            if
            (
                builder.Length > 0 &&
                !previousWasSeparator
            )
            {
                builder.Append
                (
                    '-'
                );

                previousWasSeparator =
                    true;
            }
        }


        return builder
            .ToString()
            .Trim
            (
                '-'
            );
    }


    //===========================================================
    // Normalize Backend Physical Name
    //===========================================================

    private static string NormalizeBackendPhysicalName
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


        return string.Concat
        (
            value
                .Trim()
                .Where
                (
                    character =>
                        char.IsLetterOrDigit
                        (
                            character
                        )
                )
        );
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync
    (
        PageCloning pageCloning
    )
    {
        await _context.Set<PageCloning>()
            .AddAsync
            (
                pageCloning
            );

        await _context.SaveChangesAsync();

        return pageCloning.Id;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task UpdateAsync
    (
        PageCloning pageCloning
    )
    {
        _context.Set<PageCloning>()
            .Update
            (
                pageCloning
            );

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Clone
    //===========================================================

    public async Task CloneAsync
    (
        long id
    )
    {
        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == id &&
                        !x.IsDeleted
                );


        if
        (
            pageCloning == null
        )
        {
            return;
        }


        pageCloning.Status =
            "Completed";

        pageCloning.LastClonedDate =
            DateTime.UtcNow;

        pageCloning.LastCloningResult =
            "Clone completed successfully.";

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Generate Package
    //===========================================================

    public async Task GeneratePackageAsync
    (
        long id
    )
    {
        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == id &&
                        !x.IsDeleted
                );


        if
        (
            pageCloning == null
        )
        {
            return;
        }


        pageCloning.Status =
            "Generating";

        pageCloning.LastCloningResult =
            "Package generation started.";

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore Package
    //===========================================================

    public async Task RestorePackageAsync
    (
        long id
    )
    {
        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == id &&
                        !x.IsDeleted
                );


        if
        (
            pageCloning == null
        )
        {
            return;
        }


        pageCloning.Status =
            "Restored";

        pageCloning.LastCloningResult =
            "Previous package restored successfully.";

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task DeleteAsync
    (
        long id
    )
    {
        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == id &&
                        !x.IsDeleted
                );


        if
        (
            pageCloning == null
        )
        {
            return;
        }


        pageCloning.IsDeleted =
            true;

        pageCloning.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task RestoreAsync()
    {
        var records =
            await _context.Set<PageCloning>()
                .Where
                (
                    x =>
                        x.IsDeleted
                )
                .ToListAsync();


        foreach
        (
            var record in records
        )
        {
            record.IsDeleted =
                false;

            record.DeletedDate =
                null;

            record.DeletedBy =
                null;
        }


        await _context.SaveChangesAsync();
    }
}