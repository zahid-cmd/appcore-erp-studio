//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.RegistrationManagement.RegistrationControl;


//===============================================================
// Registration Configuration (hand-written page, NO Code
// Synchronization; tables made by RegistrationConfiguration_
// Tables.sql). Four tabs, four tables :
//
//   RegistrationTypes         RTY-001  plan + mode, no amounts
//   RegistrationFees          RFE-001  min / max collection, dated
//   RegistrationCosts         RCO-001  BRTA fee, submission, tips,
//                                      commission, dated
//   RegistrationStageTimings  RST-001  the 6 fixed statuses
//===============================================================


//===============================================================
// Registration Types
//
// Plan : Installment (validity 2 years) / FullRegistration (10).
// Mode : Online / Offline. Vehicle Power : Fuel / Electric. The 8
// seeded rows are system rows (not deletable); plan, mode and
// power are locked after saving.
//===============================================================

public class RegistrationTypes
{
    public long RegistrationTypeId { get; set; }

    public Guid PublicId { get; set; }

    // RTY-001 (deleted rows count, never reused)
    public string Code { get; set; } = string.Empty;

    public string RegistrationPlan { get; set; } = string.Empty;

    // Fixed by the plan (Installment 2, FullRegistration 10)
    public int ValidityYears { get; set; }

    public string RegistrationMode { get; set; } = string.Empty;

    // Fuel / Electric : the Sales Invoice offers the types of the
    // bike's power (its specification's Fuel Type). Locked after
    // saving.
    public string VehiclePower { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public bool IsDefault { get; set; }

    public bool IsSystem { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Registration Fees : what the customer is charged, per type,
// dated (a rate change is a new row)
//===============================================================

public class RegistrationFees
{
    public long RegistrationFeeId { get; set; }

    public Guid PublicId { get; set; }

    // RFE-001
    public string Code { get; set; } = string.Empty;

    public long RegistrationTypeId { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    public decimal MinimumCollection { get; set; }

    public decimal MaximumCollection { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Registration Costs : what the dealer pays out, per type, dated.
// These configured amounts are the ones posted and paid.
//===============================================================

public class RegistrationCosts
{
    public long RegistrationCostId { get; set; }

    public Guid PublicId { get; set; }

    // RCO-001
    public string Code { get; set; } = string.Empty;

    public long RegistrationTypeId { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    // -> BRTA Fees Payable (with the submission charges)
    public decimal BrtaFees { get; set; }

    public decimal SubmissionCharges { get; set; }

    // -> BRTA Tips Payable
    public decimal BrtaTips { get; set; }

    // -> Registration Commission Account (salesman)
    public decimal RegistrationCommission { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Registration Stage Timings : the 6 fixed statuses (edit only :
// expected days, colour, remarks)
//===============================================================

public class RegistrationStageTimings
{
    public long RegistrationStageTimingId { get; set; }

    public Guid PublicId { get; set; }

    // RST-001
    public string Code { get; set; } = string.Empty;

    // Pending / Processing / SubmittedToBrta /
    // RegistrationCompleted / Delivered / Cancelled
    public string StageKey { get; set; } = string.Empty;

    public string StageName { get; set; } = string.Empty;

    public int StageOrder { get; set; }

    // Days a file may stay in this status before it is overdue
    // (null = no check)
    public int? ExpectedDays { get; set; }

    public string ColorCode { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
