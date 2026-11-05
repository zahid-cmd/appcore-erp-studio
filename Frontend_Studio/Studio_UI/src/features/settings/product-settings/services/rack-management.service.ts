// Rack Management Service (racks, zones, rack maps)
//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,

    map
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    RackManagement,

    CreateRackManagement,

    UpdateRackManagement,

    RackManagementDefaults,

    RackShelf,

    RackZone,

    CreateRackZone,

    UpdateRackZone,

    RackZoneDefaults,

    RackCategoryOption,

    RackSubCategoryOption,

    RackMap,

    RackMapShelf,

    RackMapBin,

    BinHolder,

    RACK_MAX_SHELVES,

    RACK_MAX_BINS_PER_SHELF
}
from '../models/rack-management.model';


//===============================================================
// Tolerant readers (PascalCase or camelCase from the API)
//===============================================================

function pick
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
    )
    {
        return undefined;
    }

    const camel =
        name.charAt(0).toLowerCase() + name.slice(1);

    return item[name] ?? item[camel];
}

function text
(
    item:
        any,
    name:
        string
):
    string
{
    return String(pick(item, name) ?? '');
}

function num
(
    item:
        any,
    name:
        string,
    fallback:
        number = 0
):
    number
{
    const value =
        Number(pick(item, name));

    return Number.isFinite(value) ? value : fallback;
}

// null / 0 / missing → null
function idOrNull
(
    item:
        any,
    name:
        string
):
    number | null
{
    const value =
        Number(pick(item, name));

    return Number.isFinite(value) && value > 0 ? value : null;
}

function flag
(
    item:
        any,
    name:
        string,
    fallback:
        boolean
):
    boolean
{
    const value =
        pick(item, name);

    return value == null ? fallback : Boolean(value);
}

function list
(
    item:
        any,
    name:
        string
):
    any[]
{
    const value =
        pick(item, name);

    return Array.isArray(value) ? value : [];
}


