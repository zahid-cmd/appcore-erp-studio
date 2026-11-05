//===============================================================
// Service Appointments Service (on the Service Enquiries API)
//   GET  appointments/day?date=&branchId=    the day board
//   GET  appointments/active?branchId=       live (every date) +
//                                            requests not booked
//   GET  appointments/count?date=&branchId=  live + arrived
//   GET  {id}/appointments                   one enquiry's
//   GET  appointments/{id}/history
//   POST appointments                        book
//   PUT  appointments/reschedule             move
//   PUT  appointments/status                 Confirmed / Arrived /
//                                            NoShow / Cancelled
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
    ActiveAppointment,
    AppointmentDay,
    AppointmentSlot,
    AppointmentStatus,
    AppointmentWaiting,
    BookServiceAppointment,
    RescheduleServiceAppointment,
    ServiceAppointment,
    ServiceAppointmentStatusChange
}
from '../models/service-appointments.model';


@Injectable(
{
    providedIn:'root'
})
export class ServiceAppointmentsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/enquiry-profiles/service-enquiries`;


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

    appointment(item: any): ServiceAppointment
    {
        return {
            ServiceAppointmentId:this.num(item, 'ServiceAppointmentId'),
            ServiceEnquiryId:this.num(item, 'ServiceEnquiryId'),
            EnquiryNo:this.text(item, 'EnquiryNo'),
            BranchId:this.num(item, 'BranchId'),
            BranchName:this.text(item, 'BranchName'),
            AppointmentDate:this.text(item, 'AppointmentDate').slice(0, 10),
            SlotStart:this.hm(item, 'SlotStart'),
            SlotEnd:this.hm(item, 'SlotEnd'),
            TimeSlotId:this.optionalNum(item, 'TimeSlotId'),
            Status:this.text(item, 'Status') as AppointmentStatus,
            StatusDate:this.optionalText(item, 'StatusDate'),
            CancelReason:this.text(item, 'CancelReason'),
            AdvisorUserId:this.num(item, 'AdvisorUserId'),
            AdvisorName:this.text(item, 'AdvisorName'),
            Note:this.text(item, 'Note'),
            RescheduleCount:this.num(item, 'RescheduleCount'),
            EnquirerName:this.text(item, 'EnquirerName'),
            EnquirerMobile:this.text(item, 'EnquirerMobile'),
            ModelName:this.text(item, 'ModelName'),
            BrandName:this.text(item, 'BrandName'),
            RegistrationNo:this.text(item, 'RegistrationNo'),
            RequestSummary:this.text(item, 'RequestSummary'),
            EnquiryStatusName:this.text(item, 'EnquiryStatusName'),
            EnquiryStatusColor:this.text(item, 'EnquiryStatusColor'),
            CreatedDate:this.text(item, 'CreatedDate')
        };
    }

    private waiting(item: any): AppointmentWaiting
    {
        return {
            ServiceEnquiryId:this.num(item, 'ServiceEnquiryId'),
            EnquiryNo:this.text(item, 'EnquiryNo'),
            EnquiryDate:this.text(item, 'EnquiryDate').slice(0, 10),
            EnquirerName:this.text(item, 'EnquirerName'),
            EnquirerMobile:this.text(item, 'EnquirerMobile'),
            ModelName:this.text(item, 'ModelName'),
            BrandName:this.text(item, 'BrandName'),
            RequestSummary:this.text(item, 'RequestSummary'),
            PreferredDate:this.optionalText(item, 'PreferredDate')?.slice(0, 10) ?? null,
            SourceName:this.text(item, 'SourceName'),
            FromWebsite:this.flag(item, 'FromWebsite'),
            FromSchedule:this.flag(item, 'FromSchedule'),
            StatusName:this.text(item, 'StatusName'),
            StatusColor:this.text(item, 'StatusColor'),
            ExecutiveUserId:this.num(item, 'ExecutiveUserId'),
            ExecutiveName:this.text(item, 'ExecutiveName'),
            LastAppointment:this.text(item, 'LastAppointment')
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

    private day(item: any): AppointmentDay
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
            Appointments:((this.pick(item, 'Appointments') ?? []) as any[]).map(x => this.appointment(x)),
            Waiting:((this.pick(item, 'Waiting') ?? []) as any[]).map(x => this.waiting(x)),
            Counts:this.record(item, 'Counts'),
            Week:this.pick(item, 'Week') ?? {}
        };
    }


    //===========================================================
    // Read
    //===========================================================

    getDay(date: string, branchId: number, weekFrom: string = ''): Observable<AppointmentDay>
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
            .get<any>(`${this.apiUrl}/appointments/day`, { params })
            .pipe(map(response => this.day(response)));
    }

    getActive(branchId: number): Observable<ActiveAppointment[]>
    {
        const params =
            new HttpParams()
                .set('branchId', String(branchId || 0));

        return this.http
            .get<any[]>(`${this.apiUrl}/appointments/active`, { params })
            .pipe(
                map(response =>
                    (response ?? []).map(x => ({
                        Kind:this.text(x, 'Kind') as 'Appointment' | 'Request',
                        ServiceAppointmentId:this.num(x, 'ServiceAppointmentId'),
                        ServiceEnquiryId:this.num(x, 'ServiceEnquiryId'),
                        EnquiryNo:this.text(x, 'EnquiryNo'),
                        Date:this.text(x, 'Date').slice(0, 10),
                        SlotStart:this.hm(x, 'SlotStart'),
                        SlotEnd:this.hm(x, 'SlotEnd'),
                        Status:this.text(x, 'Status'),
                        SourceName:this.text(x, 'SourceName'),
                        FromWebsite:this.flag(x, 'FromWebsite'),
                        FromSchedule:this.flag(x, 'FromSchedule'),
                        EnquirerName:this.text(x, 'EnquirerName'),
                        EnquirerMobile:this.text(x, 'EnquirerMobile'),
                        ModelName:this.text(x, 'ModelName'),
                        BrandName:this.text(x, 'BrandName'),
                        RequestSummary:this.text(x, 'RequestSummary'),
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
            .get<number>(`${this.apiUrl}/appointments/count`, { params })
            .pipe(map(response => Number(response ?? 0)));
    }

    getByEnquiry(serviceEnquiryId: number): Observable<ServiceAppointment[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/${serviceEnquiryId}/appointments`)
            .pipe(map(response => (response ?? []).map(x => this.appointment(x))));
    }

    getHistory(serviceAppointmentId: number): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/appointments/${serviceAppointmentId}/history`);
    }


    //===========================================================
    // Write (Update permission of Service Enquiries)
    //===========================================================

    book(model: BookServiceAppointment): Observable<number>
    {
        return this.http.post<number>(`${this.apiUrl}/appointments`, model);
    }

    reschedule(model: RescheduleServiceAppointment): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/appointments/reschedule`, model);
    }

    setStatus(model: ServiceAppointmentStatusChange): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/appointments/status`, model);
    }
}
