//===============================================================
// Mass Storing : the Allocate engine (pure, no Angular).
//
// The page gives the racks to fill, the rows to place (in the
// order of their groups), the bins that may NOT be used (held by
// an item that stays, the other type, or targeted by another row)
// and the mode :
//
//   plan  : Zone / Rack with "Follow rack plan" ON. A part goes to
//           the racks whose assignment fits it : its category (no
//           sub categories = the whole category, else its sub
//           category listed); none → the General racks.
//   order : Zone / Rack with the plan OFF. Every chosen rack, in
//           order, whatever its assignment.
//   start : Bin. From the chosen bin onward : the next bins of its
//           shelf, then the next shelves of that rack only.
//
//   Parts : group order (as added), movement rank (Super Fast
//   first … Slow last), part number (natural, case-insensitive),
//   code.
//   Bins (plan / order) : zone priority → rack letter → shelf
//   quality (prime shelves in order, then the others nearest to
//   the prime range first; ties → lower shelf; no prime range =
//   shelf order) → bin number.
//   A part's own current bin (released for the allocation) may
//   come back to it : "kept".
//===============================================================


//===============================================================
// Input
//===============================================================

export interface PlanShelf
{
    ShelfNo:number;
    BinCount:number;
}

export interface PlanRack
{
    Id:number;
    // Sort : "A", "B", … "AA"
    Letter:string;
    ZonePriority:number;
    IsActive:boolean;
    IsGeneral:boolean;
    // null = General
    CategoryId:number | null;
    // [] = the whole category
    SubCategoryIds:number[];
    PrimeShelfFrom:number | null;
    PrimeShelfTo:number | null;
    ShelfCount:number;
    Shelves:PlanShelf[];
}

export interface PlanPlace
{
    RackId:number;
    ShelfNo:number;
    BinNo:number;
}

export interface PlanProduct
{
    ProductId:number;
    Code:string;
    PartNumber:string;
    CategoryId:number;
    SubCategoryId:number;
    // Group / leftover name
    SubCategoryName:string;
    // 1 fastest .. 5 slow
    MovementRank:number;
    // Its group's place in the add order (first added = 0)
    Order:number;
    // Its bin now (null = Unplaced)
    Current:PlanPlace | null;
}

export type PlanMode =
    'plan' | 'order' | 'start';

export interface PlanInput
{
    // The racks to fill (start : the start bin's rack)
    racks:PlanRack[];
    products:PlanProduct[];
    mode:PlanMode;
    // plan : General racks take the parts no category rack fits
    // (default true)
    useGeneral?:boolean;
    // start : the first bin
    start?:PlanPlace | null;
    // "rack:shelf:bin" never usable
    blocked:Set<string>;
}

// An item on a bin now (own = a product of the page's type)
export interface PlanHolder
{
    ProductId:number;
    Own:boolean;
}


//===============================================================
// Output
//===============================================================

export interface PlanAssignment
{
    ProductId:number;
    Place:PlanPlace;
    // The plan gave it the bin it already has
    Kept:boolean;
    // It had a bin before (moved) / it was Unplaced (new)
    Moved:boolean;
}

export interface PlanLeftover
{
    ProductId:number;
    // Its sub category (the note's group)
    Group:string;
    // plan : no rack of the chosen ones fits it
    NoRack:boolean;
}

export interface PlanResult
{
    assignments:PlanAssignment[];
    leftovers:PlanLeftover[];
    // Leftovers per group : [name, count], most first
    leftoverGroups:[string, number][];
    placedCount:number;
    movedCount:number;
    keptCount:number;
}


//===============================================================
// Helpers (exported for the self-check)
//===============================================================

export function planKey
(
    rackId:
        number,
    shelfNo:
        number,
    binNo:
        number
):
    string
{
    return `${rackId}:${shelfNo}:${binNo}`;
}

const collator =
    new Intl.Collator(undefined, { numeric:true, sensitivity:'base' });

// Natural, case-insensitive ("A2" before "a10")
export function naturalCompare
(
    a:
        string,
    b:
        string
):
    number
{
    return collator.compare(String(a ?? '').trim(), String(b ?? '').trim());
}