//===============================================================
// Rack Management Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class RackManagementService
{

    //===========================================================
    // Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);



    //===========================================================
    // API
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/settings/product-settings/rack-management`;



    //===========================================================
    // RACKS
    //===========================================================

    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<RackManagement[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        (response ?? []).map(
                            item =>
                                this.normalize(
                                    item
                                )
                        )
                )
            );
    }



    //===========================================================
    // Normalize a rack
    //===========================================================

    normalize
    (
        item:
            any
    ):
        RackManagement
    {
        const shelves:
            RackShelf[] =
            list(item, 'Shelves')
                .map(
                    shelf =>
                    ({
                        ShelfNumber:
                            num(shelf, 'ShelfNumber'),

                        BinCount:
                            Math.max(1, num(shelf, 'BinCount', 1)),

                        ShelfLabel:
                            text(shelf, 'ShelfLabel'),

                        IsPrime:
                            flag(shelf, 'IsPrime', false)
                    })
                )
                .sort(
                    (a, b) =>
                        a.ShelfNumber - b.ShelfNumber
                );

        return {
            PublicId:
                text(item, 'PublicId'),

            RackManagementId:
                num(item, 'RackManagementId'),

            BranchId:
                num(item, 'BranchId'),

            WarehouseId:
                num(item, 'WarehouseId'),

            RackZoneId:
                idOrNull(item, 'RackZoneId'),

            RackCode:
                text(item, 'RackCode'),

            RackName:
                text(item, 'RackName'),

            ShelfCount:
                num(item, 'ShelfCount'),

            Shelves:
                shelves,

            ZoneAisle:
                text(item, 'ZoneAisle'),

            RackType:
                text(item, 'RackType'),

            ProductCategoryId:
                idOrNull(item, 'ProductCategoryId'),

            SubCategoryIds:
                list(item, 'SubCategoryIds')
                    .map(
                        id =>
                            Number(id)
                    )
                    .filter(
                        id =>
                            id > 0
                    ),

            PrimeShelfFrom:
                idOrNull(item, 'PrimeShelfFrom'),

            PrimeShelfTo:
                idOrNull(item, 'PrimeShelfTo'),

            Remarks:
                text(item, 'Remarks'),

            IsActive:
                flag(item, 'IsActive', true),

            BranchName:
                text(item, 'BranchName'),

            WarehouseCode:
                text(item, 'WarehouseCode'),

            WarehouseName:
                text(item, 'WarehouseName'),

            FullRackCode:
                text(item, 'FullRackCode'),

            RackLetter:
                text(item, 'RackLetter'),

            ZoneCode:
                text(item, 'ZoneCode'),

            ZoneName:
                text(item, 'ZoneName'),

            ZonePriority:
                num(item, 'ZonePriority'),

            CategoryCode:
                text(item, 'CategoryCode'),

            CategoryName:
                text(item, 'CategoryName'),

            CategoryType:
                text(item, 'CategoryType'),

            SubCategories:
                list(item, 'SubCategories')
                    .map(
                        sub =>
                            this.normalizeSubCategory(
                                sub
                            )
                    ),

            IsGeneral:
                flag(item, 'IsGeneral', !idOrNull(item, 'ProductCategoryId')),

            AssignmentText:
                text(item, 'AssignmentText'),

            TotalBins:
                num(item, 'TotalBins'),

            PartsPlaced:
                num(item, 'PartsPlaced')
        };
    }



    private normalizeSubCategory
    (
        item:
            any
    ):
        RackSubCategoryOption
    {
        return {
            ProductSubCategoryId:
                num(item, 'ProductSubCategoryId'),

            SubCategoryCode:
                text(item, 'SubCategoryCode'),

            SubCategoryName:
                text(item, 'SubCategoryName')
        };
    }



    private normalizeCategory
    (
        item:
            any
    ):
        RackCategoryOption
    {
        return {
            ProductCategoryId:
                num(item, 'ProductCategoryId'),

            CategoryCode:
                text(item, 'CategoryCode'),

            CategoryName:
                text(item, 'CategoryName'),

            CategoryType:
                text(item, 'CategoryType'),

            BrandName:
                text(item, 'BrandName'),

            SubCategories:
                list(item, 'SubCategories')
                    .map(
                        sub =>
                            this.normalizeSubCategory(
                                sub
                            )
                    )
        };
    }



    //===========================================================
    // Get Defaults (next rack code, zones and categories)
    //===========================================================

    getDefaults
    (
        warehouseId:
            number
    ):
        Observable<RackManagementDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params:
                    {
                        warehouseId:
                            String(warehouseId ?? 0)
                    }
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            text(response, 'Code'),

                        FullCode:
                            text(response, 'FullCode'),

                        Name:
                            text(response, 'Name'),

                        ZoneRequired:
                            flag(response, 'ZoneRequired', false),

                        Zones:
                            list(response, 'Zones')
                                .map(
                                    zone =>
                                        this.normalizeZone(
                                            zone
                                        )
                                ),

                        Categories:
                            list(response, 'Categories')
                                .map(
                                    category =>
                                        this.normalizeCategory(
                                            category
                                        )
                                ),

                        MaxShelves:
                            num(response, 'MaxShelves', RACK_MAX_SHELVES) || RACK_MAX_SHELVES,

                        MaxBinsPerShelf:
                            num(response, 'MaxBinsPerShelf', RACK_MAX_BINS_PER_SHELF) || RACK_MAX_BINS_PER_SHELF
                    })
                )
            );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:
            string
    ):
        Observable<RackManagement>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    response =>
                        this.normalize(
                            response
                        )
                )
            );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateRackManagement
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,

            model
        );
    }



    //===========================================================
    // Update
    //===========================================================

    update
    (
        model:
            UpdateRackManagement
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,

            model
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Restore
    //===========================================================

    restore():
        Observable<boolean>
    {
        return this.http.put<boolean>(
            `${this.apiUrl}/restore`,

            {}
        );
    }



    //===========================================================
    // Get History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }



    //===========================================================
    // RACK MAPS (shelves → bins with their holders)
    //===========================================================

    //===========================================================
    // One rack (form preview : occupied bins)
    //===========================================================

    getRackBins
    (
        id:
            number
    ):
        Observable<RackMap>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}/bins`
            )
            .pipe(
                map(
                    response =>
                        this.normalizeMap(
                            response
                        )
                )
            );
    }



    //===========================================================
    // Every rack of a warehouse (Spare Parts / Accessories
    // location modal). The given item's own bin is IsFree + IsOwn.
    //===========================================================

    getWarehouseBins
    (
        warehouseId:
            number,
        options:
        {
            sparePartId?: number;
            accessoryId?: number;
            activeOnly?: boolean;
        } = {}
    ):
        Observable<RackMap[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/bins`,
                {
                    params:
                    {
                        warehouseId:
                            String(warehouseId ?? 0),

                        sparePartId:
                            String(options.sparePartId ?? 0),

                        accessoryId:
                            String(options.accessoryId ?? 0),

                        activeOnly:
                            String(options.activeOnly ?? false)
                    }
                }
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(
                                item =>
                                    this.normalizeMap(
                                        item
                                    )
                            )
                )
            );
    }



    normalizeMap
    (
        item:
            any
    ):
        RackMap
    {
        return {
            RackManagementId:
                num(item, 'RackManagementId'),

            WarehouseId:
                num(item, 'WarehouseId'),

            WarehouseCode:
                text(item, 'WarehouseCode'),

            RackCode:
                text(item, 'RackCode'),

            FullRackCode:
                text(item, 'FullRackCode'),

            RackName:
                text(item, 'RackName'),

            RackLetter:
                text(item, 'RackLetter'),

            RackType:
                text(item, 'RackType'),

            IsActive:
                flag(item, 'IsActive', true),

            RackZoneId:
                idOrNull(item, 'RackZoneId'),

            ZoneCode:
                text(item, 'ZoneCode'),

            ZoneName:
                text(item, 'ZoneName'),

            ZonePriority:
                num(item, 'ZonePriority'),

            ProductCategoryId:
                idOrNull(item, 'ProductCategoryId'),

            CategoryName:
                text(item, 'CategoryName'),

            CategoryType:
                text(item, 'CategoryType'),

            SubCategoryIds:
                list(item, 'SubCategoryIds')
                    .map(
                        id =>
                            Number(id)
                    ),

            IsGeneral:
                flag(item, 'IsGeneral', true),

            AssignmentText:
                text(item, 'AssignmentText'),

            PrimeShelfFrom:
                idOrNull(item, 'PrimeShelfFrom'),

            PrimeShelfTo:
                idOrNull(item, 'PrimeShelfTo'),

            ShelfCount:
                num(item, 'ShelfCount'),

            TotalBins:
                num(item, 'TotalBins'),

            FreeBins:
                num(item, 'FreeBins'),

            Shelves:
                list(item, 'Shelves')
                    .map(
                        shelf =>
                            this.normalizeMapShelf(
                                shelf
                            )
                    )
                    .sort(
                        (a, b) =>
                            a.ShelfNumber - b.ShelfNumber
                    )
        };
    }



    private normalizeMapShelf
    (
        item:
            any
    ):
        RackMapShelf
    {
        return {
            ShelfNumber:
                num(item, 'ShelfNumber'),

            ShelfLabel:
                text(item, 'ShelfLabel'),

            BinCount:
                num(item, 'BinCount', 1),

            IsPrime:
                flag(item, 'IsPrime', false),

            FreeBins:
                num(item, 'FreeBins'),

            Bins:
                list(item, 'Bins')
                    .map(
                        bin =>
                            this.normalizeMapBin(
                                bin
                            )
                    )
                    .sort(
                        (a, b) =>
                            a.BinNumber - b.BinNumber
                    )
        };
    }



    private normalizeMapBin
    (
        item:
            any
    ):
        RackMapBin
    {
        const holder =
            pick(item, 'Holder');

        return {
            BinNumber:
                num(item, 'BinNumber'),

            BinCode:
                text(item, 'BinCode'),

            BinLabel:
                text(item, 'BinLabel'),

            IsFree:
                flag(item, 'IsFree', !holder),

            IsOwn:
                flag(item, 'IsOwn', false),

            Holder:
                holder
                    ? this.normalizeHolder(holder)
                    : null
        };
    }



    private normalizeHolder
    (
        item:
            any
    ):
        BinHolder
    {
        return {
            RackManagementId:
                num(item, 'RackManagementId'),

            WarehouseId:
                num(item, 'WarehouseId'),

            ShelfNumber:
                num(item, 'ShelfNumber'),

            BinNumber:
                num(item, 'BinNumber'),

            ItemType:
                text(item, 'ItemType'),

            ItemId:
                num(item, 'ItemId'),

            ProductCode:
                text(item, 'ProductCode'),

            ItemName:
                text(item, 'ItemName')
        };
    }



    //===========================================================
    // ZONES
    //===========================================================

    normalizeZone
    (
        item:
            any
    ):
        RackZone
    {
        return {
            RackZoneId:
                num(item, 'RackZoneId'),

            BranchId:
                num(item, 'BranchId'),

            WarehouseId:
                num(item, 'WarehouseId'),

            ZoneCode:
                text(item, 'ZoneCode'),

            ZoneName:
                text(item, 'ZoneName'),

            Priority:
                num(item, 'Priority', 1),

            Remarks:
                text(item, 'Remarks'),

            IsActive:
                flag(item, 'IsActive', true),

            BranchName:
                text(item, 'BranchName'),

            WarehouseCode:
                text(item, 'WarehouseCode'),

            WarehouseName:
                text(item, 'WarehouseName'),

            RackCount:
                num(item, 'RackCount')
        };
    }



    //===========================================================
    // Zones of a warehouse (0 = every warehouse)
    //===========================================================

    getZones
    (
        warehouseId:
            number = 0
    ):
        Observable<RackZone[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/zones`,
                {
                    params:
                    {
                        warehouseId:
                            String(warehouseId ?? 0)
                    }
                }
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(
                                item =>
                                    this.normalizeZone(
                                        item
                                    )
                            )
                )
            );
    }



    getZoneDefaults
    (
        warehouseId:
            number
    ):
        Observable<RackZoneDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/zones/defaults`,
                {
                    params:
                    {
                        warehouseId:
                            String(warehouseId ?? 0)
                    }
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            text(response, 'Code'),

                        NextPriority:
                            num(response, 'NextPriority', 1) || 1
                    })
                )
            );
    }



    getZoneById
    (
        id:
            number
    ):
        Observable<RackZone>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/zones/${id}`
            )
            .pipe(
                map(
                    response =>
                        this.normalizeZone(
                            response
                        )
                )
            );
    }



    createZone
    (
        model:
            CreateRackZone
    ):
        Observable<number>
    {
        return this.http.post<number>(
            `${this.apiUrl}/zones`,

            model
        );
    }



    updateZone
    (
        model:
            UpdateRackZone
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/zones/${model.RackZoneId}`,

            model
        );
    }



    deleteZone
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/zones/${id}`
        );
    }



    // One deleted zone
    restoreZoneById
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/zones/${id}/restore`,

            {}
        );
    }



    // The latest deleted zone (404 when none)
    restoreZone():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/zones/restore`,

            {}
        );
    }



    getZoneHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/zones/history`
        );
    }

}
