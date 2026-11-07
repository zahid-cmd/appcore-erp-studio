//===============================================================
// Enquiry Dashboard (Enquiry Management > Enquiry Profiles)
//
// Read-only page, NO Code Sync. One answer carries every figure
// of the page for a period (enquiry date), a branch and an
// executive (0 = all). Follow-ups due and today's test rides /
// appointments are "now" figures : they ignore the period.
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


// Query : ?branchId=&from=&to=&executiveId=
public class EnquiryDashboardRequest
{
    public long? BranchId { get; set; }

    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }

    public long? ExecutiveId { get; set; }
}


// A name and a figure (sources, interest, models, lost reasons)
public class EnquiryDashboardCountDto
{
    public string Name { get; set; } = string.Empty;

    // #RRGGBB from Enquiry Setup, else ''
    public string Color { get; set; } = string.Empty;

    public int Count { get; set; }
}


// One point of the trend (a day, or a month for long periods)
public class EnquiryDashboardTrendDto
{
    public string Label { get; set; } = string.Empty;

    public int Sales { get; set; }

    public int Service { get; set; }
}


// Today's agenda : follow-ups due / overdue, today's test rides
// and service appointments
public class EnquiryDashboardAgendaDto
{
    // SalesFollowUp / ServiceFollowUp / TestRide / Appointment
    public string Kind { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Detail { get; set; } = string.Empty;

    // "Overdue 2 days" / "Today" / "11:00 AM"
    public string WhenText { get; set; } = string.Empty;

    public int OverdueDays { get; set; }

    // The record the line opens (enquiry, ride or appointment)
    public Guid? PublicId { get; set; }
}


// One executive's sales enquiries in the period
public class EnquiryDashboardExecutiveDto
{
    public long UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Total { get; set; }

    public int Open { get; set; }

    public int Won { get; set; }

    public int Lost { get; set; }

    // Won / (Won + Lost) in %, null when nothing is closed
    public decimal? ConversionRate { get; set; }

    // Follow-ups (sales + service) past their date now
    public int Overdue { get; set; }
}


public class EnquiryDashboardOptionDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}


public class EnquiryDashboardDto
{
    public DateOnly From { get; set; }

    public DateOnly To { get; set; }

    public DateOnly Today { get; set; }

    // Sales enquiries of the period
    public int SalesTotal { get; set; }

    public int SalesOpen { get; set; }

    public int SalesWon { get; set; }

    public int SalesLost { get; set; }

    // Won / (Won + Lost) in %, null when nothing is closed
    public decimal? ConversionRate { get; set; }

    // Service enquiries of the period
    public int ServiceTotal { get; set; }

    public int ServiceOpen { get; set; }

    public int ServiceConverted { get; set; }

    public int ServiceLost { get; set; }

    // Now : open enquiries with the next follow-up today or past
    public int FollowUpsDue { get; set; }

    public int FollowUpsOverdue { get; set; }

    // Today, not cancelled
    public int TestRidesToday { get; set; }

    public int TestRidesTodayConfirmed { get; set; }

    public int AppointmentsToday { get; set; }

    public int AppointmentsTodayPickup { get; set; }

    // Sales funnel of the period
    public int FunnelTestRidden { get; set; }

    // Enquiry date to maturity (sale), matured enquiries
    public decimal? AverageDaysToMaturity { get; set; }

    public List<EnquiryDashboardCountDto> Sources { get; set; } = new();

    // Open sales enquiries by interest level
    public List<EnquiryDashboardCountDto> Interest { get; set; } = new();

    // Top models asked (sales)
    public List<EnquiryDashboardCountDto> Models { get; set; } = new();

    public List<EnquiryDashboardCountDto> LostReasons { get; set; } = new();

    // Day / Month
    public string TrendUnit { get; set; } = "Day";

    public List<EnquiryDashboardTrendDto> Trend { get; set; } = new();

    public List<EnquiryDashboardAgendaDto> Agenda { get; set; } = new();

    // More agenda lines than shown
    public int AgendaMore { get; set; }

    public List<EnquiryDashboardExecutiveDto> Executives { get; set; } = new();

    // Filters
    public List<EnquiryDashboardOptionDto> Branches { get; set; } = new();

    public List<EnquiryDashboardOptionDto> ExecutiveOptions { get; set; } = new();
}
