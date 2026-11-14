//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.HumanResourceManangement.ProvidentFund;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.ProvidentFund;


//===============================================================
// Provident Fund controllers (hand-written pages : NEVER run Code
// Sync for them; tables made by
// HumanResource_ProvidentFund_Engine.sql)
//
//   api/human-resource-manangement/provident-fund/policy
//   api/human-resource-manangement/provident-fund/members
//   api/human-resource-manangement/provident-fund/loans
//   api/human-resource-manangement/provident-fund/settlements
//   api/human-resource-manangement/provident-fund/interest
//   api/human-resource-manangement/provident-fund/reports
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/provident-fund/policy")]
public class PfPolicyController
    : HrAttendanceControllerBase
{
    private readonly IProvidentFundRepository _repository;

    private readonly IActivityHistoryRepository _history;

    public PfPolicyController(
        IProvidentFundRepository repository,
        IActivityHistoryRepository history,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PfPolicyController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _history = history;
    }

    protected override string PageRoute => "/human-resource-manangement/%/provident-fund-policy";

    protected override string PageName => "Provident Fund Policy";

    [HttpGet]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetPolicyAsync()), "The provident fund policy could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _history.GetListHistoryAsync("Human Resource", "HrPfPolicy")), "The policy history could not be loaded.");

    [HttpPut]
    public Task<IActionResult> Save([FromBody] PfPolicyDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add", "Update" },
            async () => Ok(await _repository.SavePolicyAsync(dto ?? new PfPolicyDto(), userId)),
            "The provident fund policy could not be saved.");
    }
}


[ApiController]
[Route("api/human-resource-manangement/provident-fund/members")]
public class PfMembersController
    : HrAttendanceControllerBase
{
    private readonly IProvidentFundRepository _repository;

    private readonly IActivityHistoryRepository _history;

    public PfMembersController(
        IProvidentFundRepository repository,
        IActivityHistoryRepository history,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PfMembersController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _history = history;
    }

    protected override string PageRoute => "/human-resource-manangement/%/pf-members";

    protected override string PageName => "PF Members";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetMembersAsync()), "The provident fund members could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetMemberDefaultsAsync()), "The member defaults could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _history.GetListHistoryAsync("Human Resource", "HrPfMembers")), "The member history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetMemberAsync(publicId)), "The member could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] PfMemberDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateMemberAsync(dto ?? new PfMemberDto(), userId)),
            "The member could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] PfMemberDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Update" },
            async () =>
            {
                await _repository.UpdateMemberAsync(publicId, dto ?? new PfMemberDto(), userId);

                return NoContent();
            },
            "The member could not be updated.");
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () =>
            {
                await _repository.DeleteMemberAsync(publicId, userId);

                return NoContent();
            },
            "The member could not be deleted.",
            StatusCodes.Status409Conflict);
    }
}


[ApiController]
[Route("api/human-resource-manangement/provident-fund/loans")]
public class PfLoansController
    : HrAttendanceControllerBase
{
    private readonly IProvidentFundRepository _repository;

    private readonly IActivityHistoryRepository _history;

    public PfLoansController(
        IProvidentFundRepository repository,
        IActivityHistoryRepository history,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PfLoansController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _history = history;
    }

    protected override string PageRoute => "/human-resource-manangement/%/pf-loans";

    protected override string PageName => "PF Loans";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetLoansAsync()), "The provident fund loans could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetLoanDefaultsAsync()), "The loan defaults could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _history.GetListHistoryAsync("Human Resource", "HrPfLoans")), "The loan history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetLoanAsync(publicId)), "The loan could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] PfLoanDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateLoanAsync(dto ?? new PfLoanDto(), userId)),
            "The loan could not be saved.");
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () =>
            {
                await _repository.DeleteLoanAsync(publicId, userId);

                return NoContent();
            },
            "The loan could not be deleted.",
            StatusCodes.Status409Conflict);
    }
}


