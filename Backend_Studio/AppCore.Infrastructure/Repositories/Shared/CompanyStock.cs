//===============================================================
// Imports
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Procurement.Shared;
using AppCore.Infrastructure.Persistence;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Company stock of a product type, per product and branch :
//   stock = In Transit (purchased, not yet received) + On Hand
//   (in the warehouses), read from StockMovements.
// Used by the Purchase Order and Purchase pages (Total Stock box,
// the 📍 branch list, Product Shelf, Max Stock Level).
//===============================================================

public static class CompanyStock
{
    private const string BucketOnHand = "OnHand";

    // ProductCode → its branches (only branches holding stock)
    public static async Task<Dictionary<string, List<PurchaseOrderStockBranchDto>>>
        LoadAsync
        (
            AppDbContext context,
            string productType
        )
    {
        var sums =
            await context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == productType)
                .GroupBy(x => new { x.StockBatchId, x.BranchId })
                .Select
                (
                    g =>
                        new
                        {
                            g.Key.StockBatchId,
                            g.Key.BranchId,
                            InTransit = g.Sum(x => x.Bucket != BucketOnHand ? x.QuantityIn - x.QuantityOut : 0m),
                            OnHand = g.Sum(x => x.Bucket == BucketOnHand ? x.QuantityIn - x.QuantityOut : 0m)
                        }
                )
                .Where(x => x.InTransit != 0m || x.OnHand != 0m)
                .ToListAsync();

        if (sums.Count == 0)
        {
            return new Dictionary<string, List<PurchaseOrderStockBranchDto>>(StringComparer.OrdinalIgnoreCase);
        }

        List<long> batchIds =
            sums.Select(x => x.StockBatchId).Distinct().ToList();

        Dictionary<long, string> codes =
            await context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => batchIds.Contains(x.StockBatchId))
                .ToDictionaryAsync(x => x.StockBatchId, x => x.ProductCode ?? string.Empty);

        List<long> branchIds =
            sums.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        return sums
            .Where(x => codes.ContainsKey(x.StockBatchId))
            .GroupBy(x => codes[x.StockBatchId], StringComparer.OrdinalIgnoreCase)
            .ToDictionary
            (
                g => g.Key,
                g =>
                    g.GroupBy(x => x.BranchId)
                        .Select
                        (
                            b =>
                                new PurchaseOrderStockBranchDto
                                {
                                    BranchId = b.Key,
                                    BranchName = branches.GetValueOrDefault(b.Key, string.Empty),
                                    InTransit = b.Sum(x => x.InTransit),
                                    OnHand = b.Sum(x => x.OnHand)
                                }
                        )
                        .Where(x => x.InTransit != 0m || x.OnHand != 0m)
                        .OrderBy(x => x.BranchName)
                        .ToList(),
                StringComparer.OrdinalIgnoreCase
            );
    }

    // ProductCode → total stock (all branches)
    public static Dictionary<string, decimal>
        Totals
        (
            Dictionary<string, List<PurchaseOrderStockBranchDto>> byBranch
        )
    {
        return byBranch.ToDictionary
        (
            x => x.Key,
            x => x.Value.Sum(b => b.InTransit + b.OnHand),
            StringComparer.OrdinalIgnoreCase
        );
    }
}
