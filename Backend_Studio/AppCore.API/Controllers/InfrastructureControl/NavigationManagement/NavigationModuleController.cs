//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.InfrastructureControl.NavigationManagement.Module.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Module.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.NavigationManagement;


//===============================================================
// Navigation Module Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/navigation-management/navigation-module")]

public class NavigationModuleController : ControllerBase
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly INavigationModuleRepository _repository;

    private readonly IActivityHistoryRepository _historyRepository;



    //===========================================================
    // Constructor
    //===========================================================

    public NavigationModuleController(
        INavigationModuleRepository repository,

        IActivityHistoryRepository historyRepository)
    {
        _repository = repository;

        _historyRepository = historyRepository;
    }



    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<NavigationModuleDto>>> GetAll()
    {
        List<NavigationModuleDto> modules =
            await _repository.GetAllAsync();

        return Ok(modules);
    }



    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<NavigationModuleDto>> GetById(
        long id)
    {
        NavigationModuleDto? module =
            await _repository.GetByIdAsync(id);


        if (module == null)
        {
            return NotFound();
        }


        return Ok(module);
    }

    //===========================================================
    // Get List History
    //
    // Used by Module List Page History Drawer
    // Shows all Create / Update / Delete activities
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetListHistory()
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetListHistoryAsync(

                "Navigation Management",

                "Navigation Module"
            );


        return Ok(history);
    }

    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory(
        long id)
    {

        List<ActivityHistoryDto> history =
            await _historyRepository.GetHistoryAsync(

                "Navigation Management",

                "Navigation Module",

                id
            );


        return Ok(history);
    }



    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode()
    {
        string code =
            await _repository.GetNextCodeAsync();

        return Ok(code);
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<NavigationModuleDefaultsDto>> GetDefaults()
    {
        NavigationModuleDefaultsDto defaults =
            await _repository.GetDefaultsAsync();

        return Ok(defaults);
    }

    //===========================================================
    // Get Suggested Display Order
    //===========================================================

    [HttpGet("suggested-display-order")]

    public async Task<ActionResult<int>> GetSuggestedDisplayOrder()
    {
        int displayOrder =
            await _repository.GetSuggestedDisplayOrderAsync();

        return Ok(displayOrder);
    }

    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateNavigationModuleDto dto)
    {
        if (await _repository.ModuleNameExistsAsync(dto.Name))
        {
            return BadRequest(
                "A navigation module with this name already exists.");
        }

        if (await _repository.RouteKeyExistsAsync(dto.RouteKey))
        {
            return BadRequest(
                "This route key already exists.");
        }

        if (await _repository.DisplayOrderExistsAsync(dto.DisplayOrder))
        {
            return BadRequest(
                "This display order is already assigned to another navigation module.");
        }

        long userId = 1;

        long id =
            await _repository.CreateAsync(
                dto,
                userId);

        return Ok(id);
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateNavigationModuleDto dto)
    {
        if (!await _repository.ExistsAsync(dto.Id))
        {
            return NotFound();
        }

        if (await _repository.ModuleNameExistsAsync(
                dto.Name,
                dto.Id))
        {
            return BadRequest(
                "A navigation module with this name already exists.");
        }

        if (await _repository.RouteKeyExistsAsync(
                dto.RouteKey,
                dto.Id))
        {
            return BadRequest(
                "This route key already exists.");
        }

        if (await _repository.DisplayOrderExistsAsync(
                dto.DisplayOrder,
                dto.Id))
        {
            return BadRequest(
                "This display order is already assigned to another navigation module.");
        }

        long userId = 1;

        await _repository.UpdateAsync(
            dto,
            userId);

        return NoContent();
    }


    //===========================================================
    // Delete
    //===========================================================

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

    //===========================================================
    // Restore
    //===========================================================

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
                "There are no deleted navigation modules available to restore.");
        }

        return NoContent();
    }
}