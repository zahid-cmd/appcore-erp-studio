// Motor Bikes Service (includes Motor Bike Image upload / delete)
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
    MotorBikes,

    CreateMotorBikes,

    UpdateMotorBikes,

    MotorBikesDefaults,

    MotorBikesPageQuery
}
from '../models/motor-bikes.model';

import
{
    PagedResult,

    toPagedParams,

    toPagedResult
}
from '../../../../shared/paging/paged-result.model';


//===============================================================
// Motor Bikes Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class MotorBikesService
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
        `${environment.apiUrl}/settings/product-settings/motor-bikes`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<MotorBikes[]>
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
        MotorBikes
    {
        return {
            MotorBikeId:
                Number(item?.MotorBikeId ?? item?.motorBikeId ?? 0),

            PublicId:
                String(item?.PublicId ?? item?.publicId ?? ''),

            ProductCategoryId:
                Number(item?.ProductCategoryId ?? item?.productCategoryId ?? 0),

            ProductSubCategoryId:
                Number(item?.ProductSubCategoryId ?? item?.productSubCategoryId ?? 0),

            ColorManagementId:
                Number(item?.ColorManagementId ?? item?.colorManagementId ?? 0),

            ProductCode:
                item?.ProductCode ?? item?.productCode ?? '',

            ProductName:
                item?.ProductName ?? item?.productName ?? '',

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

            ImagePath:
                item?.ImagePath ?? item?.imagePath ?? '',

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true),

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

            ColorName:
                item?.ColorName ?? item?.colorName ?? ''
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
        Observable<MotorBikesDefaults>
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
                            response?.salesLedgerCode ?? response?.SalesLedgerCode ?? '',

                        LastProductCategoryId:
                            Number(response?.lastProductCategoryId ?? response?.LastProductCategoryId ?? 0),

                        LastProductSubCategoryId:
                            Number(response?.lastProductSubCategoryId ?? response?.LastProductSubCategoryId ?? 0),

                        LastReorderLevel:
                            Number(response?.lastReorderLevel ?? response?.LastReorderLevel ?? 0),

                        LastRedLevel:
                            Number(response?.lastRedLevel ?? response?.LastRedLevel ?? 0),

                        LastMaxStockLevel:
                            Number(response?.lastMaxStockLevel ?? response?.LastMaxStockLevel ?? 0)
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
            MotorBikesPageQuery
    ):
        Observable<PagedResult<MotorBikes>>
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
        Observable<MotorBikes>
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

    // Returns the new row's Public Id
    create
    (
        model:
            CreateMotorBikes
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
            UpdateMotorBikes
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
    // Motor Bike Image : URL to show (saved path → full URL)
    //
    // The API stores a relative path (/uploads/motor-bike-images/…);
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
    // Motor Bike Image : Upload (multipart, field name "file")
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
    // Motor Bike Image : Delete
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