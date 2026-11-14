//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.FixedAssetsManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.FixedAssetsManagement;


//===============================================================
// Fixed Assets Management Controllers (hand-written pages : NEVER
// run Code Sync for them; tables made by FixedAssets_Engine.sql)
//
// Base : api/fixed-assets-management
//
//   lookups                                   the lists of a page
//   asset-setup/asset-groups                  CRUD, restore, history
//   asset-setup/depreciation-of-fixed-assets  list, one, PUT, history
//   asset-setup/asset-locations               CRUD, restore, history
//   asset-setup/asset-configuration           GET, PUT, history
//   asset-register/asset-acquisitions         CRUD, post, unpost
//   asset-register/fixed-asset-register       list, card, PUT card
//   asset-register/opening-assets             CRUD
//   depreciation/depreciation-runs            branches, list, one,
//                                             preview, POST, undo
//   depreciation/depreciation-schedule        GET {asset}
//   asset-disposal/asset-disposals            list, POST, DELETE
//   asset-reports/fixed-asset-schedule        GET
//   asset-reports/asset-tags                  the cards
//   asset-reports/asset-verification          CRUD, close
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

public abstract class FaControllerBase
    : HrAttendanceControllerBase
{
    private readonly IActivityHistoryRepository _history;

    protected FaControllerBase(
        IActivityHistoryRepository history,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
        : base(effectiveAccess, logger)
    {
        _history = history;
    }

    protected const int Conflict409 = StatusCodes.Status409Conflict;

    protected Task<IActionResult> History(string entity) =>
        Run(async () => Ok(await _history.GetListHistoryAsync("Fixed Assets", entity)), "The history could not be loaded.");

    // Runs a change and answers 204
    protected Task<IActionResult> Change(string activity, Func<long, Task> action, string failure)
    {
        long userId = UserId;

        return Guarded(
            new[] { activity },
            async () =>
            {
                await action(userId);

                return NoContent();
            },
            failure,
            Conflict409);
    }

    // Runs a change and answers what was saved
    protected Task<IActionResult> Save<T>(string activity, Func<long, Task<T>> action, string failure)
    {
        long userId = UserId;

        return Guarded(new[] { activity }, async () => Ok(await action(userId)), failure, Conflict409);
    }
}


//===============================================================
// Lookups (every page)
//===============================================================

[ApiController]
[Route("api/fixed-assets-management/lookups")]
public class FaLookupsController
    : FaControllerBase
{
    private readonly IFaSetupRepository _repository;

    public FaLookupsController(IFaSetupRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<FaLookupsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/fixed-asset-register";

    protected override string PageName => "Fixed Assets";

    [HttpGet]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetLookupsAsync()), "The fixed asset lists could not be loaded.");
}


//===============================================================
// Asset Setup
//===============================================================

[ApiController]
[Route("api/fixed-assets-management/asset-setup/asset-groups")]
public class AssetCategoriesController
    : FaControllerBase
{
    private readonly IFaSetupRepository _repository;

    public AssetCategoriesController(IFaSetupRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<AssetCategoriesController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/asset-groups";

    protected override string PageName => "Asset Groups";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetCategoriesAsync()), "Asset groups could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaCategories");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetCategoryAsync(publicId)), "The asset group could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] FaCategoryDto? dto) =>
        Save("Add", userId => _repository.SaveCategoryAsync(null, dto ?? new FaCategoryDto(), userId), "The asset group could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] FaCategoryDto? dto) =>
        Save("Update", userId => _repository.SaveCategoryAsync(publicId, dto ?? new FaCategoryDto(), userId), "The asset group could not be updated.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteCategoryAsync(publicId, userId), "The asset group could not be deleted.");

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            new[] { "Restore" },
            async () =>
            {
                string? code = await _repository.RestoreCategoryAsync(userId);

                return code == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted asset group to restore.")
                    : Ok(new { Code = code, message = $"{code} restored." });
            },
            "The asset group could not be restored.",
            Conflict409);
    }
}

