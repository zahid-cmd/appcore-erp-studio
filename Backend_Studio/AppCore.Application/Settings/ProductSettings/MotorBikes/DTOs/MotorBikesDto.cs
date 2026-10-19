//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Motor Bikes DTO
//===============================================================

public class MotorBikesDto
{
    public long MotorBikeId { get; set; }


    //===========================================================
    // Parent
    //===========================================================

    public long ProductCategoryId { get; set; }

    public string CategoryCode { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public long ProductSubCategoryId { get; set; }

    public string SubCategoryCode { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    public long ColorManagementId { get; set; }

    public string ColorName { get; set; } = string.Empty;


    //===========================================================
    // Product
    //===========================================================

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;


    //===========================================================
    // Inventory Ledgers
    //===========================================================

    public string InventoryLedgerCode { get; set; } = string.Empty;

    public string WipLedgerCode { get; set; } = string.Empty;

    public string CogsLedgerCode { get; set; } = string.Empty;


    //===========================================================
    // Stock Levels / Image / Status
    //===========================================================

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    public string ImagePath { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }


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