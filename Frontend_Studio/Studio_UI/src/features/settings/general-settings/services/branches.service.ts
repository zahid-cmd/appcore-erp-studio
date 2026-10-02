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
    Branches,
    CreateBranches,
    UpdateBranches
}
from '../models/branches.model';


//===============================================================
// Branches Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class BranchesService
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
        `${environment.apiUrl}/settings/general-settings/branches`;


    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():
        string
    {
        return environment.apiUrl
            .replace(
                /\/api\/?$/,
                ''
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Branches[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            branch =>
                            ({
                                BranchId:
                                    Number(
                                        branch.BranchId
                                        ??
                                        branch.branchId
                                    ),

                                CompanyId:
                                    Number(
                                        branch.CompanyId
                                        ??
                                        branch.companyId
                                        ??
                                        0
                                    ),

                                WingId:
                                    Number(
                                        branch.WingId
                                        ??
                                        branch.wingId
                                        ??
                                        0
                                    ),

                                WingName:
                                    branch.WingName
                                    ??
                                    branch.wingName
                                    ??
                                    '',

                                BranchCode:
                                    branch.BranchCode
                                    ??
                                    branch.branchCode
                                    ??
                                    '',

                                ShortName:
                                    branch.ShortName
                                    ??
                                    branch.shortName
                                    ??
                                    '',

                                BranchName:
                                    branch.BranchName
                                    ??
                                    branch.branchName
                                    ??
                                    '',

                                Mobile:
                                    branch.Mobile
                                    ??
                                    branch.mobile
                                    ??
                                    '',

                                Email:
                                    branch.Email
                                    ??
                                    branch.email
                                    ??
                                    '',

                                Address:
                                    branch.Address
                                    ??
                                    branch.address
                                    ??
                                    '',

                                Remarks:
                                    branch.Remarks
                                    ??
                                    branch.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        branch.IsActive
                                        ??
                                        branch.isActive
                                        ??
                                        true
                                    )
                            })
                        )
                )
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode
    (
        wingId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                params:
                {
                    wingId:
                        wingId
                },

                responseType:
                    'text'
            }
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
        Observable<Branches>
    {
        return this.http.get<Branches>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateBranches
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
            UpdateBranches
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