[ApiController]
[Route("api/fixed-assets-management/asset-setup/depreciation-of-fixed-assets")]
public class DepreciationOfFixedAssetsController
    : FaControllerBase
{
    private readonly IFaSetupRepository _repository;

    public DepreciationOfFixedAssetsController(IFaSetupRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<DepreciationOfFixedAssetsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/depreciation-of-fixed-assets";

    protected override string PageName => "Depreciation of Fixed Assets";

    // Every asset group with its rule
    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetCategoriesAsync()), "The asset groups could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaDepreciationRules");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetCategoryAsync(publicId)), "The asset group could not be loaded.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] FaCategoryDto? dto) =>
        Save("Update", userId => _repository.SaveDepreciationAsync(publicId, dto ?? new FaCategoryDto(), userId), "The depreciation could not be saved.");
}

[ApiController]
[Route("api/fixed-assets-management/asset-setup/asset-locations")]
public class AssetLocationsController
    : FaControllerBase
{
    private readonly IFaSetupRepository _repository;

    public AssetLocationsController(IFaSetupRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<AssetLocationsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/asset-locations";

    protected override string PageName => "Asset Locations";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetLocationsAsync()), "Asset locations could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaLocations");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetLocationAsync(publicId)), "The asset location could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] FaLocationDto? dto) =>
        Save("Add", userId => _repository.SaveLocationAsync(null, dto ?? new FaLocationDto(), userId), "The asset location could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] FaLocationDto? dto) =>
        Save("Update", userId => _repository.SaveLocationAsync(publicId, dto ?? new FaLocationDto(), userId), "The asset location could not be updated.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteLocationAsync(publicId, userId), "The asset location could not be deleted.");

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            new[] { "Restore" },
            async () =>
            {
                string? code = await _repository.RestoreLocationAsync(userId);

                return code == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted asset location to restore.")
                    : Ok(new { Code = code, message = $"{code} restored." });
            },
            "The asset location could not be restored.",
            Conflict409);
    }
}

[ApiController]
[Route("api/fixed-assets-management/asset-setup/asset-configuration")]
public class AssetConfigurationController
    : FaControllerBase
{
    private readonly IFaSetupRepository _repository;

    public AssetConfigurationController(IFaSetupRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<AssetConfigurationController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/asset-configuration";

    protected override string PageName => "Asset Configuration";

    [HttpGet]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetConfigurationAsync()), "The asset configuration could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaConfiguration");

    [HttpPut]
    public Task<IActionResult> Update([FromBody] FaConfigurationDto? dto) =>
        Change("Update", userId => _repository.SaveConfigurationAsync(dto ?? new FaConfigurationDto(), userId), "The asset configuration could not be saved.");
}


//===============================================================
// Asset Register
//===============================================================

[ApiController]
[Route("api/fixed-assets-management/asset-register/asset-acquisitions")]
public class AssetAcquisitionsController
    : FaControllerBase
{
    private readonly IFaAssetsRepository _repository;

    public AssetAcquisitionsController(IFaAssetsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<AssetAcquisitionsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/asset-acquisitions";

    protected override string PageName => "Asset Acquisitions";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAcquisitionsAsync()), "Asset acquisitions could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaAcquisitions");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAcquisitionAsync(publicId)), "The asset acquisition could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] FaAcquisitionDto? dto) =>
        Save("Add", userId => _repository.SaveAcquisitionAsync(null, dto ?? new FaAcquisitionDto(), userId), "The asset acquisition could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] FaAcquisitionDto? dto) =>
        Save("Update", userId => _repository.SaveAcquisitionAsync(publicId, dto ?? new FaAcquisitionDto(), userId), "The asset acquisition could not be updated.");

    [HttpPut("{publicId:guid}/post")]
    public Task<IActionResult> Post(Guid publicId) =>
        Change("Update", userId => _repository.PostAcquisitionAsync(publicId, userId), "The asset acquisition could not be posted.");

    [HttpPut("{publicId:guid}/unpost")]
    public Task<IActionResult> Unpost(Guid publicId, [FromBody] FaReasonDto? dto) =>
        Change("Update", userId => _repository.UnpostAcquisitionAsync(publicId, dto ?? new FaReasonDto(), userId), "The asset acquisition could not be unposted.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteAcquisitionAsync(publicId, userId), "The asset acquisition could not be deleted.");
}

[ApiController]
[Route("api/fixed-assets-management/asset-register/fixed-asset-register")]
public class FixedAssetRegisterController
    : FaControllerBase
{
    private readonly IFaAssetsRepository _repository;

    public FixedAssetRegisterController(IFaAssetsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<FixedAssetRegisterController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/fixed-asset-register";

    protected override string PageName => "Fixed Asset Register";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAssetsAsync(null)), "The asset cards could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaAssets");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAssetAsync(publicId)), "The asset card could not be loaded.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveFaAssetDto? dto) =>
        Change("Update", userId => _repository.UpdateAssetAsync(publicId, dto ?? new SaveFaAssetDto(), userId), "The asset card could not be updated.");
}

