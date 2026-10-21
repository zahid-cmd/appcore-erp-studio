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
    Customer,
    CreateCustomer,
    UpdateCustomer,
    CustomerProfilesDefaults
}
from '../models/customer-profiles.model';


//===============================================================
// Customer Profiles Service (includes Customer Photo upload / delete)
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CustomerProfilesService
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
        `${environment.apiUrl}/settings/client-settings/customer-profiles`;


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
        Customer
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        return {
            CustomerId:
                Number(this.pick(item, 'CustomerId') ?? 0),

            CustomerType:
                text('CustomerType') === 'Outside'
                    ? 'Outside'
                    : 'Inbound',

            CustomerCode:
                text('CustomerCode'),

            PreviousCode:
                text('PreviousCode'),

            CustomerName:
                text('CustomerName'),

            DisplayName:
                text('DisplayName'),

            FatherName:
                text('FatherName'),

            MotherName:
                text('MotherName'),

            DateOfBirth:
                text('DateOfBirth'),

            PhotoPath:
                text('PhotoPath'),

            Phone1:
                text('Phone1'),

            Phone2:
                text('Phone2'),

            Email:
                text('Email'),

            NidNo:
                text('NidNo'),

            DrivingLicenseNo:
                text('DrivingLicenseNo'),

            PresentAddress:
                text('PresentAddress'),

            PermanentAddress:
                text('PermanentAddress'),

            RegistrationAddress:
                text('RegistrationAddress'),

            LocationId:
                this.pick(item, 'LocationId') == null || Number(this.pick(item, 'LocationId')) <= 0
                    ? null
                    : Number(this.pick(item, 'LocationId')),

            ReceivableLedgerCode:
                text('ReceivableLedgerCode'),

            ReceivableLedgerName:
                text('ReceivableLedgerName'),

            CreditLimit:
                Number(this.pick(item, 'CreditLimit') ?? 0),

            Remarks:
                text('Remarks'),

            IsActive:
                Boolean(
                    this.pick(item, 'IsActive')
                    ??
                    true
                ),

            LocationName:
                text('LocationName')
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Customer[]>
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
    // Get Defaults (next codes, receivable sub group, locations)
    //===========================================================

    getDefaults():
        Observable<CustomerProfilesDefaults>
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
                            (name: string): string =>
                                String(this.pick(response, name) ?? '');

                        return {
                            NextInboundCode:
                                text('NextInboundCode'),

                            NextOutsideCode:
                                text('NextOutsideCode'),

                            NextLedgerCode:
                                text('NextLedgerCode'),

                            ReceivableSubGroupCode:
                                text('ReceivableSubGroupCode'),

                            ReceivableSubGroupName:
                                text('ReceivableSubGroupName'),

                            ReceivableSubGroupMessage:
                                text('ReceivableSubGroupMessage'),

                            Locations:
                                (this.pick(response, 'Locations') ?? []).map(
                                    (item: any) =>
                                    ({
                                        LocationId:
                                            Number(this.pick(item, 'LocationId') ?? 0),

                                        DisplayName:
                                            String(this.pick(item, 'DisplayName') ?? ''),

                                        IsActive:
                                            Boolean(this.pick(item, 'IsActive') ?? true)
                                    })
                                )
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
        Observable<Customer>
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
            CreateCustomer
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
            UpdateCustomer
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
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {}
        );
    }


    //===========================================================
    // Customer Photo : URL to show (saved path -> full URL)
    //
    // The API stores a relative path (/uploads/customer-photos/...);
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
    // Customer Photo : Upload (multipart, field name "file")
    // Returns the stored path.
    //===========================================================

    uploadPhoto
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
            `${this.apiUrl}/${id}/photo`,
            form,
            {
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Customer Photo : Delete
    //===========================================================

    deletePhoto
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}/photo`
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