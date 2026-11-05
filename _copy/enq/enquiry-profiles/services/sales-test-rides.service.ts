//===============================================================
// Sales Test Rides Service (on the Sales Enquiries API)
//   GET  test-rides/day?date=&branchId=    the day board
//   GET  test-rides/active?branchId=       live (every date) +
//                                          requests not booked
//   GET  test-rides/count?date=&branchId=  live + ridden
//   GET  {id}/test-rides                   one enquiry's
//   GET  test-rides/{id}/history
//   POST test-rides                        book
//   PUT  test-rides/reschedule             move
//   PUT  test-rides/status                 Confirmed / Ridden /
//                                          NoShow / Cancelled
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
    AppointmentSlot
}
from '../models/service-appointments.model';

import
{
    ActiveTestRide,
    BookTestRide,
    RescheduleTestRide,
    SalesTestRide,
    TestRideDay,
    TestRideStatus,
    TestRideStatusChange,
    TestRideWaiting
}
from '../models/sales-test-rides.model';


@Injectable(
{
    providedIn:'root'
})
export class SalesTestRidesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/enquiry-profiles/sales-enquiries`;


    //===========================================================
    // Normalize (the API answers camelCase)
    //===========================================================

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

    private flag(item: any, name: string): boolean
    {
        return Boolean(this.pick(item, name) ?? false);
    }

    // "10:30:00" → "10:30"
    private hm(item: any, name: string): string
    {
        return this.text(item, name).slice(0, 5);
    }

    private record(item: any, name: string): Record<string, number>
    {
        const value = this.pick(item, name) ?? {};

        const result: Record<string, number> = {};

        for (const key of Object.keys(value))
        {
            // keys may come camelCased (booked) : keep them as sent
            // and also with a capital first letter
            result[key] = Number(value[key] ?? 0);

            result[key.charAt(0).toUpperCase() + key.slice(1)] = Number(value[key] ?? 0);
        }

        return result;
    }

    ride(item: any): SalesTestRide
    {
        return {
            SalesTestRideId:this.num(item, 'SalesTestRideId'),
            SalesEnquiryId:this.num(item, 'SalesEnquiryId'),
            EnquiryNo:this.text(item, 'EnquiryNo'),
            BranchId:this.num(item, 'BranchId'),
            BranchName:this.text(item, 'BranchName'),
            RideDate:this.text(item, 'RideDate').slice(0, 10),
            SlotStart:this.hm(item, 'SlotStart'),
            SlotEnd:this.hm(item, 'SlotEnd'),
            TimeSlotId:this.optionalNum(item, 'TimeSlotId'),
            ModelId:this.optionalNum(item, 'ModelId'),
            ModelName:this.text(item, 'ModelName'),
            Status:this.text(item, 'Status') as TestRideStatus,
            StatusDate:this.optionalText(item, 'StatusDate'),
            CancelReason:this.text(item, 'CancelReason'),
            AdvisorUserId:this.num(item, 'AdvisorUserId'),
            AdvisorName:this.text(item, 'AdvisorName'),
            Note:this.text(item, 'Note'),
            RescheduleCount:this.num(item, 'RescheduleCount'),
            EnquirerName:this.text(item, 'EnquirerName'),
            EnquirerMobile:this.text(item, 'EnquirerMobile'),
            EnquiryModelName:this.text(item, 'EnquiryModelName'),
            BrandName:this.text(item, 'BrandName'),
            SecondModelName:this.text(item, 'SecondModelName'),
            InterestLevelName:this.text(item, 'InterestLevelName'),
            InterestLevelColor:this.text(item, 'InterestLevelColor'),
            EnquiryStatusName:this.text(item, 'EnquiryStatusName'),
            EnquiryStatusColor:this.text(item, 'EnquiryStatusColor'),
            CreatedDate:this.text(item, 'CreatedDate')
        };
    }

    private waiting(item: any): TestRideWaiting
    {
        return {
            SalesEnquiryId:this.num(item, 'SalesEnquiryId'),
            EnquiryNo:this.text(item, 'EnquiryNo'),
            EnquiryDate:this.text(item, 'EnquiryDate').slice(0, 10),
            EnquirerName:this.text(item, 'EnquirerName'),
            EnquirerMobile:this.text(item, 'EnquirerMobile'),
            ModelId:this.num(item, 'ModelId'),
            ModelName:this.text(item, 'ModelName'),
            BrandName:this.text(item, 'BrandName'),
            SecondModelId:this.optionalNum(item, 'SecondModelId'),
            SecondModelName:this.text(item, 'SecondModelName'),
            TestRideDate:this.optionalText(item, 'TestRideDate')?.slice(0, 10) ?? null,
            TestRideSlot:this.text(item, 'TestRideSlot'),
            SourceName:this.text(item, 'SourceName'),
            FromWebsite:this.flag(item, 'FromWebsite'),
            InterestLevelName:this.text(item, 'InterestLevelName'),
            InterestLevelColor:this.text(item, 'InterestLevelColor'),
            StatusName:this.text(item, 'StatusName'),
            StatusColor:this.text(item, 'StatusColor'),
            ExecutiveUserId:this.num(item, 'ExecutiveUserId'),
            ExecutiveName:this.text(item, 'ExecutiveName'),
            LastRide:this.text(item, 'LastRide')
        };
    }

    private slot(item: any): AppointmentSlot
    {
        return {
            Start:this.hm(item, 'Start'),
            End:this.hm(item, 'End'),
            Booked:this.num(item, 'Booked'),
            Capacity:this.num(item, 'Capacity'),
            Full:Boolean(this.pick(item, 'Full') ?? false)
        };
    }

    private day(item: any): TestRideDay
    {
        return {
            Date:this.text(item, 'Date').slice(0, 10),
            BranchId:this.num(item, 'BranchId'),
            TimeSlotId:this.optionalNum(item, 'TimeSlotId'),
            TimeSlotName:this.text(item, 'TimeSlotName'),
            IntervalMinutes:this.num(item, 'IntervalMinutes'),
            TimeFrom:this.hm(item, 'TimeFrom'),
            TimeTo:this.hm(item, 'TimeTo'),
            BreakFrom:this.hm(item, 'BreakFrom'),
            BreakTo:this.hm(item, 'BreakTo'),
            Message:this.text(item, 'Message'),
            AllowOverbook:this.pick(item, 'AllowOverbook') !== false,
            Capacity:this.num(item, 'Capacity'),
            Slots:((this.pick(item, 'Slots') ?? []) as any[]).map(x => this.slot(x)),
            Rides:((this.pick(item, 'Rides') ?? []) as any[]).map(x => this.ride(x)),
            Waiting:((this.pick(item, 'Waiting') ?? []) as any[]).map(x => this.waiting(x)),
            Counts:this.record(item, 'Counts'),
            Week:this.pick(item, 'Week') ?? {}
        };
    }


    //===========================================================
    // Read
    //===========================================================

    getDay(date: string, branchId: number, weekFrom: string = ''): Observable<TestRideDay>
    {
        let params =
            new HttpParams()
                .set('date', date)
                .set('branchId', String(branchId || 0));

        if (weekFrom)
        {
            params = params.set('weekFrom', weekFrom);
        }

        return this.http
            .get<any>(`${this.apiUrl}/test-rides/day`, { params })
            .pipe(map(response => this.day(response)));
    }

    getActive(branchId: number): Observable<ActiveTestRide[]>
    {
        const params =
            new HttpParams()
                .set('branchId', String(branchId || 0));

        return this.http
            .get<any[]>(`${this.apiUrl}/test-rides/active`, { params })
            .pipe(
                map(response =>
                    (response ?? []).map(x => ({
                        Kind:this.text(x, 'Kind') as 'Ride' | 'Request',
                        SalesTestRideId:this.num(x, 'SalesTestRideId'),
                        SalesEnquiryId:this.num(x, 'SalesEnquiryId'),
                        EnquiryNo:this.text(x, 'EnquiryNo'),
                        Date:this.text(x, 'Date').slice(0, 10),
                        SlotStart:this.hm(x, 'SlotStart'),
                        SlotEnd:this.hm(x, 'SlotEnd'),
                        AskedSlot:this.text(x, 'AskedSlot'),
                        Status:this.text(x, 'Status'),
                        SourceName:this.text(x, 'SourceName'),
                        FromWebsite:this.flag(x, 'FromWebsite'),
                        EnquirerName:this.text(x, 'EnquirerName'),
                        EnquirerMobile:this.text(x, 'EnquirerMobile'),
                        ModelName:this.text(x, 'ModelName'),
                        BrandName:this.text(x, 'BrandName'),
                        InterestLevelName:this.text(x, 'InterestLevelName'),
                        InterestLevelColor:this.text(x, 'InterestLevelColor'),
                        AdvisorName:this.text(x, 'AdvisorName'),
                        Note:this.text(x, 'Note'),
                        RescheduleCount:this.num(x, 'RescheduleCount')
                    }))));
    }

    count(date: string, branchId: number): Observable<number>
    {
        const params =
            new HttpParams()
                .set('date', date)
                .set('branchId', String(branchId || 0));

        return this.http
            .get<number>(`${this.apiUrl}/test-rides/count`, { params })
            .pipe(map(response => Number(response ?? 0)));
    }

    getByEnquiry(salesEnquiryId: number): Observable<SalesTestRide[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/${salesEnquiryId}/test-rides`)
            .pipe(map(response => (response ?? []).map(x => this.ride(x))));
    }

    getHistory(salesTestRideId: number): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/test-rides/${salesTestRideId}/history`);
    }


    //===========================================================
    // Write (Update permission of Sales Enquiries)
    //===========================================================

    book(model: BookTestRide): Observable<number>
    {
        return this.http.post<number>(`${this.apiUrl}/test-rides`, model);
    }

    reschedule(model: RescheduleTestRide): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/test-rides/reschedule`, model);
    }

    setStatus(model: TestRideStatusChange): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/test-rides/status`, model);
    }
}
