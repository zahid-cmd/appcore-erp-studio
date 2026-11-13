//===============================================================
// Overtime Structures (Human Resource Setup, hand-written page :
// NEVER run Code Sync for it). How overtime is paid, on two
// bases :
//   extra hours  the overtime hours of Daily Attendance x the hour
//                rate x a multiplier (another one on a holiday)
//   extra days   days worked on a weekly holiday / public holiday
//                x the day rate x a multiplier
// day rate = base / days in the month; hour rate = day rate /
// the working hours of the employee's shift; base = the employee's Basic or Gross salary (or a
// fixed Tk an hour). One structure is the Default. Picked on the
// Employee Profile when Overtime allowed is on.
//===============================================================

// What the rates need of a structure
export interface OvertimeRule
{
    // Basic / Gross / Fixed
    RateBase: string;
    // Tk an hour (RateBase Fixed)
    FixedHourRate: number;
    // Fixed (MonthDays) / Actual (the real days of the month)
    MonthDaysMode: string;
    MonthDays: number;
    PayExtraHours: boolean;
    HourMultiplier: number;
    HolidayHourMultiplier: number;
    PayExtraDays: boolean;
    DayMultiplier: number;
}

export interface OvertimeStructure extends OvertimeRule
{
    OvertimeStructureId: number;
    PublicId: string;
    Code: string;
    // Overtime Structure - 1 / 2 / 3 (not typed)
    Name: string;
    IsDefault: boolean;
    Remarks: string;
    IsActive: boolean;
    // Live employees on the structure
    EmployeeCount: number;
}

export interface OvertimeStructureDefaults
{
    NextCode: string;
    NextName: string;
    // The hours a day come from the employee's shift : the first
    // shift and its working hours, for the example on the form
    ShiftName: string;
    ShiftHours: number;
    // The Default structure now ('' = none)
    DefaultCode: string;
    DefaultPublicId: string;
}

export const OVERTIME_BASES =
[
    { label:'Basic Salary', value:'Basic' },
    { label:'Gross Salary', value:'Gross' },
    { label:'Fixed rate (Tk an hour)', value:'Fixed' }
];

export const OVERTIME_DAY_MODES =
[
    { label:'A fixed number of days', value:'Fixed' },
    { label:'The real days of the month', value:'Actual' }
];

export function emptyOvertimeStructure(): OvertimeStructure
{
    return {
        OvertimeStructureId:0,
        PublicId:'',
        Code:'',
        Name:'',
        RateBase:'Basic',
        FixedHourRate:0,
        MonthDaysMode:'Fixed',
        MonthDays:26,
        PayExtraHours:true,
        HourMultiplier:1,
        HolidayHourMultiplier:1,
        PayExtraDays:true,
        DayMultiplier:1,
        IsDefault:false,
        Remarks:'',
        IsActive:true,
        EmployeeCount:0
    };
}

// 12,500.00
export function overtimeMoney(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// 1.5 (up to three decimals, no trailing zeros)
export function overtimeNumber(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:3 });
}

// The day rate and the hour rate of a salary on a structure (the
// same rule as the server). hoursPerDay : the working hours of the
// employee's shift.
export function overtimeRates
(
    rule: OvertimeRule,
    basic: number,
    gross: number,
    monthDays: number,
    hoursPerDay: number
):
    { day: number; hour: number }
{
    const hours =
        Number(hoursPerDay) || 0;

    if (rule.RateBase === 'Fixed')
    {
        const hour = Number(rule.FixedHourRate) || 0;

        return { day:hour * hours, hour };
    }

    const days =
        rule.MonthDaysMode === 'Actual' ? monthDays : Number(rule.MonthDays) || 0;

    const amount =
        rule.RateBase === 'Gross' ? Number(gross) || 0 : Number(basic) || 0;

    const day =
        days > 0 ? amount / days : 0;

    return { day, hour:hours > 0 ? day / hours : 0 };
}

// The overtime pay : extra hours (normal and on a holiday) and
// extra days
export function overtimeAmount
(
    rule: OvertimeRule,
    basic: number,
    gross: number,
    monthDays: number,
    hoursPerDay: number,
    normalHours: number,
    holidayHours: number,
    extraDays: number
):
    number
{
    const rates =
        overtimeRates(rule, basic, gross, monthDays, hoursPerDay);

    let amount = 0;

    if (rule.PayExtraHours)
    {
        amount += rates.hour * (normalHours * rule.HourMultiplier + holidayHours * rule.HolidayHourMultiplier);
    }

    if (rule.PayExtraDays)
    {
        amount += rates.day * extraDays * rule.DayMultiplier;
    }

    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// The rate of a structure in words : Basic / 26 days / shift hours
export function overtimeRateText(rule: OvertimeRule): string
{
    return rule.RateBase === 'Fixed'
        ? `Tk ${overtimeMoney(rule.FixedHourRate)} an hour`
        : `${rule.RateBase} / ${rule.MonthDaysMode === 'Actual' ? 'days of month' : rule.MonthDays + ' days'} / shift hours`;
}
