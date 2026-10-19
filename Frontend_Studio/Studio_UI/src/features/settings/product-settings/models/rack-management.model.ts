//===============================================================
// Rack Types
//===============================================================

export const RACK_TYPES:
    readonly string[] =
[
    'Open Shelf',
    'Closed Cabinet',
    'Bin Rack',
    'Pallet Rack'
];


// Highest number of shelves a rack may have
export const RACK_MAX_SHELVES:
    number =
    50;


//===============================================================
// Rack Management
//
// One rack inside one warehouse, with a number of shelves
// (SLF-A-01 … SLF-A-nn). Rack Code R-nnn is numbered per warehouse and
// built by the server.
//===============================================================

export interface RackManagement
{
    RackManagementId: number;

    //===========================================================
    // Location (Warehouse locked after saving)
    //===========================================================

    BranchId: number;

    WarehouseId: number;

    //===========================================================
    // Rack
    //===========================================================

    RackCode: string;

    RackName: string;

    ShelfCount: number;

    ZoneAisle: string;

    RackType: string;

    Remarks: string;

    IsActive: boolean;

    //===========================================================
    // Display only (from the server)
    //===========================================================

    BranchName?: string;

    WarehouseCode?: string;

    WarehouseName?: string;

    // "<Warehouse Code>-R-001"
    FullRackCode?: string;

    PartsPlaced?: number;
}


//===============================================================
// Create Rack Management
//===============================================================

export interface CreateRackManagement
{
    WarehouseId: number;

    RackName: string;

    ShelfCount: number;

    ZoneAisle: string;

    RackType: string;

    Remarks: string;

    IsActive: boolean;
}


//===============================================================
// Update Rack Management
//===============================================================

export interface UpdateRackManagement
    extends CreateRackManagement
{
    RackManagementId: number;
}


//===============================================================
// Rack Management Defaults (next code for a warehouse)
//===============================================================

export interface RackManagementDefaults
{
    Code: string;

    FullCode: string;

    // "Rack A" : lowest free letter in the warehouse
    Name: string;
}


//===============================================================
// Shelf label : SLF-<rack letter>-nn, e.g. SLF-A-03
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

    return /^rack\s+/i.test(name)
        ? name.replace(/^rack\s+/i, '').trim().toUpperCase()
        : '';
}


export function shelfLabel
(
    rackName:
        string | null | undefined,

    shelfNumber:
        number
):
    string
{
    const letter =
        rackLetter(
            rackName
        );

    const number =
        String(shelfNumber).padStart(2, '0');

    return letter
        ? `SLF-${letter}-${number}`
        : `SLF-${number}`;
}