//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Leave Encashment Policies (Human Resource Setup, hand-written
// page)
//===============================================================

public class LeaveEncashPolicyDto
{
    public long LeaveEncashPolicyId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    // Day rate = salary / this
    public int MonthDays { get; set; } = 30;

    public bool ConfirmedOnly { get; set; }

    public int MinServiceMonths { get; set; }

    // 0 = no limit
    public decimal MaxDaysPerYear { get; set; }

    public decimal KeepDays { get; set; }

    // Only a leave year that has ended is encashed
    public bool AfterYearEnd { get; set; }

    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // The leave types it lets encash
    public List<long> LeaveTypeIds { get; set; } = new();

    // Read only : their names, the profiles that name it, the
    // encashments made with it
    public string LeaveTypeNames { get; set; } = string.Empty;

    public int EmployeeCount { get; set; }

    public int EncashmentCount { get; set; }
}

public class LeaveEncashPolicyLeaveTypeDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal DaysPerYear { get; set; }
}

public class LeaveEncashPolicyDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public string NextName { get; set; } = string.Empty;

    // No policy yet : the first one is the Default
    public bool IsFirst { get; set; }

    // Active leave types
    public List<LeaveEncashPolicyLeaveTypeDto> LeaveTypes { get; set; } = new();
}
