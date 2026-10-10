
//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

//===============================================================
// Update Page Cloning DTO
//===============================================================

public class UpdatePageCloningDto
{
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

    public bool IsActive { get; set; }

    //===========================================================
    // Audit Information
    //===========================================================

    public long ModifiedBy { get; set; }
}
