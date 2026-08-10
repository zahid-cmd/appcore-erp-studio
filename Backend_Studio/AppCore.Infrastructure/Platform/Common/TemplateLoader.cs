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
            string.IsNullOrWhiteSpace
            (
                templatePath
            )
        )
        {
            throw new FileNotFoundException
            (
                "Template path is empty."
            );
        }


        //=======================================================
        // Resolve Infrastructure Root
        //=======================================================

        var infrastructureRoot =
            FindInfrastructureRoot();


        //=======================================================
        // Resolve Template Path
        //=======================================================

        var fullPath =
            Path.Combine
            (
                infrastructureRoot,

                "Platform",

                templatePath
            );


        fullPath =
            Path.GetFullPath
            (
                fullPath
            );


        //=======================================================
        // File Exists
        //=======================================================

        if
        (
            !File.Exists
            (
                fullPath
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Template not found: {fullPath}"
            );
        }


        //=======================================================
        // Load Template
        //=======================================================

        var template =
            await File.ReadAllTextAsync
            (
                fullPath
            );


        //=======================================================
        // Validate Template
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                template
            )
        )
        {
            throw new InvalidDataException
            (
                $"Template is empty: {fullPath}"
            );
        }


        //=======================================================
        // Completed
        //=======================================================

        return template;
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
            new DirectoryInfo
            (
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
            var infrastructureDirectory =
                Path.Combine
                (
                    currentDirectory.FullName,

                    "AppCore.Infrastructure"
                );


            if
            (
                Directory.Exists
                (
                    infrastructureDirectory
                )
            )
            {
                return infrastructureDirectory;
            }


            currentDirectory =
                currentDirectory.Parent;
        }


        //=======================================================
        // Fallback
        //=======================================================

        throw new DirectoryNotFoundException
        (
            "AppCore.Infrastructure project directory could not be found."
        );
    }

}