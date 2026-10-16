//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;


//===============================================================
// Card Charges Defaults DTO
//
// Values the Add form can use before entering data.
//===============================================================

public class CardChargesDefaultsDto
{
    //===========================================================
    // Allowed Charge Range (%)
    //===========================================================

    public decimal MinChargePercent { get; set; }

    public decimal MaxChargePercent { get; set; }


    //===========================================================
    // Active POS Accounts without card charges yet
    //===========================================================

    public int AvailablePOSAccountCount { get; set; }
}