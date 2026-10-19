//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;


//===============================================================
// Brand Management DTO
//===============================================================

public class BrandManagementDto
{
    public long BrandManagementId { get; set; }

    public string BrandCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string BrandImagePath { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}