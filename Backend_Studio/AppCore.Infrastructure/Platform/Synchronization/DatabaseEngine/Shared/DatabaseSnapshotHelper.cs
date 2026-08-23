//===============================================================
// Namespaces
//===============================================================

using System.Text;


//===============================================================
// Database Snapshot Helper
//===============================================================

public class DatabaseSnapshotHelper
{

    //===========================================================
    // Build Snapshot Start Marker
    //===========================================================

    public string
        BuildSnapshotStartMarker
    (
        string submenuCode
    )
    {
        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Build Start Marker
        //=======================================================

        return
            $"// AUTO SYNC SNAPSHOT START : {submenuCode.Trim()}";
    }



    //===========================================================
    // Build Snapshot End Marker
    //===========================================================

    public string
        BuildSnapshotEndMarker
    (
        string submenuCode
    )
    {
        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Build End Marker
        //=======================================================

        return
            $"// AUTO SYNC SNAPSHOT END : {submenuCode.Trim()}";
    }



    //===========================================================
    // Check Snapshot Section
    //===========================================================

    public bool
        SnapshotSectionExists
    (
        string snapshotFilePath,

        string submenuCode
    )
    {
        //=======================================================
        // Validate Snapshot File Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                snapshotFilePath
            )
        )
        {
            throw new ArgumentException(
                "Snapshot File Path is required.",

                nameof(
                    snapshotFilePath
                )
            );
        }


        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Snapshot File Does Not Exist
        //=======================================================

        if
        (
            !File.Exists(
                snapshotFilePath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Read Snapshot Content
        //=======================================================

        var snapshotContent =
            File.ReadAllText(
                snapshotFilePath
            );


        //=======================================================
        // Build Ownership Markers
        //=======================================================

        var startMarker =
            BuildSnapshotStartMarker(
                submenuCode
            );


        var endMarker =
            BuildSnapshotEndMarker(
                submenuCode
            );


        //=======================================================
        // Count Start Markers
        //=======================================================

        var startMarkerCount =
            CountOccurrences
            (
                snapshotContent,

                startMarker
            );


        //=======================================================
        // Count End Markers
        //=======================================================

        var endMarkerCount =
            CountOccurrences
            (
                snapshotContent,

                endMarker
            );


        //=======================================================
        // No Snapshot Ownership
        //=======================================================

        if
        (
            startMarkerCount == 0
            &&
            endMarkerCount == 0
        )
        {
            return false;
        }


        //=======================================================
        // Incomplete Snapshot Ownership
        //=======================================================

        if
        (
            startMarkerCount == 0
            ||
            endMarkerCount == 0
        )
        {
            throw new InvalidOperationException(
                $"Snapshot ownership for Submenu Code '{submenuCode}' is incomplete."
            );
        }


        //=======================================================
        // Duplicate Snapshot Ownership
        //=======================================================

        if
        (
            startMarkerCount > 1
            ||
            endMarkerCount > 1
        )
        {
            throw new InvalidOperationException(
                $"Multiple snapshot ownership sections were found for Submenu Code '{submenuCode}'."
            );
        }


        //=======================================================
        // Find Start Marker
        //=======================================================

        var startMarkerIndex =
            snapshotContent.IndexOf
            (
                startMarker,

                StringComparison.Ordinal
            );


        //=======================================================
        // Find End Marker
        //=======================================================

        var endMarkerIndex =
            snapshotContent.IndexOf
            (
                endMarker,

                startMarkerIndex
                +
                startMarker.Length,

                StringComparison.Ordinal
            );


        //=======================================================
        // Verify Marker Order
        //=======================================================

        if
        (
            endMarkerIndex
            <=
            startMarkerIndex
        )
        {
            throw new InvalidOperationException(
                $"Snapshot ownership markers for Submenu Code '{submenuCode}' are in an invalid order."
            );
        }


        return true;
    }



    //===========================================================
    // Find Snapshot Section
    //===========================================================

    public string?
        FindSnapshotSection
    (
        string snapshotFilePath,

        string submenuCode
    )
    {
        //=======================================================
        // Validate Snapshot File Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                snapshotFilePath
            )
        )
        {
            throw new ArgumentException(
                "Snapshot File Path is required.",

                nameof(
                    snapshotFilePath
                )
            );
        }


        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Snapshot File Does Not Exist
        //=======================================================

        if
        (
            !File.Exists(
                snapshotFilePath
            )
        )
        {
            return null;
        }


        //=======================================================
        // Verify Snapshot Ownership
        //=======================================================

        if
        (
            !SnapshotSectionExists
            (
                snapshotFilePath,

                submenuCode
            )
        )
        {
            return null;
        }


        //=======================================================
        // Read Snapshot Content
        //=======================================================

        var snapshotContent =
            File.ReadAllText(
                snapshotFilePath
            );


        //=======================================================
        // Build Ownership Markers
        //=======================================================

        var startMarker =
            BuildSnapshotStartMarker(
                submenuCode
            );


        var endMarker =
            BuildSnapshotEndMarker(
                submenuCode
            );


        //=======================================================
        // Find Start Marker
        //=======================================================

        var startMarkerIndex =
            snapshotContent.IndexOf
            (
                startMarker,

                StringComparison.Ordinal
            );


        //=======================================================
        // Find End Marker
        //=======================================================

        var endMarkerIndex =
            snapshotContent.IndexOf
            (
                endMarker,

                startMarkerIndex
                +
                startMarker.Length,

                StringComparison.Ordinal
            );


        //=======================================================
        // Extract Snapshot Section
        //=======================================================

        var sectionEndIndex =
            endMarkerIndex
            +
            endMarker.Length;


        return
            snapshotContent.Substring
            (
                startMarkerIndex,

                sectionEndIndex
                -
                startMarkerIndex
            );
    }



    //===========================================================
    // Build Snapshot Section
    //===========================================================

    public string
        BuildSnapshotSection
    (
        string submenuCode,

        string snapshotConfiguration
    )
    {
        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Validate Snapshot Configuration
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                snapshotConfiguration
            )
        )
        {
            throw new ArgumentException(
                "Snapshot Configuration is required.",

                nameof(
                    snapshotConfiguration
                )
            );
        }


        //=======================================================
        // Build Snapshot Section
        //=======================================================

        var snapshotSection =
            new StringBuilder();


        snapshotSection.AppendLine(
            "//==========================================================="
        );


        snapshotSection.AppendLine();


        snapshotSection.AppendLine(
            BuildSnapshotStartMarker(
                submenuCode
            )
        );


        snapshotSection.AppendLine();


        snapshotSection.AppendLine(
            "//==========================================================="
        );


        snapshotSection.AppendLine();


        snapshotSection.AppendLine(
            snapshotConfiguration.Trim()
        );


        snapshotSection.AppendLine();


        snapshotSection.AppendLine(
            "//==========================================================="
        );


        snapshotSection.AppendLine();


        snapshotSection.AppendLine(
            BuildSnapshotEndMarker(
                submenuCode
            )
        );


        snapshotSection.AppendLine();


        snapshotSection.Append(
            "//==========================================================="
        );


        return
            snapshotSection.ToString();
    }



    //===========================================================
    // Add Snapshot Section
    //===========================================================

    public void
        AddSnapshotSection
    (
        string snapshotFilePath,

        string submenuCode,

        string snapshotConfiguration
    )
    {
        //=======================================================
        // Validate Snapshot File Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                snapshotFilePath
            )
        )
        {
            throw new ArgumentException(
                "Snapshot File Path is required.",

                nameof(
                    snapshotFilePath
                )
            );
        }


        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Validate Snapshot Configuration
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                snapshotConfiguration
            )
        )
        {
            throw new ArgumentException(
                "Snapshot Configuration is required.",

                nameof(
                    snapshotConfiguration
                )
            );
        }


        //=======================================================
        // Validate Snapshot File
        //=======================================================

        if
        (
            !File.Exists(
                snapshotFilePath
            )
        )
        {
            throw new FileNotFoundException(
                "Database model snapshot file could not be located.",

                snapshotFilePath
            );
        }


        //=======================================================
        // Prevent Duplicate Snapshot Ownership
        //=======================================================

        if
        (
            SnapshotSectionExists
            (
                snapshotFilePath,

                submenuCode
            )
        )
        {
            return;
        }


        //=======================================================
        // Read Snapshot Content
        //=======================================================

        var snapshotContent =
            File.ReadAllText(
                snapshotFilePath
            );


        //=======================================================
        // Find Class Closing Brace
        //=======================================================

        var classClosingBraceIndex =
            snapshotContent.LastIndexOf
            (
                '}'
            );


        if
        (
            classClosingBraceIndex < 0
        )
        {
            throw new InvalidOperationException(
                $"Snapshot file '{snapshotFilePath}' has an invalid structure."
            );
        }


        //=======================================================
        // Build Snapshot Section
        //=======================================================

        var snapshotSection =
            BuildSnapshotSection
            (
                submenuCode,

                snapshotConfiguration
            );


        //=======================================================
        // Insert Snapshot Section
        //=======================================================

        var updatedSnapshotContent =
            snapshotContent.Insert
            (
                classClosingBraceIndex,

                Environment.NewLine
                +
                Environment.NewLine
                +
                snapshotSection
                +
                Environment.NewLine
                +
                Environment.NewLine
            );


        //=======================================================
        // Save Snapshot File
        //=======================================================

        File.WriteAllText(
            snapshotFilePath,

            updatedSnapshotContent
        );


        //=======================================================
        // Verify Snapshot Section
        //=======================================================

        if
        (
            !SnapshotSectionExists
            (
                snapshotFilePath,

                submenuCode
            )
        )
        {
            throw new InvalidOperationException(
                $"Snapshot section for Submenu Code '{submenuCode}' could not be created."
            );
        }
    }



    //===========================================================
    // Count Occurrences
    //===========================================================

    private int
        CountOccurrences
    (
        string content,

        string value
    )
    {
        //=======================================================
        // Validate Content
        //=======================================================

        if
        (
            string.IsNullOrEmpty(
                content
            )
        )
        {
            return 0;
        }


        //=======================================================
        // Validate Value
        //=======================================================

        if
        (
            string.IsNullOrEmpty(
                value
            )
        )
        {
            return 0;
        }


        //=======================================================
        // Initialize Counter
        //=======================================================

        var count =
            0;


        var startIndex =
            0;


        //=======================================================
        // Count Occurrences
        //=======================================================

        while
        (
            true
        )
        {
            var index =
                content.IndexOf
                (
                    value,

                    startIndex,

                    StringComparison.Ordinal
                );


            if
            (
                index < 0
            )
            {
                break;
            }


            count++;


            startIndex =
                index
                +
                value.Length;
        }


        return
            count;
    }

}