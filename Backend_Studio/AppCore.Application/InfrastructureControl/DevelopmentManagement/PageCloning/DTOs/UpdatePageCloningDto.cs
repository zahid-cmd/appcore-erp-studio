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
    // Active Status
    //===========================================================

    public bool IsActive { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long ModifiedBy { get; set; }
}