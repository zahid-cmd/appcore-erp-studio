//===============================================================
// Namespaces
//===============================================================

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

namespace AppCore.Infrastructure.Platform.Inventory;


//===============================================================
// Motor Bike Power (2026-11-10) : electric bikes carry a MOTOR
// number, not an engine number. Messages name the number by the
// bike : "Motor No" / "Engine No".
//
// Electric = the model's Bike Type "Electric ..." or its
// specification Fuel Type Electric.
//===============================================================

public static class MotorBikePower
{
    // The electric ones among the motor bikes (product ids)
    public static async Task<HashSet<long>>
        ElectricAsync
        (
            AppDbContext context,
            IEnumerable<long> productIds
        )
    {
        List<long> ids =
            productIds.Where(x => x > 0).Distinct().ToList();

        if (ids.Count == 0)
        {
            return new HashSet<long>();
        }

        var rows =
            await
            (
                from b in context.Set<MotorBikesEntity>().AsNoTracking()
                where ids.Contains(b.MotorBikeId)
                join s in context.Set<ProductSubCategoryEntity>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId
                join m in context.Set<BikeModelsEntity>().AsNoTracking()
                    on s.BikeModelId equals (long?)m.BikeModelId
                select new { b.MotorBikeId, m.BikeModelId, m.BikeType }
            )
            .ToListAsync();

        List<long> modelIds =
            rows.Select(x => x.BikeModelId).Distinct().ToList();

        HashSet<long> electricModels =
            (
                await context
                    .Set<MotorBikeSpecificationsEntity>()
                    .AsNoTracking()
                    .Where(x => modelIds.Contains(x.BikeModelId) && !x.IsDeleted && x.FuelType == "Electric")
                    .Select(x => x.BikeModelId)
                    .ToListAsync()
            )
            .ToHashSet();

        return rows
            .Where
            (
                x =>
                    (x.BikeType ?? string.Empty).StartsWith("Electric", StringComparison.OrdinalIgnoreCase)
                    ||
                    electricModels.Contains(x.BikeModelId)
            )
            .Select(x => x.MotorBikeId)
            .ToHashSet();
    }


    // "Motor" / "Engine" for one bike
    public static async Task<string>
        WordAsync
        (
            AppDbContext context,
            long productId
        )
    {
        return (await ElectricAsync(context, new[] { productId })).Count > 0
            ? "Motor"
            : "Engine";
    }


    // "Motor" / "Engine" / "Engine / Motor" for several bikes
    public static string WordOf
    (
        HashSet<long> electric,
        IEnumerable<long> productIds
    )
    {
        List<long> ids =
            productIds.Where(x => x > 0).Distinct().ToList();

        int count =
            ids.Count(x => electric.Contains(x));

        return count == 0
            ? "Engine"
            : count == ids.Count
                ? "Motor"
                : "Engine / Motor";
    }
}
