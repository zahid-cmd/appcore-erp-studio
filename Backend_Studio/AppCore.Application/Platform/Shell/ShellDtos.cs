//===============================================================
// App Shell DTOs
//
// Used by the top bar, the sidebar footer (Favorites) and the
// app footer.
//===============================================================

namespace AppCore.Application.Platform.Shell;


//===============================================================
// Favorite page (Favorites panel)
//===============================================================

public class ShellFavoriteDto
{
    public long SubmenuId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Icon { get; set; } = string.Empty;

    public string Route { get; set; } = string.Empty;

    public string MenuName { get; set; } = string.Empty;

    public string ModuleName { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}


//===============================================================
// Reorder favorites (submenu ids in the new order)
//===============================================================

public class ReorderShellFavoritesDto
{
    public List<long> SubmenuIds { get; set; } = new();
}


//===============================================================
// Notification (bell)
//
// Key  : changes whenever the content changes, so the browser
//        can remember which ones were read.
// Kind : 'approval' | 'cheque' | 'website'
//===============================================================

public class ShellNotificationDto
{
    public string Key { get; set; } = string.Empty;

    public string Kind { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Detail { get; set; } = string.Empty;

    public string Route { get; set; } = string.Empty;

    public DateTime Date { get; set; }
}


//===============================================================
// Shell context (top bar chips)
//===============================================================

public class ShellContextDto
{
    // Business date (Asia/Dhaka), yyyy-MM-dd
    public string Today { get; set; } = string.Empty;

    // Financial year that covers today ('' when none)
    public string FinancialYearCode { get; set; } = string.Empty;

    public string FinancialYearName { get; set; } = string.Empty;

    // Open / Closed …
    public string YearStatus { get; set; } = string.Empty;
}