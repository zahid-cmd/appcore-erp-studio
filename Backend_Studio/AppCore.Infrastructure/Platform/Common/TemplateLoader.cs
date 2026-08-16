//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
            NormalizeTemplatePath(
                templatePath
            );


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
    // Normalize Template Path
    //===========================================================

    private static string NormalizeTemplatePath
    (
        string templatePath
    )
    {
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


        return templatePath;
    }



    //===========================================================
    // Find Template Path
    //===========================================================

    private static string?
        FindTemplatePath
    (
        string infrastructureRoot,

        string templatePath
    )
    {
        //=======================================================
        // Candidate Paths
        //=======================================================

        var candidates =
            new List<string>
            {
                //================================================
                // AppCore.Infrastructure / Platform / Templates
                //================================================

                Path.Combine(
                    infrastructureRoot,
                    "Platform",
                    "Templates",
                    templatePath
                ),


                //================================================
                // AppCore.Infrastructure / Templates
                //================================================

                Path.Combine(
                    infrastructureRoot,
                    "Templates",
                    templatePath
                ),


                //================================================
                // AppCore.Infrastructure / Platform /
                // Synchronization / Templates
                //================================================

                Path.Combine(
                    infrastructureRoot,
                    "Platform",
                    "Synchronization",
                    "Templates",
                    templatePath
                ),


                //================================================
                // AppCore.Infrastructure / Platform /
                // SynchronizationEngine / Templates
                //================================================

                Path.Combine(
                    infrastructureRoot,
                    "Platform",
                    "SynchronizationEngine",
                    "Templates",
                    templatePath
                ),


                //================================================
                // AppCore.Infrastructure / Platform /
                // CodeSynchronization / Templates
                //================================================

                Path.Combine(
                    infrastructureRoot,
                    "Platform",
                    "CodeSynchronization",
                    "Templates",
                    templatePath
                ),


                //================================================
                // Application Base / Platform / Templates
                //================================================

                Path.Combine(
                    AppContext.BaseDirectory,
                    "Platform",
                    "Templates",
                    templatePath
                ),


                //================================================
                // Application Base / Templates
                //================================================

                Path.Combine(
                    AppContext.BaseDirectory,
                    "Templates",
                    templatePath
                ),


                //================================================
                // Current Working Directory / Templates
                //================================================

                Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "Templates",
                    templatePath
                )
            };


        //=======================================================
        // Check Candidate Paths
        //=======================================================

        foreach
        (
            var candidate in candidates
        )
        {
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
        }


        //=======================================================
        // Search Infrastructure Project
        //=======================================================

        var discoveredPath =
            FindTemplateRecursively(
                infrastructureRoot,
                templatePath
            );


        if
        (
            !string.IsNullOrWhiteSpace(
                discoveredPath
            )
        )
        {
            return discoveredPath;
        }


        //=======================================================
        // Template Not Found
        //=======================================================

        return null;
    }



    //===========================================================
    // Find Template Recursively
    //===========================================================

    private static string?
        FindTemplateRecursively
    (
        string rootDirectory,

        string templatePath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                rootDirectory
            )
        )
        {
            return null;
        }


        if
        (
            !Directory.Exists(
                rootDirectory
            )
        )
        {
            return null;
        }


        var expectedFileName =
            Path.GetFileName(
                templatePath
            );


        var expectedDirectory =
            Path.GetDirectoryName(
                templatePath
            )
            ??
            string.Empty;


        try
        {
            var files =
                Directory.EnumerateFiles(
                    rootDirectory,
                    expectedFileName,
                    SearchOption.AllDirectories
                );


            foreach
            (
                var file in files
            )
            {
                var relativePath =
                    Path.GetRelativePath(
                        rootDirectory,
                        file
                    );


                relativePath =
                    NormalizeTemplatePath(
                        relativePath
                    );


                if
                (
                    string.Equals(
                        relativePath,
                        templatePath,
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    return Path.GetFullPath(
                        file
                    );
                }


                //================================================
                // Directory + File Fallback
                //================================================

                var fileDirectory =
                    Path.GetDirectoryName(
                        relativePath
                    )
                    ??
                    string.Empty;


                if
                (
                    string.Equals(
                        fileDirectory,
                        expectedDirectory,
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    return Path.GetFullPath(
                        file
                    );
                }
            }
        }
        catch
        (
            UnauthorizedAccessException
        )
        {
            return null;
        }
        catch
        (
            DirectoryNotFoundException
        )
        {
            return null;
        }


        return null;
    }



    //===========================================================
    // Find Infrastructure Root
    //===========================================================

    private static string
        FindInfrastructureRoot()
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
        // Search From Current Working Directory
        //=======================================================

        currentDirectory =
            new DirectoryInfo(
                Directory.GetCurrentDirectory()
            );


        while
        (
            currentDirectory != null
        )
        {
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