//===============================================================
// Namespaces
//===============================================================

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



    //===========================================================
    // Constructor
    //===========================================================

    public FrontendCodeSynchronizationEngine
    (
        ITemplateLoader templateLoader,

        IPlaceholderEngine placeholderEngine
    )
    {
        _templateLoader =
            templateLoader;


        _placeholderEngine =
            placeholderEngine;
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


            if
            (
                string.IsNullOrWhiteSpace(
                    synchronization.FrontendSubmenuFolder
                )
            )
            {
                return Failure(
                    "Frontend submenu folder is not configured."
                );
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    synchronization.FrontendMenuRouteFile
                )
            )
            {
                return Failure(
                    "Frontend menu route file is not configured."
                );
            }


            //===================================================
            // Model
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Model/model.ts.tpl",

                synchronization.FrontendSubmenuModelFile,

                synchronization
            );


            //===================================================
            // Service
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Service/service.ts.tpl",

                synchronization.FrontendSubmenuServiceFile,

                synchronization
            );


            //===================================================
            // Route
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Route/route.ts.tpl",

                synchronization.FrontendSubmenuRouteFile,

                synchronization
            );


            //===================================================
            // Form TypeScript
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Page/Form/form.ts.tpl",

                synchronization.FrontendSubmenuFormTsFile,

                synchronization
            );


            //===================================================
            // Form HTML
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Page/Form/form.html.tpl",

                synchronization.FrontendSubmenuFormHtmlFile,

                synchronization
            );


            //===================================================
            // Form CSS
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Page/Form/form.css.tpl",

                synchronization.FrontendSubmenuFormCssFile,

                synchronization
            );


            //===================================================
            // List TypeScript
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Page/List/list.ts.tpl",

                synchronization.FrontendSubmenuListTsFile,

                synchronization
            );


            //===================================================
            // List HTML
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Page/List/list.html.tpl",

                synchronization.FrontendSubmenuListHtmlFile,

                synchronization
            );


            //===================================================
            // List CSS
            //===================================================

            await WriteTemplateAsync(
                "Frontend/Page/List/list.css.tpl",

                synchronization.FrontendSubmenuListCssFile,

                synchronization
            );


            //===================================================
            // Register Submenu Route
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
    // Rollback does not delete generated files or folders.
    //
    // It:
    //
    // 1. Clears the nine existing submenu files.
    //
    // 2. Removes the submenu route registration block from
    //    the existing menu route file.
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
            // Remove Submenu Route Registration
            //===================================================

            await RemoveSubmenuRouteRegistrationAsync(
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
    // Register Submenu Route
    //===========================================================

    private async Task RegisterSubmenuRouteAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Menu Route
        //=======================================================

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


        //=======================================================
        // Load Menu Route
        //=======================================================

        var content =
            await File.ReadAllTextAsync(
                menuRouteFile
            );


        //=======================================================
        // Build Registration
        //=======================================================

        var registration =
            await BuildSubmenuRouteRegistrationAsync(
                synchronization,

                menuRouteFile
            );


        //=======================================================
        // Remove Existing Registration
        //=======================================================

        content =
            RemoveSubmenuRegistrationBlock(
                content,

                synchronization.SubmenuCode
            );


        //=======================================================
        // Register Into Placeholder
        //=======================================================

        const string placeholder =
            "// SUBMENU ROUTE PLACEHOLDER";


        if
        (
            content.Contains(
                placeholder,
                StringComparison.Ordinal
            )
        )
        {
            content =
                content.Replace(
                    placeholder,

                    registration.TrimEnd(),

                    StringComparison.Ordinal
                );
        }
        else
        {
            //===================================================
            // Existing Registrations
            //
            // Insert before the children array closing bracket.
            //===================================================

            var childrenStart =
                content.IndexOf(
                    "children:",
                    StringComparison.Ordinal
                );


            if
            (
                childrenStart < 0
            )
            {
                throw new InvalidOperationException(
                    "The frontend menu route file does not contain a children route collection."
                );
            }


            var openingBracket =
                content.IndexOf(
                    '[',

                    childrenStart
                );


            if
            (
                openingBracket < 0
            )
            {
                throw new InvalidOperationException(
                    "The frontend menu route children collection could not be located."
                );
            }


            var closingBracket =
                FindChildrenClosingBracket(
                    content,

                    openingBracket
                );


            if
            (
                closingBracket < 0
            )
            {
                throw new InvalidOperationException(
                    "The frontend menu route children collection could not be closed."
                );
            }


            var before =
                content[..closingBracket]
                    .TrimEnd();


            var after =
                content[closingBracket..];


            content =
                before
                +
                Environment.NewLine
                +
                Environment.NewLine
                +
                registration.Trim()
                +
                Environment.NewLine
                +
                Environment.NewLine
                +
                after.TrimStart();
        }


        //=======================================================
        // Write Menu Route
        //=======================================================

        await File.WriteAllTextAsync(
            menuRouteFile,

            content
        );
    }



    //===========================================================
    // Find Children Closing Bracket
    //===========================================================

    private static int
        FindChildrenClosingBracket
    (
        string content,

        int openingBracket
    )
    {
        var depth =
            0;


        var insideSingleQuote =
            false;


        var insideDoubleQuote =
            false;


        var insideTemplateLiteral =
            false;


        var escaped =
            false;


        for
        (
            var index = openingBracket;

            index < content.Length;

            index++
        )
        {
            var character =
                content[index];


            if
            (
                escaped
            )
            {
                escaped =
                    false;

                continue;
            }


            if
            (
                character == '\\'
                &&
                (
                    insideSingleQuote
                    ||
                    insideDoubleQuote
                    ||
                    insideTemplateLiteral
                )
            )
            {
                escaped =
                    true;

                continue;
            }


            if
            (
                character == '\''
                &&
                !insideDoubleQuote
                &&
                !insideTemplateLiteral
            )
            {
                insideSingleQuote =
                    !insideSingleQuote;

                continue;
            }


            if
            (
                character == '"'
                &&
                !insideSingleQuote
                &&
                !insideTemplateLiteral
            )
            {
                insideDoubleQuote =
                    !insideDoubleQuote;

                continue;
            }


            if
            (
                character == '`'
                &&
                !insideSingleQuote
                &&
                !insideDoubleQuote
            )
            {
                insideTemplateLiteral =
                    !insideTemplateLiteral;

                continue;
            }


            if
            (
                insideSingleQuote
                ||
                insideDoubleQuote
                ||
                insideTemplateLiteral
            )
            {
                continue;
            }


            if
            (
                character == '['
            )
            {
                depth++;
            }
            else if
            (
                character == ']'
            )
            {
                depth--;


                if
                (
                    depth == 0
                )
                {
                    return index;
                }
            }
        }


        return -1;
    }



    //===========================================================
    // Build Submenu Route Registration
    //===========================================================

    private async Task<string>
        BuildSubmenuRouteRegistrationAsync
    (
        SubmenuSynchronizationDto synchronization,

        string menuRouteFile
    )
    {
        //=======================================================
        // Load Template
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

        var submenuRouteImport =
            BuildRelativeRouteImport(
                menuRouteFile,

                synchronization.FrontendSubmenuRouteFile
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


        return content;
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


        var content =
            await File.ReadAllTextAsync(
                menuRouteFile
            );


        content =
            RemoveSubmenuRegistrationBlock(
                content,

                synchronization.SubmenuCode
            );


        await File.WriteAllTextAsync(
            menuRouteFile,

            content
        );
    }



    //===========================================================
    // Remove Registration Block
    //===========================================================

    private static string
        RemoveSubmenuRegistrationBlock
    (
        string content,

        string submenuCode
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            return content;
        }


        var beginMarker =
            $"// AUTO-BEGIN : {submenuCode.Trim()}";


        var endMarker =
            $"// AUTO-END : {submenuCode.Trim()}";


        var startIndex =
            content.IndexOf(
                beginMarker,

                StringComparison.Ordinal
            );


        if
        (
            startIndex < 0
        )
        {
            return content;
        }


        var endIndex =
            content.IndexOf(
                endMarker,

                startIndex,

                StringComparison.Ordinal
            );


        if
        (
            endIndex < 0
        )
        {
            throw new InvalidOperationException(
                $"Submenu route registration end marker was not found for '{submenuCode}'."
            );
        }


        var removeEnd =
            endIndex
            +
            endMarker.Length;


        while
        (
            removeEnd < content.Length
            &&
            (
                content[removeEnd] == '\r'
                ||
                content[removeEnd] == '\n'
            )
        )
        {
            removeEnd++;
        }


        return
            content.Remove(
                startIndex,

                removeEnd - startIndex
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
    // Clear File
    //===========================================================

    private static async Task ClearFileAsync
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
        // Clear Existing File
        //=======================================================

        await File.WriteAllTextAsync(
            filePath,

            string.Empty
        );
    }



    //===========================================================
    // Write Template
    //===========================================================

    private async Task WriteTemplateAsync
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
        // Target Must Already Exist
        //=======================================================

        if
        (
            !File.Exists(
                targetFile
            )
        )
        {
            throw new FileNotFoundException(
                $"Frontend target file was not found: {targetFile}"
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
        // Apply Replacements
        //=======================================================

        content =
            _placeholderEngine.Replace(
                content,

                replacements
            );


        //=======================================================
        // Write Code Into Existing File
        //=======================================================

        await File.WriteAllTextAsync(
            targetFile,

            content
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