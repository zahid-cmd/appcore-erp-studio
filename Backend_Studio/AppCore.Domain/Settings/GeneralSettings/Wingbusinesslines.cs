//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Wing Business Lines
//
// The CORE business line(s) of a wing; every branch under the
// wing always has them (they cannot be revoked per branch).
//   Sales Center   → Motor Bikes
//   Service Center → Spare Parts, Services
//   Accessory Shop → Accessories
// Set on the Business Configuration page (Wing Core Business).
// Rows are replaced on every save.
//===============================================================

public class WingBusinessLines
{
    public long WingBusinessLineId { get; set; }

    public long WingId { get; set; }

    // Motor Bikes / Spare Parts / Accessories / Services
    public string BusinessLine { get; set; } = string.Empty;


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}