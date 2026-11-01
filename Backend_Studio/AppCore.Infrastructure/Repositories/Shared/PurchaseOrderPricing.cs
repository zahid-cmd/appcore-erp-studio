//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Purchase Order pricing : the figures every Purchase Order page
// uses, in one place (same steps as the page's
// pricePurchaseOrder in purchase-order.model.ts).
//   Profit on DP  : DP = MRP / (1 + p)   p = MRP / DP - 1
//   Profit on MRP : DP = MRP x (1 - p)   p = 1 - DP / MRP
//   VAT inclusive : Amount = round(Net x 100 / (100 + r))
//   VAT exclusive : VAT = round(Net x r / 100)
//   Net unit cost : (claimable ? Amount : payable) / (Qty + Free)
//===============================================================

public static class PurchaseOrderPricing
{
    public const string BasisMrp = "MRP";

    public const string BasisDp = "DP";

    public const string DiscountNone = "None";

    public const string DiscountPercent = "Percent";

    public const string DiscountAmount = "Amount";

    public const string RoundNone = "None";

    public const string RoundNearest = "Nearest";

    public const string RoundUp = "Up";

    public const string RoundDown = "Down";

    // Profit on DP above this is taken as a typing error
    public const decimal MaxProfitOnDp = 999.99m;


    public static bool IsMoney
    (
        decimal value
    )
    {
        return decimal.Round(value, 2) == value;
    }


    // 2 decimals, half away from zero (same as the page)
    public static decimal Money
    (
        decimal value
    )
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }



    //===========================================================
    // Pricing formulas (same as the page)
    //   Profit on DP  : DP = MRP / (1 + p)   p = MRP / DP - 1
    //   Profit on MRP : DP = MRP x (1 - p)   p = 1 - DP / MRP
    //===========================================================

    public static void CheckProfit
    (
        decimal percent,
        string basis,
        string label
    )
    {
        if (percent < 0 || !IsMoney(percent))
        {
            throw new InvalidOperationException(
                $"{label} must be 0 or more with at most 2 decimals.");
        }

        if (basis == BasisMrp && percent >= 100)
        {
            throw new InvalidOperationException(
                $"{label} on MRP must be less than 100%.");
        }

        if (basis == BasisDp && percent > MaxProfitOnDp)
        {
            throw new InvalidOperationException(
                $"{label} on DP cannot be more than {MaxProfitOnDp}%.");
        }
    }


    public static decimal DpFromMrp
    (
        decimal mrp,
        decimal percent,
        string basis
    )
    {
        return basis == BasisDp
            ? Money(mrp / (1m + percent / 100m))
            : Money(mrp * (1m - percent / 100m));
    }


    public static decimal ProfitFrom
    (
        decimal mrp,
        decimal dp,
        string basis
    )
    {
        if (!(mrp > 0) || !(dp > 0))
        {
            return 0m;
        }

        decimal percent =
            basis == BasisDp
                ? (mrp / dp - 1m) * 100m
                : (1m - dp / mrp) * 100m;

        return Math.Clamp(Money(percent), 0m, 99999.99m);
    }



    // Net (after discount) → Amount without VAT, VAT, payable
    public static (decimal Amount, decimal Vat, decimal Total)
        SplitVat
        (
            decimal net,
            decimal vatRate,
            bool priceIncludesVat
        )
    {
        if (priceIncludesVat)
        {
            decimal amount =
                Money(net * 100m / (100m + vatRate));

            return (amount, net - amount, net);
        }

        decimal vat =
            Money(net * vatRate / 100m);

        return (net, vat, net + vat);
    }


    public static decimal UnitCost
    (
        decimal amount,
        decimal units
    )
    {
        return units > 0
            ? decimal.Round(amount / units, 4, MidpointRounding.AwayFromZero)
            : 0m;
    }
}