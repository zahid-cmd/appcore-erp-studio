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

    MotorBikesDefaults
}
from '../models/motor-bikes.model';


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

            ReorderLevel:
                Number(item?.ReorderLevel ?? item?.reorderLevel ?? 0),

            RedLevel:
                Number(item?.RedLevel ?? item?.redLevel ?? 0),

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
                            response?.cogsLedgerCode ?? response?.CogsLedgerCode ?? ''
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
            number
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

    create
    (
        model:
            CreateMotorBikes
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
            UpdateMotorBikes
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
            number
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
            number,

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
            number
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