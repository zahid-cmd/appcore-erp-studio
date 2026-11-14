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
    HrPayment,
    HrPaymentGroup,
    HrPaymentLine,
    HrPaymentListItem,
    HrPaymentSource
}
from '../models/hr-payments.model';


// camelCase from the API -> PascalCase of the page
function pascal(x: any): any
{
    const row: Record<string, any> = {};

    for (const key of Object.keys(x ?? {}))
    {
        row[key.charAt(0).toUpperCase() + key.slice(1)] = x[key];
    }

    return row;
}

const rows =
    (x: any): any[] => (Array.isArray(x) ? x : []).map(pascal);


//===============================================================
// Payments of Human Resource : the same calls for Payroll
// Payments (group 'payroll') and PF Payments (group 'pf')
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class HrPaymentsService
{
    private readonly http =
        inject(HttpClient);

    private api(group: HrPaymentGroup): string
    {
        return group === 'pf'
            ? `${environment.apiUrl}/human-resource-manangement/provident-fund/pf-payments`
            : `${environment.apiUrl}/human-resource-manangement/payroll-management/payroll-payments`;
    }

    getList(group: HrPaymentGroup):
        Observable<HrPaymentListItem[]>
    {
        return this.http
            .get<any[]>(this.api(group))
            .pipe(map(x => rows(x) as HrPaymentListItem[]));
    }

    get(group: HrPaymentGroup, publicId: string):
        Observable<HrPayment>
    {
        return this.http
            .get<any>(`${this.api(group)}/${publicId}`)
            .pipe(map(x =>
            {
                const payment = pascal(x);

                return { ...payment, Lines:rows(payment.Lines) as HrPaymentLine[] } as HrPayment;
            }));
    }

    // The salary sheets / settlements / loans with something due
    getSources(group: HrPaymentGroup, type: string):
        Observable<HrPaymentSource[]>
    {
        return this.http
            .get<any[]>(`${this.api(group)}/sources`, { params:new HttpParams().set('type', type) })
            .pipe(map(x => rows(x) as HrPaymentSource[]));
    }

    // The employees of a source : payable, paid, due
    getDues(group: HrPaymentGroup, type: string, sourceId: number):
        Observable<HrPaymentLine[]>
    {
        return this.http
            .get<any[]>(`${this.api(group)}/dues`, { params:new HttpParams().set('type', type).set('sourceId', String(sourceId)) })
            .pipe(map(x => rows(x) as HrPaymentLine[]));
    }

    // Pays : writes the Payment Voucher (posted at once)
    create(group: HrPaymentGroup, body: any):
        Observable<HrPayment>
    {
        return this.http
            .post<any>(this.api(group), body)
            .pipe(map(x => pascal(x) as HrPayment));
    }

    // Cancels the payment and its Payment Voucher
    cancel(group: HrPaymentGroup, publicId: string, reason: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.api(group)}/${publicId}/cancel`, { Reason:reason });
    }
}
