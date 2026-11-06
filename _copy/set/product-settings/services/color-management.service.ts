// PAGE-CLONED : Company -> Color Management (cleaned: logo upload removed)
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
    ColorManagement,

    CreateColorManagement,

    UpdateColorManagement,

    ColorManagementDefaults
}
from '../models/color-management.model';

import
{
    ColorManagementPageQuery
}
from '../models/color-management.model';

import
{
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';


//===============================================================
// Color Management Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class ColorManagementService
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
        `${environment.apiUrl}/settings/product-settings/color-management`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ColorManagement[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            colorManagement =>
                            ({
                                ...colorManagement,

                                ColorManagementId:
                                    Number(colorManagement.ColorManagementId ?? colorManagement.colorManagementId ?? colorManagement.id ?? colorManagement.Id),


                                PublicId:

                                    String(colorManagement?.PublicId ?? colorManagement?.publicId ?? ''),

                                ColorCode:
                                    colorManagement.ColorCode ?? colorManagement.colorCode ?? '',

                                ColorName:
                                    colorManagement.ColorName ?? colorManagement.colorName ?? '',

                                Remarks:
                                    colorManagement.Remarks ?? colorManagement.remarks ?? '',

                                Status:
                                    Boolean(colorManagement.Status ?? colorManagement.status ?? true)
                            })
                        )
                )
            );
    }



    //===========================================================
    // Get Paged (the list page : one page from the server, with
    // the summary counts; rows are normalized by the list)
    //===========================================================

    getPaged
    (
        query:
            ColorManagementPageQuery
    ):
        Observable<PagedResult<any>>
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
                                item
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
        Observable<ColorManagementDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            response.code
                            ??
                            response.Code
                            ??
                            ''
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
        Observable<ColorManagement>
    {
        return this.http.get<ColorManagement>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateColorManagement
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
            UpdateColorManagement
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
            string
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }

}