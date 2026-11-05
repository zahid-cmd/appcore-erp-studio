//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Platform.Inventory;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Inventory;


//===============================================================
// Product Price Index : write / cancel entries and read the
// current MRP. Used inside the posting transactions of Purchases,
// Opening Stock and Product Pricing (the caller saves).
//===============================================================

public static class ProductPriceIndexWriter
{
    public const string SourcePurchase = "Purchase";

    public const string SourceOpening = "Opening";

    public const string SourcePriceChange = "PriceChange";

    // One entry (MRP above 0 only; the caller saves)
    public static void Add
    (
        AppDbContext context,
        string productType,
        long productId,
        string productCode,
        string productName,
        decimal mrp,
        DateOnly effectiveDate,
        string sourceType,
        long sourceId,
        string sourceNo,
        long userId,
        DateTime now
    )
    {
        if (mrp <= 0m || productId <= 0)
        {
            return;
        }

        context.Set<ProductPriceIndex>().Add(
            new ProductPriceIndex
            {
                ProductType = Limit(productType, 5),
                ProductId = productId,
                ProductCode = Limit(productCode, 40),
                ProductName = Limit(productName, 250),
                Mrp = Math.Round(mrp, 2, MidpointRounding.AwayFromZero),
                EffectiveDate = effectiveDate,
                SourceType = Limit(sourceType, 20),
                SourceId = sourceId,
                SourceNo = Limit(sourceNo, 40),
                IsCancelled = false,
                CreatedBy = userId,
                CreatedDate = now
            });
    }

    // The entries of a cancelled document (the caller saves)
    public static async Task CancelAsync
    (
        AppDbContext context,
        string sourceType,
        string productType,
        long sourceId,
        DateTime now
    )
    {
        List<ProductPriceIndex> rows =
            await context
                .Set<ProductPriceIndex>()
                .Where(x => x.SourceType == sourceType && x.ProductType == productType && x.SourceId == sourceId && !x.IsCancelled)
                .ToListAsync();

        foreach (ProductPriceIndex row in rows)
        {
            row.IsCancelled = true;

            row.CancelledDate = now;
        }
    }

    // Current MRP and its date per product of a type (ids null =
    // every product with an entry)
    public static async Task<Dictionary<long, (decimal Mrp, DateOnly Date, string SourceNo)>>
        CurrentAsync
        (
            AppDbContext context,
            string productType,
            IReadOnlyCollection<long>? productIds = null
        )
    {
        var rows =
            await context
                .Set<ProductPriceIndex>()
                .AsNoTracking()
                .Where(x => x.ProductType == productType && !x.IsCancelled && (productIds == null || productIds.Contains(x.ProductId)))
                .Select(x => new { x.ProductId, x.ProductPriceIndexId, x.Mrp, x.EffectiveDate, x.SourceNo })
                .ToListAsync();

        return rows
            .GroupBy(x => x.ProductId)
            .ToDictionary
            (
                g => g.Key,
                g =>
                {
                    var last =
                        g.OrderByDescending(x => x.EffectiveDate)
                         .ThenByDescending(x => x.ProductPriceIndexId)
                         .First();

                    return (last.Mrp, last.EffectiveDate, last.SourceNo);
                }
            );
    }

    private static string Limit
    (
        string? value,
        int maxLength
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= maxLength
            ? text
            : text.Substring(0, maxLength);
    }
}
