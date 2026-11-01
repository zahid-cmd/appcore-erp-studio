//===============================================================
// User Favorites
//
// One row per page a user has starred in the sidebar.
// The page is kept by its NavigationSubmenus id (not its route),
// so a renamed page or route keeps working.
//
// Table : UserFavorites (script : UserFavorites.sql)
//===============================================================

namespace AppCore.Domain.Platform.Shell;


public class UserFavorites
{
    public long UserFavoriteId { get; set; }

    // UserProfiles.UserProfileId (no database foreign key)
    public long UserProfileId { get; set; }

    // NavigationSubmenus.Id (no database foreign key)
    public long NavigationSubmenuId { get; set; }

    // Order in the Favorites panel (1, 2, 3 …)
    public int SortOrder { get; set; }

    public DateTime CreatedDate { get; set; }
}