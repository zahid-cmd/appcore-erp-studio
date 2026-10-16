//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Card Charges
//
// One row = one card of one POS Account with its charge %.
// Master : POS Account (POSAccounts)
// Card   : Card Setup  (CardSetup)
//
// A card can appear only once per POS Account (active rows).
//===============================================================

public class CardCharges
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long CardChargeId { get; set; }


    //===========================================================
    // POS Account (master)
    //===========================================================

    public long POSAccountId { get; set; }


    //===========================================================
    // Card (Card Setup)
    //===========================================================

    public long CardSetupId { get; set; }


    //===========================================================
    // Charge (percentage, 0 – 100, two decimals)
    //===========================================================

    public decimal ChargePercent { get; set; }


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