[ApiController]
[Route("api/fixed-assets-management/asset-register/opening-assets")]
public class OpeningAssetsController
    : FaControllerBase
{
    private readonly IFaAssetsRepository _repository;

    public OpeningAssetsController(IFaAssetsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<OpeningAssetsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/opening-assets";

    protected override string PageName => "Opening Assets";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAssetsAsync("Opening")), "The opening assets could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaAssets");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAssetAsync(publicId)), "The opening asset could not be loaded.");

    // The asset no the add form shows before it is saved
    [HttpGet("next-no")]
    public Task<IActionResult> NextNo([FromQuery] long branchId = 0, [FromQuery] long categoryId = 0) =>
        Run(async () => Ok(new { AssetNo = await _repository.NextAssetNoAsync(branchId, categoryId) }), "The asset no could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveFaAssetDto? dto) =>
        Save("Add", userId => _repository.CreateOpeningAsync(dto ?? new SaveFaAssetDto(), userId), "The opening asset could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveFaAssetDto? dto) =>
        Change("Update", userId => _repository.UpdateAssetAsync(publicId, dto ?? new SaveFaAssetDto(), userId), "The opening asset could not be updated.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteAssetAsync(publicId, userId), "The opening asset could not be deleted.");
}


//===============================================================
// Depreciation
//===============================================================

[ApiController]
[Route("api/fixed-assets-management/depreciation/depreciation-runs")]
public class DepreciationRunsController
    : FaControllerBase
{
    private readonly IFaDepreciationRepository _repository;

    public DepreciationRunsController(IFaDepreciationRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<DepreciationRunsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/depreciation-runs";

    protected override string PageName => "Depreciation Runs";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetRunsAsync()), "Depreciation runs could not be loaded.");

    [HttpGet("branches")]
    public Task<IActionResult> GetBranches() =>
        Run(async () => Ok(await _repository.GetBranchesAsync()), "The branches could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaDepreciationRuns");

    [HttpGet("preview")]
    public Task<IActionResult> Preview([FromQuery] long branchId, [FromQuery] int period) =>
        Run(async () => Ok(await _repository.PreviewAsync(branchId, period)), "The depreciation could not be worked out.", Conflict409);

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetRunAsync(publicId)), "The depreciation run could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Post([FromBody] PostFaRunDto? dto) =>
        Save("Add", userId => _repository.PostAsync(dto ?? new PostFaRunDto(), userId), "The depreciation run could not be posted.");

    [HttpPut("{publicId:guid}/undo")]
    public Task<IActionResult> Undo(Guid publicId, [FromBody] FaReasonDto? dto) =>
        Change("Delete", userId => _repository.UndoAsync(publicId, dto ?? new FaReasonDto(), userId), "The depreciation run could not be undone.");
}

