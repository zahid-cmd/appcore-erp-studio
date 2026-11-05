//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Accounting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SalesOperations.Shared;


//===============================================================
// One Sales Invoices page : what makes SP / AC / MB different.
// Switches and ledgers are always read BY CODE; a null switch
// code = the switch is not on this page (its default is used).
//
// Switch codes (System Configurations, Sales Operations MOD-008) :
//
//                                  MB    SP    AC   default
//   Post on Approval              0001  0021  0041  OFF
//   Allow Credit Sale             0002  0022  0042  OFF
//   Enforce Credit Limit          0003  0023  0043  ON
//   Allow Price Edit              0004  0024  0044  OFF (Value = max %)
//   Allow Discount                0005  0025  0045  OFF (Value = max %)
//   Block Sale Below Cost         0006  0026  0046  ON
//   Allow Sale Without Stock        -   0027  0047  OFF
//   Back Dated Sales              0008  0028  0048  OFF
//   Allow Cancel of Posted        0009  0029  0049  OFF (Value = days)
//   Print After Posting           0010  0030  0050  ON
//   Allow Walk-in Customers         -   0031  0051  ON
//   Sell at Batch MRP             0017  0032  0052  ON
//   Round Down to Whole Taka      0018  0033  0053  ON
//
// Only SP is wired now; AC / MB are here so the engine is ready.
//===============================================================

public sealed class SalesInvoicePage
{
    // SP / AC / MB (the page type of the stock batches)
    public string PageType { get; init; } = string.Empty;

    // Number prefix and voucher type (SISP / SIAC / SIMB)
    public string Prefix { get; init; } = string.Empty;

    // "Sales Invoice - SP"
    public string Title { get; init; } = string.Empty;

    // Header table (row lock FOR UPDATE)
    public string TableName { get; init; } = string.Empty;

    // Sales VAT applicability product line (IVatApplicabilityService)
    public string VatLine { get; init; } = string.Empty;

    // Membership discount % column used (Spare Parts / Accessories)
    public string MembershipDiscountOf { get; init; } = string.Empty;


    //===========================================================
    // Posting Setup purposes (by code)
    //===========================================================

    public string PurposeSales { get; init; } = string.Empty;

    public string PurposeVat { get; init; } = string.Empty;

    public string PurposeCampaignDiscount { get; init; } = string.Empty;

    public string PurposeSpecialDiscount { get; init; } = string.Empty;

    public string PurposeFractionalDiscount { get; init; } = string.Empty;


    //===========================================================
    // Switch codes (CFG-MOD-008-nnnn)
    //===========================================================

    public string? SwitchPostOnApproval { get; init; }

    public string? SwitchAllowCreditSale { get; init; }

    public string? SwitchEnforceCreditLimit { get; init; }

    public string? SwitchAllowPriceEdit { get; init; }

    public string? SwitchAllowDiscount { get; init; }

    public string? SwitchBlockBelowCost { get; init; }

    public string? SwitchAllowWithoutStock { get; init; }

    public string? SwitchBackDated { get; init; }

    public string? SwitchAllowCancelPosted { get; init; }

    public string? SwitchPrintAfterPosting { get; init; }

    public string? SwitchAllowWalkIn { get; init; }

    public string? SwitchSellAtBatchMrp { get; init; }

    public string? SwitchRoundDownWholeTaka { get; init; }
}


//===============================================================
// The three pages
//===============================================================

public static class SalesInvoicePages
{
    public const string MembershipSpareParts = "SpareParts";

    public const string MembershipAccessories = "Accessories";


