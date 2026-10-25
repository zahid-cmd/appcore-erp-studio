// Brand Management Service (includes Brand Image upload / delete)
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
    BrandManagement,

    CreateBrandManagement,

    UpdateBrandManagement,

    BrandManagementDefaults
}
from '../models/brand-management.model';


//===============================================================
// Brand Management Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class BrandManagementService
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
        `${environment.apiUrl}/settings/product-settings/brand-management`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<BrandManagement[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            brandManagement =>
                            ({
                                ...brandManagement,

                                BrandManagementId:
                                    Number(brandManagement.BrandManagementId ?? brandManagement.brandManagementId ?? brandManagement.id ?? brandManagement.Id),

                                BrandCode:
                                    brandManagement.BrandCode ?? brandManagement.brandCode ?? '',

                                BrandName:
                                    brandManagement.BrandName ?? brandManagement.brandName ?? '',

                                Remarks:
                                    brandManagement.Remarks ?? brandManagement.remarks ?? '',

                                Status:
                                    Boolean(brandManagement.Status ?? brandManagement.status ?? true),

                                BrandImagePath:
                                    brandManagement.BrandImagePath ?? brandManagement.brandImagePath ?? '',

                                MotorBikesSupplierCode:
                                    brandManagement.MotorBikesSupplierCode ?? brandManagement.motorBikesSupplierCode ?? '',

                                MotorBikesSupplierName:
                                    brandManagement.MotorBikesSupplierName ?? brandManagement.motorBikesSupplierName ?? '',

                                OfferAdjustmentLedgerCode:
                                    brandManagement.OfferAdjustmentLedgerCode ?? brandManagement.offerAdjustmentLedgerCode ?? '',

                                OfferAdjustmentLedgerName:
                                    brandManagement.OfferAdjustmentLedgerName ?? brandManagement.offerAdjustmentLedgerName ?? '',

                                EmiClaimLedgerCode:
                                    brandManagement.EmiClaimLedgerCode ?? brandManagement.emiClaimLedgerCode ?? '',

                                EmiClaimLedgerName:
                                    brandManagement.EmiClaimLedgerName ?? brandManagement.emiClaimLedgerName ?? ''
                            })
                        )
                )
            );
    }



    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http.get<string>(
            `${this.apiUrl}/next-code`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<BrandManagementDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    {
                        const text =
                            (key: string): string =>
                                String(
                                    response?.[key]
                                    ??
                                    response?.[key.charAt(0).toLowerCase() + key.slice(1)]
                                    ??
                                    ''
                                );

                        const suppliers: any[] =
                            response?.MotorBikesSuppliers
                            ??
                            response?.motorBikesSuppliers
                            ??
                            [];

                        return {
                            Code:
                                text('Code'),

                            MotorBikesSuppliers:
                                suppliers.map(
                                    item =>
                                    ({
                                        SupplierCode:
                                            String(item?.SupplierCode ?? item?.supplierCode ?? ''),

                                        DisplayName:
                                            String(item?.DisplayName ?? item?.displayName ?? ''),

                                        IsActive:
                                            Boolean(item?.IsActive ?? item?.isActive ?? true)
                                    })
                                ),

                            OfferAdjustmentSubGroupCode:
                                text('OfferAdjustmentSubGroupCode'),

                            OfferAdjustmentSubGroupName:
                                text('OfferAdjustmentSubGroupName'),

                            NextOfferAdjustmentLedgerCode:
                                text('NextOfferAdjustmentLedgerCode'),

                            EmiClaimSubGroupCode:
                                text('EmiClaimSubGroupCode'),

                            EmiClaimSubGroupName:
                                text('EmiClaimSubGroupName'),

                            NextEmiClaimLedgerCode:
                                text('NextEmiClaimLedgerCode'),

                            LedgerMessage:
                                text('LedgerMessage')
                        };
                    }
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
        Observable<BrandManagement>
    {
        return this.http.get<BrandManagement>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateBrandManagement
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
            UpdateBrandManagement
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
    // Brand Image : URL to show (saved path → full URL)
    //
    // The API stores a relative path (/uploads/brand-images/…);
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
    // Brand Image : Upload (multipart, field name "file")
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
    // Brand Image : Delete
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