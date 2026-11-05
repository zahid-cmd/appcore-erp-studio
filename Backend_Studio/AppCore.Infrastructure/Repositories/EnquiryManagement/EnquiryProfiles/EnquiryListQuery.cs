//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using AppCore.Application.Common.Paging;
using AppCore.Infrastructure.Persistence.Paging;


//===============================================================
// Namespace (as the enquiry repositories)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry List Query
//
// Sales and Service Enquiries build each row on the server (status
// stage, interest by days left, request summary ...), so their
// list pages filter, count, sort and page the built rows here :
//   Search : every word must be found in the row's text (dates
//            also as 03 Nov 2026 · 3-11-2026 · 03/11/2026 ·
//            2026-11-03)
//   Sort   : a known field, ascending or descending (blank values
//            first when ascending); otherwise the order given
//   Page   : the asked page, moved back to the last page when the
//            list became shorter
//===============================================================

internal static class EnquiryListQuery
{
    private static readonly string[] Months =
        { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };


    // Search words, lower case (none = no search)
    public static string[] Words
    (
        PagedRequest request
    )
    {
        return request.SafeSearch
            .ToLowerInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }


    // A date in every way a user may type it
    public static string DateText
    (
        DateOnly? date
    )
    {
        if
        (
            !date.HasValue
        )
        {
            return string.Empty;
        }

        DateOnly d = date.Value;

        string dd = d.Day.ToString("00", CultureInfo.InvariantCulture);

        string mm = d.Month.ToString("00", CultureInfo.InvariantCulture);

        string y = d.Year.ToString(CultureInfo.InvariantCulture);

        return $"{dd} {Months[d.Month - 1]} {y} {d.Day}-{d.Month}-{y} {dd}-{mm}-{y} {d.Day}/{d.Month}/{y} {dd}/{mm}/{y} {y}-{mm}-{dd}";
    }


    // Every word inside the row's text
    public static bool Matches
    (
        string[] words,
        params string?[] parts
    )
    {
        if
        (
            words.Length == 0
        )
        {
            return true;
        }

        string text =
            string.Join(' ', parts.Where(x => !string.IsNullOrWhiteSpace(x)))
                .ToLowerInvariant();

        return words.All(w => text.Contains(w));
    }


    // Blank first (ascending); text without case; numbers / dates
    // by value
    private sealed class LooseComparer
        : IComparer<object?>
    {
        public static readonly LooseComparer Instance = new();

        public int Compare
        (
            object? a,
            object? b
        )
        {
            bool blankA = a == null || (a is string sa && sa.Length == 0);

            bool blankB = b == null || (b is string sb && sb.Length == 0);

            if (blankA && blankB) return 0;

            if (blankA) return -1;

            if (blankB) return 1;

            if
            (
                a is string textA
                &&
                b is string textB
            )
            {
                return string.Compare(textA, textB, StringComparison.OrdinalIgnoreCase);
            }

            return Comparer<object>.Default.Compare(a!, b!);
        }
    }


    // Sort by a known field (stable : equal rows keep the order
    // given); unknown field = the order given
    public static List<T> Sort<T>
    (
        List<T> rows,
        PagedRequest request,
        Dictionary<string, Func<T, object?>> keys
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(request.Sort)
            ||
            !keys.TryGetValue(request.Sort, out Func<T, object?>? key)
        )
        {
            return rows;
        }

        return request.Descending
            ? rows.OrderByDescending(key, LooseComparer.Instance).ToList()
            : rows.OrderBy(key, LooseComparer.Instance).ToList();
    }


    // The asked page of the sorted rows
    public static List<T> Page<T>
    (
        List<T> rows,
        PagedRequest request
    )
    {
        PagingQuery.FitPage(request, rows.Count);

        return rows
            .Skip(request.Skip)
            .Take(request.SafePageSize)
            .ToList();
    }
}
