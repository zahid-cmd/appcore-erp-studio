//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.RegistrationManagement.RegistrationProcessing;


//===============================================================
// Registration Profiles (hand-written page, NO Code
// Synchronization; table made by RegistrationOnSale_Engine.sql).
// One per chassis the dealer registers : made when a Sales
// Invoice - MB with a registration is posted. The costs are the
// Registration Configuration rates in force on the invoice date.
//
// Status : Pending (not fully paid) -> Processing (paid) ->
// SubmittedToBrta -> RegistrationCompleted -> Delivered;
// Cancelled (invoice cancelled / registration reversed).
//===============================================================

public class RegistrationProfiles
{
    public long RegistrationProfileId { get; set; }

    public Guid PublicId { get; set; }

    // REG-<invoice no>/<n> (n = the Customer File's suffix)
    public string ProfileNo { get; set; } = string.Empty;

    public DateOnly ProfileDate { get; set; }

    public long BranchId { get; set; }

    // Invoice
    public string Source { get; set; } = "Invoice";

    public long? SalesInvoiceId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public DateOnly? SalesInvoiceDate { get; set; }

    public long? CustomerFileId { get; set; }

    public string CustomerFileNo { get; set; } = string.Empty;

    // Customer Profiles (as on the invoice)
    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string SalesmanName { get; set; } = string.Empty;

    // The bike
    public long? MotorBikeUnitId { get; set; }

    public long MotorBikeId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    // Fuel / Electric
    public string VehiclePower { get; set; } = "Fuel";

    // Registration Configuration (copied)
    public long RegistrationTypeId { get; set; }

    public string RegistrationTypeName { get; set; } = string.Empty;

    public string RegistrationPlan { get; set; } = string.Empty;

    public string RegistrationMode { get; set; } = string.Empty;

    public int ValidityYears { get; set; }

    // Charged to the customer (per chassis) and collected so far
    public decimal Amount { get; set; }

    public decimal CollectedAmount { get; set; }

    // Costs in force on the invoice date
    public decimal BrtaFees { get; set; }

    public decimal SubmissionCharges { get; set; }

    public decimal BrtaTips { get; set; }

    public decimal RegistrationCommission { get; set; }

    // Amount - all costs
    public decimal Surplus { get; set; }

    public string Status { get; set; } = "Pending";

    public DateOnly? StatusDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
