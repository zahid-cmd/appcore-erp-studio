// PAGE-CLONED : Bank Setup -> Card Setup
// PAGE-CLONED : Wings -> Card Setup
//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.CardSetup.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// CardSetup Controller
//
// Error mapping:
//   InvalidOperationException → 400 (Create / Update)
//                             → 409 (Delete / Restore)
//   KeyNotFoundException      → 404
//   Anything else             → 500 (logged)
//===============================================================

[ApiController]

[Route("api/settings/account-settings/card-setup")]

public class CardSetupController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly ICardSetupRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<CardSetupController> _logger;


    //===============================================================
    // Constructor
    //===============================================================

    public CardSetupController(
        ICardSetupRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<CardSetupController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<CardSetupDto>>> GetAll()
    {
        try
        {
            List<CardSetupDto> cardSetup =
                await _repository.GetAllAsync();

            return Ok(cardSetup);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card setup list.");

            return StatusCode(500, "Unable to load card setup.");
        }
    }


    //===============================================================
    // Get Next Code
    //===============================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode()
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate card setup code.");

            return StatusCode(500, "Unable to generate card code.");
        }
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<CardSetupDefaultsDto>> GetDefaults()
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card setup defaults.");

            return StatusCode(500, "Unable to load card setup defaults.");
        }
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<CardSetupDto>> GetById(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        try
        {
            CardSetupDto? cardSetup =
                await _repository.GetByIdAsync(id);

            if (cardSetup == null)
            {
                return NotFound("Card Setup not found.");
            }

            return Ok(cardSetup);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card setup {CardSetupId}.", id);

            return StatusCode(500, "Unable to load card setup.");
        }
    }


    //===============================================================
    // Create
    //===============================================================

    // Returns the new row's Public Id
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(
        CreateCardSetupDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            CardSetupDto? created =
                await _repository.GetByIdAsync(id);

            return Ok(created?.PublicId ?? Guid.Empty);
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
            _logger.LogError(ex, "Failed to create card setup.");

            return StatusCode(500, "Unable to save card setup.");
        }
    }


    //===============================================================
    // Update
    //===============================================================

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateCardSetupDto dto)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        dto.CardSetupId =
            id;

           long userId = this.CurrentUserId();

        try
        {
            if (!await _repository.ExistsAsync(
                    dto.CardSetupId))
            {
                return NotFound("Card Setup not found.");
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
            _logger.LogError(ex, "Failed to update card setup {CardSetupId}.", dto.CardSetupId);

            return StatusCode(500, "Unable to update card setup.");
        }
    }


    //===============================================================
    // Delete
    //
    // 409 while the card is used in Card Charges.
    //===============================================================

    [HttpDelete("{publicId:guid}")]

    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

           long userId = this.CurrentUserId();

        try
        {
            if (!await _repository.ExistsAsync(id))
            {
                return NotFound("Card Setup not found.");
            }

            await _repository.DeleteAsync(
                id,
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
            _logger.LogError(ex, "Failed to delete card setup {CardSetupId}.", id);

            return StatusCode(500, "Unable to delete card setup.");
        }
    }


    //===============================================================
    // Restore
    //
    // 409 when the issuing bank was deleted or a duplicate exists.
    //===============================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
           long userId = this.CurrentUserId();

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted cards available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore card setup.");

            return StatusCode(500, "Unable to restore card setup.");
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
                    "CardSetup"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load card setup history.");

            return StatusCode(500, "Unable to load card setup history.");
        }
    }
}