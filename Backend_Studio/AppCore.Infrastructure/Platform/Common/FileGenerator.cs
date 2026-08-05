//===============================================================
// Namespaces
//===============================================================

using System.IO;
using System.Threading.Tasks;

using AppCore.Application.Platform.CommonInterfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Common;


//===============================================================
// File Generator
//===============================================================

public class FileGenerator
    : IFileGenerator
{
    //===========================================================
    // Generate File
    //===========================================================

    public async Task GenerateAsync
    (
        string outputFile,

        string content
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if (string.IsNullOrWhiteSpace(outputFile))
        {
            throw new IOException(
                "Output file is empty.");
        }

        if (content == null)
        {
            throw new IOException(
                "File content is null.");
        }

        //=======================================================
        // Folder
        //=======================================================

        var folder =
            Path.GetDirectoryName(outputFile);

        if
        (
            !string.IsNullOrWhiteSpace(folder)
            &&
            !Directory.Exists(folder)
        )
        {
            Directory.CreateDirectory(folder);
        }

        //=======================================================
        // Generate
        //=======================================================

        await File.WriteAllTextAsync
        (
            outputFile,

            content
        );
    }
}