// Racks a product may go to (rule 1); General only when no
// category rack fits
export function eligibleRacks
(
    product:
        PlanProduct,
    racks:
        PlanRack[],
    useGeneral:
        boolean
):
    PlanRack[]
{
    const active =
        racks.filter(x => x.IsActive);

    const specific =
        active.filter
        (
            x =>
                !x.IsGeneral
                && x.CategoryId !== null
                && x.CategoryId === product.CategoryId
                && (x.SubCategoryIds.length === 0 || x.SubCategoryIds.includes(product.SubCategoryId))
        );

    if
    (
        specific.length
    )
    {
        return specific;
    }

    return useGeneral
        ? active.filter(x => x.IsGeneral)
        : [];
}

// Group order, then Super Fast first … Slow last, then part
// number, then code
export function compareProducts
(
    a:
        PlanProduct,
    b:
        PlanProduct
):
    number
{
    return ((a.Order || 0) - (b.Order || 0))
        || ((a.MovementRank || 5) - (b.MovementRank || 5))
        || naturalCompare(a.PartNumber, b.PartNumber)
        || naturalCompare(a.Code, b.Code)
        || a.ProductId - b.ProductId;
}

// Shelf quality (rule 4) : prime shelves in order, then the rest
// by distance from the prime range (ties → lower shelf)
export function shelfOrder
(
    rack:
        PlanRack
):
    number[]
{
    const shelves =
        Array.from({ length:Math.max(0, rack.ShelfCount) }, (_, i) => i + 1);

    const from =
        rack.PrimeShelfFrom ?? 0;

    const to =
        rack.PrimeShelfTo ?? 0;

    if
    (
        !(from > 0 && to >= from)
    )
    {
        return shelves;
    }

    const distance =
        (shelf: number): number =>
            shelf < from ? from - shelf : shelf > to ? shelf - to : 0;

    return [...shelves].sort((a, b) => (distance(a) - distance(b)) || (a - b));
}

export function rackOrder
(
    racks:
        PlanRack[]
):
    PlanRack[]
{
    return [...racks].sort
    (
        (a, b) =>
            ((a.ZonePriority || 999) - (b.ZonePriority || 999))
            || (a.Letter.length - b.Letter.length)
            || naturalCompare(a.Letter, b.Letter)
            || a.Id - b.Id
    );
}

// Every bin of a rack set in allocation order
export function binOrder
(
    racks:
        PlanRack[]
):
    PlanPlace[]
{
    const out:
        PlanPlace[] = [];

    for
    (
        const rack of rackOrder(racks)
    )
    {
        for
        (
            const shelf of shelfOrder(rack)
        )
        {
            const count =
                Math.max(1, rack.Shelves.find(x => x.ShelfNo === shelf)?.BinCount || 1);

            for
            (
                let bin = 1;
                bin <= count;
                bin++
            )
            {
                out.push({ RackId:rack.Id, ShelfNo:shelf, BinNo:bin });
            }
        }
    }

    return out;
}


// Bin mode : from the start bin onward on its shelf, then the
// next shelves of that rack (from their first bin)
export function startOrder
(
    rack:
        PlanRack | null | undefined,
    start:
        PlanPlace | null | undefined
):
    PlanPlace[]
{
    const out:
        PlanPlace[] = [];

    if
    (
        !rack || !start || start.RackId !== rack.Id
    )
    {
        return out;
    }

    for
    (
        let shelf = Math.max(1, start.ShelfNo);
        shelf <= rack.ShelfCount;
        shelf++
    )
    {
        const count =
            Math.max(1, rack.Shelves.find(x => x.ShelfNo === shelf)?.BinCount || 1);

        for
        (
            let bin = shelf === start.ShelfNo ? Math.max(1, start.BinNo) : 1;
            bin <= count;
            bin++
        )
        {
            out.push({ RackId:rack.Id, ShelfNo:shelf, BinNo:bin });
        }
    }

    return out;
}

