//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Chart of Services : Item Types
//
// One per service table; each matches one Sub Category Type.
//===============================================================

public static class ChartOfServicesItemTypes
{
    // MSS-ccc-sss-nnnnn   (Sub Category Type : Scheduled Services)
    public const string ScheduledService = "Scheduled Service";

    // BLC-ccc-sss-nnnnn   (Sub Category Type : Labor Chart)
    public const string LaborChart = "Labor Chart";

    // OCS-ccc-sss-nnnnn   (Sub Category Type : Customized Services)
    public const string CustomizedService = "Customized Service";

    // MSC-ccc-sss-nnnnn   (Sub Category Type : Membership Services)
    public const string MembershipService = "Membership Service";
}