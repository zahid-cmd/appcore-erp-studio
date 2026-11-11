//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.RegistrationProcessing;


//===============================================================
// Registration Profiles : list (one per registered chassis)
//===============================================================

public class RegistrationProfileRowDto
{
    public long RegistrationProfileId { get; set; }

    public Guid PublicId { get; set; }

    public string ProfileNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string ProfileDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string SalesInvoiceDate { get; set; } = string.Empty;

    public string CustomerFileNo { get; set; } = string.Empty;

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string SalesmanName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public string VehiclePower { get; set; } = string.Empty;

    public string RegistrationTypeName { get; set; } = string.Empty;

    public string RegistrationPlan { get; set; } = string.Empty;

    public string RegistrationMode { get; set; } = string.Empty;

    public int ValidityYears { get; set; }

    public decimal Amount { get; set; }

    public decimal CollectedAmount { get; set; }

    public decimal BrtaFees { get; set; }

    public decimal SubmissionCharges { get; set; }

    public decimal BrtaTips { get; set; }

    public decimal RegistrationCommission { get; set; }

    public decimal TotalCost { get; set; }

    public decimal Surplus { get; set; }

    // Pending / Processing / SubmittedToBrta / RegistrationCompleted
    // / Delivered / Cancelled
    public string Status { get; set; } = string.Empty;

    public string StatusDate { get; set; } = string.Empty;

    // Days in the status, and over the Stage Timings' expected days
    public int DaysInStatus { get; set; }

    public bool Overdue { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public string CreatedDate { get; set; } = string.Empty;
}


public class RegistrationProfilesListDto
{
    public List<RegistrationProfileRowDto> Rows { get; set; } = new();

    // Stage key -> name (Stage Timings), in order
    public List<RegistrationProfileStageDto> Stages { get; set; } = new();
}


public class RegistrationProfileStageDto
{
    public string StageKey { get; set; } = string.Empty;

    public string StageName { get; set; } = string.Empty;

    public int? ExpectedDays { get; set; }

    public string ColorCode { get; set; } = string.Empty;
}
