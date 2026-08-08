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
// File Remover
//===============================================================

public class FileRemover
: IFileRemover
{
    //===========================================================
    // Remove Managed Block
    //===========================================================

    public async Task RemoveManagedBlockAsync
    (
        string filePath,

        string beginMarker,

        string endMarker
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
                beginMarker
            )
        )
        {
            throw new ArgumentException
            (
                "Begin marker is required."
            );
        }

        if
        (
            string.IsNullOrWhiteSpace
            (
                endMarker
            )
        )
        {
            throw new ArgumentException
            (
                "End marker is required."
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
        // Find Begin Marker
        //=======================================================

        var beginIndex =
            text.IndexOf
            (
                beginMarker,
                StringComparison.Ordinal
            );

        if
        (
            beginIndex < 0
        )
        {
            return;
        }

        //=======================================================
        // Find Beginning Of Marker Line
        //=======================================================

        var removeStart =
            text.LastIndexOf
            (
                Environment.NewLine,
                beginIndex,
                StringComparison.Ordinal
            );

        if
        (
            removeStart < 0
        )
        {
            removeStart = 0;
        }
        else
        {
            removeStart +=
                Environment.NewLine.Length;
        }

        //=======================================================
        // Find End Marker
        //=======================================================

        var endIndex =
            text.IndexOf
            (
                endMarker,
                beginIndex,
                StringComparison.Ordinal
            );

        if
        (
            endIndex < 0
        )
        {
            return;
        }

        endIndex +=
            endMarker.Length;

        //=======================================================
        // Move To End Of Marker Line
        //=======================================================

        while
        (
            endIndex < text.Length
            &&
            text[endIndex] != '\n'
        )
        {
            endIndex++;
        }

        if
        (
            endIndex < text.Length
        )
        {
            endIndex++;
        }

        //=======================================================
        // Remove Following Blank Line
        //=======================================================

        if
        (
            endIndex < text.Length
            &&
            text[endIndex] == '\r'
        )
        {
            endIndex++;
        }

        if
        (
            endIndex < text.Length
            &&
            text[endIndex] == '\n'
        )
        {
            endIndex++;
        }

        if
        (
            endIndex < text.Length
            &&
            text[endIndex] == '\r'
        )
        {
            endIndex++;
        }

        if
        (
            endIndex < text.Length
            &&
            text[endIndex] == '\n'
        )
        {
            endIndex++;
        }

        //=======================================================
        // Remove Managed Block
        //=======================================================

        text =
            text.Remove
            (
                removeStart,
                endIndex - removeStart
            );

        //=======================================================
        // Normalize Blank Lines
        //=======================================================

        while
        (
            text.Contains
            (
                Environment.NewLine
                + Environment.NewLine
                + Environment.NewLine
            )
        )
        {
            text =
                text.Replace
                (
                    Environment.NewLine
                    + Environment.NewLine
                    + Environment.NewLine,

                    Environment.NewLine
                    + Environment.NewLine,

                    StringComparison.Ordinal
                );
        }

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
    // Delete File
    //===========================================================

    public async Task DeleteFileAsync
    (
        string filePath
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

        //=======================================================
        // File Exists
        //=======================================================

        if
        (
            !File.Exists
            (
                filePath
            )
        )
        {
            return;
        }

        //=======================================================
        // Delete File
        //=======================================================

        File.Delete
        (
            filePath
        );

        await Task.CompletedTask;
    }
}