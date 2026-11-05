//===============================================================
// Bin availability : which bins of a warehouse's rack map a
// product may take. One item (spare part OR accessory) per bin;
// the product's own bin counts as free for it; a bin another line
// of the same document already takes is not offered.
//
// Works on the core rack map (GET rack-management/bins :
// RackMap[] → Shelves → Bins with their Holder). The types below
// are the fields this helper reads, so any RackMap fits.
// Labels come from storage-labels (never hand-formatted).
//===============================================================

import
{
    binCode,
    shelfLabel
}
from './storage-labels';


export interface BinMapHolder
{
    // "Spare Part" / "Accessory"
    ItemType:string;
    ItemId:number;
    ProductCode:string;
    ItemName:string;
}

export interface BinMapBin
{
    BinNumber:number;
    BinCode:string;
    IsFree:boolean;
    Holder:BinMapHolder | null;
}

export interface BinMapShelf
{
    ShelfNumber:number;
    ShelfLabel:string;
    BinCount:number;
    Bins:BinMapBin[];
}

export interface BinMapRack
{
    RackManagementId:number;
    RackName:string;
    ShelfCount:number;
    Shelves:BinMapShelf[];
}

// The item type of a product type (BinOccupancy names)
export function binItemType
(
    pageType:
        string
):
    string
{
    return String(pageType ?? '').toUpperCase() === 'AC' ? 'Accessory' : 'Spare Part';
}

// "rack:shelf:bin" of a place
export function binKey
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

export function mapRack
(
    map:
        BinMapRack[],
    rackId:
        number
):
    BinMapRack | null
{
    return rackId > 0
        ? map.find(x => x.RackManagementId === rackId) ?? null
        : null;
}

// Bins on a shelf (no shelf row = 1 bin)
export function mapBinCount
(
    rack:
        BinMapRack | null,
    shelfNo:
        number
):
    number
{
    if
    (
        !rack || shelfNo < 1 || shelfNo > rack.ShelfCount
    )
    {
        return 0;
    }

    return Math.max(1, rack.Shelves.find(x => x.ShelfNumber === shelfNo)?.BinCount || 1);
}

// A bin is free for the item : no holder, or the item itself; and
// no other line takes it (taken : keys of the OTHER lines)
export function mapBinFree
(
    rack:
        BinMapRack,
    shelfNo:
        number,
    binNo:
        number,
    itemType:
        string,
    itemId:
        number,
    taken:
        Set<string>
):
    boolean
{
    if
    (
        taken.has(binKey(rack.RackManagementId, shelfNo, binNo))
    )
    {
        return false;
    }

    const bin =
        rack.Shelves
            .find(x => x.ShelfNumber === shelfNo)
            ?.Bins
            .find(x => x.BinNumber === binNo);

    if
    (
        !bin || bin.IsFree
    )
    {
        return true;
    }

    return !!bin.Holder && bin.Holder.ItemType === itemType && bin.Holder.ItemId === itemId;
}

// Free bins of a shelf for the item (in order)
export function mapFreeBins
(
    rack:
        BinMapRack | null,
    shelfNo:
        number,
    itemType:
        string,
    itemId:
        number,
    taken:
        Set<string>
):
    number[]
{
    const out:
        number[] = [];

    const count =
        mapBinCount(rack, shelfNo);

    for
    (
        let bin = 1;
        rack && bin <= count;
        bin++
    )
    {
        if
        (
            mapBinFree(rack, shelfNo, bin, itemType, itemId, taken)
        )
        {
            out.push(bin);
        }
    }

    return out;
}

// The first free (shelf, bin) of a rack, shelf-then-bin
export function mapFirstFree
(
    rack:
        BinMapRack | null,
    itemType:
        string,
    itemId:
        number,
    taken:
        Set<string>
):
    { shelf:number; bin:number } | null
{
    for
    (
        let shelf = 1;
        rack && shelf <= rack.ShelfCount;
        shelf++
    )
    {
        const bins =
            mapFreeBins(rack, shelf, itemType, itemId, taken);

        if
        (
            bins.length
        )
        {
            return { shelf, bin:bins[0] };
        }
    }

    return null;
}

// Dropdown items of the shelves of a rack : SLF-A-03 · badge =
// free bins; a shelf with none is marked (Full)
export function mapShelfItems
(
    rack:
        BinMapRack | null,
    rackName:
        string,
    itemType:
        string,
    itemId:
        number,
    taken:
        Set<string>
):
    { label:string; value:number; count:string }[]
{
    const out:
        { label:string; value:number; count:string }[] = [];

    for
    (
        let shelf = 1;
        rack && shelf <= rack.ShelfCount;
        shelf++
    )
    {
        const free =
            mapFreeBins(rack, shelf, itemType, itemId, taken).length;

        const label =
            rack.Shelves.find(x => x.ShelfNumber === shelf)?.ShelfLabel || shelfLabel(rackName || rack.RackName, shelf);

        out.push({ label:free ? label : `${label} (Full)`, value:shelf, count:String(free) });
    }

    return out;
}

// Dropdown items of the free bins of a shelf (A-03-05); the picked
// bin stays listed
export function mapBinItems
(
    rack:
        BinMapRack | null,
    rackName:
        string,
    shelfNo:
        number,
    itemType:
        string,
    itemId:
        number,
    taken:
        Set<string>,
    picked:
        number = 0
):
    { label:string; value:number }[]
{
    if
    (
        !rack || !shelfNo
    )
    {
        return [];
    }

    const free =
        mapFreeBins(rack, shelfNo, itemType, itemId, taken);

    const bins =
        picked && !free.includes(picked) ? [picked, ...free] : free;

    return bins.map
    (
        bin =>
        {
            const code =
                rack.Shelves
                    .find(x => x.ShelfNumber === shelfNo)
                    ?.Bins
                    .find(x => x.BinNumber === bin)
                    ?.BinCode
                || binCode(rackName || rack.RackName, shelfNo, bin);

            return { label:free.includes(bin) ? code : `${code} (in use)`, value:bin };
        }
    );
}

// Free bins of a whole rack for the item (badge of the rack list)
export function mapRackFreeCount
(
    rack:
        BinMapRack | null,
    itemType:
        string,
    itemId:
        number,
    taken:
        Set<string>
):
    number
{
    let count = 0;

    for
    (
        let shelf = 1;
        rack && shelf <= rack.ShelfCount;
        shelf++
    )
    {
        count += mapFreeBins(rack, shelf, itemType, itemId, taken).length;
    }

    return count;
}