[ApiController]
[Route("api/fixed-assets-management/depreciation/depreciation-schedule")]
public class DepreciationScheduleController
    : FaControllerBase
{
    private readonly IFaDepreciationRepository _repository;

    private readonly IFaAssetsRepository _assets;

    public DepreciationScheduleController(IFaDepreciationRepository repository, IFaAssetsRepository assets, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<DepreciationScheduleController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
        _assets = assets;
    }

    protected override string PageRoute => "/fixed-assets-management/%/depreciation-schedule";

    protected override string PageName => "Depreciation Schedule";

    // The cards to pick from
    [HttpGet]
    public Task<IActionResult> GetAssets() =>
        Run(async () => Ok(await _assets.GetAssetsAsync(null)), "The asset cards could not be loaded.");

    [HttpGet("{assetPublicId:guid}")]
    public Task<IActionResult> Get(Guid assetPublicId) =>
        Run(async () => Ok(await _repository.GetScheduleAsync(assetPublicId)), "The depreciation schedule could not be loaded.");
}


//===============================================================
// Asset Disposal
//===============================================================

[ApiController]
[Route("api/fixed-assets-management/asset-disposal/asset-disposals")]
public class AssetDisposalsController
    : FaControllerBase
{
    private readonly IFaMovementsRepository _repository;

    public AssetDisposalsController(IFaMovementsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<AssetDisposalsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/asset-disposals";

    protected override string PageName => "Asset Disposals";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetDisposalsAsync()), "Asset disposals could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaDisposals");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] FaDisposalDto? dto) =>
        Save("Add", userId => _repository.CreateDisposalAsync(dto ?? new FaDisposalDto(), userId), "The asset disposal could not be saved.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteDisposalAsync(publicId, userId), "The asset disposal could not be deleted.");
}


//===============================================================
// Asset Reports
//===============================================================

[ApiController]
[Route("api/fixed-assets-management/asset-reports/fixed-asset-schedule")]
public class FixedAssetScheduleController
    : FaControllerBase
{
    private readonly IFaReportsRepository _repository;

    public FixedAssetScheduleController(IFaReportsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<FixedAssetScheduleController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/fixed-asset-schedule";

    protected override string PageName => "Fixed Asset Schedule";

    [HttpGet]
    public Task<IActionResult> Get([FromQuery] string? from = null, [FromQuery] string? to = null, [FromQuery] long branchId = 0) =>
        Run(async () => Ok(await _repository.GetScheduleReportAsync(from, to, branchId)), "The fixed asset schedule could not be loaded.");
}

[ApiController]
[Route("api/fixed-assets-management/asset-reports/asset-tags")]
public class AssetTagsController
    : FaControllerBase
{
    private readonly IFaAssetsRepository _repository;

    public AssetTagsController(IFaAssetsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<AssetTagsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/asset-tags";

    protected override string PageName => "Asset Tags";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAssetsAsync(null)), "The asset cards could not be loaded.");
}

[ApiController]
[Route("api/fixed-assets-management/asset-reports/asset-verification")]
public class AssetVerificationController
    : FaControllerBase
{
    private readonly IFaReportsRepository _repository;

    public AssetVerificationController(IFaReportsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<AssetVerificationController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/fixed-assets-management/%/asset-verification";

    protected override string PageName => "Asset Verification";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetVerificationsAsync()), "Asset verifications could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FaVerifications");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetVerificationAsync(publicId)), "The asset verification could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] FaVerificationDto? dto) =>
        Save("Add", userId => _repository.CreateVerificationAsync(dto ?? new FaVerificationDto(), userId), "The asset verification could not be started.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] FaVerificationDto? dto) =>
        Change("Update", userId => _repository.SaveVerificationAsync(publicId, dto ?? new FaVerificationDto(), userId), "The asset verification could not be saved.");

    [HttpPut("{publicId:guid}/close")]
    public Task<IActionResult> Close(Guid publicId) =>
        Change("Update", userId => _repository.CloseVerificationAsync(publicId, userId), "The asset verification could not be closed.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteVerificationAsync(publicId, userId), "The asset verification could not be deleted.");
}
