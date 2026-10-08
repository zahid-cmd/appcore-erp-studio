//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;


//===============================================================
// Create Page Cloning DTO
//===============================================================

public class CreatePageCloningDto
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
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }


    //===========================================================
    // Active Status
    //===========================================================

    public bool IsActive { get; set; } = true;


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }
}