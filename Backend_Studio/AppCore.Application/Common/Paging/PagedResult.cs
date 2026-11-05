//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Common.Paging;


//===============================================================
// Paged Result (server-side pagination, shared by every list)
//---------------------------------------------------------------
// One page of rows plus the totals :
//
//     {
//       "Items":      [ ...one page... ],
//       "TotalCount": 4823,     rows matching the filters
//       "Page":       1,
//       "PageSize":   10,
//       "Counts":     { "Inbound": 4500, "Outside": 323 }
//     }
//
// Counts : optional, e.g. the number on each list tab (the other
// filters and the search applied, the tab itself not).
//===============================================================

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();

    public int TotalCount { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = PagedRequest.DefaultPageSize;

    public Dictionary<string, int> Counts { get; set; } = new();
}
