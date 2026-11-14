//===============================================================
// Employees (Human Resource > Employee Management, hand-written
// page : NEVER run Code Sync for it). Dates are yyyy-MM-dd
// ('' = none).
//===============================================================

import
{
    OvertimeRule
}
from '../../human-resource-setup/models/overtime-structures.model';

export interface EmployeeListItem
{
    PublicId: string;
    Code: string;
    FullName: string;
    MobileNo: string;
    BranchId: number;
    BranchName: string;
    DepartmentId: number;
    DepartmentName: string;
    DesignationName: string;
    ShiftName: string;
    EmploymentType: string;
    JoiningDate: string;
    GrossSalary: number;
    HasLogin: boolean;
    IsActive: boolean;
}

// One line of a salary : Tk a month for a salary head
export interface EmployeeSalaryLine
{
    SalaryHeadId: number;
    HeadName: string;
    // Earning / Deduction
    HeadType: string;
    Amount: number;
}

export interface Employee
{
    PublicId: string;
    Code: string;

    // Personal
    FullName: string;
    FatherName: string;
    MotherName: string;
    Gender: string;
    DateOfBirth: string;
    BloodGroup: string;
    MaritalStatus: string;
    NationalId: string;

    // Contact
    MobileNo: string;
    Email: string;
    PresentAddress: string;
    PermanentAddress: string;
    EmergencyContactName: string;
    EmergencyContactPhone: string;

    // Job
    BranchId: number;
    BranchName: string;
    DepartmentId: number;
    DepartmentName: string;
    DesignationId: number;
    DesignationName: string;
    ShiftId: number;
    ShiftName: string;
    // The employee's own weekly holiday : Sun,Mon ... ('' = the
    // weekly holiday of everyone, Holidays > Weekly Holidays)
    WeeklyOffDays: string;
    EmploymentType: string;
    JoiningDate: string;
    ConfirmationDate: string;
    // 0 = no login
    UserProfileId: number;
    LoginName: string;

    // Salary : the gross salary typed (Tk a month) and the structure
    // picked (0 = none) that splits it; the lines as the employee
    // has them (read only)
    GrossSalary: number;
    SalaryStructureId: number;
    SalaryStructureName: string;
    SalaryLines: EmployeeSalaryLine[];
    OvertimeAllowed: boolean;
    // The overtime structure picked (0 = none) when overtime is
    // allowed
    OvertimeStructureId: number;
    OvertimeStructureName: string;
    // A rate typed before overtime structures (read only)
    OvertimeRate: number;
    // The employee's own bonus structure and leave encashment
    // policy (0 = the Default one)
    BonusStructureId: number;
    LeaveEncashPolicyId: number;
    // Cash / Bank / MFS
    PaymentMode: string;
    BankName: string;
    BankAccountNo: string;
    MfsName: string;
    MfsNo: string;

    Remarks: string;
    IsActive: boolean;
}

export interface EmployeeLookup
{
    Id: number;
    Name: string;
    // Shifts : the hours. Logins : the employee already linked.
    Note: string;
    // Shifts : the working hours a day (hours less the break)
    Hours: number;
}

// A line of a salary structure : a percent of the gross salary
export interface EmployeeSalaryStructureLine
{
    SalaryHeadId: number;
    HeadName: string;
    HeadType: string;
    IsBasic: boolean;
    Percent: number;
    // A deduction : Gross / Basic / Fixed (FixedAmount Tk a month)
    Basis: string;
    FixedAmount: number;
}

// A salary structure the profile can pick, with its lines
export interface EmployeeSalaryStructure
{
    Id: number;
    Code: string;
    Name: string;
    // A new profile starts with it
    IsDefault: boolean;
    Lines: EmployeeSalaryStructureLine[];
}

// An overtime structure the profile can pick, with its rules
export interface EmployeeOvertimeStructure extends OvertimeRule
{
    Id: number;
    Code: string;
    Name: string;
    IsDefault: boolean;
}

export interface EmployeeDefaults
{
    NextCode: string;
    // The weekly holiday of everyone
    DefaultWeeklyOffDays: string;
    Branches: EmployeeLookup[];
    Departments: EmployeeLookup[];
    Designations: EmployeeLookup[];
    Shifts: EmployeeLookup[];
    Users: EmployeeLookup[];
    SalaryStructures: EmployeeSalaryStructure[];
    // Active overtime structures
    OvertimeStructures: EmployeeOvertimeStructure[];
    // Active bonus structures / leave encashment policies (Note :
    // "Default" on the one that applies when the profile names none)
    BonusStructures: EmployeeLookup[];
    LeaveEncashPolicies: EmployeeLookup[];
}


//===============================================================
// The fixed lists of the form (the same lists as the repository)
//===============================================================

const options =
    (values: string[]): { label: string; value: string }[] =>
        values.map(v => ({ label:v, value:v }));

export const EMPLOYEE_GENDERS =
    options(['Male', 'Female', 'Other']);

export const EMPLOYEE_MARITAL_STATUSES =
    options(['Single', 'Married', 'Other']);

export const EMPLOYEE_BLOOD_GROUPS =
    options(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

export const EMPLOYEE_TYPES =
    options(['Permanent', 'Probation', 'Contract', 'Part Time', 'Intern']);

export const EMPLOYEE_PAYMENT_MODES =
[
    { label:'Cash', value:'Cash' },
    { label:'Bank', value:'Bank' },
    { label:'MFS (bKash, Nagad ...)', value:'MFS' }
];

export const EMPLOYEE_MFS_NAMES =
    options(['bKash', 'Nagad', 'Rocket', 'Upay', 'Other']);

export function emptyEmployee(): Employee
{
    return {
        PublicId:'',
        Code:'',
        FullName:'',
        FatherName:'',
        MotherName:'',
        Gender:'',
        DateOfBirth:'',
        BloodGroup:'',
        MaritalStatus:'',
        NationalId:'',
        MobileNo:'',
        Email:'',
        PresentAddress:'',
        PermanentAddress:'',
        EmergencyContactName:'',
        EmergencyContactPhone:'',
        BranchId:0,
        BranchName:'',
        DepartmentId:0,
        DepartmentName:'',
        DesignationId:0,
        DesignationName:'',
        ShiftId:0,
        ShiftName:'',
        WeeklyOffDays:'',
        EmploymentType:'Permanent',
        JoiningDate:'',
        ConfirmationDate:'',
        UserProfileId:0,
        LoginName:'',
        GrossSalary:0,
        SalaryStructureId:0,
        SalaryStructureName:'',
        SalaryLines:[],
        OvertimeAllowed:false,
        OvertimeStructureId:0,
        OvertimeStructureName:'',
        OvertimeRate:0,
        BonusStructureId:0,
        LeaveEncashPolicyId:0,
        PaymentMode:'Cash',
        BankName:'',
        BankAccountNo:'',
        MfsName:'',
        MfsNo:'',
        Remarks:'',
        IsActive:true
    };
}
