//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Accessories DTO
//===============================================================

public class AccessoriesDto
{
    public long AccessoryId { get; set; }


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



    //===========================================================
    // Accessory
    //===========================================================

    // Optional ('' when none)
    public string PartNumber { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string ProductCode { get; set; } = string.Empty;


    //===========================================================
    // Inventory Ledgers
    //===========================================================

    public string InventoryLedgerCode { get; set; } = string.Empty;

    public string WipLedgerCode { get; set; } = string.Empty;

    public string CogsLedgerCode { get; set; } = string.Empty;


    //===========================================================
    // Stock Levels / Status
    //===========================================================

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }


    //===========================================================
    // Storage Locations (one per warehouse)
    //===========================================================

    public List<AccessoryLocationDto> Locations { get; set; } = new();

    // "WH-001: R-001 / S-03, WH-002: R-002 / S-01"
    public string LocationsText { get; set; } = string.Empty;


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