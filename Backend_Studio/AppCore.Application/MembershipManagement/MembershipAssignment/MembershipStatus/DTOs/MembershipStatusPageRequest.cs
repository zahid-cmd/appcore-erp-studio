//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Status list : one page (GET paged)
//
//   Tab    : all · Pending · Active · Expired · Suspended ·
//            Cancelled
//   CardId : membership card (blank = every card)
//
// Counts : All / <status> (card + search applied).
// Sort   : the list column fields; empty = newest first.
//===============================================================

public class MembershipStatusPageRequest
    : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Tab { get; set; }

    public long? CardId { get; set; }
}
