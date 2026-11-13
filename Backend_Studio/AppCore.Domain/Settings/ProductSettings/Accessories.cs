//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Accessories
//
// One Accessory = one item inside a Product Sub Category
// (category of Category Type "Accessories").
//
// Four codes, nnnnn numbered per sub category:
//   Product Code      <sub category code>-nnnnn   AC-001-001-00001
//   Inventory Ledger  <INV sub group>-nnnnn       INV-001-005-001-00001
//   WIP Ledger        <WIP sub group>-nnnnn       WIP-001-005-001-00001
//   COGS Ledger       <COGS sub group>-nnnnn      COGS-001-005-001-00001
//
// Part Number    : OPTIONAL. When given, unique within the brand
//                  (category), ignoring spaces, hyphens, dots and
//                  case (PartNumberKey holds the cleaned value;
//                  '' when no part number).
// Accessory Name : typed, required.
//===============================================================

public class Accessories
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long AccessoryId { get; set; }


    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();


    //===========================================================
    // Parent (locked after saving)
    //===========================================================

    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }


    //===========================================================
    // Accessory
    //===========================================================

    // Optional; as typed, e.g. "AB-12.34" ('' when none)
    public string PartNumber { get; set; } = string.Empty;

    // Cleaned for the uniqueness check : "AB1234"
    // (spaces, hyphens and dots removed, upper case; '' when none)
    public string PartNumberKey { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    // Pcs, Set, Pair, Box, Packet, Litre, Kg, Meter, Roll
    public string Unit { get; set; } = string.Empty;

    public string ProductCode { get; set; } = string.Empty;


    //===========================================================
    // Inventory Ledgers (General Ledgers created with the accessory)
    //===========================================================

    public string InventoryLedgerCode { get; set; } = string.Empty;

    public string WipLedgerCode { get; set; } = string.Empty;

    public string CogsLedgerCode { get; set; } = string.Empty;

    // Sales ledger (2026-11-04) : GLR-ccc-ggg-sss-nnnnn under the
    // sub category's sales sub group (CLS-005 / 006 / 008)
    public string SalesLedgerCode { get; set; } = string.Empty;


    //===========================================================
    // Stock Levels
    //===========================================================

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }

    // Highest stock wanted (0 = not set) : a purchase order
    // cannot take the company stock above it
    public int MaxStockLevel { get; set; }


    //===========================================================
    // Movement Class : SuperFast / Fast / Regular / Periodic /
    // Slow (default). Used by bin allocation (Stage 2).
    //
    // MovementClassAuto : reserved (later set from the 3- or
    // 6-month average sales); not used yet.
    //===========================================================

    public string MovementClass { get; set; } = "Slow";

    // For Sale (default) / Additional Accessories (free with every
    // bike, all year) / Promotional Accessories (free with bikes
    // during a promotion). Ledgers are kept for every use.
    public string AccessoryUse { get; set; } = "For Sale";

    public bool MovementClassAuto { get; set; }


    //===========================================================
    // Image (optional; path only, the file is saved by the
    // controller). '' = no image : pages show the item icon.
    //===========================================================

    public string ImagePath { get; set; } = string.Empty;


    //===========================================================
    // Description / Status
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; } = false;

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