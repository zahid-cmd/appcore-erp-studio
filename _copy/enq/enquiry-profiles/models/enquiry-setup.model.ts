/* ============================================================
   Enquiry Setup

   One table, six lists (a tab each on the page) :
     Source          Source of Enquiry   SRC-001
     Status          Enquiry Status      EST-001  colour + stage
     InterestLevel   Interest Levels     INT-001  colour + days
     FollowUpMethod  Follow-up Methods   FUM-001
     LostReason      Lost Reasons        LRS-001
     TimeSlot        Time Slots          TSL-001  booking day of a page

   Hand-written page : no Code Synchronization.
============================================================ */

export type EnquirySetupType =
    | 'Source'
    | 'Status'
    | 'InterestLevel'
    | 'FollowUpMethod'
    | 'LostReason'
    | 'TimeSlot';


// The page a time slot serves (its name : "<label> n")
export type TimeSlotUse =
    | 'Service'
    | 'TestRide';


export const TIME_SLOT_USES:
    { label:string; value:TimeSlotUse }[] =
[
    { label:'Service Appointment', value:'Service' },
    { label:'Test Ride',           value:'TestRide' }
];


// Slot lengths (minutes)
export const TIME_SLOT_INTERVALS:
    { label:string; value:number }[] =
[
    { label:'15 minutes', value:15 },
    { label:'30 minutes', value:30 },
    { label:'45 minutes', value:45 },
    { label:'1 hour',     value:60 }
];


// "HH:mm" → minutes after midnight (NaN when empty)
export function slotMinutes(value: string): number
{
    const [h, m] =
        (value ?? '').split(':').map(Number);

    return value ? h * 60 + m : NaN;
}


// minutes → "HH:mm"
export function slotTime(minutes: number): string
{
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}


// "14:30" → "02:30 PM"
export function slotLabel(value: string): string
{
    const [h, m] =
        (value ?? '').split(':').map(Number);

    if (!Number.isFinite(h) || !Number.isFinite(m))
    {
        return value ?? '';
    }

    const hour =
        h % 12 === 0 ? 12 : h % 12;

    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}


