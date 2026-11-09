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
    CustomerFilesPage,
    CustomerFilesDefaults,
    CustomerFileLookupItem,
    CustomerFileStatus,
    NameTransferQuote,
    SaveOpeningFile,
    SetCustomerFileStatus,
    SaveNameTransfer,
    CustomerFileFeeStatus,
    CustomerFileStatusResult,
    CustodyQuote,
    NameTransferSaved,
    CollectCustomerFileFees,
    CollectCustomerFileFeesResult
}
from '../models/customer-files.model';


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

const lookups =
    (x: any, name: string): CustomerFileLookupItem[] =>
        list(x, name).map(
            r =>
            ({
                Id:num(r, 'Id'),
                Code:text(r, 'Code'),
                Name:text(r, 'Name'),
                Extra:text(r, 'Extra')
            }));


//===============================================================
// Customer Files Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CustomerFilesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/registration-management/customer-file/customer-files`;


    getAll():
        Observable<CustomerFilesPage>
    {
        return this.http
            .get<any>(this.apiUrl)
            .pipe(
                map(
                    x =>
                    ({
                        Files:
                            list(x, 'Files').map(
                                r =>
                                ({
                                    CustomerFileId:num(r, 'CustomerFileId'),
                                    PublicId:text(r, 'PublicId'),
                                    CustomerFileNo:text(r, 'CustomerFileNo'),
                                    Source:text(r, 'Source'),
                                    FileDate:text(r, 'FileDate').slice(0, 10),
                                    BranchId:num(r, 'BranchId'),
                                    BranchName:text(r, 'BranchName'),
                                    SalesInvoiceNo:text(r, 'SalesInvoiceNo'),
                                    SalesInvoiceDate:text(r, 'SalesInvoiceDate').slice(0, 10),
                                    SalesmanName:text(r, 'SalesmanName'),
                                    MotorBikeId:num(r, 'MotorBikeId'),
                                    BikeName:text(r, 'BikeName'),
                                    ChassisNo:text(r, 'ChassisNo'),
                                    EngineNo:text(r, 'EngineNo'),
                                    VehiclePower:text(r, 'VehiclePower'),
                                    OriginalCustomerId:num(r, 'OriginalCustomerId'),
                                    OriginalCustomerName:text(r, 'OriginalCustomerName'),
                                    CurrentCustomerId:num(r, 'CurrentCustomerId'),
                                    CurrentCustomerName:text(r, 'CurrentCustomerName'),
                                    CurrentCustomerPhone:text(r, 'CurrentCustomerPhone'),
                                    CurrentCustomerNid:text(r, 'CurrentCustomerNid'),
                                    RegistrationBy:text(r, 'RegistrationBy'),
                                    RegistrationFileNo:text(r, 'RegistrationFileNo'),
                                    TransferCount:num(r, 'TransferCount'),
                                    FileReadyDate:text(r, 'FileReadyDate').slice(0, 10),
                                    CollectedDate:text(r, 'CollectedDate').slice(0, 10),
                                    Status:(text(r, 'Status') || 'Open') as CustomerFileStatus,
                                    Remarks:text(r, 'Remarks'),
                                    PendingTransferNo:text(r, 'PendingTransferNo'),
                                    CkdStatus:text(r, 'CkdStatus') === 'Yes' ? 'Yes' : 'No'
                                })),
                        Transfers:
                            list(x, 'Transfers').map(
                                r =>
                                ({
                                    NameTransferId:num(r, 'NameTransferId'),
                                    PublicId:text(r, 'PublicId'),
                                    TransferNo:text(r, 'TransferNo'),
                                    CustomerFileId:num(r, 'CustomerFileId'),
                                    CustomerFilePublicId:text(r, 'CustomerFilePublicId'),
                                    CustomerFileNo:text(r, 'CustomerFileNo'),
                                    ChassisNo:text(r, 'ChassisNo'),
                                    TransferDate:text(r, 'TransferDate').slice(0, 10),
                                    FromCustomerId:num(r, 'FromCustomerId'),
                                    FromCustomerName:text(r, 'FromCustomerName'),
                                    ToCustomerId:num(r, 'ToCustomerId'),
                                    ToCustomerName:text(r, 'ToCustomerName'),
                                    FeeAmount:num(r, 'FeeAmount'),
                                    DocumentCodes:text(r, 'DocumentCodes'),
                                    Remarks:text(r, 'Remarks'),
                                    Status:text(r, 'Status') || 'Completed',
                                    FeeNo:text(r, 'FeeNo'),
                                    FeeStatus:text(r, 'FeeStatus'),
                                    IsLatest:flag(r, 'IsLatest', false)
                                })),
                        Fees:
                            list(x, 'Fees').map(
                                r =>
                                ({
                                    CustomerFileFeeId:num(r, 'CustomerFileFeeId'),
                                    PublicId:text(r, 'PublicId'),
                                    FeeNo:text(r, 'FeeNo'),
                                    CustomerFileId:num(r, 'CustomerFileId'),
                                    CustomerFilePublicId:text(r, 'CustomerFilePublicId'),
                                    CustomerFileNo:text(r, 'CustomerFileNo'),
                                    ChassisNo:text(r, 'ChassisNo'),
                                    FeeType:text(r, 'FeeType'),
                                    TransferNo:text(r, 'TransferNo'),
                                    FeeDate:text(r, 'FeeDate').slice(0, 10),
                                    CustomerId:num(r, 'CustomerId'),
                                    CustomerName:text(r, 'CustomerName'),
                                    Amount:num(r, 'Amount'),
                                    CustodyUpTo:text(r, 'CustodyUpTo').slice(0, 10),
                                    Status:(text(r, 'Status') || 'Pending') as CustomerFileFeeStatus,
                                    BranchId:num(r, 'BranchId'),
                                    DueVoucherNo:text(r, 'DueVoucherNo'),
                                    ReceiptVoucherNo:text(r, 'ReceiptVoucherNo'),
                                    PaidDate:text(r, 'PaidDate').slice(0, 10),
                                    Remarks:text(r, 'Remarks')
                                })),
                        Today:text(x, 'Today').slice(0, 10),
                        BranchId:num(x, 'BranchId'),
                        BranchName:text(x, 'BranchName'),
                        AllowWithoutPayment:flag(x, 'AllowWithoutPayment', false)
                    })
                )
            );
    }


    getDefaults():
        Observable<CustomerFilesDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(
                    x =>
                    ({
                        NextOpeningNo:text(x, 'NextOpeningNo'),
                        NextTransferNo:text(x, 'NextTransferNo'),
                        Bikes:lookups(x, 'Bikes'),
                        Customers:lookups(x, 'Customers'),
                        TransferDocuments:lookups(x, 'TransferDocuments')
                    })
                )
            );
    }


    getQuote
    (
        filePublicId:string,
        date:string
    ):
        Observable<NameTransferQuote>
    {
        const params =
            new HttpParams().set('date', date);

        return this.http
            .get<any>(`${this.apiUrl}/${filePublicId}/transfer-quote`, { params })
            .pipe(
                map(
                    x =>
                    ({
                        Allowed:flag(x, 'Allowed', false),
                        Message:text(x, 'Message'),
                        TransfersAllowed:num(x, 'TransfersAllowed'),
                        TransfersMade:num(x, 'TransfersMade'),
                        FeePerTransfer:num(x, 'FeePerTransfer'),
                        PolicyCode:text(x, 'PolicyCode')
                    })
                )
            );
    }


    getCustodyQuote
    (
        filePublicId:string,
        date:string
    ):
        Observable<CustodyQuote>
    {
        const params =
            new HttpParams().set('date', date);

        return this.http
            .get<any>(`${this.apiUrl}/${filePublicId}/custody-quote`, { params })
            .pipe(
                map(
                    x =>
                    ({
                        Charge:num(x, 'Charge'),
                        Covered:num(x, 'Covered'),
                        Pending:num(x, 'Pending'),
                        Remaining:num(x, 'Remaining'),
                        PolicyCode:text(x, 'PolicyCode'),
                        Message:text(x, 'Message')
                    })
                )
            );
    }


    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }


    getFileHistory(customerFileId: number):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history/${customerFileId}`);
    }


    createOpeningFile(body: SaveOpeningFile):
        Observable<string>
    {
        return this.http.post<string>(`${this.apiUrl}/opening-files`, body);
    }


    updateOpeningFile(publicId: string, body: SaveOpeningFile):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/opening-files/${publicId}`, body);
    }


    setStatus(publicId: string, body: SetCustomerFileStatus):
        Observable<CustomerFileStatusResult>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${publicId}/status`, body)
            .pipe(
                map(
                    x =>
                    ({
                        Done:flag(x, 'Done', true),
                        Message:text(x, 'Message'),
                        FeeNo:text(x, 'FeeNo')
                    })
                )
            );
    }


    createNameTransfer(body: SaveNameTransfer):
        Observable<NameTransferSaved>
    {
        return this.http
            .post<any>(`${this.apiUrl}/name-transfers`, body)
            .pipe(
                map(
                    x =>
                    ({
                        PublicId:text(x, 'PublicId'),
                        TransferNo:text(x, 'TransferNo'),
                        Status:text(x, 'Status'),
                        FeeNo:text(x, 'FeeNo'),
                        FeeAmount:num(x, 'FeeAmount'),
                        DueVoucherNo:text(x, 'DueVoucherNo')
                    })
                )
            );
    }


    collectFees(body: CollectCustomerFileFees):
        Observable<CollectCustomerFileFeesResult>
    {
        return this.http
            .post<any>(`${this.apiUrl}/fees/collect`, body)
            .pipe(
                map(
                    x =>
                    ({
                        ReceiptVoucherPublicId:text(x, 'ReceiptVoucherPublicId'),
                        ReceiptVoucherNo:text(x, 'ReceiptVoucherNo'),
                        Amount:num(x, 'Amount'),
                        CompletedTransfers:list(x, 'CompletedTransfers').map(v => String(v))
                    })
                )
            );
    }


    cancelFee(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/fees/${publicId}`);
    }


    cancelNameTransfer(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/name-transfers/${publicId}`);
    }
}
