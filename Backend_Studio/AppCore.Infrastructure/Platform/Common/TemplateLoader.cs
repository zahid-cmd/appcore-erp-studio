//===============================================================
// Namespaces
//===============================================================

using System.IO;
using System;
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

        if (string.IsNullOrWhiteSpace(templatePath))
        {
            throw new FileNotFoundException(
                "Template path is empty.");
        }

        //=======================================================
        // Resolve Template Path
        //=======================================================

        var fullPath =
            Path.Combine
            (
                AppContext.BaseDirectory,
                "..",
                "..",
                "..",
                "..",
                "AppCore.Infrastructure",
                "Platform",
                templatePath
            );

        fullPath =
            Path.GetFullPath(fullPath);

        //=======================================================
        // File Exists
        //=======================================================

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException
            (
                $"Template not found: {fullPath}"
            );
        }

        //=======================================================
        // Load
        //=======================================================

        var template =
            await File.ReadAllTextAsync
            (
                fullPath
            );

        //=======================================================
        // Validate Template
        //=======================================================

        if (string.IsNullOrWhiteSpace(template))
        {
            throw new InvalidDataException
            (
                $"Template is empty: {fullPath}"
            );
        }

        return template;
    }
}