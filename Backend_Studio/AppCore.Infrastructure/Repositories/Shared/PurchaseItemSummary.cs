//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Procurement.Shared;
using AppCore.Infrastructure.Persistence;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Purchase Item Summary (2026-11-10)
// --------------------------------------------------------------
// The short item list shown on the hover card of the purchase
// order and purchase lists : one row per product, with quantity,
// free quantity and amount.
//
// Motor bikes are kept per model, not per colour : a bike item
// is a model x colour row, and its sub category is the model, so
// "Revoo R1 - Red" and "Revoo R1 - Blue" become one "Revoo R1"
// row. Other products (spare parts, accessories) stay one row
// per product.
//===============================================================

public sealed class PurchaseItemSummaryLine
{
    public string ProductType { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal FreeQuantity { get; set; }

    public decimal LineTotal { get; set; }
}


public static class PurchaseItemSummary
{
    private const string TypeMotorBikes = "Motor Bikes";


    public static async Task<List<PurchaseItemSummaryDto>>
        BuildAsync
        (
            AppDbContext context,
            List<PurchaseItemSummaryLine> lines
        )
    {
        if (lines.Count == 0)
        {
            return new List<PurchaseItemSummaryDto>();
        }

        //-------------------------------------------------------
        // Motor bikes : item -> model (sub category) name
        //-------------------------------------------------------

        List<long> bikeIds =
            lines
                .Where(x => x.ProductType == TypeMotorBikes)
                .Select(x => x.ProductId)
                .Distinct()
                .ToList();

        Dictionary<long, string> modelOfBike =
            new();

        if (bikeIds.Count > 0)
        {
            modelOfBike =
                (
                    await
                    (
                        from b in context.Set<MotorBikesEntity>().AsNoTracking()

                        join s in context.Set<ProductSubCategoryEntity>().AsNoTracking()
                            on b.ProductSubCategoryId equals s.ProductSubCategoryId

                        where bikeIds.Contains(b.MotorBikeId)

                        select new { b.MotorBikeId, s.SubCategoryName }
                    )
                    .ToListAsync()
                )
                .Where(x => !string.IsNullOrWhiteSpace(x.SubCategoryName))
                .GroupBy(x => x.MotorBikeId)
                .ToDictionary(
                    g => g.Key,
                    g => g.First().SubCategoryName!.Trim());
        }

        //-------------------------------------------------------
        // Group : bikes by model, others by product
        //-------------------------------------------------------

        return lines
            .Select
            (
                x =>
                    new
                    {
                        Line = x,
                        Name =
                            x.ProductType == TypeMotorBikes && modelOfBike.TryGetValue(x.ProductId, out string? model)
                                ? model
                                : (string.IsNullOrWhiteSpace(x.ProductName) ? "(no name)" : x.ProductName.Trim()),
                        Key =
                            x.ProductType == TypeMotorBikes && modelOfBike.ContainsKey(x.ProductId)
                                ? "M:" + modelOfBike[x.ProductId].ToUpperInvariant()
                                : "P:" + x.ProductType + ":" + x.ProductId
                    }
            )
            .GroupBy(x => x.Key)
            .Select
            (
                g =>
                    new PurchaseItemSummaryDto
                    {
                        Name = g.First().Name,
                        Quantity = g.Sum(x => x.Line.Quantity),
                        FreeQuantity = g.Sum(x => x.Line.FreeQuantity),
                        Amount = g.Sum(x => x.Line.LineTotal),
                        Items = g.Count()
                    }
            )
            .ToList();
    }
}
