//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries : one list page (GET paged)
//
//   Tab    : all · website · visits · open · due · converted ·
//            suspended
//   Type   : all · Service · Parts
//   Raise  : true on a fresh load : sold bikes whose service is
//            near get their enquiries first (as the full list did)
//   Search : every word must match (enquiry no, date, type,
//            enquirer, mobile, model, brand, registration,
//            chassis, complaint, items, executive, source, status,
//            location, branch, remarks)
//   Sort   : EnquiryNo · EnquiryDate · TypeText · EnquirerText ·
//            BikeText · RequestText · ExecutiveText · StatusText ·
//            NextText (default : newest first; Due : oldest
//            follow-up first; Visits : nearest visit first)
//===============================================================

public class ServiceEnquiryPageRequest
    : PagedRequest
{
    public string? Tab { get; set; }

    public string? Type { get; set; }

    public bool Raise { get; set; }
}


//===============================================================
// Answer
//
//   Counts       : All · Open · Due · Converted · Suspended
//                  (search applied; tab and type not)
//   WebsiteCount : website enquiries nobody has taken (all rows)
//   VisitsCount  : open enquiries with a visit date from today
//   ServiceCount / PartsCount : type chips of the tab + search
//===============================================================

public class ServiceEnquiryPagedResult
    : PagedResult<ServiceEnquiriesDto>
{
    public int WebsiteCount { get; set; }

    public int VisitsCount { get; set; }

    public int ServiceCount { get; set; }

    public int PartsCount { get; set; }
}
