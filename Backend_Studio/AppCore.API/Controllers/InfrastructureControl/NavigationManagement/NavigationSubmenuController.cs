//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.NavigationManagement;

//===============================================================
// Navigation Submenu Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/navigation-management/navigation-submenu")]

public class NavigationSubmenuController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly INavigationSubmenuRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    //===============================================================
    // Constructor
    //===============================================================

    public NavigationSubmenuController(
        INavigationSubmenuRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }

    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<NavigationSubmenuDto>>> GetAll()
    {
        List<NavigationSubmenuDto> submenus =
            await _repository.GetAllAsync();

        return Ok(submenus);
    }

    //===============================================================
    // Get Next Code
    //===============================================================

    [HttpGet("next-code/{navigationMenuId:long}")]

    public async Task<ActionResult<string>> GetNextCode(
        long navigationMenuId)
    {
        return Ok(
            await _repository.GetNextCodeAsync(
                navigationMenuId));
    }

    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults/{navigationMenuId:long}")]

    public async Task<ActionResult<NavigationSubmenuDefaultsDto>> GetDefaults(
        long navigationMenuId)
    {
        return Ok(
            await _repository.GetDefaultsAsync(
                navigationMenuId));
    }

    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    [HttpGet("suggested-display-order/{navigationMenuId:long}")]

    public async Task<ActionResult<int>> GetSuggestedDisplayOrder(
        long navigationMenuId)
    {
        return Ok(
            await _repository.GetSuggestedDisplayOrderAsync(
                navigationMenuId));
    }

    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<NavigationSubmenuDto>> GetById(
        long id)
    {
        NavigationSubmenuDto? submenu =
            await _repository.GetByIdAsync(id);

        if (submenu == null)
        {
            return NotFound();
        }

        return Ok(submenu);
    }

    //===============================================================
    // Get By Menu
    //===============================================================

    [HttpGet("menu/{navigationMenuId:long}")]

    public async Task<ActionResult<List<NavigationSubmenuDto>>> GetByMenu(
        long navigationMenuId)
    {
        List<NavigationSubmenuDto> submenus =
            await _repository.GetByMenuAsync(
                navigationMenuId);

        return Ok(submenus);
    }
    
    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateNavigationSubmenuDto dto)
    {
        if (await _repository.RouteKeyExistsAsync(
                dto.NavigationMenuId,
                dto.RouteKey))
        {
            return BadRequest(
                "This route key already exists in the selected navigation menu.");
        }

        long userId = 1;

        long id =
            await _repository.CreateAsync(
                dto,
                userId);

        return Ok(id);
    }

    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateNavigationSubmenuDto dto)
    {
        if (!await _repository.ExistsAsync(dto.Id))
        {
            return NotFound();
        }

        if (await _repository.RouteKeyExistsAsync(
                dto.NavigationMenuId,
                dto.RouteKey,
                dto.Id))
        {
            return BadRequest(
                "This route key already exists in the selected navigation menu.");
        }

        long userId = 1;

        await _repository.UpdateAsync(
            dto,
            userId);

        return NoContent();
    }

    //===============================================================
    // Delete
    //===============================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

        long userId = 1;

        await _repository.DeleteAsync(
            id,
            userId);

        return NoContent();
    }

    //===============================================================
    // Restore
    //===============================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        bool restored =
            await _repository.RestoreAsync(
                userId);

        if (!restored)
        {
            return BadRequest(
                "There are no deleted navigation submenus available to restore.");
        }

        return NoContent();
    }
    //===============================================================
    // Get History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Navigation Management",
                "Navigation Submenu"));
    }
}