[ApiController]
[Route("api/human-resource-manangement/provident-fund/settlements")]
public class PfSettlementsController
    : HrAttendanceControllerBase
{
    private readonly IProvidentFundRepository _repository;

    private readonly IActivityHistoryRepository _history;

    public PfSettlementsController(
        IProvidentFundRepository repository,
        IActivityHistoryRepository history,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PfSettlementsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _history = history;
    }

    protected override string PageRoute => "/human-resource-manangement/%/pf-settlements";

    protected override string PageName => "PF Settlements";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetSettlementsAsync()), "The provident fund settlements could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetSettlementDefaultsAsync()), "The settlement defaults could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _history.GetListHistoryAsync("Human Resource", "HrPfSettlements")), "The settlement history could not be loaded.");

    // What the policy gives the member (nothing is saved)
    [HttpGet("preview")]
    public Task<IActionResult> Preview([FromQuery] long memberId, [FromQuery] string? date, [FromQuery] string? reason) =>
        Run(async () => Ok(await _repository.PreviewSettlementAsync(memberId, date ?? string.Empty, reason ?? string.Empty)), "The settlement could not be worked out.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetSettlementAsync(publicId)), "The settlement could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] PfSettlementDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateSettlementAsync(dto ?? new PfSettlementDto(), userId)),
            "The settlement could not be saved.");
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () =>
            {
                await _repository.DeleteSettlementAsync(publicId, userId);

                return NoContent();
            },
            "The settlement could not be deleted.",
            StatusCodes.Status409Conflict);
    }
}


[ApiController]
[Route("api/human-resource-manangement/provident-fund/interest")]
public class PfInterestController
    : HrAttendanceControllerBase
{
    private readonly IProvidentFundRepository _repository;

    public PfInterestController(
        IProvidentFundRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PfInterestController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/pf-interest";

    protected override string PageName => "PF Interest";

    // The financial years and the interest credited already
    [HttpGet]
    public Task<IActionResult> GetHome() =>
        Run(async () => Ok(await _repository.GetInterestHomeAsync()), "The interest of the fund could not be loaded.");

    // The interest of a financial year as it would be credited
    [HttpGet("{financialYearId:long}")]
    public Task<IActionResult> Preview(long financialYearId) =>
        Run(async () => Ok(await _repository.PreviewInterestAsync(financialYearId)), "The interest could not be worked out.");

    [HttpPost("{financialYearId:long}")]
    public Task<IActionResult> Post(long financialYearId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add", "Update" },
            async () => Ok(await _repository.PostInterestAsync(financialYearId, userId)),
            "The interest could not be credited.");
    }

    [HttpDelete("{id:long}")]
    public Task<IActionResult> Delete(long id)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () =>
            {
                await _repository.DeleteInterestAsync(id, userId);

                return NoContent();
            },
            "The interest could not be deleted.",
            StatusCodes.Status409Conflict);
    }
}


[ApiController]
[Route("api/human-resource-manangement/provident-fund/reports")]
public class PfReportsController
    : HrAttendanceControllerBase
{
    private readonly IProvidentFundRepository _repository;

    public PfReportsController(
        IProvidentFundRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PfReportsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/pf-reports";

    protected override string PageName => "PF Reports";

    // Fund summary : every member with the balances
    [HttpGet("summary")]
    public Task<IActionResult> Summary() =>
        Run(async () => Ok(await _repository.GetMembersAsync()), "The fund summary could not be loaded.");

    // Loan interest received and company parts forfeited
    [HttpGet("income")]
    public Task<IActionResult> Income() =>
        Run(async () => Ok(await _repository.GetIncomeAsync()), "The income of the fund could not be loaded.");

    [HttpGet("statement/{memberId:long}")]
    public Task<IActionResult> Statement(long memberId) =>
        Run(async () => Ok(await _repository.GetStatementAsync(memberId)), "The member statement could not be loaded.");

    [HttpGet("register")]
    public Task<IActionResult> Register([FromQuery] int year, [FromQuery] int month) =>
        Run(async () => Ok(await _repository.GetRegisterAsync(year, month)), "The contribution register could not be loaded.");
}
