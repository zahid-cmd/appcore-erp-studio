//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;


//===============================================================
// Update Brand Management DTO
//
// BrandCode is locked after creation (ignored here).
// The image is uploaded / deleted separately ({id}/image).
//===============================================================

public class UpdateBrandManagementDto
{
    public long BrandManagementId { get; set; }

    public string BrandCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }

    // Optional : SupplierCode of a Motor Bikes supplier ('' = none)
    public string MotorBikesSupplierCode { get; set; } = string.Empty;
}