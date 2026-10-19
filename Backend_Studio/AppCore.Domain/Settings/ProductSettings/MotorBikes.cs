//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Motor Bikes
//
// One Motor Bike = one model (Product Sub Category) in one Color.
//
// Four codes, nnnnn numbered per sub category:
//   Product Code      <sub category code>-nnnnn   MB-002-001-00001
//   Inventory Ledger  <INV sub group>-nnnnn       INV-001-002-001-00001
//   WIP Ledger        <WIP sub group>-nnnnn       WIP-001-002-001-00001
//   COGS Ledger       <COGS sub group>-nnnnn      COGS-001-002-001-00001
//
// Product Name : "<Sub Category Name> - <Color Name>",
//                e.g. "Revoo C32 - Red". Built by the server.
//===============================================================

public class MotorBikes
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MotorBikeId { get; set; }


    //===========================================================
    // Parent (locked after saving)
    //===========================================================

    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }

    public long ColorManagementId { get; set; }


    //===========================================================
    // Product
    //===========================================================

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;


    //===========================================================
    // Inventory Ledgers (General Ledgers created with the bike)
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
    // Image (path only; the file is saved by the controller)
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