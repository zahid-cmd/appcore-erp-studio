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
    CreateTestRide,
    OVERDUE_COLOR,
    TEST_RIDE_STATUSES,
    TestRideDefaults,
    TestRidePageQuery,
    TestRideRow,
    TestRideStatus,
    TestRideWaiting,
    UpdateTestRide
}
from '../models/test-rides.model';

import
{
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    dateLabel,
    isoDate,
    readSlot,
    slotLabel
}
from './service-appointments.service';


//===============================================================
// Readers (PascalCase or camelCase answers)
//===============================================================

const pick =
    (item: any, name: string): any =>
        item?.[name] ?? item?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (item: any, name: string): string =>
        String(pick(item, name) ?? '');

const num =
    (item: any, name: string): number =>
        Number(pick(item, name) ?? 0) || 0;


//===============================================================
// Test Rides Service (Follow-ups & Appointments › Test Rides
// page : list + form)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class TestRidesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/follow-ups-appointments/test-rides`;


    //===========================================================
    // Readers
    //===========================================================

    normalize
    (
        item: any
    ):
        TestRideRow
    {
        const status =
            text(item, 'Status') as TestRideStatus;

        const option =
            TEST_RIDE_STATUSES.find(x => x.value === status);

        const overdue =
            Boolean(pick(item, 'IsOverdue'));

        const date =
            isoDate(pick(item, 'RideDate'));

        const start =
            text(item, 'SlotStart').slice(0, 5);

        const end =
            text(item, 'SlotEnd').slice(0, 5);

        const name =
            text(item, 'EnquirerName');

        const mobile =
            text(item, 'EnquirerMobile');

        const moves =
            num(item, 'RescheduleCount');

        return {
            SalesTestRideId:num(item, 'SalesTestRideId'),
            PublicId:text(item, 'PublicId'),
            SalesEnquiryId:num(item, 'SalesEnquiryId'),
            EnquiryNo:text(item, 'EnquiryNo'),
            BranchId:num(item, 'BranchId'),
            BranchName:text(item, 'BranchName'),
            RideDate:date,
            SlotStart:start,
            SlotEnd:end,
            TimeSlotId:pick(item, 'TimeSlotId') == null ? null : num(item, 'TimeSlotId'),
            ModelId:pick(item, 'ModelId') == null ? null : num(item, 'ModelId'),
            ModelName:text(item, 'ModelName'),
            Status:status,
            StatusDate:pick(item, 'StatusDate') ?? null,
            CancelReason:text(item, 'CancelReason'),
            AdvisorUserId:num(item, 'AdvisorUserId'),
            AdvisorName:text(item, 'AdvisorName'),
            Note:text(item, 'Note'),
            RescheduleCount:moves,
            EnquirerName:name,
            EnquirerMobile:mobile,
            EnquiryModelName:text(item, 'EnquiryModelName'),
            BrandName:text(item, 'BrandName'),
            SecondModelName:text(item, 'SecondModelName'),
            InterestLevelName:text(item, 'InterestLevelName'),
            InterestLevelColor:text(item, 'InterestLevelColor'),
            EnquiryStatusName:text(item, 'EnquiryStatusName'),
            EnquiryStatusColor:text(item, 'EnquiryStatusColor'),
            CreatedDate:text(item, 'CreatedDate'),
            IsLive:Boolean(pick(item, 'IsLive')),
            IsOverdue:overdue,

            DateText:dateLabel(date),
            SlotText:start ? `${slotLabel(start)} - ${slotLabel(end)}` : '',
            StatusText:overdue ? `${option?.label ?? status} · Overdue` : (option?.label ?? status),
            StatusColor:overdue ? OVERDUE_COLOR : (option?.color ?? '#64748B'),
            CustomerText:[name, mobile].filter(x => !!x).join(' · '),
            MovedText:moves > 0 ? `${moves}×` : ''
        };
    }


    private readWaiting
    (
        w: any
    ):
        TestRideWaiting
    {
        return {
            SalesEnquiryId:num(w, 'SalesEnquiryId'),
            EnquiryNo:text(w, 'EnquiryNo'),
            EnquiryDate:isoDate(pick(w, 'EnquiryDate')),
            EnquirerName:text(w, 'EnquirerName'),
            EnquirerMobile:text(w, 'EnquirerMobile'),
            ModelId:num(w, 'ModelId'),
            ModelName:text(w, 'ModelName'),
            BrandName:text(w, 'BrandName'),
            SecondModelId:pick(w, 'SecondModelId') == null || num(w, 'SecondModelId') <= 0 ? null : num(w, 'SecondModelId'),
            SecondModelName:text(w, 'SecondModelName'),
            TestRideDate:isoDate(pick(w, 'TestRideDate')) || null,
            TestRideSlot:text(w, 'TestRideSlot'),
            SourceName:text(w, 'SourceName'),
            FromWebsite:Boolean(pick(w, 'FromWebsite')),
            InterestLevelName:text(w, 'InterestLevelName'),
            InterestLevelColor:text(w, 'InterestLevelColor'),
            ExecutiveUserId:num(w, 'ExecutiveUserId'),
            ExecutiveName:text(w, 'ExecutiveName'),
            LastRide:text(w, 'LastRide')
        };
    }


    //===========================================================
    // Calls
    //===========================================================

    getPaged
    (
        query: TestRidePageQuery
    ):
        Observable<PagedResult<TestRideRow>>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                {
                    params:
                        toPagedParams(
                            {
                                ...query,
                                branchId: query.branchId > 0 ? query.branchId : null
                            })
                })
            .pipe(
                map(
                    raw =>
                        toPagedResult(raw, x => this.normalize(x))));
    }


    getDefaults
    (
        date: string,
        branchId: number
    ):
        Observable<TestRideDefaults>
    {
        const params =
            new HttpParams()
                .set('date', date)
                .set('branchId', String(branchId > 0 ? branchId : 0));

        return this.http
            .get<any>(`${this.apiUrl}/defaults`, { params })
            .pipe(
                map(
                    r =>
                    ({
                        Date:isoDate(pick(r, 'Date')),
                        BranchId:num(r, 'BranchId'),
                        TimeSlotName:text(r, 'TimeSlotName'),
                        Capacity:num(r, 'Capacity'),
                        AllowOverbook:pick(r, 'AllowOverbook') !== false,
                        Message:text(r, 'Message'),
                        Slots:((pick(r, 'Slots') ?? []) as any[]).map(readSlot),
                        Waiting:((pick(r, 'Waiting') ?? []) as any[]).map(w => this.readWaiting(w)),
                        Advisors:
                            ((pick(r, 'Advisors') ?? []) as any[])
                                .map(a => ({ Id:num(a, 'Id'), Name:text(a, 'Name') }))
                                .filter(a => a.Id > 0)
                    })));
    }


    getByPublicId
    (
        publicId: string
    ):
        Observable<TestRideRow>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(
                map(r => this.normalize(r)));
    }


    // Answers the new test ride's PublicId
    create
    (
        model: CreateTestRide
    ):
        Observable<string>
    {
        return this.http
            .post<any>(this.apiUrl, model)
            .pipe(
                map(r => String(r ?? '')));
    }


    update
    (
        publicId: string,
        model: UpdateTestRide
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}`, model);
    }


    delete
    (
        publicId: string
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
    }


    // The most recently deleted test ride
    restore():
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/restore`, {});
    }


    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }


    getEntityHistory
    (
        salesTestRideId: number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/${salesTestRideId}/history`);
    }
}
