//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;


//===============================================================
// Sales Warranty Records (BikeDeliveries_Pdi_Engine.sql) : the
// warranty of one delivered bike, made when the bike is delivered
// (Bike Deliveries, or Delivery on Sale). The policy of the
// bike's brand / model valid on the delivery date is copied;
// the warranty starts on the delivery date.
// Status Active / Expired / Void / Claimed.
//===============================================================

public class SalesWarrantyRecords
{
    public long SalesWarrantyRecordId { get; set; }

    public Guid PublicId { get; set; }

    // SWR-000001
    public string Code { get; set; } = string.Empty;

    public string SourceType { get; set; } = "Bike Delivery";

    public long SourceId { get; set; }

    public long BranchId { get; set; }

    public long SalesInvoiceId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductName { get; set; } = string.Empty;

    public long? BikeModelId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public long? WarrantyPolicyId { get; set; }

    public string PolicyCode { get; set; } = string.Empty;

    public string PolicyName { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }

    public DateOnly? ExpiryDate { get; set; }

    public int? KmLimit { get; set; }

    public string Status { get; set; } = "Active";

    public string VoidReason { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class SalesWarrantyRecordParts
{
    public long SalesWarrantyRecordPartId { get; set; }

    public long SalesWarrantyRecordId { get; set; }

    public long WarrantyPartId { get; set; }

    public string PartName { get; set; } = string.Empty;

    public DateOnly? ExpiryDate { get; set; }

    public int? KmLimit { get; set; }

    public string Notes { get; set; } = string.Empty;
}
