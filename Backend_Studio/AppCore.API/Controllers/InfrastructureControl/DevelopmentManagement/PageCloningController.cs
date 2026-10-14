//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Page Cloning Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/development-management/page-cloning")]

public class PageCloningController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IPageCloningRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public PageCloningController(
        IPageCloningRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<PageCloningDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<PageCloningDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Analyze Source Page
    //===========================================================

    [HttpGet("analyze")]

    public ActionResult<EntityAnalysisDto> Analyze(
        [FromQuery] string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(
                "Page name is required.");
        }

        return Ok(
            _repository.Analyze(name));
    }


    //===========================================================
    // Preview From The Wizard Plan (writes nothing)
    //===========================================================

    [HttpPost("preview-plan")]

    public async Task<ActionResult<PageCloningPreviewDto>> PreviewPlan(
        [FromBody] ClonePlanDto plan)
    {
        try
        {
            return Ok(
                await _repository.PreviewPlanAsync(plan));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Development Management",
                "Page Cloning"));
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<PageCloningDto>> GetById(
        long id)
    {
        PageCloningDto? pageCloning =
            await _repository.GetByIdAsync(id);

        if (pageCloning == null)
        {
            return NotFound();
        }

        return Ok(pageCloning);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreatePageCloningDto dto)
    {
        long userId = 1;

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            return Ok(id);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdatePageCloningDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.PageCloningId))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

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

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Restore Deleted Record
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
            return NotFound(
                "There are no deleted page cloning records available to restore.");
        }

        return NoContent();
    }


    //===========================================================
    // Preview Clone
    //===========================================================

    [HttpPost("{id:long}/preview")]

    public async Task<ActionResult<PageCloningPreviewDto>> Preview(
        long id)
    {
        try
        {
            return Ok(
                await _repository.PreviewAsync(id));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Apply Clone
    //===========================================================

    [HttpPost("{id:long}/apply")]

    public async Task<ActionResult<PageCloningResultDto>> Apply(
        long id,
        [FromQuery] bool overwriteEdited = false)
    {
        long userId = 1;

        try
        {
            return Ok(
                await _repository.ApplyAsync(
                    id,
                    overwriteEdited,
                    userId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    //===========================================================
    // Save Plan
    //===========================================================

    [HttpPost("save-plan")]

    public async Task<ActionResult<PageCloningResultDto>> SavePlan(
        [FromBody] ClonePlanDto plan,
        [FromQuery] bool overwriteEdited = false)
    {
        long userId = 1;

        try
        {
            return Ok(
                await _repository.SavePlanAsync(plan, overwriteEdited, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
    
    //===========================================================
    // Restore Code To Baseline
    //===========================================================

    [HttpPost("{id:long}/restore-baseline")]

    public async Task<ActionResult<PageCloningResultDto>> RestoreToBaseline(
        long id)
    {
        long userId = 1;

        try
        {
            return Ok(
                await _repository.RestoreToBaselineAsync(
                    id,
                    userId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}