//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employee Movements (Human Resource > Employee Management,
// hand-written page : NEVER run Code Sync for it; tables made by
// HumanResource_Phase4_Engine.sql)
//
//   HrEmployeeMovements      MOV-0001  Increment / Promotion /
//                                      Transfer / Confirmation /
//                                      Separation; saving changes
//                                      the employee at once
//   HrEmployeeMovementLines            the salary structure before
//                                      and after
//===============================================================

public class HrEmployeeMovements
{
    public long MovementId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    // Increment / Promotion / Transfer / Confirmation / Separation
    public string MovementType { get; set; } = string.Empty;

    public DateOnly EffectiveDate { get; set; }

    // The employee before and after (the same on both sides when
    // the movement did not change it)
    public long OldBranchId { get; set; }

    public long NewBranchId { get; set; }

    public long OldDepartmentId { get; set; }

    public long NewDepartmentId { get; set; }

    public long OldDesignationId { get; set; }

    public long NewDesignationId { get; set; }

    public long OldShiftId { get; set; }

    public long NewShiftId { get; set; }

    public string OldEmploymentType { get; set; } = string.Empty;

    public string NewEmploymentType { get; set; } = string.Empty;

    public DateOnly? OldConfirmationDate { get; set; }

    // The salary structure before and after (null = none)
    public long? OldSalaryStructureId { get; set; }

    public long? NewSalaryStructureId { get; set; }

    public decimal OldGrossSalary { get; set; }

    public decimal NewGrossSalary { get; set; }

    // Separation : Resignation / Termination / Retirement /
    // Contract End / Other
    public string SeparationType { get; set; } = string.Empty;

    // Separation : the final settlement agreed (a note; it is paid
    // by Payment Voucher)
    public decimal SettlementAmount { get; set; }

    public string SettlementNote { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class HrEmployeeMovementLines
{
    public long MovementLineId { get; set; }

    public long MovementId { get; set; }

    public long SalaryHeadId { get; set; }

    // Tk per month
    public decimal OldAmount { get; set; }

    public decimal NewAmount { get; set; }
}
