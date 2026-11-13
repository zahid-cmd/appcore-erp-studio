//===============================================================
// Human Resource Setup : Shifts, Holidays, Leave Types, Salary
// Heads (hand-written pages : NEVER run Code Sync for them).
//
// The four pages share one list page and one form page
// (pages/hr-setup). Each page is described here : its API, its
// form fields, its list columns and its summary line.
//
// The form is three columns : Code, the name (the field with the
// key 'Name', always first) and Status, then the other fields in
// the order written here (span2 = two columns, wide = the row).
//===============================================================

export type HrSetupKey =
    'shifts' | 'holidays' | 'leave-types' | 'salary-heads';

export type HrFieldType =
    'text' | 'number' | 'time' | 'date' | 'select' | 'switch' | 'weekdays' | 'info';

// A row as the API sends it (the page's own fields by name)
export type HrSetupRow =
    Record<string, any>
    &
    {
        PublicId: string;
        Code: string;
        Name: string;
        Remarks: string;
        IsActive: boolean;
    };

export interface HrSetupOption
{
    label: string;
    value: string;
}

export interface HrSetupField
{
    key: string;
    label: string;
    type: HrFieldType;
    // Value of a new row
    initial: any;
    required?: boolean;
    maxLength?: number;
    placeholder?: string;
    // number : whole numbers only
    whole?: boolean;
    // text : typed text goes to capitals
    upper?: boolean;
    // select
    options?: HrSetupOption[];
    // switch : the small line under the label
    hint?: string;
    // The field takes the whole row of the form
    wide?: boolean;
    // The field takes two of the form's three columns
    span2?: boolean;
    // info : a read only box worked out from the row (not saved)
    info?: (row: HrSetupRow) => string;
    // Shown only when true (e.g. Maximum Carry Forward)
    showWhen?: (row: HrSetupRow) => boolean;
    // Read only when true (e.g. a salary head used by payroll)
    lockedWhen?: (row: HrSetupRow) => boolean;
}

export interface HrSetupColumn
{
    header: string;
    field: string;
    width: string;
    align: 'left' | 'center' | 'right';
}

export interface HrSetupSummaryItem
{
    label: string;
    value: string;
    tone: '' | 'ok' | 'bad';
}

export interface HrSetupPage
{
    key: HrSetupKey;
    // "Shifts" / "Shift"
    title: string;
    singular: string;
    subtitle: string;
    icon: string;
    // Under environment.apiUrl
    api: string;
    // The page's route (list / add / edit / view below it)
    route: string;
    fields: HrSetupField[];
    columns: HrSetupColumn[];
    // Display fields of a list row (hours, dates as text ...)
    display: (row: HrSetupRow) => Record<string, any>;
    // Fields the search box looks in
    search: string[];
    // Toolbar filter (right side); none when missing
    filter?:
    {
        placeholder: string;
        field: string;
        items: (rows: HrSetupRow[]) => HrSetupOption[];
    };
    // Extra summary items after Total / Active / Inactive
    summary?: (rows: HrSetupRow[]) => HrSetupSummaryItem[];
    // The note at the right end of the summary line
    note: string;
    // The "How it is used" card of the form
    help: string[];
    // The status cannot be changed (e.g. payroll salary heads)
    statusLockedWhen?: (row: HrSetupRow) => boolean;
    // The form's check before saving ('' = fine)
    validate?: (row: HrSetupRow) => string;
}


//===============================================================
// Helpers
//===============================================================

// The days of a holiday, From and To counted : "3 days" ('' until
// the From Date is picked; To Date empty = a single day)
export function hrHolidayDaysText(from: any, to: any): string
{
    const day =
        (value: any): number =>
        {
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));

            return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
        };

    const first = day(from);

    if (Number.isNaN(first))
    {
        return '';
    }

    const last = day(to);

    if (Number.isNaN(last))
    {
        return '1 day';
    }

    if (last < first)
    {
        return 'To Date is before From Date';
    }

    const days = Math.round((last - first) / 86400000) + 1;

    return days === 1 ? '1 day' : `${days} days`;
}

