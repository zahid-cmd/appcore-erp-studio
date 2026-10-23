//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Platform.Accounting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Platform.Accounting;


//===============================================================
// Voucher Foundation Controller
//
// Shared look-ups for every voucher page and the Master Entry /
// Payment Desk components.
//
//   GET ledgers?activeOnly=true
//       every postable ledger (GL + Cash / Bank / MFS / POS /
//       EMI) with type, sub group, branch and
//       collection / payment flags
//
//   GET period?branchId=1&date=2026-10-22
//       branch digits + open financial year for a date
//       (400 with the reason when vouchers are not allowed)
//
//   GET next-number?prefix=RV&branchId=1&date=2026-10-22
//       preview of the next voucher number (nothing reserved)
//===============================================================

[ApiController]

[Route("api/platform/accounting")]

public class VoucherFoundationController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IVoucherLedgerRepository _ledgerRepository;

    private readonly IVoucherNumberService _numberService;


    //===========================================================
    // Constructor
    //===========================================================

    public VoucherFoundationController(
        IVoucherLedgerRepository ledgerRepository,
        IVoucherNumberService numberService)
    {
        _ledgerRepository = ledgerRepository;

        _numberService = numberService;
    }


    //===========================================================
    // Ledgers
    //===========================================================

    [HttpGet("ledgers")]

    public async Task<ActionResult<List<VoucherLedgerDto>>> GetLedgers(
        [FromQuery] bool activeOnly = true)
    {
        return Ok(
            await _ledgerRepository.GetAllAsync(
                activeOnly));
    }


    //===========================================================
    // Period
    //===========================================================

    [HttpGet("period")]

    public async Task<ActionResult<VoucherPeriodDto>> GetPeriod(
        [FromQuery] long branchId,
        [FromQuery] DateOnly date)
    {
        try
        {
            return Ok(
                await _numberService.ResolvePeriodAsync(
                    branchId,
                    date));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Next Number (preview)
    //===========================================================

    [HttpGet("next-number")]

    public async Task<ActionResult<VoucherNumberDto>> GetNextNumber(
        [FromQuery] string prefix,
        [FromQuery] long branchId,
        [FromQuery] DateOnly date)
    {
        try
        {
            return Ok(
                await _numberService.PeekAsync(
                    prefix,
                    branchId,
                    date));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}