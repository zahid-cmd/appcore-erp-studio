//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;


//===============================================================
// Card Charges DTO
//
// All card lines of one POS Account.
// List page : one row per POS Account
// Form page : edit / view
//===============================================================

public class CardChargesDto
{
    //===========================================================
    // POS Account (master)
    //===========================================================

    public long POSAccountId { get; set; }

    // The POS Account's Public Id (links and API calls; uuid v7)
    public Guid PublicId { get; set; }

    public string POSAccountCode { get; set; } = string.Empty;

    public string POSAccountName { get; set; } = string.Empty;

    // POS Account status (list Status filter)
    public bool Status { get; set; }


    //===========================================================
    // Summary
    //===========================================================

    public int CardCount { get; set; }

    // "VISA, MASTERCARD, AMEX"
    public string CardNames { get; set; } = string.Empty;


    //===========================================================
    // Lines
    //===========================================================

    public List<CardChargeLineDto> Details { get; set; } = new();
}