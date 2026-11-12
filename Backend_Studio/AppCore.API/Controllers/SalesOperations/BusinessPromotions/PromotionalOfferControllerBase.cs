//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.BusinessPromotions;


//===============================================================
// Business Promotions : Promotional Offers - shared endpoints of
// the three hand-written pages (Sales Center / Service Center /
// Accessory Shop; NO Code Sync)
//
//   GET    ''                     the channel's offers (all)
//   GET    paged                  one list page + summary counts
//   GET    history                the page's history (list)
//   GET    {publicId}/history     one offer's history
//   PUT    restore                the last deleted offer (Restore)
//   GET    defaults               next no, types, brands, branches,
//                                 categories, models, products
//   GET    products?search=       product search (targets)
//   GET    {publicId}             one offer
//   GET    history/{id}           its history
//   POST   ''                     new draft             (Add)
//   PUT    {publicId}             change                (Update)
//   PUT    {publicId}/activate    Draft -> Active       (Approve)
//   PUT    {publicId}/close       Active -> Closed      (Cancel)
//   PUT    {publicId}/cancel      with a reason         (Cancel)
//   DELETE {publicId}             delete a draft        (Delete)
//===============================================================

public abstract class PromotionalOfferControllerBase
    : ControllerBase
{
    private readonly IPromotionalOffersRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;


    private long UserId => this.CurrentUserId();


    protected PromotionalOfferControllerBase(
        IPromotionalOffersRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }


    // SalesCenter / ServiceCenter / AccessoryShop
    protected abstract string Channel { get; }

    // "Promotional Offers - Sales Center"
    protected abstract string PageTitle { get; }

    // The page (permissions) : "/sales-operations/%/promotional-offers-sales-center"
    protected abstract string PageRoute { get; }


    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });


    private async Task<IActionResult> Run
    (
        string? activity,
        Func<Task<IActionResult>> action,
        string failure
    )
    {
        if (activity != null && !await _effectiveAccess.HasActivityAsync(UserId, PageRoute, activity))
        {
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on {PageTitle}.");
        }

        try
        {
            return await action();
        }
        catch (KeyNotFoundException ex)
        {
            return Fail(StatusCodes.Status404NotFound, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Fail(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Fail(StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            // Usually the tables are missing : run PromotionalOffers_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Reads
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            null,
            async () => Ok(await _repository.GetAllAsync(Channel)),
            "The offers could not be loaded.");
    }


    [HttpGet("paged")]
    public Task<IActionResult> GetPaged([FromQuery] PromotionalOfferPageRequest? request)
    {
        return Run(
            null,
            async () => Ok(await _repository.GetPagedAsync(Channel, request ?? new PromotionalOfferPageRequest())),
            "The offers could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetListHistory()
    {
        return Run(
            null,
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Sales Operations", PageTitle)),
            "The history could not be loaded.");
    }


    [HttpGet("{publicId:guid}/history")]
    public Task<IActionResult> GetOfferHistory(Guid publicId)
    {
        return Run(
            null,
            async () =>
            {
                long? id = await _repository.GetIdAsync(Channel, publicId);

                return id == null
                    ? Fail(StatusCodes.Status404NotFound, "The promotional offer was not found.")
                    : Ok(await _activityHistoryRepository.GetHistoryAsync("Sales Operations", PageTitle, id.Value));
            },
            "The history could not be loaded.");
    }


    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        return Run(
            "Restore",
            async () =>
                await _repository.RestoreAsync(Channel, UserId)
                    ? Ok(new { message = "The most recently deleted offer has been restored." })
                    : Fail(StatusCodes.Status404NotFound, "There is no deleted offer to restore."),
            "The offer could not be restored.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults()
    {
        return Run(
            null,
            async () => Ok(await _repository.GetDefaultsAsync(Channel)),
            "The offer settings could not be loaded.");
    }


    [HttpGet("products")]
    public Task<IActionResult> SearchProducts([FromQuery] string? search)
    {
        return Run(
            null,
            async () => Ok(await _repository.SearchProductsAsync(Channel, search)),
            "The products could not be loaded.");
    }


    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId)
    {
        return Run(
            null,
            async () =>
            {
                PromotionalOfferDto? row = await _repository.GetAsync(Channel, publicId);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "The promotional offer was not found.")
                    : Ok(row);
            },
            "The offer could not be loaded.");
    }


    [HttpGet("history/{id:long}")]
    public Task<IActionResult> GetHistory(long id)
    {
        return Run(
            null,
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Sales Operations", PageTitle, id)),
            "The history could not be loaded.");
    }


    //===========================================================
    // Writes
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SavePromotionalOfferDto? dto)
    {
        return Run(
            "Add",
            async () => Ok(await _repository.CreateAsync(Channel, dto ?? new SavePromotionalOfferDto(), UserId)),
            "The offer could not be saved.");
    }


    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SavePromotionalOfferDto? dto)
    {
        return Run(
            "Update",
            async () => Ok(await _repository.UpdateAsync(Channel, publicId, dto ?? new SavePromotionalOfferDto(), UserId)),
            "The offer could not be saved.");
    }


    [HttpPut("{publicId:guid}/activate")]
    public Task<IActionResult> Activate(Guid publicId)
    {
        return Run(
            "Approve",
            async () =>
            {
                await _repository.ActivateAsync(Channel, publicId, UserId);

                return Ok(new { message = "The offer is active." });
            },
            "The offer could not be activated.");
    }


    [HttpPut("{publicId:guid}/close")]
    public Task<IActionResult> Close(Guid publicId, [FromBody] PromotionalOfferReasonDto? dto)
    {
        return Run(
            "Cancel",
            async () =>
            {
                await _repository.CloseAsync(Channel, publicId, dto ?? new PromotionalOfferReasonDto(), UserId);

                return Ok(new { message = "The offer is closed." });
            },
            "The offer could not be closed.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public Task<IActionResult> Cancel(Guid publicId, [FromBody] PromotionalOfferReasonDto? dto)
    {
        return Run(
            "Cancel",
            async () =>
            {
                await _repository.CancelAsync(Channel, publicId, dto ?? new PromotionalOfferReasonDto(), UserId);

                return Ok(new { message = "The offer is cancelled." });
            },
            "The offer could not be cancelled.");
    }


    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        return Run(
            "Delete",
            async () =>
            {
                await _repository.DeleteAsync(Channel, publicId, UserId);

                return Ok(new { message = "The offer is deleted." });
            },
            "The offer could not be deleted.");
    }
}
