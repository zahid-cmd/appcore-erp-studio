//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Update Motor Bikes DTO
//
// Category, Sub Category and Color are locked after saving; they
// are sent back only to be checked against the saved values.
//===============================================================

public class UpdateMotorBikesDto
{
    public long MotorBikeId { get; set; }

    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }

    public long ColorManagementId { get; set; }

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}