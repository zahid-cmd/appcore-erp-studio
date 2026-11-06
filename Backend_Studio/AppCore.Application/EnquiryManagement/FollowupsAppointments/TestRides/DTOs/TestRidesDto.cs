//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Test Rides page (Follow-ups & Appointments) : list
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for the Test
// Rides submenu.
//
// A list row / the form's record is the board's DTO,
// AppCore.Application.EnquiryManagement.EnquiryProfiles
// .SalesTestRideDto (with PublicId, IsLive, IsOverdue). The period
// tabs and the Live / Overdue chips are shared with Service
// Appointments (FollowUpPeriods, FollowUpStatusFilters in
// ServiceAppointmentsDto.cs).
//===============================================================


//===============================================================
// ?page=&pageSize=&search=&sort=&dir=&period=&status=&branchId=
//
//   period   : upcoming (default) / today / past / all
//   status   : '' (all) / Live / Overdue / Booked / Confirmed /
//              Ridden / NoShow / Cancelled
//   branchId : 0 = every branch
//
// Counts (the period, branch and search applied; not the status) :
//   Total, Live, Overdue, Booked, Confirmed, Ridden, NoShow,
//   Cancelled
//===============================================================

public class TestRidesPageRequest
    : PagedRequest
{
    public string? Period { get; set; }

    public string? Status { get; set; }

    public long BranchId { get; set; }
}
