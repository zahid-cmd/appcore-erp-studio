//===============================================================
// Imports
//===============================================================

import
{
    ServicePolicySchedule,
    DAYS_PER_YEAR
}
from './service-policy.model';


//===============================================================
// Service Policy Schedule : shared helpers
//
// Used by the Service Policy form and the Service Schedule page.
// The server builds the same names and runs the same check.
//===============================================================

// 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd"
export function ordinal
(
    n:
        number
):
    string
{
    const lastTwo =
        n % 100;

    const suffix =
        lastTwo >= 11 && lastTwo <= 13
            ? 'th'
            : ({ 1:'st', 2:'nd', 3:'rd' } as Record<number, string>)[n % 10] ?? 'th';

    return `${n}${suffix}`;
}


// Rebuilds sequence, type numbers and names in place and
// returns each row's standard due day after sale (running total)
export function renumberSchedule
(
    rows:
        ServicePolicySchedule[]
):
    number[]
{
    let free =
        0;

    let paid =
        0;

    let day =
        0;

    return rows.map(
        (row, index) =>
        {
            row.SequenceNo =
                index + 1;

            row.ServiceTypeNo =
                row.ServiceType === 'Free'
                    ? ++free
                    : ++paid;

            row.ServiceName =
                `${ordinal(row.ServiceTypeNo)} ${row.ServiceType} Service`;

            day +=
                row.IntervalDays || 0;

            return day;
        }
    );
}


// Index of the first Free row due after the warranty, or -1
export function firstFreeBeyondWarranty
(
    rows:
        ServicePolicySchedule[],

    warrantyYears:
        number
):
    number
{
    const limit =
        (warrantyYears || 0) * DAYS_PER_YEAR;

    if
    (
        limit <= 0
    )
    {
        return -1;
    }

    const dueDays =
        renumberSchedule(
            rows
        );

    return rows.findIndex(
        (row, index) =>
            row.ServiceType === 'Free'
            &&
            dueDays[index] > limit
    );
}


// "6 Free · 12 Paid · 18 Total"
export function scheduleSummary
(
    rows:
        ServicePolicySchedule[]
):
    string
{
    if
    (
        !rows.length
    )
    {
        return '';
    }

    const free =
        rows.filter(row => row.ServiceType === 'Free').length;

    return `${free} Free · ${rows.length - free} Paid · ${rows.length} Total`;
}