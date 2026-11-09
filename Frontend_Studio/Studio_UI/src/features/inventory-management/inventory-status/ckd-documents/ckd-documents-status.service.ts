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
    CkdDocumentsPage,
    CkdDocumentRow,
    SetCkdStatus
}
from './ckd-documents-status.model';


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


//===============================================================
// CKD Documents Status Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CkdDocumentsStatusService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/inventory-status/ckd-documents-status`;


    getAll():
        Observable<CkdDocumentsPage>
    {
        return this.http
            .get<any>(this.apiUrl)
            .pipe(
                map(
                    x =>
                    ({
                        Rows:
                            ((pick(x, 'Rows') ?? []) as any[]).map(
                                r =>
                                ({
                                    Kind:text(r, 'Kind') === 'File' ? 'File' : 'Unit',
                                    Id:num(r, 'Id'),
                                    PublicId:text(r, 'PublicId'),
                                    ChassisNo:text(r, 'ChassisNo'),
                                    EngineNo:text(r, 'EngineNo'),
                                    ProductName:text(r, 'ProductName'),
                                    Source:text(r, 'Source'),
                                    SourceNo:text(r, 'SourceNo'),
                                    BranchId:num(r, 'BranchId'),
                                    BranchName:text(r, 'BranchName'),
                                    WarehouseName:text(r, 'WarehouseName'),
                                    StockStatus:text(r, 'StockStatus'),
                                    StockInDate:text(r, 'StockInDate').slice(0, 10),
                                    CustomerFileNo:text(r, 'CustomerFileNo'),
                                    CustomerName:text(r, 'CustomerName'),
                                    CkdStatus:text(r, 'CkdStatus') === 'Yes' ? 'Yes' : 'No',
                                    CkdCheckedDate:text(r, 'CkdCheckedDate').slice(0, 10),
                                    CkdCheckedByName:text(r, 'CkdCheckedByName'),
                                    CkdRemarks:text(r, 'CkdRemarks'),
                                    ManufactureYear:num(r, 'ManufactureYear') || null
                                } as CkdDocumentRow)),
                        Today:text(x, 'Today').slice(0, 10)
                    })
                )
            );
    }


    setStatus(row: CkdDocumentRow, body: SetCkdStatus):
        Observable<void>
    {
        return row.Kind === 'File'
            ? this.http.put<void>(`${this.apiUrl}/files/${row.PublicId}`, body)
            : this.http.put<void>(`${this.apiUrl}/units/${row.Id}`, body);
    }


    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }


    getRowHistory(row: CkdDocumentRow):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history/${row.Kind === 'File' ? 'file' : 'unit'}/${row.Id}`);
    }
}
