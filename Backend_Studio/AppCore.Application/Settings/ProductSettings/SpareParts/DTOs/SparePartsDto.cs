//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Spare Parts DTO
//===============================================================

public class SparePartsDto
{
    public long SparePartId { get; set; }


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
    // Part
    //===========================================================

    public string PartNumber { get; set; } = string.Empty;

    public string PartName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string ProductCode { get; set; } = string.Empty;


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


    //===========================================================
    // Storage Locations (one per warehouse)
    //===========================================================

    public List<SparePartLocationDto> Locations { get; set; } = new();

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