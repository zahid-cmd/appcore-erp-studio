//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Entities.InventoryManagement.PricingLabels;

using AppCore.Infrastructure.Persistence;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Inventory;


//===============================================================
// Motor Bike prices from the price cards (2026-11-10)
//
// Product Pricing - Motor Bikes is the only source of the motor
// bike DP and MRP :
//   DpAsync  : the DEALING price with a supplier = the supplier's
//              latest posted card on the date (purchases,
//              opening stock)
//   MrpAsync : the SELLING MRP = per model, the newest posted card
//              of any supplier pricing the model on the date
//              (barcode, sales)
// A colour takes its own price on the card (colour exception),
// else its model's price. No card -> not in the result.
//===============================================================

public static class MotorBikeCardPrices
{
    private const string StatusPosted = "Posted";

    // DP / MRP of one bike (colour) on a card
    public sealed class CardPrice
    {
        public long MotorBikeId { get; set; }

        public long ModelId { get; set; }

        public decimal Dp { get; set; }

        public decimal Mrp { get; set; }

        public long CardId { get; set; }

        public string CardNo { get; set; } = string.Empty;

        public string SupplierCode { get; set; } = string.Empty;

        public DateOnly EffectiveFrom { get; set; }
    }


    //===========================================================
    // Selling MRP per bike (colour) on a date : per model, the
    // newest posted card of any supplier that prices the model
    //===========================================================

    public static async Task<Dictionary<long, CardPrice>>
        MrpAsync
        (
            AppDbContext context,
            DateOnly date,
            IReadOnlyCollection<long> motorBikeIds
        )
    {
        Dictionary<long, long> modelOf =
            await ModelsAsync(context, motorBikeIds);

        if (modelOf.Count == 0)
        {
            return new Dictionary<long, CardPrice>();
        }

        List<long> modelIds =
            modelOf.Values.Distinct().ToList();

        // Posted cards started by the date that price these models
        var cards =
            await
            (
                from h in context.Set<ProductPricingMotorBikes>().AsNoTracking()
                where !h.IsDeleted
                      && h.Status == StatusPosted
                      && h.EffectiveFrom <= date
                      && context.Set<ProductPricingMotorBikeLines>()
                                .Any(l => l.CardId == h.Id && l.MotorBikeId == null && modelIds.Contains(l.ModelId))
                select new { h.Id, h.CardNo, h.SupplierCode, h.EffectiveFrom, h.PostedDate }
            )
            .ToListAsync();

        if (cards.Count == 0)
        {
            return new Dictionary<long, CardPrice>();
        }

        List<long> cardIds =
            cards.Select(x => x.Id).ToList();

        List<ProductPricingMotorBikeLines> lines =
            await context
                .Set<ProductPricingMotorBikeLines>()
                .AsNoTracking()
                .Where(x => cardIds.Contains(x.CardId) && modelIds.Contains(x.ModelId))
                .ToListAsync();

        // Newest first : Effective From, then posting, then id
        var ordered =
            cards
                .OrderByDescending(x => x.EffectiveFrom)
                .ThenByDescending(x => x.PostedDate)
                .ThenByDescending(x => x.Id)
                .ToList();

        Dictionary<long, CardPrice> result =
            new();

        foreach (KeyValuePair<long, long> bike in modelOf)
        {
            foreach (var card in ordered)
            {
                ProductPricingMotorBikeLines? model =
                    lines.FirstOrDefault(l => l.CardId == card.Id && l.MotorBikeId == null && l.ModelId == bike.Value);

                if (model == null)
                {
                    continue;
                }

                ProductPricingMotorBikeLines own =
                    lines.FirstOrDefault(l => l.CardId == card.Id && l.MotorBikeId == bike.Key)
                    ?? model;

                result[bike.Key] =
                    new CardPrice
                    {
                        MotorBikeId = bike.Key,
                        ModelId = bike.Value,
                        Dp = own.Dp,
                        Mrp = own.Mrp,
                        CardId = card.Id,
                        CardNo = card.CardNo,
                        SupplierCode = card.SupplierCode,
                        EffectiveFrom = card.EffectiveFrom
                    };

                break;
            }
        }

        return result;
    }


    //===========================================================
    // Dealing price per bike (colour) with a supplier on a date :
    // the supplier's latest posted card (it holds the whole set)
    //===========================================================

    public static async Task<Dictionary<long, CardPrice>>
        DpAsync
        (
            AppDbContext context,
            string supplierCode,
            DateOnly date,
            IReadOnlyCollection<long> motorBikeIds
        )
    {
        string supplier =
            (supplierCode ?? string.Empty).Trim();

        Dictionary<long, long> modelOf =
            await ModelsAsync(context, motorBikeIds);

        if (supplier.Length == 0 || modelOf.Count == 0)
        {
            return new Dictionary<long, CardPrice>();
        }

        var card =
            await context
                .Set<ProductPricingMotorBikes>()
                .AsNoTracking()
                .Where
                (
                    h =>
                        !h.IsDeleted
                        && h.Status == StatusPosted
                        && h.SupplierCode == supplier
                        && h.EffectiveFrom <= date
                )
                .OrderByDescending(h => h.EffectiveFrom)
                .ThenByDescending(h => h.Id)
                .Select(h => new { h.Id, h.CardNo, h.SupplierCode, h.EffectiveFrom })
                .FirstOrDefaultAsync();

        if (card == null)
        {
            return new Dictionary<long, CardPrice>();
        }

        List<ProductPricingMotorBikeLines> lines =
            await context
                .Set<ProductPricingMotorBikeLines>()
                .AsNoTracking()
                .Where(x => x.CardId == card.Id)
                .ToListAsync();

        Dictionary<long, CardPrice> result =
            new();

        foreach (KeyValuePair<long, long> bike in modelOf)
        {
            ProductPricingMotorBikeLines? model =
                lines.FirstOrDefault(l => l.MotorBikeId == null && l.ModelId == bike.Value);

            if (model == null)
            {
                continue;
            }

            ProductPricingMotorBikeLines own =
                lines.FirstOrDefault(l => l.MotorBikeId == bike.Key)
                ?? model;

            result[bike.Key] =
                new CardPrice
                {
                    MotorBikeId = bike.Key,
                    ModelId = bike.Value,
                    Dp = own.Dp,
                    Mrp = own.Mrp,
                    CardId = card.Id,
                    CardNo = card.CardNo,
                    SupplierCode = card.SupplierCode,
                    EffectiveFrom = card.EffectiveFrom
                };
        }

        return result;
    }


    // Motor bike -> its model (ProductSubCategoryId)
    private static async Task<Dictionary<long, long>>
        ModelsAsync
        (
            AppDbContext context,
            IReadOnlyCollection<long> motorBikeIds
        )
    {
        List<long> ids =
            (motorBikeIds ?? Array.Empty<long>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<long, long>();
        }

        return await context
            .Set<MotorBikesEntity>()
            .AsNoTracking()
            .Where(x => ids.Contains(x.MotorBikeId))
            .ToDictionaryAsync(x => x.MotorBikeId, x => x.ProductSubCategoryId);
    }
}
