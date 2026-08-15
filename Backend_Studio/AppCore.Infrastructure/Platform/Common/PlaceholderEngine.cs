//===============================================================
// Namespaces
//===============================================================

using System;

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
            throw new ArgumentException
            (
                "Template is empty.",

                nameof(template)
            );
        }


        //=======================================================
        // Validate Replacements
        //=======================================================

        if
        (
            replacements == null
            ||
            replacements.Count == 0
        )
        {
            return template;
        }


        //=======================================================
        // Replace Placeholders
        //=======================================================

        foreach
        (
            var replacement
            in replacements
        )
        {
            var placeholder =
                replacement.Key;


            //===================================================
            // Normalize Placeholder
            //===================================================

            if
            (
                !placeholder.StartsWith
                (
                    "{{",

                    StringComparison.Ordinal
                )
            )
            {
                placeholder =
                    "{{"
                    +
                    placeholder;
            }


            if
            (
                !placeholder.EndsWith
                (
                    "}}",

                    StringComparison.Ordinal
                )
            )
            {
                placeholder +=
                    "}}";
            }


            //===================================================
            // Replace
            //===================================================

            template =
                template.Replace
                (
                    placeholder,

                    replacement.Value
                    ??
                    string.Empty,

                    StringComparison.Ordinal
                );
        }


        //=======================================================
        // Return
        //=======================================================

        return template;
    }

}