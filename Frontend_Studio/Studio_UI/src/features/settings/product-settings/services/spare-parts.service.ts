// Spare Parts Service (includes Spare Part Image upload / delete)
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
    SpareParts,

    CreateSpareParts,

    UpdateSpareParts,

    SparePartsDefaults,

    SparePartsPageQuery
}
from '../models/spare-parts.model';

import
{
    PagedResult,

    toPagedParams,

    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    SparePartLocation
}
from '../models/spare-parts.model';

import
{
    binCode,

    shelfLabel,

    movementClassInfo
}
from '../../../../shared/inventory/storage-labels';


//===============================================================
// Spare Parts Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class SparePartsService
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
        `${environment.apiUrl}/settings/product-settings/spare-parts`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SpareParts[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            item =>
                                this.normalize(
                                    item
                                )
                        )
                )
            );
    }



    //===========================================================
    // Normalize (PascalCase or camelCase from the API)
    //===========================================================

    normalize
    (
        item:
            any
    ):
        SpareParts
    {
        return {
            SparePartId:
                Number(item?.SparePartId ?? item?.sparePartId ?? 0),

            PublicId:
                String(item?.PublicId ?? item?.publicId ?? ''),

            ProductCategoryId:
                Number(item?.ProductCategoryId ?? item?.productCategoryId ?? 0),

            ProductSubCategoryId:
                Number(item?.ProductSubCategoryId ?? item?.productSubCategoryId ?? 0),

            PartNumber:
                item?.PartNumber ?? item?.partNumber ?? '',

            PartName:
                item?.PartName ?? item?.partName ?? '',

            Unit:
                item?.Unit ?? item?.unit ?? '',

            ProductCode:
                item?.ProductCode ?? item?.productCode ?? '',

            InventoryLedgerCode:
                item?.InventoryLedgerCode ?? item?.inventoryLedgerCode ?? '',

            WipLedgerCode:
                item?.WipLedgerCode ?? item?.wipLedgerCode ?? '',

            CogsLedgerCode:
                item?.CogsLedgerCode ?? item?.cogsLedgerCode ?? '',

            SalesLedgerCode:
                item?.SalesLedgerCode ?? item?.salesLedgerCode ?? '',

            ReorderLevel:
                Number(item?.ReorderLevel ?? item?.reorderLevel ?? 0),

            RedLevel:
                Number(item?.RedLevel ?? item?.redLevel ?? 0),

            MaxStockLevel:
                Number(item?.MaxStockLevel ?? item?.maxStockLevel ?? 0),

            // Stored value (SuperFast … Slow); unknown / '' → Slow
            MovementClass:
                movementClassInfo(
                    item?.MovementClass ?? item?.movementClass
                ).value,

            MovementClassAuto:
                Boolean(item?.MovementClassAuto ?? item?.movementClassAuto ?? false),

            ImagePath:
                item?.ImagePath ?? item?.imagePath ?? '',

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true),

            Locations:
                (
                    Array.isArray(item?.Locations ?? item?.locations)
                        ? (item?.Locations ?? item?.locations)
                        : []
                )
                .map(
                    (location: any) =>
                        this.normalizeLocation(
                            location
                        )
                ),

            // "WH-001: A-03-05, WH-002: B-01-02" (built here when the
            // server sends none)
            LocationsText:
                item?.LocationsText
                ??
                item?.locationsText
                ??
                (
                    Array.isArray(item?.Locations ?? item?.locations)
                        ? (item?.Locations ?? item?.locations)
                        : []
                )
                .map(
                    (location: any) =>
                        this.normalizeLocation(
                            location
                        ).LocationText
                )
                .filter(
                    (text: string | undefined) =>
                        !!text
                )
                .join(', '),

            CategoryCode:
                item?.CategoryCode ?? item?.categoryCode ?? '',

            CategoryName:
                item?.CategoryName ?? item?.categoryName ?? '',

            BrandName:
                item?.BrandName ?? item?.brandName ?? '',

            SubCategoryCode:
                item?.SubCategoryCode ?? item?.subCategoryCode ?? '',

            SubCategoryName:
                item?.SubCategoryName ?? item?.subCategoryName ?? '',

            // Fits Models
            Fits:
                (
                    Array.isArray(item?.Fits ?? item?.fits)
                        ? (item?.Fits ?? item?.fits)
                        : []
                )
                .map(
                    (f: any) =>
                    ({
                        ProductSubCategoryId: Number(f?.ProductSubCategoryId ?? f?.productSubCategoryId ?? 0),
                        SubCategoryCode: String(f?.SubCategoryCode ?? f?.subCategoryCode ?? ''),
                        SubCategoryName: String(f?.SubCategoryName ?? f?.subCategoryName ?? ''),
                        ModelName: String(f?.ModelName ?? f?.modelName ?? '')
                    })
                ),

            FitsText:
                item?.FitsText ?? item?.fitsText ?? ''
        };
    }



    //===========================================================
    // Normalize one storage location
    //
    // Bin 0 / missing = 1 (rows saved before bins). Codes come from
    // the server; when missing they are built by the shared
    // storage-labels helper (never hand-formatted).
    //===========================================================

    normalizeLocation
    (
        location:
            any
    ):
        SparePartLocation
    {
        const rackName =
            location?.RackName ?? location?.rackName ?? '';

        const shelfNumber =
            Number(location?.ShelfNumber ?? location?.shelfNumber ?? 0);

        const binNumber =
            Number(location?.BinNumber ?? location?.binNumber ?? 0) || 1;

        const warehouseCode =
            location?.WarehouseCode ?? location?.warehouseCode ?? '';

        const code =
            location?.BinCode
            ??
            location?.binCode
            ??
            binCode(
                rackName,
                shelfNumber,
                binNumber
            );

        return {
            WarehouseId:
                Number(location?.WarehouseId ?? location?.warehouseId ?? 0),

            RackManagementId:
                Number(location?.RackManagementId ?? location?.rackManagementId ?? 0),

            ShelfNumber:
                shelfNumber,

            BinNumber:
                binNumber,

            WarehouseCode:
                warehouseCode,

            WarehouseName:
                location?.WarehouseName ?? location?.warehouseName ?? '',

            RackCode:
                location?.RackCode ?? location?.rackCode ?? '',

            RackName:
                rackName,

            ShelfLabel:
                location?.ShelfLabel
                ??
                location?.shelfLabel
                ??
                shelfLabel(
                    rackName,
                    shelfNumber
                ),

            BinCode:
                code,

            LocationText:
                location?.LocationText
                ??
                location?.locationText
                ??
                (
                    warehouseCode && code
                        ? `${warehouseCode}: ${code}`
                        : code
                )
        };
    }



    //===========================================================
    // Get Defaults (code preview for a sub category)
    //===========================================================

    getDefaults
    (
        productSubCategoryId:
            number
    ):
        Observable<SparePartsDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params:
                    {
                        productSubCategoryId:
                            String(productSubCategoryId ?? 0)
                    }
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            response?.code ?? response?.Code ?? '',

                        InventoryLedgerCode:
                            response?.inventoryLedgerCode ?? response?.InventoryLedgerCode ?? '',

                        WipLedgerCode:
                            response?.wipLedgerCode ?? response?.WipLedgerCode ?? '',

                        CogsLedgerCode:
                            response?.cogsLedgerCode ?? response?.CogsLedgerCode ?? '',

                        SalesLedgerCode:
                            response?.salesLedgerCode ?? response?.SalesLedgerCode ?? ''
                    })
                )
            );
    }



    //===========================================================
    // Get Paged (the list page : one page from the server, with
    // the summary counts)
    //===========================================================

    getPaged
    (
        query:
            SparePartsPageQuery
    ):
        Observable<PagedResult<SpareParts>>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                {
                    params:
                        toPagedParams(
                            { ...query }
                        )
                }
            )
            .pipe(
                map(
                    response =>
                        toPagedResult(
                            response,
                            item =>
                                this.normalize(
                                    item
                                )
                        )
                )
            );
    }



    //===========================================================
    // Get By Public Id
    //===========================================================

    getById
    (
        id:
            string
    ):
        Observable<SpareParts>
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

    // Returns the new part's Public Id
    create
    (
        model:
            CreateSpareParts
    ):
        Observable<string>
    {
        return this.http.post<string>(
            this.apiUrl,

            model
        );
    }



    //===========================================================
    // Update
    //===========================================================

    update
    (
        publicId:
            string,

        model:
            UpdateSpareParts
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,

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
    // Spare Part Image : URL to show (saved path → full URL)
    //
    // The API stores a relative path (/uploads/spare-part-images/…);
    // it is served from the API root, i.e. apiUrl without /api.
    //===========================================================

    getImageUrl
    (
        path:
            string | null | undefined
    ):
        string
    {
        const value =
            (path ?? '').trim();

        if
        (
            !value
            ||
            /^(https?:|blob:|data:)/i.test(value)
        )
        {
            return value;
        }

        const root =
            environment.apiUrl
                .replace(/\/+$/, '')
                .replace(/\/api$/i, '');

        return `${root}/${value.replace(/^\/+/, '')}`;
    }



    //===========================================================
    // Spare Part Image : Upload (multipart, field name "file")
    //
    // Returns the stored path.
    //===========================================================

    uploadImage
    (
        id:
            string,

        file:
            File
    ):
        Observable<string>
    {
        const form =
            new FormData();

        form.append(
            'file',
            file,
            file.name
        );

        return this.http.post(
            `${this.apiUrl}/${id}/image`,

            form,

            {
                responseType:'text'
            }
        );
    }



    //===========================================================
    // Spare Part Image : Delete
    //===========================================================

    deleteImage
    (
        id:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}/image`
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

}