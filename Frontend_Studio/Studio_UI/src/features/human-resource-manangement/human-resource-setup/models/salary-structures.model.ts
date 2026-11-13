//===============================================================
// Salary Structures (Human Resource Setup, hand-written page :
// NEVER run Code Sync for it). A named split of the gross salary :
// a percent for each salary head (the earnings add up to 100).
// One structure is the Default. The Employee Profile takes the
// gross salary and one structure.
//===============================================================

export interface SalaryStructureLine
{
    SalaryHeadId: number;
    HeadName: string;
    // Earning / Deduction
    HeadType: string;
    // The basic salary head (it takes what rounding leaves over)
    IsBasic: boolean;
    // Percent of the gross salary (Basis Gross) or of the basic
    // salary (Basis Basic)
    Percent: number;
    // A deduction is worked out in one of three ways : Gross /
    // Basic / Fixed. An earning is always Gross.
    Basis: string;
    // Tk a month (Basis Fixed)
    FixedAmount: number;
}

export interface SalaryStructure
{
    SalaryStructureId: number;
    PublicId: string;
    Code: string;
    Name: string;
    // The earning lines added up (100) / the deduction lines
    EarningPercent: number;
    DeductionPercent: number;
    // A new Employee Profile starts with it (one only)
    IsDefault: boolean;
    Remarks: string;
    IsActive: boolean;
    // Live employees on the structure
    EmployeeCount: number;
    Lines: SalaryStructureLine[];
}

// A head that can go on a structure (normal heads + Basic)
export interface SalaryStructureHead
{
    SalaryHeadId: number;
    Name: string;
    HeadType: string;
    IsBasic: boolean;
}

export interface SalaryStructureDefaults
{
    NextCode: string;
    // The name a new structure gets : Salary Structure - 1 / 2 / 3
    NextName: string;
    SalaryHeads: SalaryStructureHead[];
    // The Default structure now ('' = none)
    DefaultCode: string;
    DefaultPublicId: string;
}

export function emptySalaryStructure(): SalaryStructure
{
    return {
        SalaryStructureId:0,
        PublicId:'',
        Code:'',
        Name:'',
        EarningPercent:0,
        DeductionPercent:0,
        IsDefault:false,
        Remarks:'',
        IsActive:true,
        EmployeeCount:0,
        Lines:[]
    };
}

// 12,500.00
export function structureMoney(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// 12.5 (up to three decimals, no trailing zeros)
export function structurePercent(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:3 });
}

// Two decimals, halves up (the same rounding as the server)
function round2(value: number): number
{
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

// A line of a structure as the split needs it
export interface SalarySplitLine
{
    SalaryHeadId: number;
    HeadType: string;
    IsBasic: boolean;
    Percent: number;
    // Gross when left out
    Basis?: string;
    FixedAmount?: number;
}

// How a deduction line is worked out, in words : 5 % of gross /
// 10 % of basic / Tk 500.00 fixed
export function deductionBasisText(line: SalarySplitLine): string
{
    return line.Basis === 'Fixed' ? `Tk ${structureMoney(line.FixedAmount ?? 0)} fixed`
        : line.Basis === 'Basic' ? `${structurePercent(line.Percent)} % of basic`
        : `${structurePercent(line.Percent)} % of gross`;
}

// The gross salary split by a structure : Tk for each head (by
// SalaryHeadId). The same rule as the server : amount = gross x
// percent / 100 to two decimals; what rounding leaves over goes to
// Basic (or the largest earning) so the earnings add up to the
// gross exactly.
export function splitGross
(
    gross: number,
    lines: SalarySplitLine[]
):
    Map<number, number>
{
    const amounts =
        new Map<number, number>();

    const total =
        round2(Number(gross) || 0);

    if (total <= 0)
    {
        return amounts;
    }

    const earnings =
        lines.filter(l => l.HeadType !== 'Deduction' && l.Percent > 0);

    let given = 0;

    for (const line of earnings)
    {
        const amount = round2(total * line.Percent / 100);

        amounts.set(line.SalaryHeadId, amount);

        given = round2(given + amount);
    }

    const left =
        round2(total - given);

    if (left !== 0 && earnings.length > 0)
    {
        const keeper =
            earnings.find(l => l.IsBasic)
            ?? [...earnings].sort((a, b) => b.Percent - a.Percent)[0];

        amounts.set(keeper.SalaryHeadId, round2((amounts.get(keeper.SalaryHeadId) ?? 0) + left));
    }

    // the basic salary as it came out (0 without a Basic line)
    const basicLine =
        earnings.find(l => l.IsBasic);

    const basic =
        basicLine ? amounts.get(basicLine.SalaryHeadId) ?? 0 : 0;

    // a deduction : a fixed amount, a percent of the basic salary or
    // a percent of the gross salary
    for (const line of lines.filter(l => l.HeadType === 'Deduction'))
    {
        const amount =
            line.Basis === 'Fixed' ? round2(Number(line.FixedAmount) || 0)
            : line.Basis === 'Basic' ? round2(basic * line.Percent / 100)
            : round2(total * line.Percent / 100);

        if (amount > 0)
        {
            amounts.set(line.SalaryHeadId, amount);
        }
    }

    return amounts;
}
