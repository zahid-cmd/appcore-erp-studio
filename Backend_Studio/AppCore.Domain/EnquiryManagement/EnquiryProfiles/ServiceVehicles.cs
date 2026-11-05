//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Vehicles : bikes sold from our outlet
//
// One row per chassis. Made automatically when a motor bike sale
// is saved (SaleSource "Sale", Sales Invoices - MB), or by hand
// for bikes sold before the ERP (SaleSource "Manual").
// Its service schedule (ServiceVehicleSchedules) comes from the
// brand's Service Policy, counted from the sale date. The policy
// warranty (years / km) is copied here at the time.
//===============================================================

public class ServiceVehicles
{
    public long ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    // Model : Product Sub Category of a Motor Bikes category
    public long ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    // Policy used when the schedule was made (none = no schedule)
    public long? ServicePolicyId { get; set; }

    public string PolicyCode { get; set; } = string.Empty;

    public int WarrantyYears { get; set; }

    public int WarrantyKm { get; set; }

    public DateOnly? WarrantyUntil { get; set; }

    public DateOnly SaleDate { get; set; }

    // Sale (from the sales invoice) / Manual (sold before the ERP)
    public string SaleSource { get; set; } = "Manual";

    public string SaleDocType { get; set; } = string.Empty;

    public long? SaleDocId { get; set; }

    public string SaleDocNo { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Latest known reading (taken services, job cards)
    public int? LastKm { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Inactive : no more reminders (returned, sold on, stolen …)
    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
