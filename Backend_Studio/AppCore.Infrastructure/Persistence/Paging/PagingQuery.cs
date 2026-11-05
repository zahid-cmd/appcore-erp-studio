//===============================================================
// Namespaces
//===============================================================

using System.Linq.Expressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Paging;


//===============================================================
// Server-side pagination helpers (shared by every list)
//---------------------------------------------------------------
// Usage in a repository :
//
//   private static readonly SortMap<CustomerEntity> Sorts =
//       new SortMap<CustomerEntity>("CustomerCode")
//           .Add("CustomerCode", x => x.CustomerCode)
//           .Add("CustomerName", x => x.CustomerName)
//           .Tie(x => x.CustomerId);
//
//   IQueryable<CustomerEntity> query = ...filters...;
//
//   if (request.SafeSearch != "")
//   {
//       string like = PagingQuery.LikePattern(request.SafeSearch);
//       query = query.Where(x => EF.Functions.ILike(x.CustomerName, like));
//   }
//
//   int total = await query.CountAsync();
//
//   List<CustomerEntity> page =
//       await Sorts.Apply(query, request)
//           .Page(request)
//           .ToListAsync();
//
// Sorting runs in the database, on the allowed columns only, with
// a tie-breaker so a row never shows on two pages.
//===============================================================

public static class PagingQuery
{
    //===========================================================
    // ILIKE pattern : "contains", with % _ \ typed by the user
    // matched literally
    //===========================================================

    public static string LikePattern(
        string text)
    {
        string escaped =
            (text ?? string.Empty)
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");

        return "%" + escaped + "%";
    }


    //===========================================================
    // Skip / Take for the requested page
    //===========================================================

    public static IQueryable<T> Page<T>(
        this IQueryable<T> query,
        PagedRequest request)
    {
        return query
            .Skip(request.Skip)
            .Take(request.SafePageSize);
    }


    //===========================================================
    // The requested page number, pulled back inside the last page
    // when the rows got fewer (e.g. after a delete)
    //===========================================================

    public static void FitPage(
        PagedRequest request,
        int totalCount)
    {
        int lastPage =
            Math.Max(
                1,
                (int)Math.Ceiling(totalCount / (double)request.SafePageSize));

        if (request.SafePage > lastPage)
        {
            request.Page = lastPage;
        }
    }
}


//===============================================================
// Allowed sort columns of one list
//===============================================================

public sealed class SortMap<T>
{
    private readonly Dictionary<string, Func<IQueryable<T>, bool, IOrderedQueryable<T>>> _sorts =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly string _defaultField;

    // The default sort runs newest / highest first when true
    private readonly bool _defaultDescending;

    private Func<IOrderedQueryable<T>, bool, IOrderedQueryable<T>>? _tie;


    public SortMap(
        string defaultField,
        bool defaultDescending = false)
    {
        _defaultField = defaultField;

        _defaultDescending = defaultDescending;
    }


    // An allowed column
    public SortMap<T> Add<TKey>(
        string field,
        Expression<Func<T, TKey>> key)
    {
        _sorts[field] =
            (query, descending) =>
                descending
                    ? query.OrderByDescending(key)
                    : query.OrderBy(key);

        return this;
    }


    // Last sort key (usually the primary key), ascending; or in
    // the same direction as the main sort when followDirection
    public SortMap<T> Tie<TKey>(
        Expression<Func<T, TKey>> key,
        bool followDirection = false)
    {
        _tie =
            (ordered, descending) =>
                followDirection && descending
                    ? ordered.ThenByDescending(key)
                    : ordered.ThenBy(key);

        return this;
    }


    // Sort by the requested column (or the default one)
    public IOrderedQueryable<T> Apply(
        IQueryable<T> query,
        PagedRequest request)
    {
        bool known =
            !string.IsNullOrWhiteSpace(request.Sort) &&
            _sorts.ContainsKey(request.Sort);

        string field =
            known
                ? request.Sort!
                : _defaultField;

        bool descending =
            known
                ? request.Descending
                : _defaultDescending;

        IOrderedQueryable<T> ordered =
            _sorts[field](query, descending);

        return _tie == null
            ? ordered
            : _tie(ordered, descending);
    }
}
