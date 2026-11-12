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

namespace AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Sales Returns - MB / SP / AC : shared endpoints (hand-written
// pages, NO Code Sync). One return = one posted invoice; the
// engine is the Sales Invoice repository of the type
// (SalesInvoiceRepositoryBase.Returns.cs).
//
//   GET    switches                     Post on Approval, Return
//                                        Window, login branch
//   GET    invoices?search=             posted invoices of the
//                                        login branch to return from
//   GET    invoices/{invoicePublicId}   one invoice, what is left
//          ?except={returnPublicId}
//   GET    ''                           the returns of the type
//   GET    {publicId}                   one return
//   GET    history/{id}                 its history
//   POST   ''                           new return       (Add; Post
//                                        on Approval OFF : posted)
//   PUT    {publicId}                   change a draft   (Update)
//   PUT    {publicId}/approve           Draft -> Approved (Approve)
//   PUT    {publicId}/return            Approved -> Draft (Return)
//   PUT    {publicId}/post              Approved -> Posted (Post)
//   PUT    {publicId}/cancel            with a reason    (Cancel)
//   DELETE {publicId}                   delete a draft   (Delete)
//===============================================================

public abstract class SalesReturnControllerBase
    : ControllerBase
{
    private readonly ISalesInvoiceRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;


    private long UserId => this.CurrentUserId();


    protected SalesReturnControllerBase(
        ISalesInvoiceRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }


    // MB / SP / AC
    protected abstract string PageType { get; }

    // The return page (permissions) : "/sales-operations/%/sales-returns-mb"
    protected abstract string PageRoute { get; }


    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });


    private async Task<IActionResult?> DenyAsync(string activity)
    {
        return await _effectiveAccess.HasActivityAsync(UserId, PageRoute, activity)
            ? null
            : Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on Sales Returns - {PageType}.");
    }


    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> action,
        string failure
    )
    {
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
            // Usually the tables are missing : run SalesReturns_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }


    private async Task<IActionResult> Act
    (
        string activity,
        Func<long, Task<IActionResult>> action,
        string failure
    )
    {
        IActionResult? denied = await DenyAsync(activity);

        if (denied != null)
        {
            return denied;
        }

        long userId = UserId;

        return await Run(() => action(userId), failure);
    }


    //===========================================================
    // Reads
    //===========================================================

    [HttpGet("switches")]
    public Task<IActionResult> GetSwitches()
    {
        return Run(
            async () => Ok(await _repository.GetReturnSwitchesAsync(this.CurrentBranchId())),
            "The return settings could not be loaded.");
    }


    [HttpGet("invoices")]
    public Task<IActionResult> FindInvoices([FromQuery] string? search)
    {
        return Run(
            async () => Ok(await _repository.FindReturnInvoicesAsync(search, this.CurrentBranchId())),
            "The invoices could not be loaded.");
    }


    [HttpGet("invoices/{invoicePublicId:guid}")]
    public Task<IActionResult> GetInvoice(Guid invoicePublicId, [FromQuery] Guid? except)
    {
        return Run(
            async () => Ok(await _repository.GetReturnInvoiceAsync(invoicePublicId, except)),
            "The invoice could not be loaded.");
    }


    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetReturnsAsync()),
            "The returns could not be loaded.");
    }


    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId)
    {
        return Run(
            async () =>
            {
                SalesReturnDto? row = await _repository.GetReturnAsync(publicId);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Sales return not found.")
                    : Ok(row);
            },
            "The return could not be loaded.");
    }


    [HttpGet("history/{id:long}")]
    public Task<IActionResult> GetHistory(long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Sales Operations", $"SalesReturn{PageType}", id)),
            "The return history could not be loaded.");
    }


    //===========================================================
    // Changes
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveSalesReturnDto? dto)
    {
        return Act(
            "Add",
            async userId => Ok(await _repository.CreateReturnAsync(dto ?? new SaveSalesReturnDto(), userId)),
            "The return could not be saved.");
    }


    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveSalesReturnDto? dto)
    {
        return Act(
            "Update",
            async userId => Ok(await _repository.UpdateReturnAsync(publicId, dto ?? new SaveSalesReturnDto(), userId)),
            "The return could not be saved.");
    }


    [HttpPut("{publicId:guid}/approve")]
    public Task<IActionResult> Approve(Guid publicId)
    {
        return Act(
            "Approve",
            async userId =>
            {
                await _repository.ApproveReturnAsync(publicId, userId);

                return NoContent();
            },
            "The return could not be approved.");
    }


    [HttpPut("{publicId:guid}/return")]
    public Task<IActionResult> ReturnToDraft(Guid publicId)
    {
        return Act(
            "Return",
            async userId =>
            {
                await _repository.ReturnToDraftReturnAsync(publicId, userId);

                return NoContent();
            },
            "The return could not be sent back to draft.");
    }


    [HttpPut("{publicId:guid}/post")]
    public Task<IActionResult> Post(Guid publicId)
    {
        return Act(
            "Post",
            async userId => Ok(await _repository.PostReturnAsync(publicId, userId)),
            "The return could not be posted.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public Task<IActionResult> Cancel(Guid publicId, [FromBody] CancelSalesReturnDto? dto)
    {
        return Act(
            "Cancel",
            async userId =>
            {
                await _repository.CancelReturnAsync(publicId, dto ?? new CancelSalesReturnDto(), userId);

                return NoContent();
            },
            "The return could not be cancelled.");
    }


    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        return Act(
            "Delete",
            async userId =>
            {
                await _repository.DeleteReturnAsync(publicId, userId);

                return NoContent();
            },
            "The return could not be deleted.");
    }
}
