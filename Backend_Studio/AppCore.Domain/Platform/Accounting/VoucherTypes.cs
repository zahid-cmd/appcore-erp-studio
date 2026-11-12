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


    // Purchases (Mushak 6.3 as the purchase invoice; posted under
    // the purchase number) : Motor Bikes / Spare Parts &
    // Lubricants / Accessories
    public const string PurchaseMotorBikes = "PIMB";

    public const string PurchaseSpareParts = "PISP";

    public const string PurchaseAccessories = "PIAC";

    // Product Receiving (no journal; numbers only)
    public const string ReceivingMotorBikes = "RCMB";

    public const string ReceivingSpareParts = "RCSP";

    public const string ReceivingAccessories = "RCAC";

    // Opening Stock (journal Dr Inventory / Cr Opening Stock,
    // posted under the opening number) : Motor Bikes / Spare
    // Parts & Lubricants / Accessories
    public const string OpeningMotorBikes = "OPMB";

    public const string OpeningSpareParts = "OPSP";

    public const string OpeningAccessories = "OPAC";

    // Price Adjustment (journal of the stock price adjustment;
    // its own number PA-<branch>-<FY>-<MM>-00001, the Adjustment
    // No PA-<MB|SP|AC>-0001 is its reference)
    public const string PriceAdjustment = "PA";

    // Product Transfer between branches (journal Dr inventory of
    // the receiving branch / Cr inventory of the sending branch,
    // Inter-Branch lines by the posting engine; its own number
    // TRF-<branch>-<FY>-<MM>-00001, the Transfer No
    // TRF-<MB|SP|AC>-0001 is its reference; same-branch transfers
    // post no journal). Also the DocumentType of its stock
    // movements.
    public const string ProductTransfer = "TRF";

    // Sales Invoices (posted under the invoice number; the
    // payments become a Receipt Voucher of their own) : Spare
    // Parts & Lubricants / Accessories / Motor Bikes. Also the
    // DocumentType of their stock movements, allocations and VAT
    // register rows.
    public const string SalesInvoiceSpareParts = "SISP";

    public const string SalesInvoiceAccessories = "SIAC";

    public const string SalesInvoiceMotorBikes = "SIMB";

    // Bookings (numbers only; the advance is a Receipt Voucher of
    // its own) : Motor Bikes / Spare Parts & Lubricants /
    // Accessories
    public const string BookingMotorBikes = "BKMB";

    public const string BookingSpareParts = "BKSP";

    public const string BookingAccessories = "BKAC";

    // Sales Quotations (numbers only, never posted)
    public const string QuotationMotorBikes = "SQMB";

    public const string QuotationSpareParts = "SQSP";

    public const string QuotationAccessories = "SQAC";

    // Sales Returns (posted under the return number; also the
    // DocumentType of their stock movements and VAT register rows)
    public const string SalesReturnMotorBikes = "SRMB";

    public const string SalesReturnSpareParts = "SRSP";

    public const string SalesReturnAccessories = "SRAC";


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
        PurchaseOrderAccessories,
        PurchaseMotorBikes,
        PurchaseSpareParts,
        PurchaseAccessories,
        ReceivingMotorBikes,
        ReceivingSpareParts,
        ReceivingAccessories,
        OpeningMotorBikes,
        OpeningSpareParts,
        OpeningAccessories,
        PriceAdjustment,
        ProductTransfer,
        SalesInvoiceSpareParts,
        SalesInvoiceAccessories,
        SalesInvoiceMotorBikes,
        BookingMotorBikes,
        BookingSpareParts,
        BookingAccessories,
        QuotationMotorBikes,
        QuotationSpareParts,
        QuotationAccessories,
        SalesReturnMotorBikes,
        SalesReturnSpareParts,
        SalesReturnAccessories
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
