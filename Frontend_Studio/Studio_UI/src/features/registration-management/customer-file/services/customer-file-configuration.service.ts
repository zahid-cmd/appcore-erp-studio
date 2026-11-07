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
    CustomerFileConfiguration,
    CustomerFileConfigurationDefaults,
    CustomerFileRateState,
    CustomerFileTab,
    SaveNameTransferRule,
    SaveDeliveryRule,
    SaveCustomerFileDocument
}
from '../models/customer-file-configuration.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const flag =
    (x: any, name: string, fallback: boolean): boolean =>
        Boolean(pick(x, name) ?? fallback);

const list =
    (x: any, name: string): any[] =>
        (pick(x, name) ?? []) as any[];


//===============================================================
// Customer File Configuration Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CustomerFileConfigurationService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/registration-management/customer-file/customer-file-configuration`;


    getAll():
        Observable<CustomerFileConfiguration>
    {
        return this.http
            .get<any>(this.apiUrl)
            .pipe(
                map(
                    x =>
                    ({
                        NameTransferRules:
                            list(x, 'NameTransferRules').map(
                                r =>
                                ({
                                    NameTransferRuleId:num(r, 'NameTransferRuleId'),
                                    PublicId:text(r, 'PublicId'),
                                    Code:text(r, 'Code'),
                                    EffectiveFrom:text(r, 'EffectiveFrom').slice(0, 10),
                                    TransfersAllowed:num(r, 'TransfersAllowed'),
                                    FeePerTransfer:num(r, 'FeePerTransfer'),
                                    RateState:(text(r, 'RateState') || 'Old') as CustomerFileRateState,
                                    Remarks:text(r, 'Remarks'),
                                    IsActive:flag(r, 'IsActive', true)
                                })),
                        DeliveryRules:
                            list(x, 'DeliveryRules').map(
                                r =>
                                ({
                                    DeliveryRuleId:num(r, 'DeliveryRuleId'),
                                    PublicId:text(r, 'PublicId'),
                                    Code:text(r, 'Code'),
                                    EffectiveFrom:text(r, 'EffectiveFrom').slice(0, 10),
                                    FreeDays:num(r, 'FreeDays'),
                                    FirstYearAmount:num(r, 'FirstYearAmount'),
                                    SecondYearAmount:num(r, 'SecondYearAmount'),
                                    PerYearAmount:num(r, 'PerYearAmount'),
                                    RateState:(text(r, 'RateState') || 'Old') as CustomerFileRateState,
                                    Remarks:text(r, 'Remarks'),
                                    IsActive:flag(r, 'IsActive', true)
                                })),
                        Documents:
                            list(x, 'Documents').map(
                                r =>
                                ({
                                    CustomerFileDocumentId:num(r, 'CustomerFileDocumentId'),
                                    PublicId:text(r, 'PublicId'),
                                    DocumentFor:text(r, 'DocumentFor') as CustomerFileTab,
                                    Code:text(r, 'Code'),
                                    Name:text(r, 'Name'),
                                    IsRequired:flag(r, 'IsRequired', true),
                                    DisplayOrder:num(r, 'DisplayOrder'),
                                    Remarks:text(r, 'Remarks'),
                                    IsActive:flag(r, 'IsActive', true)
                                })),
                        Today:text(x, 'Today').slice(0, 10)
                    })
                )
            );
    }


    getDefaults():
        Observable<CustomerFileConfigurationDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(
                    x =>
                    ({
                        NameTransferRuleCode:text(x, 'NameTransferRuleCode'),
                        DeliveryRuleCode:text(x, 'DeliveryRuleCode'),
                        NameTransferDocumentCode:text(x, 'NameTransferDocumentCode'),
                        FileDeliveryDocumentCode:text(x, 'FileDeliveryDocumentCode'),
                        NextNameTransferDocumentOrder:num(x, 'NextNameTransferDocumentOrder') || 1,
                        NextFileDeliveryDocumentOrder:num(x, 'NextFileDeliveryDocumentOrder') || 1
                    })
                )
            );
    }


    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }


    // path : name-transfer-rules / delivery-rules / documents
    create
    (
        path:string,
        body:SaveNameTransferRule | SaveDeliveryRule | SaveCustomerFileDocument
    ):
        Observable<string>
    {
        return this.http.post<string>(`${this.apiUrl}/${path}`, body);
    }


    update
    (
        path:string,
        publicId:string,
        body:SaveNameTransferRule | SaveDeliveryRule | SaveCustomerFileDocument
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${path}/${publicId}`, body);
    }


    delete
    (
        path:string,
        publicId:string
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${path}/${publicId}`);
    }


    // documents : documentFor = the tab's list
    restore
    (
        path:string,
        documentFor:string = ''
    ):
        Observable<void>
    {
        let params =
            new HttpParams();

        if (documentFor)
        {
            params = params.set('documentFor', documentFor);
        }

        return this.http.put<void>(`${this.apiUrl}/${path}/restore`, {}, { params });
    }
}
