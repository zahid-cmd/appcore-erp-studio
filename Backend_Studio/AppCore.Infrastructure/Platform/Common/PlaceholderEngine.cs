//===============================================================
// Namespaces
//===============================================================

using System.Collections.Generic;

using AppCore.Application.Platform.CommonInterfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Common;


//===============================================================
// Placeholder Engine
//===============================================================

public class PlaceholderEngine
    : IPlaceholderEngine
{
    //===========================================================
    // Replace Placeholders
    //===========================================================

    public string Replace
    (
        string template,

        Dictionary<string, string> replacements
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if (string.IsNullOrWhiteSpace(template))
        {
            throw new ArgumentException(
                "Template is empty.",
                nameof(template));
        }

        if (replacements == null)
        {
            return template;
        }

        //=======================================================
        // Replace
        //=======================================================

        foreach (var replacement in replacements)
        {
            template =
                template.Replace
                (
                    replacement.Key,
                    replacement.Value ?? string.Empty
                );
        }

        return template;
    }
}