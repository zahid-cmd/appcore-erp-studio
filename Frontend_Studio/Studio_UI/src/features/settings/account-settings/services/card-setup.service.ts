// PAGE-CLONED : Bank Setup -> Card Setup
// PAGE-CLONED : Wings -> Card Setup
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
    CardSetup,
    CreateCardSetup,
    UpdateCardSetup
}
from '../models/card-setup.model';


//===============================================================
// CardSetup Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class CardSetupService
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
        `${environment.apiUrl}/settings/account-settings/card-setup`;


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
        Observable<CardSetup[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(

                map(

                    response =>

                        response.map(

                            cardSetup =>

                            ({
                                ...cardSetup,

                                CardSetupId:
                                    Number(cardSetup.CardSetupId ?? cardSetup.cardSetupId ?? cardSetup.id ?? cardSetup.Id),

                                CardCode:
                                    cardSetup.CardCode ?? cardSetup.cardCode ?? '',

                                CardName:
                                    cardSetup.CardName ?? cardSetup.cardName ?? '',

                                Remarks:
                                    cardSetup.Remarks ?? cardSetup.remarks ?? '',

                                Status:
                                    Boolean(cardSetup.Status ?? cardSetup.status ?? true),

                                ShortName:
                                    cardSetup.ShortName ?? cardSetup.shortName ?? '',

                                IssuingBank:
                                    cardSetup.IssuingBank ?? cardSetup.issuingBank ?? ''
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
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
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
        Observable<CardSetup>
    {
        return this.http.get<CardSetup>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateCardSetup
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
            UpdateCardSetup
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