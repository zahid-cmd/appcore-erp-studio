//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Infrastructure.Persistence;
using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Management switches (System Configurations, module
// MOD-010; created by EnquiryManagement_Switches.sql). Read by
// code; a switch that is missing or deleted behaves as its
// default (the behaviour before the switches existed).
//
// Sales Enquiries page
//   0001 Expected Purchase Date Required          ON
//   0002 Auto Interest Level by Days              ON
//   0003 Repeat Mobile Joins the Open Enquiry     ON   (website)
//   0004 Call Note Required                       ON
//   0005 Allow Test Ride Overbooking              ON
//   0006 Website Test Ride Booking                ON
//   0007 Test Ride Booking Window   days          ON 90
//   0008 Driving Licence Required for Test Ride   OFF  (website)
//   0009 Follow-up After a Test Ride  days        ON 1
// Service Enquiries page
//   0021 Call Note Required                       ON
//   0022 Allow Appointment Overbooking            ON
//   0023 Website Service Booking                  ON
//   0024 Appointment Booking Window  days         ON 180
//   0025 Follow-up Before the Visit  days         ON 1
//   0026 Service Reminder Lead Days  days         ON 7
// Module
//   0041 Website Enquiries per Hour  sends        ON 5
//===============================================================

public static class EnquirySwitches
{
    public const string PurchaseDateRequired = "CFG-MOD-010-0001";

    public const string AutoInterest = "CFG-MOD-010-0002";

    public const string RepeatMobileJoins = "CFG-MOD-010-0003";

    public const string SalesCallNoteRequired = "CFG-MOD-010-0004";

    public const string RideOverbooking = "CFG-MOD-010-0005";

    public const string WebsiteRideBooking = "CFG-MOD-010-0006";

    public const string RideWindow = "CFG-MOD-010-0007";

    public const string RideLicenceRequired = "CFG-MOD-010-0008";

    public const string FollowUpAfterRide = "CFG-MOD-010-0009";

    public const string ServiceCallNoteRequired = "CFG-MOD-010-0021";

    public const string AppointmentOverbooking = "CFG-MOD-010-0022";

    public const string WebsiteServiceBooking = "CFG-MOD-010-0023";

    public const string AppointmentWindow = "CFG-MOD-010-0024";

    public const string FollowUpBeforeVisit = "CFG-MOD-010-0025";

    public const string ServiceLeadDays = "CFG-MOD-010-0026";

    public const string WebsiteSendsPerHour = "CFG-MOD-010-0041";


    private static async Task<SystemConfigurationsEntity?> FindAsync(AppDbContext context, string code)
    {
        return await context.Set<SystemConfigurationsEntity>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ConfigurationCode == code && !x.IsDeleted);
    }


    // ON / OFF (missing : fallback)
    public static async Task<bool> OnAsync(AppDbContext context, string code, bool fallback)
    {
        SystemConfigurationsEntity? row =
            await FindAsync(context, code);

        return row?.IsEnabled ?? fallback;
    }


    // ON + a number : the number (empty / out of range : fallback);
    // OFF : null (the caller's "off" behaviour). Missing : fallback.
    public static async Task<int?> NumberAsync(AppDbContext context, string code, int fallback, int min, int max)
    {
        SystemConfigurationsEntity? row =
            await FindAsync(context, code);

        if (row == null)
        {
            return fallback;
        }

        if (!row.IsEnabled)
        {
            return null;
        }

        return int.TryParse((row.Value ?? string.Empty).Trim(), out int n) && n >= min && n <= max
            ? n
            : fallback;
    }
}
