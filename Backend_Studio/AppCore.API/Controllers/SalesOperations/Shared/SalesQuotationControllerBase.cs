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
// Sales Quotations - MB / SP / AC : shared endpoints (hand-written
// pages, NO Code Sync). The page is the Sales Invoice page in
// quotation mode : it prices with the invoice API (POST
// quote?quotation=true); here the body is priced again with the
// Sales Invoice engine of the type in quotation mode and stored.
//
//   GET    ''                   the quotations of the type
//   GET    {publicId}           one quotation (lines as typed + as
//                               priced)
//   GET    history/{id}         its history
//   POST   ''                   new quotation              (Add)
//   PUT    {publicId}           change an open quotation   (Update)
//   PUT    {publicId}/cancel    cancel with a reason       (Cancel)
//   DELETE {publicId}           delete an open quotation   (Delete)
//
// Any special discount : Give Special Discount (as the invoice).
//===============================================================

public abstract class SalesQuotationControllerBase
    : ControllerBase
{
    private const string ActivitySpecial =
        "Give Special Discount";

    private readonly ISalesInvoiceRepository _pricing;

    private readonly ISalesQuotationsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;


    private long UserId => this.CurrentUserId();


    protected SalesQuotationControllerBase(
        ISalesInvoiceRepository pricing,
        ISalesQuotationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
    {
        _pricing = pricing;
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }


    // MB / SP / AC
    protected abstract string PageType { get; }

    // The quotation page (permissions) : "/sales-operations/%/sales-quotations-mb"
    protected abstract string PageRoute { get; }


    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });


    private async Task<IActionResult?> DenyAsync(string activity)
    {
        return await _effectiveAccess.HasActivityAsync(UserId, PageRoute, activity)
            ? null
            : Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on Sales Quotations - {PageType}.");
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
            // Usually the tables are missing : run SalesQuotations_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }


    // The body priced by the Sales Invoice engine (quotation mode)
    private async Task<SalesInvoiceQuoteDto> PriceAsync(SaveSalesQuotationDto dto)
    {
        dto.PageType = PageType;

        dto.Payments = new();

        dto.BookingId = null;

        dto.QuotationId = null;

        dto.RegistrationTypeId = null;

        dto.RegistrationUnitIds = new();

        dto.PaymentTerm = string.Empty;

        dto.InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6)).ToString("yyyy-MM-dd");

        long? branchId = this.CurrentBranchId();

        if (branchId.HasValue && branchId.Value > 0)
        {
            dto.BranchId = branchId.Value;
        }

        bool canSpecial =
            await _effectiveAccess.HasActivityAsync(UserId, PageRoute.Replace("sales-quotations", "sales-invoices"), ActivitySpecial)
            ||
            await _effectiveAccess.HasActivityAsync(UserId, PageRoute, ActivitySpecial);

        return await _pricing.QuoteAsync(dto, canSpecial, UserId, true);
    }


    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync(PageType)),
            "The quotations could not be loaded.");
    }


    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId)
    {
        return Run(
            async () =>
            {
                SalesQuotationDto? row = await _repository.GetAsync(PageType, publicId);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Quotation not found.")
                    : Ok(row);
            },
            "The quotation could not be loaded.");
    }


    [HttpGet("history/{id:long}")]
    public Task<IActionResult> GetHistory(long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Sales Operations", $"SalesQuotation{PageType}", id)),
            "The quotation history could not be loaded.");
    }


    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveSalesQuotationDto? dto)
    {
        IActionResult? denied = await DenyAsync("Add");

        if (denied != null)
        {
            return denied;
        }

        long userId = UserId;

        return await Run(
            async () =>
            {
                SaveSalesQuotationDto body = dto ?? new SaveSalesQuotationDto();

                SalesInvoiceQuoteDto priced = await PriceAsync(body);

                return Ok(await _repository.CreateAsync(PageType, body, priced, body.BranchId, userId));
            },
            "The quotation could not be saved.");
    }


    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(Guid publicId, [FromBody] SaveSalesQuotationDto? dto)
    {
        IActionResult? denied = await DenyAsync("Update");

        if (denied != null)
        {
            return denied;
        }

        long userId = UserId;

        return await Run(
            async () =>
            {
                SaveSalesQuotationDto body = dto ?? new SaveSalesQuotationDto();

                SalesInvoiceQuoteDto priced = await PriceAsync(body);

                return Ok(await _repository.UpdateAsync(PageType, publicId, body, priced, userId));
            },
            "The quotation could not be saved.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid publicId, [FromBody] CancelSalesQuotationDto? dto)
    {
        IActionResult? denied = await DenyAsync("Cancel");

        if (denied != null)
        {
            return denied;
        }

        long userId = UserId;

        return await Run(
            async () =>
            {
                await _repository.CancelAsync(PageType, publicId, dto ?? new CancelSalesQuotationDto(), userId);

                return NoContent();
            },
            "The quotation could not be cancelled.");
    }


    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Delete(Guid publicId)
    {
        IActionResult? denied = await DenyAsync("Delete");

        if (denied != null)
        {
            return denied;
        }

        long userId = UserId;

        return await Run(
            async () =>
            {
                await _repository.DeleteAsync(PageType, publicId, userId);

                return NoContent();
            },
            "The quotation could not be deleted.");
    }
}
