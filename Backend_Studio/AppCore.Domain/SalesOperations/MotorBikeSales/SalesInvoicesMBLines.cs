//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.MotorBikeSales;


//===============================================================
// Sales Invoices - MB line, table SalesInvoicesMbLines : one bike
// (chassis) per line, quantity 1.
//===============================================================

public class SalesInvoicesMbLines
    : SalesInvoiceLine,
      IMotorBikeSaleLine
{
    public long? MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    // Year of manufacture (BRTA Form-17)
    public int? ManufactureYear { get; set; }

    // CKD documents of the chassis when sold : Yes / No
    public string CkdStatus { get; set; } = "No";

    // Pending (sold, not handed over) / Delivered / Cancelled
    public string DeliveryStatus { get; set; } = "Pending";

    public DateOnly? DeliveredDate { get; set; }
}
