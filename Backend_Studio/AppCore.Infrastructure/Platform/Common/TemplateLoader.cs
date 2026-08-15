//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Threading.Tasks;

using AppCore.Application.Platform.CommonInterfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Common;


//===============================================================
// Template Loader
//===============================================================

public class TemplateLoader
    : ITemplateLoader
{

    //===========================================================
    // Load Template
    //===========================================================

    public async Task<string> LoadTemplateAsync
    (
        string templatePath
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                templatePath
            )
        )
        {
            throw new FileNotFoundException(
                "Template path is empty."
            );
        }



        //=======================================================
        // Normalize Template Path
        //=======================================================

        templatePath =
            templatePath
                .Trim()
                .Replace(
                    '/',
                    Path.DirectorySeparatorChar
                )
                .Replace(
                    '\\',
                    Path.DirectorySeparatorChar
                );


        var templatesPrefix =
            "Templates"
            +
            Path.DirectorySeparatorChar;


        if
        (
            templatePath.StartsWith(
                templatesPrefix,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            templatePath =
                templatePath.Substring(
                    templatesPrefix.Length
                );
        }



        //=======================================================
        // Resolve Infrastructure Root
        //=======================================================

        var infrastructureRoot =
            FindInfrastructureRoot();



        //=======================================================
        // Resolve Template
        //=======================================================

        var fullPath =
            FindTemplatePath(
                infrastructureRoot,
                templatePath
            );



        //=======================================================
        // Template Not Found
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                fullPath
            )
            ||
            !File.Exists(
                fullPath
            )
        )
        {
            throw new FileNotFoundException(
                $"Template not found: {templatePath}"
            );
        }



        //=======================================================
        // Load Template
        //=======================================================

        var template =
            await File.ReadAllTextAsync(
                fullPath
            );



        //=======================================================
        // Validate Template
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                template
            )
        )
        {
            throw new InvalidDataException(
                $"Template is empty: {fullPath}"
            );
        }



        //=======================================================
        // Completed
        //=======================================================

        return template;
    }



    //===========================================================
    // Find Template Path
    //===========================================================

    private static string? FindTemplatePath
    (
        string infrastructureRoot,

        string templatePath
    )
    {
        //=======================================================
        // Candidate 1
        //=======================================================
        //
        // AppCore.Infrastructure
        //     Platform
        //         Templates
        //
        //=======================================================

        var candidate =
            Path.Combine(
                infrastructureRoot,
                "Platform",
                "Templates",
                templatePath
            );


        if
        (
            File.Exists(
                candidate
            )
        )
        {
            return Path.GetFullPath(
                candidate
            );
        }



        //=======================================================
        // Candidate 2
        //=======================================================
        //
        // AppCore.Infrastructure
        //     Templates
        //
        //=======================================================

        candidate =
            Path.Combine(
                infrastructureRoot,
                "Templates",
                templatePath
            );


        if
        (
            File.Exists(
                candidate
            )
        )
        {
            return Path.GetFullPath(
                candidate
            );
        }



        //=======================================================
        // Candidate 3
        //=======================================================
        //
        // Application Base Directory
        //     Platform
        //         Templates
        //
        //=======================================================

        candidate =
            Path.Combine(
                AppContext.BaseDirectory,
                "Platform",
                "Templates",
                templatePath
            );


        if
        (
            File.Exists(
                candidate
            )
        )
        {
            return Path.GetFullPath(
                candidate
            );
        }



        //=======================================================
        // Candidate 4
        //=======================================================
        //
        // Application Base Directory
        //     Templates
        //
        //=======================================================

        candidate =
            Path.Combine(
                AppContext.BaseDirectory,
                "Templates",
                templatePath
            );


        if
        (
            File.Exists(
                candidate
            )
        )
        {
            return Path.GetFullPath(
                candidate
            );
        }



        //=======================================================
        // Template Not Found
        //=======================================================

        return null;
    }



    //===========================================================
    // Find Infrastructure Root
    //===========================================================

    private static string FindInfrastructureRoot()
    {
        //=======================================================
        // Start From Application Base Directory
        //=======================================================

        var currentDirectory =
            new DirectoryInfo(
                AppContext.BaseDirectory
            );



        //=======================================================
        // Search Current Directory And Parents
        //=======================================================

        while
        (
            currentDirectory != null
        )
        {
            //===================================================
            // Current Directory Is Infrastructure
            //===================================================

            if
            (
                currentDirectory.Name
                    .Equals(
                        "AppCore.Infrastructure",
                        StringComparison.OrdinalIgnoreCase
                    )
            )
            {
                return currentDirectory.FullName;
            }



            //===================================================
            // Search Child Infrastructure Directory
            //===================================================

            var infrastructureDirectory =
                Path.Combine(
                    currentDirectory.FullName,
                    "AppCore.Infrastructure"
                );


            if
            (
                Directory.Exists(
                    infrastructureDirectory
                )
            )
            {
                return infrastructureDirectory;
            }



            //===================================================
            // Parent
            //===================================================

            currentDirectory =
                currentDirectory.Parent;
        }



        //=======================================================
        // Fallback
        //=======================================================

        throw new DirectoryNotFoundException(
            "AppCore.Infrastructure project directory could not be found."
        );
    }

}