//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sold bikes (our outlet) and their service schedule
//
// A bike sold from the outlet gets its schedule from the brand's
// Service Policy when the sale is saved (or by hand for bikes
// sold before the ERP). 7 days before a service is due a
// Service Enquiry (Source "Scheduled") is raised for follow-up.
//===============================================================

public class ServiceVehicleScheduleDto
{
    public long ServiceVehicleScheduleId { get; set; }

    public int SequenceNo { get; set; }

    public string ServiceType { get; set; } = string.Empty;

    public string ServiceName { get; set; } = string.Empty;

    public long? ScheduledServiceId { get; set; }

    public string ServiceCode { get; set; } = string.Empty;

    public decimal CustomerCharge { get; set; }

    public int IntervalDays { get; set; }

    public int IntervalKm { get; set; }

    public int GraceDays { get; set; }

    public DateOnly DueDate { get; set; }

    public int DueKm { get; set; }

    public DateOnly LastDate { get; set; }

    public bool DueDateEdited { get; set; }

    // Stored : Upcoming / Enquired / Taken / Skipped
    public string Status { get; set; } = string.Empty;

    // Shown : Upcoming / Due / Missed / Out of warranty / Enquired /
    // Declined / Taken / Skipped
    public string StatusText { get; set; } = string.Empty;

    public long? ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public DateOnly? TakenDate { get; set; }

    public int? TakenKm { get; set; }

    public string TakenDocType { get; set; } = string.Empty;

    public string TakenDocNo { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}


public class ServiceVehicleDto
{
    public long ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public long ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public long? ServicePolicyId { get; set; }

    public string PolicyCode { get; set; } = string.Empty;

    public int WarrantyYears { get; set; }

    public int WarrantyKm { get; set; }

    public DateOnly? WarrantyUntil { get; set; }

    public bool InWarranty { get; set; }

    public DateOnly SaleDate { get; set; }

    public string SaleSource { get; set; } = string.Empty;

    public string SaleDocType { get; set; } = string.Empty;

    public long? SaleDocId { get; set; }

    public string SaleDocNo { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public int? LastKm { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // Counts and the next service still to take
    public int TakenCount { get; set; }

    public int TotalCount { get; set; }

    public string NextServiceName { get; set; } = string.Empty;

    public DateOnly? NextDueDate { get; set; }

    public string NextStatusText { get; set; } = string.Empty;

    public string NextEnquiryNo { get; set; } = string.Empty;

    public List<ServiceVehicleScheduleDto> Schedules { get; set; } = new();

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


// A schedule row as edited on the form (matched by SequenceNo)
public class SaveServiceVehicleScheduleDto
{
    public int SequenceNo { get; set; }

    // Kept when DueDateEdited is true
    public DateOnly? DueDate { get; set; }

    public bool DueDateEdited { get; set; }

    // Taken before the ERP / outside a job card
    public DateOnly? TakenDate { get; set; }

    public int? TakenKm { get; set; }

    public bool Skipped { get; set; }

    public string Note { get; set; } = string.Empty;
}


// Add (sold before the ERP) / Update
public class SaveServiceVehicleDto
{
    public long ServiceVehicleId { get; set; }

    public long BranchId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public long ModelId { get; set; }

    public string ColorName { get; set; } = string.Empty;

    public DateOnly? SaleDate { get; set; }

    public string Mobile { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public int? LastKm { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<SaveServiceVehicleScheduleDto> Schedules { get; set; } = new();
}


// What Sales Invoices - MB passes for each bike sold
public class SoldBikeInput
{
    // e.g. "Sales Invoice - MB"
    public string SaleDocType { get; set; } = string.Empty;

    public long SaleDocId { get; set; }

    public string SaleDocNo { get; set; } = string.Empty;

    public DateOnly SaleDate { get; set; }

    public long BranchId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    // Product Sub Category of the bike
    public long ModelId { get; set; }

    public string ColorName { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public long UserId { get; set; }
}