// The bins an allocation may NOT use : targeted by a row, or held
// by an item that stays (the other type, or a product of this
// type that does not leave its bin in this document)
export function blockedBins
(
    racks:
        PlanRack[],
    holders:
        Map<string, PlanHolder>,
    leaving:
        Set<number>,
    targets:
        Set<string>
):
    Set<string>
{
    const out =
        new Set<string>();

    for
    (
        const rack of racks
    )
    {
        for
        (
            let shelf = 1;
            shelf <= rack.ShelfCount;
            shelf++
        )
        {
            const count =
                Math.max(1, rack.Shelves.find(x => x.ShelfNo === shelf)?.BinCount || 1);

            for
            (
                let bin = 1;
                bin <= count;
                bin++
            )
            {
                const key =
                    planKey(rack.Id, shelf, bin);

                const holder =
                    holders.get(key);

                if
                (
                    targets.has(key)
                    || (!!holder && !(holder.Own && leaving.has(holder.ProductId)))
                )
                {
                    out.add(key);
                }
            }
        }
    }

    return out;
}


//===============================================================
// The allocation
//===============================================================

export function allocateByPlan
(
    input:
        PlanInput
):
    PlanResult
{
    const useGeneral =
        input.useGeneral !== false;

    const active =
        input.racks.filter(x => x.IsActive);

    // Bin lists by rack set, each with its cursor : bins before
    // the cursor are taken or blocked for good
    const lists =
        new Map<string, { bins:PlanPlace[]; cursor:number }>();

    const listOf =
        (racks: PlanRack[]): { bins:PlanPlace[]; cursor:number } =>
        {
            const key =
                racks.map(x => x.Id).sort((a, b) => a - b).join(',');

            let list =
                lists.get(key);

            if
            (
                !list
            )
            {
                list = { bins:binOrder(racks), cursor:0 };

                lists.set(key, list);
            }

            return list;
        };

    const startList =
        input.mode === 'start'
            ? { bins:startOrder(active.find(x => x.Id === input.start?.RackId), input.start), cursor:0 }
            : null;

    const taken =
        new Set<string>();

    const assignments:
        PlanAssignment[] = [];

    const leftovers:
        PlanLeftover[] = [];

    for
    (
        const product of [...input.products].sort(compareProducts)
    )
    {
        let list:
            { bins:PlanPlace[]; cursor:number } | null = startList;

        if
        (
            !list
        )
        {
            const racks =
                input.mode === 'plan'
                    ? eligibleRacks(product, active, useGeneral)
                    : active;

            if
            (
                !racks.length
            )
            {
                leftovers.push({ ProductId:product.ProductId, Group:product.SubCategoryName || 'Other', NoRack:true });

                continue;
            }

            list = listOf(racks);
        }

        const bins =
            list.bins;

        while
        (
            list.cursor < bins.length
            &&
            (
                taken.has(planKey(bins[list.cursor].RackId, bins[list.cursor].ShelfNo, bins[list.cursor].BinNo))
                || input.blocked.has(planKey(bins[list.cursor].RackId, bins[list.cursor].ShelfNo, bins[list.cursor].BinNo))
            )
        )
        {
            list.cursor++;
        }

        if
        (
            list.cursor >= bins.length
        )
        {
            leftovers.push({ ProductId:product.ProductId, Group:product.SubCategoryName || 'Other', NoRack:false });

            continue;
        }

        const place =
            bins[list.cursor];

        taken.add(planKey(place.RackId, place.ShelfNo, place.BinNo));

        const current =
            product.Current;

        const kept =
            !!current
            && current.RackId === place.RackId
            && current.ShelfNo === place.ShelfNo
            && current.BinNo === place.BinNo;

        assignments.push({ ProductId:product.ProductId, Place:{ ...place }, Kept:kept, Moved:!!current && !kept });
    }

    const counts =
        new Map<string, number>();

    leftovers.forEach(x => counts.set(x.Group, (counts.get(x.Group) ?? 0) + 1));

    return {
        assignments,
        leftovers,
        leftoverGroups:[...counts.entries()].sort((a, b) => (b[1] - a[1]) || naturalCompare(a[0], b[0])),
        placedCount:assignments.filter(x => !x.Kept && !x.Moved).length,
        movedCount:assignments.filter(x => x.Moved).length,
        keptCount:assignments.filter(x => x.Kept).length
    };
}
