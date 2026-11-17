//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Service Operations : service estimates (ServiceOperations_
// Estimates_Engine.sql; hand-written page, no Code Sync).
//
// ServiceEstimates      EST-000001 with a version : what the job
//                       of a job card will cost.
//                       Draft -> Sent -> Approved / Rejected;
//                       Revise : this one becomes Revised and a new
//                       Draft with the next version is made.
//                       Approved : the job card follows it (its
//                       labour and part lines become these).
// ServiceEstimateLines  LineType Service (labour) / Part
//===============================================================

public class ServiceEstimates
{
    public long ServiceEstimateId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // EST-000001 : every version keeps the number
    public string EstimateNo { get; set; } = string.Empty;

    public int Version { get; set; } = 1;

    public DateOnly EstimateDate { get; set; }

    public DateOnly? ValidUntil { get; set; }

    public long BranchId { get; set; }

    // The job card made from the estimate (null : not converted)
    public long? JobCardId { get; set; }

    // The customer : of the customer profiles, or typed only
    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    // The bike : one the service center knows, or typed
    public long? ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    // What the customer asks for
    public string Requirement { get; set; } = string.Empty;

    // The Estimate Charge : the customized service selected in
    // Workshop Configuration, as it was when the estimate was saved
    // (frozen when it is collected)
    public long? ChargeServiceId { get; set; }

    public string ChargeName { get; set; } = string.Empty;

    public decimal ChargeAmount { get; set; }

    public decimal ChargeVatRate { get; set; }

    public decimal ChargeVatAmount { get; set; }

    public decimal ChargeTotal { get; set; }

    public string ChargeIncomeLedgerCode { get; set; } = string.Empty;

    public string ChargeVatLedgerCode { get; set; } = string.Empty;

    public bool ChargeCollected { get; set; }

    public DateOnly? ChargeCollectedDate { get; set; }

    public long? ChargeReceiptVoucherId { get; set; }

    public string ChargeReceiptVoucherNo { get; set; } = string.Empty;

    // The service invoice the collected charge came off
    public string ChargeInvoiceNo { get; set; } = string.Empty;

    // Draft / Sent / Approved / Rejected / Revised
    public string Status { get; set; } = "Draft";

    public DateTime StatusDate { get; set; }

    public string StatusNote { get; set; } = string.Empty;

    public decimal LabourTotal { get; set; }

    public decimal PartsTotal { get; set; }

    public decimal GrandTotal { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class ServiceEstimateLines
{
    public long ServiceEstimateLineId { get; set; }

    public long ServiceEstimateId { get; set; }

    // Service / Part
    public string LineType { get; set; } = "Service";

    public int LineNo { get; set; }

    // Service : Scheduled / LaborChart / Customized / Membership /
    // Other. Part : SparePart / Accessory / Other
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public bool IsFree { get; set; }

    public string Note { get; set; } = string.Empty;
}
