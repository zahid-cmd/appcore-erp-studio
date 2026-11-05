//===============================================================
// Service Follow-ups Service (on the Service Enquiries API)
//   GET  {id}/follow-ups         calls logged on one enquiry
//   GET  follow-ups/recent?days= calls from N days ago
//   POST follow-ups              log a call / visit
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
    ServiceFollowUp,
    LogServiceFollowUp
}
from '../models/service-follow-ups.model';


@Injectable(
{
    providedIn:'root'
})
export class ServiceFollowUpsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/enquiry-profiles/service-enquiries`;


    private pick(item: any, name: string): any
    {
        if (item == null)
        {
            return undefined;
        }

        return item[name] ?? item[name.charAt(0).toLowerCase() + name.slice(1)];
    }

    private text(item: any, name: string): string
    {
        return String(this.pick(item, name) ?? '');
    }

    private num(item: any, name: string): number
    {
        return Number(this.pick(item, name) ?? 0);
    }

    private optionalNum(item: any, name: string): number | null
    {
        const value = this.pick(item, name);

        return value == null ? null : Number(value);
    }

    private optionalText(item: any, name: string): string | null
    {
        const value = this.pick(item, name);

        return value == null || value === '' ? null : String(value);
    }


    normalize(x: any): ServiceFollowUp
    {
        return {
            ServiceFollowUpId: this.num(x, 'ServiceFollowUpId'),
            ServiceEnquiryId: this.num(x, 'ServiceEnquiryId'),
            EnquiryNo: this.text(x, 'EnquiryNo'),
            EnquirerName: this.text(x, 'EnquirerName'),
            EnquirerMobile: this.text(x, 'EnquirerMobile'),
            EnquiryType: this.text(x, 'EnquiryType'),
            FollowUpAt: this.text(x, 'FollowUpAt'),
            FollowUpDate: this.text(x, 'FollowUpDate'),
            MethodId: this.optionalNum(x, 'MethodId'),
            MethodName: this.text(x, 'MethodName'),
            Outcome: this.text(x, 'Outcome'),
            Note: this.text(x, 'Note'),
            NextFollowUpDate: this.optionalText(x, 'NextFollowUpDate'),
            StatusFromName: this.text(x, 'StatusFromName'),
            StatusToName: this.text(x, 'StatusToName'),
            StatusToStage: this.text(x, 'StatusToStage'),
            PreferredDateFrom: this.optionalText(x, 'PreferredDateFrom'),
            PreferredDateTo: this.optionalText(x, 'PreferredDateTo'),
            LostReasonName: this.text(x, 'LostReasonName'),
            ExecutiveUserId: this.num(x, 'ExecutiveUserId'),
            ExecutiveName: this.text(x, 'ExecutiveName')
        };
    }


    getByEnquiry(enquiryId: number): Observable<ServiceFollowUp[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/${enquiryId}/follow-ups`)
            .pipe(map(response => (response ?? []).map(x => this.normalize(x))));
    }

    getRecent(days: number = 0): Observable<ServiceFollowUp[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/follow-ups/recent`, { params: new HttpParams().set('days', String(days)) })
            .pipe(map(response => (response ?? []).map(x => this.normalize(x))));
    }

    log(model: LogServiceFollowUp): Observable<number>
    {
        return this.http.post<number>(`${this.apiUrl}/follow-ups`, model);
    }
}
