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
        // Extract Managed Block Markers
        //=======================================================

        var contentLines =
            SplitLines
            (
                content
            );


        var beginMarker =
            contentLines
                .FirstOrDefault
                (
                    line =>
                        line
                            .Trim()
                            .StartsWith
                            (
                                "// AUTO-BEGIN :",
                                StringComparison.Ordinal
                            )
                );


        var endMarker =
            contentLines
                .FirstOrDefault
                (
                    line =>
                        line
                            .Trim()
                            .StartsWith
                            (
                                "// AUTO-END :",
                                StringComparison.Ordinal
                            )
                );


        if
        (
            string.IsNullOrWhiteSpace
            (
                beginMarker
            )

            ||

            string.IsNullOrWhiteSpace
            (
                endMarker
            )
        )
        {
            throw new InvalidOperationException
            (
                "Managed block must contain AUTO-BEGIN and AUTO-END markers."
            );
        }


        beginMarker =
            beginMarker.Trim();


        endMarker =
            endMarker.Trim();



        //=======================================================
        // Resolve Collection
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
        // Resolve Collection Item Indentation
        //=======================================================

        var collectionIndentation =
            ResolveCollectionItemIndentation
            (
                text,

                collectionIndex,

                collection
            );



        //=======================================================
        // Existing Managed Block
        //=======================================================

        var existingBeginIndex =
            text.IndexOf
            (
                beginMarker,

                StringComparison.Ordinal
            );


        if
        (
            existingBeginIndex >= 0
        )
        {
            var existingEndIndex =
                text.IndexOf
                (
                    endMarker,

                    existingBeginIndex,

                    StringComparison.Ordinal
                );


            if
            (
                existingEndIndex < 0
            )
            {
                throw new InvalidOperationException
                (
                    $"Managed block end marker was not found for '{beginMarker}'."
                );
            }


            var existingEndLineEnd =
                GetLineEnd
                (
                    text,

                    existingEndIndex
                );


            var replacementStart =
                GetLineStart
                (
                    text,

                    existingBeginIndex
                );


            var replacementEnd =
                existingEndLineEnd;



            //===================================================
            // Build Managed Block
            //===================================================

            var normalizedManagedBlock =
                ApplyBaseIndentation
                (
                    content,

                    collectionIndentation
                );



            //===================================================
            // Replace Existing Managed Block
            //===================================================

            text =
                text.Remove
                (
                    replacementStart,

                    replacementEnd -
                    replacementStart
                );


            text =
                text.Insert
                (
                    replacementStart,

                    normalizedManagedBlock +
                    Environment.NewLine
                );


            await File.WriteAllTextAsync
            (
                filePath,

                text
            );


            return;
        }



        //=======================================================
        // Find Collection Opening Bracket
        //=======================================================

        var openBracketIndex =
            FindCollectionOpeningBracket
            (
                text,

                collectionIndex,

                collection
            );


        if
        (
            openBracketIndex < 0
        )
        {
            throw new InvalidOperationException
            (
                $"Collection opening bracket not found for '{collection}'."
            );
        }



        //=======================================================
        // Find Matching Closing Bracket
        //=======================================================

        var depth =
            1;


        var insertIndex =
            -1;


        for
        (
            var i =
                openBracketIndex + 1;

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
                        insertIndex =
                            i;
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
                $"Collection closing bracket not found for '{collection}'."
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
        // Find Beginning Of Closing Bracket Line
        //=======================================================

        var insertLineStart =
            GetLineStart
            (
                text,

                insertIndex
            );



        //=======================================================
        // Build Managed Block
        //=======================================================

        var newManagedBlock =
            ApplyBaseIndentation
            (
                content,

                collectionIndentation
            );



        //=======================================================
        // Insert Managed Block
        //=======================================================

        text =
            text.Insert
            (
                insertLineStart,

                newManagedBlock +
                Environment.NewLine +
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



    //===========================================================
    // Resolve Collection Item Indentation
    //===========================================================

    private static string ResolveCollectionItemIndentation
    (
        string text,

        int collectionIndex,

        string collection
    )
    {
        //=======================================================
        // First Preference:
        // Submenu Placeholder
        //=======================================================

        var placeholderIndex =
            text.IndexOf
            (
                "// SUBMENU ROUTE PLACEHOLDER",

                collectionIndex,

                StringComparison.Ordinal
            );


        if
        (
            placeholderIndex >= 0
        )
        {
            var placeholderLineStart =
                GetLineStart
                (
                    text,

                    placeholderIndex
                );


            return GetLineIndentation
            (
                text,

                placeholderLineStart
            );
        }



        //=======================================================
        // Second Preference:
        // Existing Managed Block
        //=======================================================

        var autoBeginIndex =
            text.IndexOf
            (
                "// AUTO-BEGIN :",

                collectionIndex,

                StringComparison.Ordinal
            );


        if
        (
            autoBeginIndex >= 0
        )
        {
            var autoBeginLineStart =
                GetLineStart
                (
                    text,

                    autoBeginIndex
                );


            return GetLineIndentation
            (
                text,

                autoBeginLineStart
            );
        }



        //=======================================================
        // Third Preference:
        // Module Routes
        //
        // Module Routes uses the top-level Routes array.
        //
        // Example:
        //
        // export const accountsFiananceRoutes:
        //     Routes =
        // [
        //     // Module Routes
        //     ...
        // ]
        //
        // The collection item indentation is therefore taken
        // from the first route object after the Module Routes
        // section.
        //=======================================================

        if
        (
            string.Equals
            (
                collection,

                "Module Routes",

                StringComparison.Ordinal
            )
        )
        {
            var moduleRouteObjectIndex =
                text.IndexOf
                (
                    "{",

                    collectionIndex
                );


            if
            (
                moduleRouteObjectIndex >= 0
            )
            {
                var moduleRouteObjectLineStart =
                    GetLineStart
                    (
                        text,

                        moduleRouteObjectIndex
                    );


                return GetLineIndentation
                (
                    text,

                    moduleRouteObjectLineStart
                );
            }



            //===================================================
            // Module Route Object Does Not Exist
            //===================================================

            var moduleArrayIndex =
                FindModuleRoutesOpeningBracket
                (
                    text,

                    collectionIndex
                );


            if
            (
                moduleArrayIndex >= 0
            )
            {
                var arrayLineStart =
                    GetLineStart
                    (
                        text,

                        moduleArrayIndex
                    );


                var arrayIndentation =
                    GetLineIndentation
                    (
                        text,

                        arrayLineStart
                    );


                return arrayIndentation +
                       "    ";
            }
        }



        //=======================================================
        // Fourth Preference:
        // Find children Collection
        //=======================================================

        var childrenIndex =
            FindChildrenIndex
            (
                text,

                collectionIndex
            );


        if
        (
            childrenIndex >= 0
        )
        {
            var childrenLineStart =
                GetLineStart
                (
                    text,

                    childrenIndex
                );


            var childrenIndentation =
                GetLineIndentation
                (
                    text,

                    childrenLineStart
                );


            return childrenIndentation +
                   "    ";
        }



        //=======================================================
        // Fifth Preference:
        // Find First Route Object
        //=======================================================

        var openingBraceIndex =
            FindNextToken
            (
                text,

                collectionIndex,

                '{'
            );


        if
        (
            openingBraceIndex >= 0
        )
        {
            var braceLineStart =
                GetLineStart
                (
                    text,

                    openingBraceIndex
                );


            return GetLineIndentation
            (
                text,

                braceLineStart
            );
        }



        //=======================================================
        // Fallback
        //=======================================================

        var collectionLineStart =
            GetLineStart
            (
                text,

                collectionIndex
            );


        var collectionIndentation =
            GetLineIndentation
            (
                text,

                collectionLineStart
            );


        return collectionIndentation +
               "    ";
    }



    //===========================================================
    // Find Collection Opening Bracket
    //===========================================================

    private static int FindCollectionOpeningBracket
    (
        string text,

        int collectionIndex,

        string collection
    )
    {
        //=======================================================
        // Module Routes
        //
        // Module Routes is a comment INSIDE the top-level
        // Routes array.
        //
        // Therefore the opening '[' must be searched BEFORE
        // the collection comment.
        //=======================================================

        if
        (
            string.Equals
            (
                collection,

                "Module Routes",

                StringComparison.Ordinal
            )
        )
        {
            return FindModuleRoutesOpeningBracket
            (
                text,

                collectionIndex
            );
        }



        //=======================================================
        // Menu Routes
        //
        // Menu Routes is followed by children: [
        //=======================================================

        var childrenIndex =
            FindChildrenIndex
            (
                text,

                collectionIndex
            );


        if
        (
            childrenIndex >= 0
        )
        {
            var childrenBracketIndex =
                text.IndexOf
                (
                    '[',

                    childrenIndex
                );


            if
            (
                childrenBracketIndex >= 0
            )
            {
                return childrenBracketIndex;
            }
        }



        //=======================================================
        // Generic Direct Route Array
        //=======================================================

        var directBracketIndex =
            text.IndexOf
            (
                '[',

                collectionIndex
            );


        if
        (
            directBracketIndex >= 0
        )
        {
            return directBracketIndex;
        }



        //=======================================================
        // Collection Not Found
        //=======================================================

        return -1;
    }



    //===========================================================
    // Find Module Routes Opening Bracket
    //===========================================================

    private static int FindModuleRoutesOpeningBracket
    (
        string text,

        int collectionIndex
    )
    {
        //=======================================================
        // Find Routes Declaration Before Module Routes Comment
        //=======================================================

        var routesIndex =
            text.LastIndexOf
            (
                "Routes",

                collectionIndex,

                StringComparison.Ordinal
            );


        if
        (
            routesIndex < 0
        )
        {
            return -1;
        }



        //=======================================================
        // Find Equals Sign
        //=======================================================

        var equalsIndex =
            text.IndexOf
            (
                '=',

                routesIndex,

                collectionIndex -
                routesIndex
            );


        if
        (
            equalsIndex < 0
        )
        {
            return -1;
        }



        //=======================================================
        // Find Opening Bracket After Routes =
        //=======================================================

        var openingBracketIndex =
            text.IndexOf
            (
                '[',

                equalsIndex,

                collectionIndex -
                equalsIndex
            );


        if
        (
            openingBracketIndex < 0
        )
        {
            return -1;
        }


        return openingBracketIndex;
    }



    //===========================================================
    // Find Children Index
    //===========================================================

    private static int FindChildrenIndex
    (
        string text,

        int collectionIndex
    )
    {
        var searchIndex =
            collectionIndex;


        while
        (
            searchIndex < text.Length
        )
        {
            var childrenIndex =
                text.IndexOf
                (
                    "children",

                    searchIndex,

                    StringComparison.Ordinal
                );


            if
            (
                childrenIndex < 0
            )
            {
                return -1;
            }



            //===================================================
            // Verify It Is The children Property
            //===================================================

            var afterChildren =
                childrenIndex +
                "children".Length;


            while
            (
                afterChildren < text.Length

                &&

                char.IsWhiteSpace
                (
                    text[afterChildren]
                )
            )
            {
                afterChildren++;
            }


            if
            (
                afterChildren < text.Length

                &&

                text[afterChildren] == ':'
            )
            {
                return childrenIndex;
            }


            searchIndex =
                childrenIndex +
                "children".Length;
        }


        return -1;
    }



    //===========================================================
    // Find Next Token
    //===========================================================

    private static int FindNextToken
    (
        string text,

        int startIndex,

        char token
    )
    {
        return text.IndexOf
        (
            token,

            startIndex
        );
    }



    //===========================================================
    // Get Line Start
    //===========================================================

    private static int GetLineStart
    (
        string text,

        int position
    )
    {
        if
        (
            position <= 0
        )
        {
            return 0;
        }


        var lineFeedIndex =
            text.LastIndexOf
            (
                '\n',

                position - 1
            );


        if
        (
            lineFeedIndex < 0
        )
        {
            return 0;
        }


        return lineFeedIndex +
               1;
    }



    //===========================================================
    // Get Line End
    //===========================================================

    private static int GetLineEnd
    (
        string text,

        int position
    )
    {
        var lineFeedIndex =
            text.IndexOf
            (
                '\n',

                position
            );


        if
        (
            lineFeedIndex < 0
        )
        {
            return text.Length;
        }


        return lineFeedIndex +
               1;
    }



    //===========================================================
    // Get Line Indentation
    //===========================================================

    private static string GetLineIndentation
    (
        string text,

        int lineStart
    )
    {
        var indentation =
            "";


        while
        (
            lineStart +
            indentation.Length <
            text.Length

            &&

            (
                text
                [
                    lineStart +
                    indentation.Length
                ]
                == ' '

                ||

                text
                [
                    lineStart +
                    indentation.Length
                ]
                == '\t'
            )
        )
        {
            indentation +=
                text
                [
                    lineStart +
                    indentation.Length
                ];
        }


        return indentation;
    }



    //===========================================================
    // Apply Base Indentation
    //===========================================================

    private static string ApplyBaseIndentation
    (
        string content,

        string baseIndentation
    )
    {
        var lines =
            SplitLines
            (
                content.Trim()
            );


        //=======================================================
        // Determine Minimum Template Indentation
        //=======================================================

        var minimumIndentation =
            lines
                .Where
                (
                    line =>
                        !string.IsNullOrWhiteSpace
                        (
                            line
                        )
                )
                .Select
                (
                    GetLeadingWhitespaceCount
                )
                .DefaultIfEmpty
                (
                    0
                )
                .Min();



        //=======================================================
        // Apply Relative Indentation
        //=======================================================

        return string.Join
        (
            Environment.NewLine,

            lines
                .Select
                (
                    line =>
                    {
                        if
                        (
                            string.IsNullOrWhiteSpace
                            (
                                line
                            )
                        )
                        {
                            return "";
                        }


                        var leadingWhitespace =
                            GetLeadingWhitespaceCount
                            (
                                line
                            );


                        var relativeIndentation =
                            Math.Max
                            (
                                0,

                                leadingWhitespace -
                                minimumIndentation
                            );


                        var contentStart =
                            Math.Min
                            (
                                leadingWhitespace,

                                line.Length
                            );


                        var actualContent =
                            line
                                .Substring
                                (
                                    contentStart
                                );


                        return baseIndentation
                               +
                               new string
                               (
                                   ' ',

                                   relativeIndentation
                               )
                               +
                               actualContent;
                    }
                )
        );
    }



    //===========================================================
    // Split Lines
    //===========================================================

    private static string[] SplitLines
    (
        string value
    )
    {
        return value
            .Replace
            (
                "\r\n",

                "\n"
            )
            .Replace
            (
                "\r",

                "\n"
            )
            .Split
            (
                '\n'
            );
    }



    //===========================================================
    // Get Leading Whitespace Count
    //===========================================================

    private static int GetLeadingWhitespaceCount
    (
        string value
    )
    {
        var count =
            0;


        while
        (
            count < value.Length

            &&

            (
                value[count] == ' '

                ||

                value[count] == '\t'
            )
        )
        {
            count++;
        }


        return count;
    }

}