    public static readonly SalesInvoicePage SpareParts =
        new()
        {
            PageType = "SP",
            Prefix = "SISP",
            Title = "Sales Invoice - SP",
            TableName = "SalesInvoicesSp",
            VatLine = "SP",
            MembershipDiscountOf = MembershipSpareParts,
            PurposeSales = PostingPurposes.SalesSpareParts,
            PurposeVat = PostingPurposes.VatSpareParts,
            PurposeCampaignDiscount = PostingPurposes.CampaignDiscountSpareParts,
            PurposeSpecialDiscount = PostingPurposes.SpecialDiscountSpareParts,
            PurposeFractionalDiscount = PostingPurposes.FractionalDiscountSpareParts,
            SwitchPostOnApproval = "CFG-MOD-008-0021",
            SwitchAllowCreditSale = "CFG-MOD-008-0022",
            SwitchEnforceCreditLimit = "CFG-MOD-008-0023",
            SwitchAllowPriceEdit = "CFG-MOD-008-0024",
            SwitchAllowDiscount = "CFG-MOD-008-0025",
            SwitchBlockBelowCost = "CFG-MOD-008-0026",
            SwitchAllowWithoutStock = "CFG-MOD-008-0027",
            SwitchBackDated = "CFG-MOD-008-0028",
            SwitchAllowCancelPosted = "CFG-MOD-008-0029",
            SwitchPrintAfterPosting = "CFG-MOD-008-0030",
            SwitchAllowWalkIn = "CFG-MOD-008-0031",
            SwitchSellAtBatchMrp = "CFG-MOD-008-0032",
            SwitchRoundDownWholeTaka = "CFG-MOD-008-0033"
        };


    // Not wired yet (Sales Invoices - AC) : purposes to be made by
    // its SQL when the page is built
    public static readonly SalesInvoicePage Accessories =
        new()
        {
            PageType = "AC",
            Prefix = "SIAC",
            Title = "Sales Invoice - AC",
            TableName = "SalesInvoicesAc",
            VatLine = "AC",
            MembershipDiscountOf = MembershipAccessories,
            PurposeSales = "SALES-AC",
            PurposeVat = "VAT-AC",
            PurposeCampaignDiscount = "CAMPAIGN-DISCOUNT-AC",
            PurposeSpecialDiscount = "SPECIAL-DISCOUNT-AC",
            PurposeFractionalDiscount = "FRACTIONAL-DISCOUNT-AC",
            SwitchPostOnApproval = "CFG-MOD-008-0041",
            SwitchAllowCreditSale = "CFG-MOD-008-0042",
            SwitchEnforceCreditLimit = "CFG-MOD-008-0043",
            SwitchAllowPriceEdit = "CFG-MOD-008-0044",
            SwitchAllowDiscount = "CFG-MOD-008-0045",
            SwitchBlockBelowCost = "CFG-MOD-008-0046",
            SwitchAllowWithoutStock = "CFG-MOD-008-0047",
            SwitchBackDated = "CFG-MOD-008-0048",
            SwitchAllowCancelPosted = "CFG-MOD-008-0049",
            SwitchPrintAfterPosting = "CFG-MOD-008-0050",
            SwitchAllowWalkIn = "CFG-MOD-008-0051",
            SwitchSellAtBatchMrp = "CFG-MOD-008-0052",
            SwitchRoundDownWholeTaka = "CFG-MOD-008-0053"
        };


    // Not wired yet (Sales Invoices - MB : bikes are sold by
    // chassis; no sale without stock, no walk-in)
    public static readonly SalesInvoicePage MotorBikes =
        new()
        {
            PageType = "MB",
            Prefix = "SIMB",
            Title = "Sales Invoice - MB",
            TableName = "SalesInvoicesMb",
            VatLine = "MB",
            MembershipDiscountOf = string.Empty,
            PurposeSales = "SALES-MB",
            PurposeVat = "VAT-MB",
            PurposeCampaignDiscount = "CAMPAIGN-DISCOUNT-MB",
            PurposeSpecialDiscount = "SPECIAL-DISCOUNT-MB",
            PurposeFractionalDiscount = "FRACTIONAL-DISCOUNT-MB",
            SwitchPostOnApproval = "CFG-MOD-008-0001",
            SwitchAllowCreditSale = "CFG-MOD-008-0002",
            SwitchEnforceCreditLimit = "CFG-MOD-008-0003",
            SwitchAllowPriceEdit = "CFG-MOD-008-0004",
            SwitchAllowDiscount = "CFG-MOD-008-0005",
            SwitchBlockBelowCost = "CFG-MOD-008-0006",
            SwitchAllowWithoutStock = null,
            SwitchBackDated = "CFG-MOD-008-0008",
            SwitchAllowCancelPosted = "CFG-MOD-008-0009",
            SwitchPrintAfterPosting = "CFG-MOD-008-0010",
            SwitchAllowWalkIn = null,
            SwitchSellAtBatchMrp = "CFG-MOD-008-0017",
            SwitchRoundDownWholeTaka = "CFG-MOD-008-0018"
        };
}
