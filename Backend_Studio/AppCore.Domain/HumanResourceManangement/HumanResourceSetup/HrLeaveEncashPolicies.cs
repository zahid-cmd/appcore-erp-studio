//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Leave Encashment Policies
// (HumanResource_EncashmentPolicies_Engine.sql; hand-written page,
// no Code Sync).
//
// HrLeaveEncashPolicies     LEP-0001 "Encashment Policy - 1" : the
//                           rule of a leave encashment (which
//                           leave, on what salary, who, how many
//                           days). One is the Default : it applies
//                           to every employee whose profile names
//                           no other policy.
// HrLeaveEncashPolicyTypes  the leave types the policy lets encash
//===============================================================

public class HrLeaveEncashPolicies
{
    public long LeaveEncashPolicyId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    // Day rate = salary / this
    public int MonthDays { get; set; } = 30;

    // Only employees who are confirmed
    public bool ConfirmedOnly { get; set; }

    // Whole months of service needed
    public int MinServiceMonths { get; set; }

    // The most days of an employee a leave year, over all the
    // leave types together (0 = no limit)
    public decimal MaxDaysPerYear { get; set; }

    // Days that must stay in the balance
    public decimal KeepDays { get; set; }

    // Only a leave year that has ended is encashed
    public bool AfterYearEnd { get; set; }

    public bool IsDefault { get; set; }

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

public class HrLeaveEncashPolicyTypes
{
    public long LeaveEncashPolicyTypeId { get; set; }

    public long LeaveEncashPolicyId { get; set; }

    public long LeaveTypeId { get; set; }
}
