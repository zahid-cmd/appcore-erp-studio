/* ============================================================
   Enquiry Dashboard (Enquiry Profiles, read only, NO Code Sync)

   One answer per period / branch / executive. Follow-ups due
   and today's test rides / appointments are "now" figures.
============================================================ */

export interface EnquiryDashboardCount
{
    Name:
        string;

    // #RRGGBB from Enquiry Setup, else ''
    Color:
        string;

    Count:
        number;
}

export interface EnquiryDashboardTrend
{
    Label:
        string;

    Sales:
        number;

    Service:
        number;
}

export type EnquiryDashboardAgendaKind =
    | 'SalesFollowUp'
    | 'ServiceFollowUp'
    | 'TestRide'
    | 'Appointment';

export interface EnquiryDashboardAgenda
{
    Kind:
        EnquiryDashboardAgendaKind;

    Title:
        string;

    Detail:
        string;

    WhenText:
        string;

    OverdueDays:
        number;

    PublicId:
        string | null;
}

export interface EnquiryDashboardExecutive
{
    UserId:
        number;

    Name:
        string;

    Total:
        number;

    Open:
        number;

    Won:
        number;

    Lost:
        number;

    // % or null when nothing is closed
    ConversionRate:
        number | null;

    Overdue:
        number;
}

export interface EnquiryDashboardOption
{
    Id:
        number;

    Name:
        string;
}

export interface EnquiryDashboard
{
    From:
        string;

    To:
        string;

    Today:
        string;

    SalesTotal:
        number;

    SalesOpen:
        number;

    SalesWon:
        number;

    SalesLost:
        number;

    ConversionRate:
        number | null;

    ServiceTotal:
        number;

    ServiceOpen:
        number;

    ServiceConverted:
        number;

    ServiceLost:
        number;

    FollowUpsDue:
        number;

    FollowUpsOverdue:
        number;

    TestRidesToday:
        number;

    TestRidesTodayConfirmed:
        number;

    AppointmentsToday:
        number;

    AppointmentsTodayPickup:
        number;

    FunnelTestRidden:
        number;

    AverageDaysToMaturity:
        number | null;

    Sources:
        EnquiryDashboardCount[];

    Interest:
        EnquiryDashboardCount[];

    Models:
        EnquiryDashboardCount[];

    LostReasons:
        EnquiryDashboardCount[];

    // Day / Month
    TrendUnit:
        string;

    Trend:
        EnquiryDashboardTrend[];

    Agenda:
        EnquiryDashboardAgenda[];

    AgendaMore:
        number;

    Executives:
        EnquiryDashboardExecutive[];

    Branches:
        EnquiryDashboardOption[];

    ExecutiveOptions:
        EnquiryDashboardOption[];
}

// Query (dates yyyy-MM-dd; 0 = all)
export interface EnquiryDashboardFilter
{
    BranchId:
        number;

    From:
        string;

    To:
        string;

    ExecutiveId:
        number;
}
