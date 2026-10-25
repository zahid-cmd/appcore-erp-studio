//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;


//===============================================================
// Create Brand Management DTO
//
// BrandCode is ignored : the server always generates it.
// The image is uploaded separately (POST {id}/image).
//===============================================================

public class CreateBrandManagementDto
{
    public string BrandCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }

    // Optional : SupplierCode of a Motor Bikes supplier ('' = none)
    public string MotorBikesSupplierCode { get; set; } = string.Empty;
}