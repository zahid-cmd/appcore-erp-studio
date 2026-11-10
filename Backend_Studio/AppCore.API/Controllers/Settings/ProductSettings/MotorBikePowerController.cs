//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;

using MotorBikeSpecificationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecifications;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ProductSettings;


//===============================================================
// Motor Bike Power (2026-11-10) : which motor bikes are electric.
// An electric bike carries a MOTOR number, not an engine number :
// every page labels the number "Motor No" for these.
//
//   GET electric   the Motor Bikes (id, code, name) whose model's
//                  Bike Type is "Electric ..." or whose
//                  specification Fuel Type is Electric
//===============================================================

[ApiController]

[Route("api/settings/product-settings/motor-bike-power")]

public class MotorBikePowerController : ControllerBase
{
    private readonly AppDbContext _context;

    private readonly ILogger<MotorBikePowerController> _logger;


    public MotorBikePowerController(
        AppDbContext context,
        ILogger<MotorBikePowerController> logger)
    {
        _context = context;
        _logger = logger;
    }


    [HttpGet("electric")]

    public async Task<ActionResult<List<ElectricBikeDto>>> GetElectric()
    {
        try
        {
            var rows =
                await
                (
                    from b in _context.Set<MotorBikesEntity>().AsNoTracking()
                    join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                        on b.ProductSubCategoryId equals s.ProductSubCategoryId
                    join m in _context.Set<BikeModelsEntity>().AsNoTracking()
                        on s.BikeModelId equals (long?)m.BikeModelId
                    select new
                    {
                        b.MotorBikeId,
                        b.ProductCode,
                        b.ProductName,
                        m.BikeModelId,
                        m.ModelName,
                        m.BikeType
                    }
                )
                .ToListAsync();

            HashSet<long> electricModels =
                (
                    await _context
                        .Set<MotorBikeSpecificationsEntity>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted && x.FuelType == "Electric")
                        .Select(x => x.BikeModelId)
                        .ToListAsync()
                )
                .ToHashSet();

            List<ElectricBikeDto> bikes =
                rows
                    .Where
                    (
                        x =>
                            (x.BikeType ?? string.Empty).StartsWith("Electric", StringComparison.OrdinalIgnoreCase)
                            ||
                            electricModels.Contains(x.BikeModelId)
                    )
                    .GroupBy(x => x.MotorBikeId)
                    .Select
                    (
                        g =>
                            new ElectricBikeDto
                            {
                                ProductId = g.Key,
                                ProductCode = g.First().ProductCode,
                                ProductName = g.First().ProductName,
                                BikeModelId = g.First().BikeModelId,
                                ModelName = g.First().ModelName
                            }
                    )
                    .OrderBy(x => x.ProductId)
                    .ToList();

            return Ok(bikes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the electric motor bikes.");

            return StatusCode(500, "Failed to load the electric motor bikes.");
        }
    }
}


public class ElectricBikeDto
{
    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    // The bike model (pages that pick a model, not a colour)
    public long BikeModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;
}
