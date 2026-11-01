//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Posting Setups
//
// One row per posting purpose (VAT per product type, Inter-
// Branch, Opening Stock ...). The rows are made by SQL
// (PostingSetup_StockLedger.sql); the Posting Setup page only
// picks the ledger of each row. Linked by code, never by name.
//===============================================================

public class PostingSetups
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long PostingSetupId { get; set; }


    //===========================================================
    // Purpose (fixed)
    //===========================================================

    public string PurposeCode { get; set; } = string.Empty;

    public string PurposeName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string UsedBy { get; set; } = string.Empty;

    // Comma list of account sub group codes the ledger must sit
    // under; empty = any General Ledger (GLR-)
    public string AllowedSubGroupCodes { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = true;

    public int DisplayOrder { get; set; }


    //===========================================================
    // Chosen Ledger
    //===========================================================

    public string LedgerCode { get; set; } = string.Empty;


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