// The bookable slots of a day (same rule as the server's
// TimeSlotUses.BuildSlots) : From, From + interval ... while the
// slot ends by To; a slot that would touch the lunch break starts
// again at the break's end.
export function buildSlots
(
    from: string,
    to: string,
    interval: number | null,
    breakFrom: string,
    breakTo: string
):
    { start:string; end:string }[]
{
    const slots: { start:string; end:string }[] = [];

    const start = slotMinutes(from);

    const end = slotMinutes(to);

    if (!interval || !(interval > 0) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    {
        return slots;
    }

    const lunchFrom = slotMinutes(breakFrom);

    const lunchTo = slotMinutes(breakTo);

    const hasLunch = Number.isFinite(lunchFrom) && Number.isFinite(lunchTo);

    let t = start;

    while (t + interval <= end && slots.length < 200)
    {
        if (hasLunch && t < lunchTo && t + interval > lunchFrom)
        {
            t = lunchTo;

            continue;
        }

        slots.push({ start:slotTime(t), end:slotTime(t + interval) });

        t += interval;
    }

    return slots;
}


export type EnquiryStage =
    | 'Open'
    | 'Won'
    | 'Lost';


export interface EnquirySetup
{
    EnquirySetupId:
        number;

    SetupType:
        EnquirySetupType;

    // SRC-001 …
    Code:
        string;

    Name:
        string;

    // #RRGGBB (Status / Interest Level), else ''
    ColorCode:
        string;

    // Open / Won / Lost (Status), else ''
    Stage:
        string;

    // Interest Level : days to purchase (To null = and more;
    // both null = chosen by hand only)
    DaysFrom:
        number | null;

    DaysTo:
        number | null;

    // Time Slot : page (Service / TestRide), slot length, working
    // hours and lunch break ("HH:mm", 24 h), else '' / null
    UsedFor:
        string;

    IntervalMinutes:
        number | null;

    // Bookings per slot (1 - 20)
    SlotCapacity:
        number | null;

    TimeFrom:
        string;

    TimeTo:
        string;

    BreakFrom:
        string;

    BreakTo:
        string;

    // Bookable slots of a day (from the server)
    SlotCount:
        number;

    DisplayOrder:
        number;

    // Preselected on new enquiries / follow-ups (one per list)
    IsDefault:
        boolean;

    // Seeded New / Won / Lost : no delete, always active, stage locked
    IsSystem:
        boolean;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Create / Update (the code is always built by the server)
============================================================ */

export interface CreateEnquirySetup
{
    SetupType:
        EnquirySetupType;

    Name:
        string;

    ColorCode:
        string;

    Stage:
        string;

    DaysFrom:
        number | null;

    DaysTo:
        number | null;

    UsedFor:
        string;

    IntervalMinutes:
        number | null;

    // Bookings per slot (1 - 20)
    SlotCapacity:
        number | null;

    TimeFrom:
        string;

    TimeTo:
        string;

    BreakFrom:
        string;

    BreakTo:
        string;

    DisplayOrder:
        number;

    IsDefault:
        boolean;

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateEnquirySetup
extends CreateEnquirySetup
{
    EnquirySetupId:
        number;
}


/* ============================================================
   Defaults : preview for a new row of a list
============================================================ */

export interface EnquirySetupDefaults
{
    SetupType:
        string;

    Code:
        string;

    NextDisplayOrder:
        number;
}


/* ============================================================
   The five lists : tab label, singular noun, what they carry
============================================================ */

export interface EnquirySetupTypeInfo
{
    type:
        EnquirySetupType;

    tabLabel:
        string;

    noun:
        string;

    icon:
        string;

    hint:
        string;

    hasColor:
        boolean;

    hasStage:
        boolean;

    // Days to purchase range (Interest Levels)
    hasDays:
        boolean;

    // Hours + used for (Time Slots)
    hasTime?:
        boolean;
}


export const ENQUIRY_SETUP_TYPES:
    EnquirySetupTypeInfo[] =
[
    {
        type:'Source',
        tabLabel:'Source of Enquiry',
        noun:'Source of Enquiry',
        icon:'fas fa-bullhorn',
        hint:'Where the customer came from : walk-in, phone, Facebook, referral …',
        hasColor:false,
        hasStage:false,
        hasDays:false
    },
    {
        type:'Status',
        tabLabel:'Enquiry Status',
        noun:'Enquiry Status',
        icon:'fas fa-list-check',
        hint:'Steps of an enquiry. Won (by sale) and Suspended stages close it.',
        hasColor:true,
        hasStage:true,
        hasDays:false
    },
    {
        type:'InterestLevel',
        tabLabel:'Interest Levels',
        noun:'Interest Level',
        icon:'fas fa-temperature-half',
        hint:'Set by the days left to the expected purchase date : Super Hot 0 - 3, Hot 4 - 7 …',
        hasColor:true,
        hasStage:false,
        hasDays:true
    },
    {
        type:'FollowUpMethod',
        tabLabel:'Follow-up Methods',
        noun:'Follow-up Method',
        icon:'fas fa-phone-volume',
        hint:'How a follow-up is made : call, SMS, WhatsApp, visit …',
        hasColor:false,
        hasStage:false,
        hasDays:false
    },
    {
        type:'LostReason',
        tabLabel:'Suspend Reasons',
        noun:'Suspend Reason',
        icon:'fas fa-circle-xmark',
        hint:'Why an enquiry was suspended; asked when it is closed as Suspended.',
        hasColor:false,
        hasStage:false,
        hasDays:false
    },
    {
        type:'TimeSlot',
        tabLabel:'Time Slots',
        noun:'Time Slot',
        icon:'fas fa-clock',
        hint:'The booking day of a page : slot length, working hours and lunch break. The default one is used.',
        hasColor:false,
        hasStage:false,
        hasDays:false,
        hasTime:true
    }
];


/* ============================================================
   Colour presets for the swatch picker
============================================================ */

export const ENQUIRY_SETUP_COLORS:
    string[] =
[
    '#2563EB',
    '#0EA5E9',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#EA580C',
    '#16A34A',
    '#0D9488',
    '#DC2626',
    '#64748B'
];
