//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Accounting;


//===============================================================
// Voucher Types (number prefixes)
//
// Number : <PREFIX>-<BRANCH DIGITS>-<FY>-<MM>-<seq5>
//          e.g. RV-010101-2627-10-00001
//===============================================================

public static class VoucherTypes
{
    // Receipt Voucher
    public const string Receipt = "RV";

    // Payment Voucher
    public const string Payment = "PV";

    // Journal Voucher
    public const string Journal = "JV";

    // Fund Transfer
    public const string FundTransfer = "FT";

    // Voucher created by a receipt-side reconciliation
    // (cheque / MFS / POS / EMI)
    public const string ReceiptReconciliation = "RRV";

    // Voucher created by a payment-side reconciliation
    // (issued cheques)
    public const string PaymentReconciliation = "RRP";

    // Purchase Orders (numbered like vouchers, never posted) :
    // Motor Bikes / Spare Parts & Lubricants / Accessories
    public const string PurchaseOrderMotorBikes = "POMB";

    public const string PurchaseOrderSpareParts = "POSP";

    public const string PurchaseOrderAccessories = "POAC";


    public static readonly string[] All =
    {
        Receipt,
        Payment,
        Journal,
        FundTransfer,
        ReceiptReconciliation,
        PaymentReconciliation,
        PurchaseOrderMotorBikes,
        PurchaseOrderSpareParts,
        PurchaseOrderAccessories
    };


    public static bool IsValid
    (
        string? prefix
    )
    {
        return All.Contains(
            (prefix ?? string.Empty).Trim());
    }
}