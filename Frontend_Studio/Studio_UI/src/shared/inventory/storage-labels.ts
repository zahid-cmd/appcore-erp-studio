//===============================================================
// Storage labels : one place that builds every rack / shelf /
// bin text, and the movement classes of spare parts and
// accessories. Never hand-format a location anywhere else.
//
//   Rack letter   : "Rack A"           → letter "A"
//   Shelf label   : SLF-A-03
//   Bin code      : A-03-05            (rack - shelf - bin)
//   Bin label     : BIN-A-03-05
//===============================================================


//===============================================================
// Rack letter : "Rack A" → "A", "Rack AB" → "AB" (anything else
// is returned trimmed, so a renamed rack still shows something)
//===============================================================

export function rackLetter
(
    rackName:
        string | null | undefined
):
    string
{
    const name =
        String(rackName ?? '').trim();

    const match =
        /^rack\s+(.+)$/i.exec(name);

    return (match ? match[1] : name).trim();
}

function two
(
    value:
        number | null | undefined
):
    string
{
    const n =
        Math.max(0, Math.trunc(Number(value) || 0));

    return n < 10 ? `0${n}` : String(n);
}


//===============================================================
// SLF-A-03
//===============================================================

export function shelfLabel
(
    rackName:
        string | null | undefined,
    shelfNo:
        number | null | undefined
):
    string
{
    const letter =
        rackLetter(rackName);

    return letter && shelfNo ? `SLF-${letter}-${two(shelfNo)}` : '';
}


//===============================================================
// A-03-05 (short code, shown in grids and on labels)
//===============================================================

export function binCode
(
    rackName:
        string | null | undefined,
    shelfNo:
        number | null | undefined,
    binNo:
        number | null | undefined
):
    string
{
    const letter =
        rackLetter(rackName);

    if
    (
        !letter || !shelfNo
    )
    {
        return '';
    }

    return `${letter}-${two(shelfNo)}-${two(binNo || 1)}`;
}


//===============================================================
// BIN-A-03-05 (long label)
//===============================================================

export function binLabel
(
    rackName:
        string | null | undefined,
    shelfNo:
        number | null | undefined,
    binNo:
        number | null | undefined
):
    string
{
    const code =
        binCode(rackName, shelfNo, binNo);

    return code ? `BIN-${code}` : '';
}


//===============================================================
// "Rack A · SLF-A-03 · Bin 05" (tooltips, print)
//===============================================================

export function locationText
(
    rackName:
        string | null | undefined,
    shelfNo:
        number | null | undefined,
    binNo:
        number | null | undefined
):
    string
{
    const rack =
        String(rackName ?? '').trim();

    if
    (
        !rack || !shelfNo
    )
    {
        return '';
    }

    return `${rack} · ${shelfLabel(rack, shelfNo)} · Bin ${two(binNo || 1)}`;
}


//===============================================================
// Movement classes (Spare Parts and Accessories)
// Stored value → labels and a colour token. Default : Slow.
// Later the class can be automated from the 3- or 6-month
// average sale (MovementClassAuto, reserved).
//===============================================================

export type MovementClass =
    'SuperFast' | 'Fast' | 'Regular' | 'Periodic' | 'Slow';

export interface MovementClassInfo
{
    value:MovementClass;
    label:string;
    short:string;
    // CSS colour for the thin dot + text style (no filled chips)
    color:string;
    // 1 = fastest (allocation order)
    rank:number;
}

export const DEFAULT_MOVEMENT_CLASS:
    MovementClass = 'Slow';

export const MOVEMENT_CLASSES:
    readonly MovementClassInfo[] =
[
    { value:'SuperFast', label:'Super Fast Moving', short:'Super Fast', color:'#047857', rank:1 },
    { value:'Fast', label:'Fast Moving', short:'Fast', color:'#0f766e', rank:2 },
    { value:'Regular', label:'Regular Moving', short:'Regular', color:'#1d4ed8', rank:3 },
    { value:'Periodic', label:'Periodic Moving', short:'Periodic', color:'#b45309', rank:4 },
    { value:'Slow', label:'Slow Moving', short:'Slow', color:'#be123c', rank:5 }
];

export function movementClassInfo
(
    value:
        string | null | undefined
):
    MovementClassInfo
{
    const key =
        String(value ?? '').replace(/[\s_-]/g, '').toLowerCase();

    return MOVEMENT_CLASSES.find(x => x.value.toLowerCase() === key)
        ?? MOVEMENT_CLASSES[MOVEMENT_CLASSES.length - 1];
}

// Dropdown items { label, value }
export const MOVEMENT_CLASS_OPTIONS =
    MOVEMENT_CLASSES.map(x => ({ label:x.label, value:x.value }));
