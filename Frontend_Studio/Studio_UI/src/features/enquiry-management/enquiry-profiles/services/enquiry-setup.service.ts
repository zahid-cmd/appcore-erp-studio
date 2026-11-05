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
    HttpClient,
    HttpParams
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
    EnquirySetup,
    EnquirySetupType,
    CreateEnquirySetup,
    UpdateEnquirySetup,
    EnquirySetupDefaults
}
from '../models/enquiry-setup.model';


//===============================================================
// Enquiry Setup Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class EnquirySetupService
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
        `${environment.apiUrl}/enquiry-management/enquiry-profiles/enquiry-setup`;


    //===========================================================
    // Read a value in PascalCase or camelCase
    //===========================================================

    private pick
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


    //===========================================================
    // Normalize
    //===========================================================

    normalize
    (
        item:
            any
    ):
        EnquirySetup
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        const flag =
            (name: string, fallback: boolean): boolean =>
                Boolean(this.pick(item, name) ?? fallback);

        return {
            EnquirySetupId:
                num('EnquirySetupId'),

            SetupType:
                text('SetupType') as EnquirySetupType,

            Code:
                text('Code'),

            Name:
                text('Name'),

            ColorCode:
                text('ColorCode'),

            Stage:
                text('Stage'),

            DaysFrom:
                this.pick(item, 'DaysFrom') == null
                    ? null
                    : Number(this.pick(item, 'DaysFrom')),

            DaysTo:
                this.pick(item, 'DaysTo') == null
                    ? null
                    : Number(this.pick(item, 'DaysTo')),

            UsedFor:
                text('UsedFor'),

            IntervalMinutes:
                this.pick(item, 'IntervalMinutes') == null
                    ? null
                    : Number(this.pick(item, 'IntervalMinutes')),

            SlotCapacity:
                this.pick(item, 'SlotCapacity') == null
                    ? null
                    : Number(this.pick(item, 'SlotCapacity')),

            // "10:00:00" or "10:00" → "10:00"
            TimeFrom:
                text('TimeFrom').slice(0, 5),

            TimeTo:
                text('TimeTo').slice(0, 5),

            BreakFrom:
                text('BreakFrom').slice(0, 5),

            BreakTo:
                text('BreakTo').slice(0, 5),

            SlotCount:
                num('SlotCount'),

            DisplayOrder:
                num('DisplayOrder'),

            IsDefault:
                flag('IsDefault', false),

            IsSystem:
                flag('IsSystem', false),

            Remarks:
                text('Remarks'),

            IsActive:
                flag('IsActive', true)
        };
    }


    //===========================================================
    // Get All (setupType empty = every list)
    //===========================================================

    getAll
    (
        setupType:
            EnquirySetupType | '' = ''
    ):
        Observable<EnquirySetup[]>
    {
        let params =
            new HttpParams();

        if
        (
            setupType
        )
        {
            params =
                params.set('setupType', setupType);
        }

        return this.http
            .get<any[]>(
                this.apiUrl,
                { params }
            )
            .pipe(
                map(
                    response =>
                        (response ?? []).map(
                            item =>
                                this.normalize(item)
                        )
                )
            );
    }


    //===========================================================
    // Get Defaults (next code / order of a list)
    //===========================================================

    getDefaults
    (
        setupType:
            EnquirySetupType
    ):
        Observable<EnquirySetupDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params:
                        new HttpParams().set('setupType', setupType)
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        SetupType:
                            String(this.pick(response, 'SetupType') ?? setupType),

                        Code:
                            String(this.pick(response, 'Code') ?? ''),

                        NextDisplayOrder:
                            Number(this.pick(response, 'NextDisplayOrder') ?? 1)
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
        Observable<EnquirySetup>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    response =>
                        this.normalize(response)
                )
            );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateEnquirySetup
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
            UpdateEnquirySetup
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
    // Restore (the most recently deleted row of the list)
    //===========================================================

    restore
    (
        setupType:
            EnquirySetupType
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {},
            {
                params:
                    new HttpParams().set('setupType', setupType)
            }
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
}
