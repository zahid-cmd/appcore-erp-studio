//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.MotorBikeSales;


//===============================================================
// Sales Invoices - MB (header), table SalesInvoicesMb. The
// columns are in SalesInvoiceHeader (shared by SP / AC / MB) plus
// the Sale Type (MB only).
//===============================================================

public class SalesInvoicesMb
    : SalesInvoiceHeader, IMotorBikeSaleHeader
{
    // Regular (one chassis) / Corporate (several chassis)
    public string SaleType { get; set; } = "Regular";

    // Registration on the invoice (RegistrationOnSale_Engine.sql)
    public long? RegistrationTypeId { get; set; }

    public string RegistrationTypeName { get; set; } = string.Empty;

    // Per chassis
    public decimal RegistrationAmount { get; set; }

    public int RegistrationCount { get; set; }

    public decimal RegistrationTotal { get; set; }

    // Commission share (Registration Costs) of the total
    public decimal RegistrationCommission { get; set; }

    // '' / Active / Reversed
    public string RegistrationStatus { get; set; } = string.Empty;

    // The reversal Journal Voucher
    public long? RegistrationReversalId { get; set; }

    public string RegistrationReversalNo { get; set; } = string.Empty;

    public long? RegistrationReversedBy { get; set; }

    public DateTime? RegistrationReversedDate { get; set; }

    public string RegistrationReverseReason { get; set; } = string.Empty;
}
