//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Common.Paging;


//===============================================================
// Paged Request (server-side pagination, shared by every list)
//---------------------------------------------------------------
// Query string of a list's "paged" call :
//
//     ?page=1&pageSize=10&search=rahim&sort=CustomerCode&dir=asc
//
// A module adds its own filters by inheriting :
//
//     public class CustomerProfilesPageRequest : PagedRequest
//     {
//         public string? Type { get; set; }
//     }
//
// Sort accepts only the columns the module allows (SortMap);
// anything else falls back to the module's default sort.
//===============================================================

public class PagedRequest
{
    public const int DefaultPageSize =
        10;

    public const int MaxPageSize =
        100;

    public const int MaxSearchLength =
        100;


    // 1-based
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = DefaultPageSize;

    public string? Search { get; set; }

    // Column name, e.g. CustomerCode
    public string? Sort { get; set; }

    // asc / desc
    public string? Dir { get; set; }


    //===========================================================
    // Safe values
    //===========================================================

    public int SafePage =>
        Page < 1 ? 1 : Page;

    public int SafePageSize =>
        PageSize < 1
            ? DefaultPageSize
            : Math.Min(PageSize, MaxPageSize);

    public int Skip =>
        (SafePage - 1) * SafePageSize;

    public bool Descending =>
        string.Equals(Dir, "desc", StringComparison.OrdinalIgnoreCase);

    // Trimmed, at most 100 characters, '' when empty
    public string SafeSearch
    {
        get
        {
            string text =
                (Search ?? string.Empty).Trim();

            return text.Length > MaxSearchLength
                ? text[..MaxSearchLength]
                : text;
        }
    }
}
