//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Service Appointments page (Follow-ups & Appointments) : list
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for the Service
// Appointments submenu.
//
// A list row / the form's record is the board's DTO,
// AppCore.Application.EnquiryManagement.EnquiryProfiles
// .ServiceAppointmentDto (with PublicId, IsLive, IsOverdue), so
// the board and the list always show the same fields.
//===============================================================


//===============================================================
// Period tabs of the Service Appointments and Test Rides lists
//===============================================================

public static class FollowUpPeriods
{
    // Today and later (default)
    public const string Upcoming = "upcoming";

    public const string Today = "today";

    // Before today
    public const string Past = "past";

    public const string All = "all";

    public static string Normalize(string? value)
    {
        string text =
            (value ?? string.Empty).Trim().ToLowerInvariant();

        return text == Today || text == Past || text == All
            ? text
            : Upcoming;
    }
}


//===============================================================
// Status filter values beside the statuses themselves
//===============================================================

public static class FollowUpStatusFilters
{
    // Booked + Confirmed
    public const string Live = "Live";

    // Live, and the date has passed
    public const string Overdue = "Overdue";
}


//===============================================================
// ?page=&pageSize=&search=&sort=&dir=&period=&status=&branchId=
//
//   period   : upcoming (default) / today / past / all
//   status   : '' (all) / Live / Overdue / Booked / Confirmed /
//              Arrived / NoShow / Cancelled
//   branchId : 0 = every branch
//
// Counts (the period, branch and search applied; not the status) :
//   Total, Live, Overdue, Booked, Confirmed, Arrived, NoShow,
//   Cancelled
//===============================================================

public class ServiceAppointmentsPageRequest
    : PagedRequest
{
    public string? Period { get; set; }

    public string? Status { get; set; }

    public long BranchId { get; set; }
}
