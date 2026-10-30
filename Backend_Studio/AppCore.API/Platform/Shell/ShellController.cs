//===============================================================
// App Shell Controller
//
// Favorites (sidebar footer), notifications (bell) and the top
// bar context. Login required (global fallback policy); every
// call works on the logged-in user only.
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Platform.Shell;


namespace AppCore.Api.Controllers.Platform;


[ApiController]
[Route("api/platform/shell")]
public class ShellController : ControllerBase
{
    private readonly IShellRepository _repository;


    public ShellController
    (
        IShellRepository repository
    )
    {
        _repository =
            repository;
    }


    //===========================================================
    // Favorites
    //===========================================================

    [HttpGet("favorites")]
    public async Task<ActionResult<List<ShellFavoriteDto>>> GetFavorites()
    {
        return Ok(
            await _repository.GetFavoritesAsync(
                this.CurrentUserId()));
    }


    [HttpPost("favorites/{submenuId:long}")]
    public async Task<ActionResult<List<ShellFavoriteDto>>> AddFavorite
    (
        long submenuId
    )
    {
        try
        {
            return Ok(
                await _repository.AddFavoriteAsync(
                    this.CurrentUserId(),
                    submenuId));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(exception.Message);
        }
    }


    [HttpDelete("favorites/{submenuId:long}")]
    public async Task<ActionResult<List<ShellFavoriteDto>>> RemoveFavorite
    (
        long submenuId
    )
    {
        return Ok(
            await _repository.RemoveFavoriteAsync(
                this.CurrentUserId(),
                submenuId));
    }


    [HttpPut("favorites/order")]
    public async Task<ActionResult<List<ShellFavoriteDto>>> ReorderFavorites
    (
        [FromBody] ReorderShellFavoritesDto dto
    )
    {
        return Ok(
            await _repository.ReorderFavoritesAsync(
                this.CurrentUserId(),
                dto?.SubmenuIds ?? new List<long>()));
    }


    //===========================================================
    // Notifications (login branch from the token)
    //===========================================================

    [HttpGet("notifications")]
    public async Task<ActionResult<List<ShellNotificationDto>>> GetNotifications()
    {
        return Ok(
            await _repository.GetNotificationsAsync(
                this.CurrentUserId(),
                this.CurrentBranchId()));
    }


    //===========================================================
    // Context (financial year for the top bar)
    //===========================================================

    [HttpGet("context")]
    public async Task<ActionResult<ShellContextDto>> GetContext()
    {
        return Ok(
            await _repository.GetContextAsync());
    }
}