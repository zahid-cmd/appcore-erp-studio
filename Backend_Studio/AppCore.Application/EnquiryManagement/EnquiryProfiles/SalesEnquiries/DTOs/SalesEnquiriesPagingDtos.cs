//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries : one list page (GET paged)
//
//   Tab      : all · website · open · due · lapsed · matured ·
//              lost (Suspended)
//   Interest : all · none · an interest level id
//   Search   : every word must match (enquiry no, date, enquirer,
//              mobile, model, brand, executive, colour, source,
//              status, interest, payment, location, branch,
//              remarks)
//   Sort     : EnquiryNo · EnquiryDate · EnquirerText ·
//              ModelColourText · ExecutiveText · InterestText ·
//              StatusText · NextFollowUpDate (default : newest
//              first; Due / Lapsed : oldest follow-up first)
//===============================================================

public class SalesEnquiryPageRequest
    : PagedRequest
{
    public string? Tab { get; set; }

    public string? Interest { get; set; }
}


// One interest chip : key = level id or "none"
public class EnquiryChipCountDto
{
    public string Key { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;

    public int Count { get; set; }
}


//===============================================================
// Answer
//
//   Counts       : All · Open · Due · Lapsed · Matured · Suspended
//                  (search applied; tab and interest not)
//   WebsiteCount : website enquiries nobody has taken (all rows)
//   Interests    : chip counts of the tab + search
//   Ids          : every enquiry of the view in list order (Print)
//===============================================================

public class SalesEnquiryPagedResult
    : PagedResult<SalesEnquiriesDto>
{
    public int WebsiteCount { get; set; }

    public List<EnquiryChipCountDto> Interests { get; set; } = new();

    public List<long> Ids { get; set; } = new();
}
