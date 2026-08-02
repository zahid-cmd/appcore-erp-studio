//===============================================================
// Imports
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Project Synchronization Controller
//===============================================================

[ApiController]

[Route(
    "api/infrastructure-control/development-management/project-synchronization")]

public class ProjectSynchronizationController
    : ControllerBase
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly IProjectSynchronizationRepository
        _repository;

    //===========================================================
    // Constructor
    //===========================================================

    public ProjectSynchronizationController(
        IProjectSynchronizationRepository repository)
    {
        _repository =
            repository;
    }

    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ProjectSynchronizationDto>>>
        GetAll()
    {
        List<ProjectSynchronizationDto> result =
            await _repository.GetAllAsync();

        return Ok(
            result);
    }

    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<ProjectSynchronizationDto>>
        GetById(
            long id)
    {
        ProjectSynchronizationDto? result =
            await _repository.GetByIdAsync(
                id);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(
            result);
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<ProjectSynchronizationDefaultsDto>>
        GetDefaults()
    {
        ProjectSynchronizationDefaultsDto result =
            await _repository.GetDefaultsAsync();

        return Ok(
            result);
    }

    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>>
        Create(
            CreateProjectSynchronizationDto dto)
    {
        long id =
            await _repository.CreateAsync(
                dto,
                1);

        return Ok(
            id);
    }

    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult>
        Update(
            UpdateProjectSynchronizationDto dto)
    {
        await _repository.UpdateAsync(
            dto,
            1);

        return NoContent();
    }

    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult>
        Delete(
            long id)
    {
        await _repository.DeleteAsync(
            id,
            1);

        return NoContent();
    }

    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult>
        Restore()
    {
        bool restored =
            await _repository.RestoreAsync(
                1);

        if (!restored)
        {
            return NotFound();
        }

        return NoContent();
    }

    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>>
        GetHistory()
    {
        List<ActivityHistoryDto> result =
            await _repository.GetHistoryAsync();

        return Ok(
            result);
    }

    //===========================================================
    // Get Modules
    //===========================================================

    [HttpGet("modules")]

    public async Task<ActionResult<List<ModuleDto>>>
        GetModules()
    {
        List<ModuleDto> result =
            await _repository.GetModulesAsync();

        return Ok(
            result);
    }

    //===========================================================
    // Get Menus
    //===========================================================

    [HttpGet("menus")]

    public async Task<ActionResult<List<MenuDto>>>
        GetMenus()
    {
        List<MenuDto> result =
            await _repository.GetMenusAsync();

        return Ok(
            result);
    }

    //===========================================================
    // Get Submenus
    //===========================================================

    [HttpGet("submenus")]

    public async Task<ActionResult<List<SubmenuDto>>>
        GetSubmenus()
    {
        List<SubmenuDto> result =
            await _repository.GetSubmenusAsync();

        return Ok(
            result);
    }

    //===========================================================
    // Get All Modules
    //===========================================================

    [HttpGet("modules/all")]

    public async Task<ActionResult<List<ModuleDto>>>
        GetAllModules()
    {
        List<ModuleDto> result =
            await _repository.GetAllModulesAsync();

        return Ok(
            result);
    }


    //===========================================================
    // Get All Menus
    //===========================================================

    [HttpGet("menus/all")]

    public async Task<ActionResult<List<MenuDto>>>
        GetAllMenus()
    {
        List<MenuDto> result =
            await _repository.GetAllMenusAsync();

        return Ok(
            result);
    }


    //===========================================================
    // Get All Submenus
    //===========================================================

    [HttpGet("submenus/all")]

    public async Task<ActionResult<List<SubmenuDto>>>
        GetAllSubmenus()
    {
        List<SubmenuDto> result =
            await _repository.GetAllSubmenusAsync();

        return Ok(
            result);
    }
}