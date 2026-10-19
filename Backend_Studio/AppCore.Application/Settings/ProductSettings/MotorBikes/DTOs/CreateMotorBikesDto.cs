//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Create Motor Bikes DTO
//
// Codes, Product Name and ledger names are always built by the
// server; only the choices below are taken from the form.
//===============================================================

public class CreateMotorBikesDto
{
    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }

    public long ColorManagementId { get; set; }

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}