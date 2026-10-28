//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.VatManagement.VatSetup;


//===============================================================
// Sales VAT Controller
//===============================================================

[ApiController]

[Route("api/vat-management/vat-setup/sales-vat")]

public class SalesVatController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly ISalesVatRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<SalesVatController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public SalesVatController(
        ISalesVatRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<SalesVatController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<List<SalesVatDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults (next code, VAT types, ledgers, today)
    //===========================================================

    [HttpGet("defaults")]
    public async Task<ActionResult<SalesVatDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get Rate : the rule in force for a VAT Type on a date
    //   GET rate?vatType=Motor%20Bikes&date=2026-10-28
    // 404 : no active rule covers that date
    //===========================================================

    [HttpGet("rate")]
    public async Task<ActionResult<SalesVatDto>> GetRate(
        [FromQuery] string vatType,
        [FromQuery] string date)
    {
        if
        (
            !DateOnly.TryParseExact(
                (date ?? string.Empty).Trim(),
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly day)
        )
        {
            return BadRequest("Date must be yyyy-MM-dd.");
        }

        SalesVatDto? rule =
            await _repository.GetRateAsync(
                vatType,
                day);

        if (rule == null)
        {
            return NotFound(
                $"No active {vatType} rate on {day:dd-MMM-yyyy}.");
        }

        return Ok(rule);
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SalesVatDto>> GetById(
        long id)
    {
        SalesVatDto? item =
            await _repository.GetByIdAsync(id);

        if (item == null)
        {
            return NotFound();
        }

        return Ok(item);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<long>> Create(
        CreateSalesVatDto dto)
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create Sales VAT rule failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to create the Sales VAT rule.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]
    public async Task<IActionResult> Update(
        UpdateSalesVatDto dto)
    {
        long userId = 1;

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Update Sales VAT rule failed. Id: {Id}", dto.SalesVatId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to update the Sales VAT rule.");
        }
    }


    //===========================================================
    // Extend : same rate, later Valid To
    //===========================================================

    [HttpPut("extend")]
    public async Task<IActionResult> Extend(
        ExtendSalesVatDto dto)
    {
        long userId = 1;

        try
        {
            await _repository.ExtendAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Extend Sales VAT rule failed. Id: {Id}", dto.SalesVatId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to extend the Sales VAT rule.");
        }
    }


    //===========================================================
    // Delete
    //
    // 404 : not found / already deleted
    // 409 : in use (future : purchase / sale documents)
    //===========================================================

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id)
    {
        long userId = 1;

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Delete Sales VAT rule failed. Id: {Id}", id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to delete the Sales VAT rule.");
        }
    }


    //===========================================================
    // Restore (most recently deleted)
    //
    // 404 : nothing to restore
    // 409 : clashes with a live active rule
    //===========================================================

    [HttpPut("restore")]
    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted Sales VAT rules available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore Sales VAT rule failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to restore the Sales VAT rule.");
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
                "VAT Management",
                "SalesVat"));
    }
}