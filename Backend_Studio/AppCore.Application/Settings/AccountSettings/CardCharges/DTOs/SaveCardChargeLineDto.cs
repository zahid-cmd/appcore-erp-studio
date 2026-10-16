//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;


//===============================================================
// Save Card Charge Line DTO (Create & Update)
//
// CardChargeId : 0 = new line, > 0 = existing line
//===============================================================

public class SaveCardChargeLineDto
{
    public long CardChargeId { get; set; }

    public long CardSetupId { get; set; }

    public decimal ChargePercent { get; set; }
}