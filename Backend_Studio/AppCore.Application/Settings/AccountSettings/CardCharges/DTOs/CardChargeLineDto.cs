//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;


//===============================================================
// Card Charge Line DTO (read)
//
// One card of a POS Account, with card details from Card Setup.
//===============================================================

public class CardChargeLineDto
{
    public long CardChargeId { get; set; }

    public long CardSetupId { get; set; }

    public string CardCode { get; set; } = string.Empty;

    public string CardName { get; set; } = string.Empty;

    public decimal ChargePercent { get; set; }
}