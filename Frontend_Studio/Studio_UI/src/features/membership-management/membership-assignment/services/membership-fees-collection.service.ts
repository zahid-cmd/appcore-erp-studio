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
    CollectMembershipFee,
    MembershipFeeResult,
    MembershipFeeRow,
    MembershipFeesPage
}
from '../models/membership-fees-collection.model';


const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const day =
    (x: any, name: string): string =>
        text(x, name).substring(0, 10);


function toRow(x: any): MembershipFeeRow
{
    return {
        Kind:text(x, 'Kind') === 'ToCollect' ? 'ToCollect' : 'Fee',
        MembershipFeeId:num(x, 'MembershipFeeId'),
        PublicId:text(x, 'PublicId'),
        FeeNo:text(x, 'FeeNo'),
        FeeType:text(x, 'FeeType'),
        MembershipId:num(x, 'MembershipId'),
        MembershipNo:text(x, 'MembershipNo'),
        MembershipStatus:text(x, 'MembershipStatus'),
        CardName:text(x, 'CardName'),
        CustomerId:num(x, 'CustomerId'),
        CustomerCode:text(x, 'CustomerCode'),
        CustomerName:text(x, 'CustomerName'),
        CustomerPhone:text(x, 'CustomerPhone'),
        ChassisNo:text(x, 'ChassisNo'),
        StartDate:day(x, 'StartDate'),
        ExpiryDate:day(x, 'ExpiryDate'),
        Amount:num(x, 'Amount'),
        Date:day(x, 'Date'),
        BranchName:text(x, 'BranchName'),
        ReceiptVoucherNo:text(x, 'ReceiptVoucherNo'),
        RefundJournalVoucherNo:text(x, 'RefundJournalVoucherNo'),
        RefundDate:day(x, 'RefundDate'),
        Status:(text(x, 'Status') || 'To Collect') as any,
        Reason:text(x, 'Reason'),
        Used:!!pick(x, 'Used'),
        UsedText:text(x, 'UsedText'),
        CanCancel:!!pick(x, 'CanCancel'),
        CanRefund:!!pick(x, 'CanRefund'),
        Note:text(x, 'Note')
    };
}


function toResult(x: any): MembershipFeeResult
{
    return {
        PublicId:text(x, 'PublicId'),
        FeeNo:text(x, 'FeeNo'),
        MembershipNo:text(x, 'MembershipNo'),
        Amount:num(x, 'Amount'),
        VoucherNo:text(x, 'VoucherNo')
    };
}


//===============================================================
// Membership Fees Collection API (hand-written page)
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class MembershipFeesCollectionService
{
    private readonly http =
        inject(HttpClient);

    private readonly url =
        `${environment.apiUrl}/membership-management/membership-assignment/membership-fees-collection`;


    getAll(): Observable<MembershipFeesPage>
    {
        return this.http
            .get<any>(this.url)
            .pipe(
                map
                (
                    x =>
                    ({
                        Today:day(x, 'Today'),
                        BranchId:num(x, 'BranchId'),
                        BranchName:text(x, 'BranchName'),
                        Rows:((pick(x, 'Rows') ?? []) as any[]).map(toRow)
                    })
                )
            );
    }

    collect(model: CollectMembershipFee): Observable<MembershipFeeResult>
    {
        return this.http
            .post<any>(`${this.url}/collect`, model)
            .pipe(map(x => toResult(x)));
    }

    cancel(publicId: string, reason: string): Observable<MembershipFeeResult>
    {
        return this.http
            .put<any>(`${this.url}/${publicId}/cancel`, { Reason:reason })
            .pipe(map(x => toResult(x)));
    }

    refund(publicId: string, reason: string): Observable<MembershipFeeResult>
    {
        return this.http
            .put<any>(`${this.url}/${publicId}/refund`, { Reason:reason })
            .pipe(map(x => toResult(x)));
    }

    getHistory(feeId: number): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url}/history/${feeId}`);
    }
}
