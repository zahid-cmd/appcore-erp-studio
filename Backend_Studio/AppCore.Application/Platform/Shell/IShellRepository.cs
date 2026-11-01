//===============================================================
// App Shell Repository
//
// Favorites (per user, in the database), the notification list
// and the top bar context (financial year).
//===============================================================

namespace AppCore.Application.Platform.Shell;


public interface IShellRepository
{
    //===========================================================
    // Favorites
    //===========================================================

    // The user's favorite pages (active pages only), in order
    Task<List<ShellFavoriteDto>> GetFavoritesAsync(
        long userId);

    // Adds a page; already a favorite = no change
    Task<List<ShellFavoriteDto>> AddFavoriteAsync(
        long userId,
        long submenuId);

    // Removes a page; not a favorite = no change
    Task<List<ShellFavoriteDto>> RemoveFavoriteAsync(
        long userId,
        long submenuId);

    // Saves a new order (ids not given keep their place after them)
    Task<List<ShellFavoriteDto>> ReorderFavoritesAsync(
        long userId,
        List<long> submenuIds);


    //===========================================================
    // Notifications (bell)
    //===========================================================

    Task<List<ShellNotificationDto>> GetNotificationsAsync(
        long userId,
        long? branchId);


    //===========================================================
    // Context (top bar chips)
    //===========================================================

    Task<ShellContextDto> GetContextAsync();
}