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


    //===========================================================
    // Stock Levels
    //===========================================================

    public int ReorderLevel { get; set; }

    public int RedLevel { get; set; }


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