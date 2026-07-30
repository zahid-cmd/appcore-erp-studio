//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.NavigationManagement;

//===============================================================
// Navigation Menu Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/navigation-management/navigation-menu")]

public class NavigationMenuController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly INavigationMenuRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    //===============================================================
    // Constructor
    //===============================================================

    public NavigationMenuController(
        INavigationMenuRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }

    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<NavigationMenuDto>>> GetAll()
    {
        List<NavigationMenuDto> menus =
            await _repository.GetAllAsync();

        return Ok(menus);
    }

    //===============================================================
    // Get By Module
    //===============================================================

    [HttpGet("module/{navigationModuleId:long}")]

    public async Task<ActionResult<List<NavigationMenuDto>>> GetByModule(
        long navigationModuleId)
    {
        List<NavigationMenuDto> menus =
            await _repository.GetByModuleAsync(
                navigationModuleId);

        return Ok(menus);
    }
    
    //===============================================================
    // Get Next Code
    //===============================================================

    [HttpGet("next-code/{navigationModuleId:long}")]

    public async Task<ActionResult<string>> GetNextCode(
        long navigationModuleId)
    {
        return Ok(
            await _repository.GetNextCodeAsync(
                navigationModuleId));
    }

    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults/{navigationModuleId:long}")]

    public async Task<ActionResult<NavigationMenuDefaultsDto>> GetDefaults(
        long navigationModuleId)
    {
        return Ok(
            await _repository.GetDefaultsAsync(
                navigationModuleId));
    }

    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    [HttpGet("suggested-display-order/{navigationModuleId:long}")]

    public async Task<ActionResult<int>> GetSuggestedDisplayOrder(
        long navigationModuleId)
    {
        return Ok(
            await _repository.GetSuggestedDisplayOrderAsync(
                navigationModuleId));
    }

    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<NavigationMenuDto>> GetById(
        long id)
    {
        NavigationMenuDto? menu =
            await _repository.GetByIdAsync(id);

        if (menu == null)
        {
            return NotFound();
        }

        return Ok(menu);
    }

    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateNavigationMenuDto dto)
    {
        if (await _repository.RouteKeyExistsAsync(
                dto.NavigationModuleId,
                dto.RouteKey))
        {
            return BadRequest(
                "This route key already exists in the selected navigation module.");
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
        UpdateNavigationMenuDto dto)
    {
        if (!await _repository.ExistsAsync(dto.Id))
        {
            return NotFound();
        }

        if (await _repository.RouteKeyExistsAsync(
                dto.NavigationModuleId,
                dto.RouteKey,
                dto.Id))
        {
            return BadRequest(
                "This route key already exists in the selected navigation module.");
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
                "There are no deleted navigation menus available to restore.");
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
                "Navigation Menu"));
    }
    
}