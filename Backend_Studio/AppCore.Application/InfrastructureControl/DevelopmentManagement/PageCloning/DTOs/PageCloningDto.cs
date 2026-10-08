//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;


//===============================================================
// Page Cloning DTO
//===============================================================

public class PageCloningDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long Id { get; set; }


    //===========================================================
    // Clone From
    //===========================================================

    public long CloneFromId { get; set; }

    public string CloneFromCode { get; set; } = string.Empty;

    public string CloneFromName { get; set; } = string.Empty;


    //===========================================================
    // Clone To
    //===========================================================

    public long CloneToId { get; set; }

    public string CloneToCode { get; set; } = string.Empty;

    public string CloneToName { get; set; } = string.Empty;


    //===========================================================
    // Clone Type
    //===========================================================

    public string CloningType { get; set; } = "Page";


    //===========================================================
    // Files
    //===========================================================

    public int NumberOfFiles { get; set; }


    //===========================================================
    // Operation
    //===========================================================

    public string Operation { get; set; } = "Clone";


    //===========================================================
    // Status
    //===========================================================

    public string Status { get; set; } = "Pending";


    //===========================================================
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }


    //===========================================================
    // Last Cloning
    //===========================================================

    public long? LastClonedBy { get; set; }

    public DateTime? LastClonedDate { get; set; }

    public string LastCloningResult { get; set; } = string.Empty;


    //===========================================================
    // Active Status
    //===========================================================

    public bool IsActive { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public bool IsDeleted { get; set; }
}


//===============================================================
// Page Cloning Source Analysis DTO
//===============================================================

public class PageCloningSourceAnalysisDto
{
    //===========================================================
    // Source Page
    //===========================================================

    public long SubmenuId { get; set; }

    public string SubmenuCode { get; set; } = string.Empty;

    public string SubmenuName { get; set; } = string.Empty;


    //===========================================================
    // Source Files
    //===========================================================

    public List<PageCloningSourceFileDto> Files { get; set; } = new();


    //===========================================================
    // Model Fields
    //===========================================================

    public List<PageCloningModelFieldDto> ModelFields { get; set; } = new();
}


//===============================================================
// Page Cloning Source File DTO
//===============================================================

public class PageCloningSourceFileDto
{
    //===========================================================
    // File Information
    //===========================================================

    public int Id { get; set; }

    public string Category { get; set; } = string.Empty;

    public string FileType { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;


    //===========================================================
    // File Status
    //===========================================================

    public bool Exists { get; set; }

    public string Action { get; set; } = string.Empty;
}


//===============================================================
// Page Cloning Model Field DTO
//===============================================================

public class PageCloningModelFieldDto
{
    //===========================================================
    // Field Information
    //===========================================================

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;


    //===========================================================
    // Validation
    //===========================================================

    public bool Required { get; set; }
}