//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;


//===============================================================
// Update Card Charges DTO
//
// Master = POS Account. Details = card charge lines.
// Line CardChargeId = 0 means a new line.
//===============================================================

public class UpdateCardChargesDto
{
    //===========================================================
    // Master : POS Account
    //===========================================================

    public long POSAccountId { get; set; }


    //===========================================================
    // Details : Card Charge Lines
    //===========================================================

    public List<SaveCardChargeLineDto> Details { get; set; } =
        new List<SaveCardChargeLineDto>();
}