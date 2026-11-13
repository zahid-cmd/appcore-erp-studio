//===============================================================
// Employee Movements (Human Resource > Employee Management,
// hand-written page : NEVER run Code Sync for it). Dates are
// yyyy-MM-dd ('' = none).
//
// A movement is saved once and changes the employee at once :
// Increment / Promotion / Transfer / Confirmation / Separation.
// It is not edited; the employee's latest one can be deleted.
//===============================================================

// A salary head before and after
export interface MovementSalaryLine
{
    SalaryHeadId: number;
    HeadName: string;
    // Earning / Deduction
    HeadType: string;
    OldAmount: number;
    NewAmount: number;
    // On a line of a salary structure : its percent of the gross
    Percent: number;
    IsBasic: boolean;
    // A deduction : Gross / Basic / Fixed (FixedAmount Tk a month)
    Basis: string;
    FixedAmount: number;
}

export interface EmployeeMovement
{
    PublicId: string;
    Code: string;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    MovementType: string;
    EffectiveDate: string;
    OldBranchId: number;
    OldBranchName: string;
    NewBranchId: number;
    NewBranchName: string;
    OldDepartmentId: number;
    OldDepartmentName: string;
    NewDepartmentId: number;
    NewDepartmentName: string;
    OldDesignationId: number;
    OldDesignationName: string;
    NewDesignationId: number;
    NewDesignationName: string;
    OldShiftId: number;
    OldShiftName: string;
    NewShiftId: number;
    NewShiftName: string;
    OldEmploymentType: string;
    NewEmploymentType: string;
    // 0 = none
    OldSalaryStructureId: number;
    OldSalaryStructureName: string;
    // The structure after (the same one when only the gross changes)
    NewSalaryStructureId: number;
    NewSalaryStructureName: string;
    OldGrossSalary: number;
    NewGrossSalary: number;
    // Read only : the salary head by head before and after
    SalaryLines: MovementSalaryLine[];
    // Resignation / Termination / Retirement / Contract End / Other
    SeparationType: string;
    SettlementAmount: number;
    SettlementNote: string;
    Remarks: string;
    // What changed, in a line
    Summary: string;
    // The employee's latest movement : it can be deleted
    IsLatest: boolean;
}

export interface MovementLookup
{
    Id: number;
    Name: string;
}

export interface MovementEmployee
{
    Id: number;
    Code: string;
    Name: string;
}

export interface EmployeeMovementDefaults
{
    NextCode: string;
    Employees: MovementEmployee[];
    Branches: MovementLookup[];
    Departments: MovementLookup[];
    Designations: MovementLookup[];
    Shifts: MovementLookup[];
    // Active salary structures with their lines (Percent)
    SalaryStructures: MovementSalaryStructure[];
}

export interface MovementSalaryStructure
{
    Id: number;
    Name: string;
    IsDefault: boolean;
    Lines: MovementSalaryLine[];
}

// The employee as now : what a new movement starts from
export interface MovementEmployeeState
{
    EmployeeId: number;
    Code: string;
    FullName: string;
    JoiningDate: string;
    ConfirmationDate: string;
    IsActive: boolean;
    BranchId: number;
    BranchName: string;
    DepartmentId: number;
    DepartmentName: string;
    DesignationId: number;
    DesignationName: string;
    ShiftId: number;
    ShiftName: string;
    EmploymentType: string;
    // 0 = none
    SalaryStructureId: number;
    SalaryStructureName: string;
    GrossSalary: number;
    // The employee's salary lines now (OldAmount = NewAmount)
    SalaryLines: MovementSalaryLine[];
    LastMovementDate: string;
    AdvanceBalance: number;
    LastSalaryMonth: string;
    HasLogin: boolean;
}

export const MOVEMENT_TYPES =
[
    { label:'Increment', value:'Increment', icon:'fas fa-arrow-trend-up', hint:'A new gross salary (or salary structure)' },
    { label:'Promotion', value:'Promotion', icon:'fas fa-medal', hint:'A new designation (and salary)' },
    { label:'Transfer', value:'Transfer', icon:'fas fa-people-arrows', hint:'A new branch, department or shift' },
    { label:'Confirmation', value:'Confirmation', icon:'fas fa-user-check', hint:'Probation to Permanent' },
    { label:'Separation', value:'Separation', icon:'fas fa-door-open', hint:'Resignation, termination ...' }
];

export const SEPARATION_TYPES =
    ['Resignation', 'Termination', 'Retirement', 'Contract End', 'Other']
        .map(v => ({ label:v, value:v }));

export const MOVEMENT_COLORS:
    Record<string, string> =
{
    Increment:'#047857',
    Promotion:'#6d28d9',
    Transfer:'#1d4ed8',
    Confirmation:'#0e7490',
    Separation:'#be123c'
};

export function emptyEmployeeMovement(): EmployeeMovement
{
    return {
        PublicId:'',
        Code:'',
        EmployeeId:0,
        EmployeeCode:'',
        EmployeeName:'',
        MovementType:'Increment',
        EffectiveDate:'',
        OldBranchId:0,
        OldBranchName:'',
        NewBranchId:0,
        NewBranchName:'',
        OldDepartmentId:0,
        OldDepartmentName:'',
        NewDepartmentId:0,
        NewDepartmentName:'',
        OldDesignationId:0,
        OldDesignationName:'',
        NewDesignationId:0,
        NewDesignationName:'',
        OldShiftId:0,
        OldShiftName:'',
        NewShiftId:0,
        NewShiftName:'',
        OldEmploymentType:'',
        NewEmploymentType:'',
        OldSalaryStructureId:0,
        OldSalaryStructureName:'',
        NewSalaryStructureId:0,
        NewSalaryStructureName:'',
        OldGrossSalary:0,
        NewGrossSalary:0,
        SalaryLines:[],
        SeparationType:'',
        SettlementAmount:0,
        SettlementNote:'',
        Remarks:'',
        Summary:'',
        IsLatest:false
    };
}
