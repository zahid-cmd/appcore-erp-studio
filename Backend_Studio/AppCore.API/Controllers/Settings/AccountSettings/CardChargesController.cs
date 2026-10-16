//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Card Charges Controller
//
// Master = POS Account. All routes use the POS Account id.
//
// Error mapping:
//   InvalidOperationException → 400 (Create / Update)
//                             → 409 (Delete / Restore)
//   KeyNotFoundException      → 404
//   Anything else             → 500 (logged)
//===============================================================

[ApiController]

[Route("api/settings/account-settings/card-charges")]

public class CardChargesController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly ICardChargesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<CardChargesController> _logger;


    //===============================================================
    // Constructor
    //===============================================================

    public CardChargesController(
        ICardChargesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<CardChargesController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<CardChargesDto>>> GetAll()
    {
        try
        {
            List<CardChargesDto> cardCharges =
                await _repository.GetAllAsync();

            return Ok(cardCharges);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card charges.");

            return StatusCode(500, "Unable to load card charges.");
        }
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<CardChargesDefaultsDto>> GetDefaults()
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card charges defaults.");

            return StatusCode(500, "Unable to load card charges defaults.");
        }
    }


    //===============================================================
    // Get History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        try
        {
            return Ok(
                await _activityHistoryRepository.GetListHistoryAsync(
                    "Account Settings",
                    "CardCharges"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card charges history.");

            return StatusCode(500, "Unable to load card charges history.");
        }
    }


    //===============================================================
    // Get By POS Account
    //===============================================================

    [HttpGet("{posAccountId:long}")]

    public async Task<ActionResult<CardChargesDto>> GetByPosAccount(
        long posAccountId)
    {
        try
        {
            CardChargesDto? cardCharges =
                await _repository.GetByPosAccountAsync(
                    posAccountId);

            if (cardCharges == null)
            {
                return NotFound("Card charges not found for this POS Account.");
            }

            return Ok(cardCharges);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card charges for POS Account {POSAccountId}.", posAccountId);

            return StatusCode(500, "Unable to load card charges.");
        }
    }


    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<IActionResult> Create(
        [FromBody] CreateCardChargesDto dto)
    {
        long userId = 1;

        try
        {
            await _repository.CreateAsync(
                dto,
                userId);

            return Ok(dto.POSAccountId);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create card charges for POS Account {POSAccountId}.", dto.POSAccountId);

            return StatusCode(500, "Unable to save card charges.");
        }
    }


    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        [FromBody] UpdateCardChargesDto dto)
    {
        long userId = 1;

        try
        {
            if (!await _repository.ExistsAsync(
                    dto.POSAccountId))
            {
                return NotFound("Card charges not found for this POS Account.");
            }

            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update card charges for POS Account {POSAccountId}.", dto.POSAccountId);

            return StatusCode(500, "Unable to update card charges.");
        }
    }


    //===============================================================
    // Restore
    //
    // 409 when the POS Account or a card was deleted, or the POS
    // Account already has card charges again.
    //===============================================================

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
                    "There are no deleted card charges available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore card charges.");

            return StatusCode(500, "Unable to restore card charges.");
        }
    }


    //===============================================================
    // Delete
    //===============================================================

    [HttpDelete("{posAccountId:long}")]

    public async Task<IActionResult> Delete(
        long posAccountId)
    {
        long userId = 1;

        try
        {
            if (!await _repository.ExistsAsync(posAccountId))
            {
                return NotFound("Card charges not found for this POS Account.");
            }

            await _repository.DeleteAsync(
                posAccountId,
                userId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete card charges for POS Account {POSAccountId}.", posAccountId);

            return StatusCode(500, "Unable to delete card charges.");
        }
    }
}