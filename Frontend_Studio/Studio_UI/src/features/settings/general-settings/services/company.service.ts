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
    Company,

    CreateCompany,

    UpdateCompany,

    CompanyDefaults
}
from '../models/company.model';


//===============================================================
// Company Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class CompanyService
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
        `${environment.apiUrl}/settings/general-settings/company`;



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
        Observable<Company[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            company =>
                            ({
                                ...company,

                                CompanyId:
                                    Number
                                    (
                                        company.CompanyId
                                        ??
                                        company.companyId
                                        ??
                                        company.id
                                        ??
                                        company.Id
                                    ),

                                CompanyCode:
                                    company.CompanyCode
                                    ??
                                    company.companyCode
                                    ??
                                    '',

                                CompanyName:
                                    company.CompanyName
                                    ??
                                    company.companyName
                                    ??
                                    '',

                                CompanyShortName:
                                    company.CompanyShortName
                                    ??
                                    company.companyShortName
                                    ??
                                    '',

                                AddressLine1:
                                    company.AddressLine1
                                    ??
                                    company.addressLine1
                                    ??
                                    '',

                                AddressLine2:
                                    company.AddressLine2
                                    ??
                                    company.addressLine2
                                    ??
                                    '',

                                Phone:
                                    company.Phone
                                    ??
                                    company.phone
                                    ??
                                    '',

                                Mobile:
                                    company.Mobile
                                    ??
                                    company.mobile
                                    ??
                                    '',

                                Email:
                                    company.Email
                                    ??
                                    company.email
                                    ??
                                    '',

                                Website:
                                    company.Website
                                    ??
                                    company.website
                                    ??
                                    '',

                                BINNo:
                                    company.BINNo
                                    ??
                                    company.binNo
                                    ??
                                    '',

                                OwnershipType:
                                    company.OwnershipType
                                    ??
                                    company.ownershipType
                                    ??
                                    '',

                                EconomicActivity:
                                    company.EconomicActivity
                                    ??
                                    company.economicActivity
                                    ??
                                    '',

                                TINNo:
                                    company.TINNo
                                    ??
                                    company.tinNo
                                    ??
                                    '',

                                TradeLicenseNo:
                                    company.TradeLicenseNo
                                    ??
                                    company.tradeLicenseNo
                                    ??
                                    '',

                                CompanyLogoPath:
                                    company.CompanyLogoPath
                                    ??
                                    company.companyLogoPath
                                    ??
                                    '',

                                Remarks:
                                    company.Remarks
                                    ??
                                    company.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean
                                    (
                                        company.IsActive
                                        ??
                                        company.isActive
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
        Observable<CompanyDefaults>
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
            number
    ):
        Observable<Company>
    {
        return this.http.get<Company>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Upload Company Logo
    //===========================================================

    uploadLogo
    (
        file:
            File,

        companyCode:
            string
    ):
        Observable<string>
    {
        const formData =
            new FormData();


        formData.append(
            'file',

            file
        );


        formData.append(
            'companyCode',

            companyCode
        );


        return this.http

            .post<any>(
                `${this.apiUrl}/logo`,

                formData
            )

            .pipe(
                map(
                    response =>
                    {
                        if
                        (
                            typeof response ===
                            'string'
                        )
                        {
                            return response;
                        }


                        return (
                            response?.path
                            ??
                            response?.Path
                            ??
                            response?.logoPath
                            ??
                            response?.LogoPath
                            ??
                            response?.companyLogoPath
                            ??
                            response?.CompanyLogoPath
                            ??
                            ''
                        );
                    }
                )
            );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateCompany
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
            UpdateCompany
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