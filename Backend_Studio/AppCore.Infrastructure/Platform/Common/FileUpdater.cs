//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using AppCore.Application.Platform.CommonInterfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Common;

//===============================================================
// File Updater
//===============================================================

public class FileUpdater
    : IFileUpdater
{
    //===========================================================
    // Insert Managed Block
    //===========================================================

    public async Task InsertManagedBlockAsync
    (
        string filePath,

        string collection,

        string content
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                filePath
            )
        )
        {
            throw new ArgumentException
            (
                "File path is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                collection
            )
        )
        {
            throw new ArgumentException
            (
                "Collection is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                content
            )
        )
        {
            throw new ArgumentException
            (
                "Content is required."
            );
        }


        if
        (
            !File.Exists
            (
                filePath
            )
        )
        {
            throw new FileNotFoundException
            (
                $"File not found: {filePath}"
            );
        }


        //=======================================================
        // Read File
        //=======================================================

        var text =
            await File.ReadAllTextAsync
            (
                filePath
            );


        //=======================================================
        // Already Registered
        //=======================================================

        if
        (
            text.Contains
            (
                content,
                StringComparison.Ordinal
            )
        )
        {
            return;
        }


        //=======================================================
        // Find Collection
        //=======================================================

        var collectionIndex =
            text.IndexOf
            (
                collection,
                StringComparison.Ordinal
            );


        if
        (
            collectionIndex < 0
        )
        {
            throw new InvalidOperationException
            (
                $"Collection '{collection}' not found in file: {filePath}"
            );
        }


        //=======================================================
        // Find Opening Bracket
        //=======================================================

        var openBracketIndex =
            text.IndexOf
            (
                '[',
                collectionIndex
            );


        //=======================================================
        // Collection Marker Is Inside Collection
        //=======================================================

        if
        (
            openBracketIndex < 0
        )
        {
            openBracketIndex =
                text.LastIndexOf
                (
                    '[',
                    collectionIndex
                );
        }


        if
        (
            openBracketIndex < 0
        )
        {
            throw new InvalidOperationException
            (
                "Collection opening bracket not found."
            );
        }


        //=======================================================
        // Find Matching Closing Bracket
        //=======================================================

        var depth = 1;

        var insertIndex = -1;


        for
        (
            var i = openBracketIndex + 1;
            i < text.Length;
            i++
        )
        {
            switch
            (
                text[i]
            )
            {
                case '[':

                    depth++;

                    break;


                case ']':

                    depth--;

                    if
                    (
                        depth == 0
                    )
                    {
                        insertIndex = i;
                    }

                    break;
            }


            if
            (
                insertIndex >= 0
            )
            {
                break;
            }
        }


        if
        (
            insertIndex < 0
        )
        {
            throw new InvalidOperationException
            (
                "Collection closing bracket not found."
            );
        }


        //=======================================================
        // Ensure Previous Item Ends With Comma
        //=======================================================

        var scan =
            insertIndex - 1;


        while
        (
            scan >= 0
            &&
            char.IsWhiteSpace
            (
                text[scan]
            )
        )
        {
            scan--;
        }


        if
        (
            scan >= 0
            &&
            text[scan] == '}'
        )
        {
            text =
                text.Insert
                (
                    scan + 1,
                    ","
                );


            insertIndex++;
        }


        //=======================================================
        // Determine Indentation
        //=======================================================

        var lineStart =
            text.LastIndexOf
            (
                Environment.NewLine,
                insertIndex,
                StringComparison.Ordinal
            );


        if
        (
            lineStart < 0
        )
        {
            lineStart = 0;
        }
        else
        {
            lineStart +=
                Environment.NewLine.Length;
        }


        var indentation =
            "";


        while
        (
            lineStart + indentation.Length < text.Length
            &&
            (
                text[lineStart + indentation.Length] == ' '
                ||
                text[lineStart + indentation.Length] == '\t'
            )
        )
        {
            indentation +=
                text[lineStart + indentation.Length];
        }


        indentation +=
            "    ";


        //=======================================================
        // Apply Indentation
        //=======================================================

        var managedBlock =
            string.Join
            (
                Environment.NewLine,

                content
                    .TrimEnd()
                    .Split
                    (
                        new[]
                        {
                            Environment.NewLine
                        },

                        StringSplitOptions.None
                    )
                    .Select
                    (
                        line =>
                            string.IsNullOrWhiteSpace
                            (
                                line
                            )
                                ? ""
                                : indentation + line
                    )
            );


        //=======================================================
        // Find Beginning Of Closing Bracket Line
        //=======================================================

        var insertLineStart =
            text.LastIndexOf
            (
                Environment.NewLine,
                insertIndex,
                StringComparison.Ordinal
            );


        if
        (
            insertLineStart < 0
        )
        {
            insertLineStart = 0;
        }
        else
        {
            insertLineStart +=
                Environment.NewLine.Length;
        }


        //=======================================================
        // Insert Managed Block
        //=======================================================

        text =
            text.Insert
            (
                insertLineStart,

                managedBlock
                +
                Environment.NewLine
                +
                Environment.NewLine
            );


        //=======================================================
        // Save
        //=======================================================

        await File.WriteAllTextAsync
        (
            filePath,

            text
        );
    }
}