export const HR_WEEK_DAYS =
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The weekly holiday (Holidays > Weekly Holidays tab) : one record,
// edited in place. It is the weekly holiday of every employee
// unless the Employee Profile has its own.
export interface HrWeeklyHoliday
{
    // Sun,Mon,Tue,Wed,Thu,Fri,Sat (comma separated)
    WeeklyOffDays: string;
    Remarks: string;
    // Employees with their own weekly holiday
    OwnCount: number;
}

// "Fri,Sat" : "Friday, Saturday" ('' : "None")
export function hrWeekDaysText(value: string): string
{
    const names:
        Record<string, string> =
        { Sun:'Sunday', Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday', Sat:'Saturday' };

    const days =
        String(value ?? '').split(',').filter(Boolean);

    return days.length > 0 ? days.map(d => names[d] ?? d).join(', ') : 'None';
}

// A day switched on / off in "Fri,Sat" (kept in week order)
export function hrToggleWeekDay(value: string, day: string): string
{
    const days =
        new Set(String(value ?? '').split(',').filter(Boolean));

    if (days.has(day))
    {
        days.delete(day);
    }
    else
    {
        days.add(day);
    }

    return HR_WEEK_DAYS.filter(d => days.has(d)).join(',');
}

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// yyyy-MM-dd -> 13 Nov 2026
export function hrDayText(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

// HH:mm (24 hours) -> 9:00 AM
export function hrTimeText(value: string): string
{
    const m =
        /^(\d{2}):(\d{2})$/.exec(value ?? '');

    if (!m)
    {
        return value ?? '';
    }

    const hour = Number(m[1]);

    return `${hour % 12 === 0 ? 12 : hour % 12}:${m[2]} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function hrNumberText(value: number, digits = 2): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:digits });
}

const count =
    (value: number): string => value.toLocaleString('en-US');

// A payroll head : worked out by payroll (Overtime, Absence,
// Late, Advance), never typed on a salary structure
const isPayrollHead =
    (row: HrSetupRow): boolean => !!row['SystemKey'] && row['SystemKey'] !== 'BASIC';


//===============================================================
// The four pages
//===============================================================

const BASE =
    '/human-resource-manangement/human-resource-setup';

export const HR_SETUP_PAGES:
    Record<HrSetupKey, HrSetupPage> =
{
    'shifts':
    {
        key:'shifts',
        title:'Shifts',
        singular:'Shift',
        subtitle:'Working hours and grace time',
        icon:'fas fa-business-time',
        api:'human-resource-manangement/human-resource-setup/shifts',
        route:`${BASE}/shifts`,
        fields:
        [
            { key:'Name', label:'Shift Name', type:'text', initial:'', required:true, maxLength:100, placeholder:'e.g. General Shift' },
            { key:'StartTime', label:'Start Time', type:'time', initial:'09:00', required:true },
            { key:'EndTime', label:'End Time', type:'time', initial:'18:00', required:true },
            { key:'GraceMinutes', label:'Grace Time (minutes)', type:'number', initial:15, whole:true, placeholder:'0' },
            { key:'BreakMinutes', label:'Break (minutes)', type:'number', initial:60, whole:true, placeholder:'0' },
            { key:'Remarks', label:'Remarks', type:'text', initial:'', maxLength:500, placeholder:'Optional', wide:true }
        ],
        columns:
        [
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Shift Name', field:'Name', width:'210px', align:'left' },
            { header:'Hours', field:'HoursText', width:'190px', align:'center' },
            { header:'Working Hours', field:'WorkingText', width:'140px', align:'center' },
            { header:'Grace', field:'GraceText', width:'110px', align:'center' },
            { header:'Break', field:'BreakText', width:'110px', align:'center' }
        ],
        display:row => ({
            HoursText:`${hrTimeText(row['StartTime'])} - ${hrTimeText(row['EndTime'])}`,
            WorkingText:`${hrNumberText(row['WorkingHours'])} h`,
            GraceText:`${row['GraceMinutes']} min`,
            BreakText:`${row['BreakMinutes']} min`
        }),
        search:['Code', 'Name', 'Remarks'],
        note:'An employee is late after the start time plus the grace time',
        help:
        [
            'Each employee is put on one shift. Attendance compares the in time with the shift.',
            'Grace Time : minutes after the start that still count as on time.',
            'An End Time before the Start Time is a night shift (it ends the next day).',
            'The weekly holiday is not on the shift : it is set on Holidays > Weekly Holidays, and an Employee Profile can have its own.'
        ],
        validate:row =>
            !row['StartTime'] ? 'Start Time is required.'
            : !row['EndTime'] ? 'End Time is required.'
            : row['StartTime'] === row['EndTime'] ? 'Start Time and End Time cannot be the same.'
            : ''
    },

    'holidays':
    {
        key:'holidays',
        title:'Holidays',
        singular:'Holiday',
        subtitle:'Public, festival and company holidays',
        icon:'fas fa-umbrella-beach',
        api:'human-resource-manangement/human-resource-setup/holidays',
        route:`${BASE}/holidays`,
        fields:
        [
            { key:'Name', label:'Holiday Name', type:'text', initial:'', required:true, maxLength:150, placeholder:'e.g. Eid-ul-Fitr' },
            {
                key:'HolidayType', label:'Holiday Type', type:'select', initial:'Public', required:true,
                options:
                [
                    { label:'Public', value:'Public' },
                    { label:'Festival', value:'Festival' },
                    { label:'Company', value:'Company' }
                ]
            },
            { key:'FromDate', label:'From Date', type:'date', initial:'', required:true },
            { key:'ToDate', label:'To Date', type:'date', initial:'' },
            { key:'HolidayDays', label:'Days', type:'info', initial:'', info:row => hrHolidayDaysText(row['FromDate'], row['ToDate']) },
            { key:'Remarks', label:'Remarks', type:'text', initial:'', maxLength:500, placeholder:'Optional', span2:true }
        ],
        columns:
        [
            { header:'Code', field:'Code', width:'110px', align:'center' },
            { header:'Holiday Name', field:'Name', width:'280px', align:'left' },
            { header:'Type', field:'HolidayType', width:'120px', align:'center' },
            { header:'From', field:'FromText', width:'140px', align:'center' },
            { header:'To', field:'ToText', width:'140px', align:'center' },
            { header:'Days', field:'Days', width:'80px', align:'center' }
        ],
        display:row => ({
            FromText:hrDayText(row['FromDate']),
            ToText:hrDayText(row['ToDate']),
            YearText:String(row['Year'] ?? '')
        }),
        search:['Code', 'Name', 'HolidayType', 'FromText', 'ToText', 'Remarks'],
        filter:
        {
            placeholder:'All Years',
            field:'YearText',
            items:rows =>
                [...new Set(rows.map(x => String(x['YearText'] ?? '')).filter(Boolean))]
                    .sort((a, b) => b.localeCompare(a))
                    .map(y => ({ label:y, value:y }))
        },
        summary:rows =>
        [
            { label:'Holiday Days', value:count(rows.filter(x => x.IsActive).reduce((sum, x) => sum + (Number(x['Days']) || 0), 0)), tone:'' }
        ],
        note:'A holiday is a paid day off for every employee',
        help:
        [
            'Enter each holiday of the year once. Leave To Date empty for a single day.',
            'Holidays are not counted as absence and are paid.',
            'Two holidays cannot share a date.',
            'A holiday that comes every year (Eid, Victory Day) is entered again for each year.'
        ],
        validate:row =>
            !row['FromDate'] ? 'From Date is required.'
            : row['ToDate'] && row['ToDate'] < row['FromDate'] ? 'To Date cannot be before From Date.'
            : ''
    },

    'leave-types':
    {
        key:'leave-types',
        title:'Leave Types',
        singular:'Leave Type',
        subtitle:'Days per year, paid or unpaid',
        icon:'fas fa-plane-departure',
        api:'human-resource-manangement/human-resource-setup/leave-types',
        route:`${BASE}/leave-types`,
        fields:
        [
            { key:'Name', label:'Leave Name', type:'text', initial:'', required:true, maxLength:100, placeholder:'e.g. Casual Leave' },
            { key:'ShortName', label:'Short Name', type:'text', initial:'', required:true, maxLength:10, upper:true, placeholder:'e.g. CL' },
            { key:'DaysPerYear', label:'Days per Year', type:'number', initial:0, placeholder:'0' },
            {
                key:'AppliesTo', label:'Applies To', type:'select', initial:'All',
                options:
                [
                    { label:'All Employees', value:'All' },
                    { label:'Male Only', value:'Male' },
                    { label:'Female Only', value:'Female' }
                ]
            },
            { key:'IsPaid', label:'Paid Leave', type:'switch', initial:true, hint:'Off : the days are cut from the salary.' },
            { key:'CarryForward', label:'Carry Forward', type:'switch', initial:false, hint:'Unused days move to the next year.' },
            { key:'MaxCarryDays', label:'Maximum Carry Forward (days)', type:'number', initial:0, placeholder:'0', showWhen:row => !!row['CarryForward'] },
            { key:'Remarks', label:'Remarks', type:'text', initial:'', maxLength:500, placeholder:'Optional', wide:true }
        ],
        columns:
        [
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Leave Name', field:'Name', width:'240px', align:'left' },
            { header:'Short', field:'ShortName', width:'90px', align:'center' },
            { header:'Days / Year', field:'DaysText', width:'110px', align:'center' },
            { header:'Paid', field:'PaidText', width:'100px', align:'center' },
            { header:'Carry Forward', field:'CarryText', width:'150px', align:'center' },
            { header:'Applies To', field:'AppliesTo', width:'110px', align:'center' }
        ],
        display:row => ({
            DaysText:hrNumberText(row['DaysPerYear']),
            PaidText:row['IsPaid'] ? 'Paid' : 'Unpaid',
            CarryText:row['CarryForward'] ? `Up to ${hrNumberText(row['MaxCarryDays'])} days` : 'No'
        }),
        search:['Code', 'Name', 'ShortName', 'PaidText', 'AppliesTo', 'Remarks'],
        summary:rows =>
        [
            { label:'Paid Days / Year', value:hrNumberText(rows.filter(x => x.IsActive && x['IsPaid'] && x['AppliesTo'] === 'All').reduce((sum, x) => sum + (Number(x['DaysPerYear']) || 0), 0)), tone:'' }
        ],
        note:'Unpaid leave days are cut from the salary',
        help:
        [
            'Days per Year is what an employee may take in a year (0 = no limit, e.g. Leave Without Pay).',
            'The Short Name is shown on the attendance sheet (CL, SL ...).',
            'Paid leave keeps the salary; unpaid leave is cut by payroll.',
            'Carry Forward moves unused days to the next year, up to the maximum.'
        ],
        validate:row =>
            !String(row['ShortName'] ?? '').trim() ? 'Short Name is required (e.g. CL).'
            : Number(row['DaysPerYear']) < 0 || Number(row['DaysPerYear']) > 366 ? 'Days per Year must be 0 to 366.'
            : ''
    },

    'salary-heads':
    {
        key:'salary-heads',
        title:'Salary Heads',
        singular:'Salary Head',
        subtitle:'Earnings and deductions of the salary structure',
        icon:'fas fa-money-bill-wave',
        api:'human-resource-manangement/human-resource-setup/salary-heads',
        route:`${BASE}/salary-heads`,
        fields:
        [
            { key:'Name', label:'Head Name', type:'text', initial:'', required:true, maxLength:100, placeholder:'e.g. Mobile Allowance' },
            {
                key:'HeadType', label:'Head Type', type:'select', initial:'Earning', required:true,
                options:
                [
                    { label:'Earning', value:'Earning' },
                    { label:'Deduction', value:'Deduction' }
                ],
                lockedWhen:row => !!row['SystemKey']
            },
            {
                key:'CalcType', label:'Calculation', type:'select', initial:'Fixed', required:true,
                options:
                [
                    { label:'Fixed amount (Tk)', value:'Fixed' },
                    { label:'Percent of Basic (%)', value:'Percent' }
                ],
                lockedWhen:row => !!row['SystemKey']
            },
            { key:'DefaultValue', label:'Default Value', type:'number', initial:0, placeholder:'0', lockedWhen:row => !!row['SystemKey'] },
            { key:'DisplayOrder', label:'Display Order', type:'number', initial:20, whole:true, placeholder:'0' },
            { key:'IsProrated', label:'Falls with unpaid days', type:'switch', initial:true, hint:'The amount is cut for absence and unpaid leave.', span2:true, lockedWhen:row => !!row['SystemKey'] },
            { key:'Remarks', label:'Remarks', type:'text', initial:'', maxLength:500, placeholder:'Optional', wide:true }
        ],
        columns:
        [
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Head Name', field:'Name', width:'260px', align:'left' },
            { header:'Type', field:'HeadType', width:'120px', align:'center' },
            { header:'Calculation', field:'CalcText', width:'190px', align:'center' },
            { header:'Used By', field:'UsedText', width:'150px', align:'center' },
            { header:'Order', field:'DisplayOrder', width:'80px', align:'center' }
        ],
        display:row => ({
            CalcText:
                isPayrollHead(row) ? 'Worked out by payroll'
                : row['SystemKey'] === 'BASIC' ? 'Typed per employee'
                : row['CalcType'] === 'Percent' ? `${hrNumberText(row['DefaultValue'])} % of Basic`
                : `Tk ${hrNumberText(row['DefaultValue'])}`,
            UsedText:isPayrollHead(row) ? 'Payroll' : 'Salary structure'
        }),
        search:['Code', 'Name', 'HeadType', 'CalcText', 'UsedText', 'Remarks'],
        filter:
        {
            placeholder:'All Types',
            field:'HeadType',
            items:() =>
            [
                { label:'Earning', value:'Earning' },
                { label:'Deduction', value:'Deduction' }
            ]
        },
        summary:rows =>
        [
            { label:'Earnings', value:count(rows.filter(x => x['HeadType'] === 'Earning').length), tone:'ok' },
            { label:'Deductions', value:count(rows.filter(x => x['HeadType'] === 'Deduction').length), tone:'bad' }
        ],
        note:'Payroll heads (Overtime, Absence, Late, Advance) are worked out each month',
        help:
        [
            'A salary structure (Human Resource Setup > Salary Structures) gives each head a percent of the gross salary. Calculation and Default Value here are not used by the structures.',
            'Percent of Basic : the default amount is that percent of the employee\'s Basic Salary.',
            'Payroll heads (Overtime, Absence, Late, Advance / Loan) are worked out by payroll every month : only their name and order can be changed.',
            'A head on an employee\'s salary structure cannot be deleted; make it Inactive instead.'
        ],
        statusLockedWhen:row => !!row['SystemKey'],
        validate:row =>
            Number(row['DefaultValue']) < 0 ? 'Default Value cannot be negative.'
            : row['CalcType'] === 'Percent' && Number(row['DefaultValue']) > 500 ? 'A percent of Basic cannot be more than 500.'
            : ''
    }
};
