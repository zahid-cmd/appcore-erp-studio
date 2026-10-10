
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
    // Source Submenu
    //===========================================================

    public long CloneFromId { get; set; }

    public string CloneFromCode { get; set; } = string.Empty;

    public string CloneFromName { get; set; } = string.Empty;

    //===========================================================
    // Target Submenu
    //===========================================================

    public long CloneToId { get; set; }

    public string CloneToCode { get; set; } = string.Empty;

    public string CloneToName { get; set; } = string.Empty;

    //===========================================================
    // Cloning Configuration
    //===========================================================

    public string CloningType { get; set; } = "Page";

    public int NumberOfFiles { get; set; } = 15;

    public string Operation { get; set; } = "Clone";

    public string Status { get; set; } = "Pending";

    public string? Remarks { get; set; }

    //===========================================================
    // Transformation Options
    //===========================================================

    public bool RenameIdentifiers { get; set; } = true;

    public bool UpdateRoutes { get; set; } = true;

    public bool UpdateApiReferences { get; set; } = true;

    public bool UpdateModelReferences { get; set; } = true;

    public bool PreserveTargetFilePaths { get; set; } = true;

    //===========================================================
    // Model Field Mappings
    //===========================================================

    public List<PageCloningModelFieldDto> ModelFields { get; set; } = new();

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
    // Audit Information
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
    // Submenu Information
    //===========================================================

    public long SubmenuId { get; set; }

    public string SubmenuCode { get; set; } = string.Empty;

    public string SubmenuName { get; set; } = string.Empty;

    //===========================================================
    // Analyzed Files
    //===========================================================

    public List<PageCloningSourceFileDto> Files { get; set; } = new();

    //===========================================================
    // Analyzed Model Fields
    //===========================================================

    public List<PageCloningModelFieldDto> ModelFields { get; set; } = new();

    //===========================================================
    // Analysis Result
    //===========================================================

    public bool AnalysisCompleted { get; set; }

    public string Message { get; set; } = string.Empty;
}

//===============================================================
// Page Cloning Source File DTO
//===============================================================

public class PageCloningSourceFileDto
{
    //===========================================================
    // File Identity
    //===========================================================

    public int Id { get; set; }

    public string Category { get; set; } = string.Empty;

    public string FileType { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    //===========================================================
    // File Location
    //===========================================================

    public string Location { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;

    //===========================================================
    // File Status
    //===========================================================

    public bool Exists { get; set; }

    public string Action { get; set; } = string.Empty;

    //===========================================================
    // Target Mapping
    //===========================================================

    public string TargetPath { get; set; } = string.Empty;

    public bool TargetExists { get; set; }
}

//===============================================================
// Page Cloning Model Field DTO
//===============================================================

public class PageCloningModelFieldDto
{
    //===========================================================
    // Source Mapping
    //===========================================================

    public string InputModel { get; set; } = string.Empty;

    public string SourceField { get; set; } = string.Empty;

    //===========================================================
    // Target Field Definition
    //===========================================================

    public string Name { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public bool Required { get; set; }

    //===========================================================
    // Transformation Operation
    //===========================================================

    public string Operation { get; set; } = "Keep";

    //===========================================================
    // Optional Field Metadata
    //===========================================================

    public string? Description { get; set; }

    public string? DefaultValue { get; set; }
}
