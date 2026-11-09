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
}
