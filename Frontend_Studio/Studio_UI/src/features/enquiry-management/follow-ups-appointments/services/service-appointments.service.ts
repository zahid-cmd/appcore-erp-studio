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
    CreateServiceAppointment,
    FollowUpSlot,
    OVERDUE_COLOR,
    SERVICE_APPOINTMENT_STATUSES,
    ServiceAppointmentDefaults,
    ServiceAppointmentPageQuery,
    ServiceAppointmentRow,
    ServiceAppointmentStatus,
    ServiceAppointmentWaiting,
    UpdateServiceAppointment
}
from '../models/service-appointments.model';

import
{
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';


//===============================================================
// Shared readers (PascalCase or camelCase answers)
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

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAYS =
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


// "2026-11-06" (or a DateTime) -> "2026-11-06"
export function isoDate
(
    value: unknown
):
    string
{
    const raw =
        String(value ?? '');

    return /^\d{4}-\d{2}-\d{2}/.test(raw)
        ? raw.slice(0, 10)
        : '';
}


// "2026-11-06" -> "06-Nov-2026 Fri"
export function dateLabel
(
    iso: string,
    withDay: boolean = true
):
    string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

    if (!m)
    {
        return '';
    }

    const date =
        new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

    const text =
        `${m[3]}-${MONTHS[date.getMonth()]}-${m[1]}`;

    return withDay
        ? `${text} ${DAYS[date.getDay()]}`
        : text;
}


// "14:30" -> "02:30 PM"
export function slotLabel
(
    hm: string
):
    string
{
    const m =
        /^(\d{1,2}):(\d{2})/.exec(hm ?? '');

    if (!m)
    {
        return '';
    }

    const hour =
        Number(m[1]);

    const h12 =
        hour % 12 === 0 ? 12 : hour % 12;

    return `${String(h12).padStart(2, '0')}:${m[2]} ${hour < 12 ? 'AM' : 'PM'}`;
}


// Date object -> "2026-11-06" (local)
export function toIso
(
    date: Date
):
    string
{
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


export function readSlot
(
    s: any
):
    FollowUpSlot
{
    return {
        Start:text(s, 'Start').slice(0, 5),
        End:text(s, 'End').slice(0, 5),
        Booked:num(s, 'Booked'),
        Capacity:num(s, 'Capacity'),
        Full:Boolean(pick(s, 'Full'))
    };
}


//===============================================================
// Service Appointments Service (Follow-ups & Appointments ›
// Service Appointments page : list + form)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class ServiceAppointmentsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/follow-ups-appointments/service-appointments`;


    //===========================================================
    // Readers
    //===========================================================

    normalize
    (
        item: any
    ):
        ServiceAppointmentRow
    {
        const status =
            text(item, 'Status') as ServiceAppointmentStatus;

        const option =
            SERVICE_APPOINTMENT_STATUSES.find(x => x.value === status);

        const overdue =
            Boolean(pick(item, 'IsOverdue'));

        const date =
            isoDate(pick(item, 'AppointmentDate'));

        const start =
            text(item, 'SlotStart').slice(0, 5);

        const end =
            text(item, 'SlotEnd').slice(0, 5);

        const name =
            text(item, 'EnquirerName');

        const mobile =
            text(item, 'EnquirerMobile');

        const model =
            text(item, 'ModelName');

        const reg =
            text(item, 'RegistrationNo');

        const moves =
            num(item, 'RescheduleCount');

        return {
            ServiceAppointmentId:num(item, 'ServiceAppointmentId'),
            PublicId:text(item, 'PublicId'),
            ServiceEnquiryId:num(item, 'ServiceEnquiryId'),
            EnquiryNo:text(item, 'EnquiryNo'),
            BranchId:num(item, 'BranchId'),
            BranchName:text(item, 'BranchName'),
            AppointmentDate:date,
            SlotStart:start,
            SlotEnd:end,
            TimeSlotId:pick(item, 'TimeSlotId') == null ? null : num(item, 'TimeSlotId'),
            Status:status,
            StatusDate:pick(item, 'StatusDate') ?? null,
            CancelReason:text(item, 'CancelReason'),
            AdvisorUserId:num(item, 'AdvisorUserId'),
            AdvisorName:text(item, 'AdvisorName'),
            Note:text(item, 'Note'),
            RescheduleCount:moves,
            EnquirerName:name,
            EnquirerMobile:mobile,
            ModelName:model,
            BrandName:text(item, 'BrandName'),
            RegistrationNo:reg,
            RequestSummary:text(item, 'RequestSummary'),
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
            BikeText:[model, reg].filter(x => !!x).join(' · '),
            MovedText:moves > 0 ? `${moves}×` : ''
        };
    }


    private readWaiting
    (
        w: any
    ):
        ServiceAppointmentWaiting
    {
        return {
            ServiceEnquiryId:num(w, 'ServiceEnquiryId'),
            EnquiryNo:text(w, 'EnquiryNo'),
            EnquiryDate:isoDate(pick(w, 'EnquiryDate')),
            EnquirerName:text(w, 'EnquirerName'),
            EnquirerMobile:text(w, 'EnquirerMobile'),
            ModelName:text(w, 'ModelName'),
            BrandName:text(w, 'BrandName'),
            RequestSummary:text(w, 'RequestSummary'),
            PreferredDate:isoDate(pick(w, 'PreferredDate')) || null,
            SourceName:text(w, 'SourceName'),
            FromWebsite:Boolean(pick(w, 'FromWebsite')),
            FromSchedule:Boolean(pick(w, 'FromSchedule')),
            ExecutiveUserId:num(w, 'ExecutiveUserId'),
            ExecutiveName:text(w, 'ExecutiveName'),
            LastAppointment:text(w, 'LastAppointment')
        };
    }


    //===========================================================
    // Calls
    //===========================================================

    getPaged
    (
        query: ServiceAppointmentPageQuery
    ):
        Observable<PagedResult<ServiceAppointmentRow>>
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
        Observable<ServiceAppointmentDefaults>
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
        Observable<ServiceAppointmentRow>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(
                map(r => this.normalize(r)));
    }


    // Answers the new appointment's PublicId
    create
    (
        model: CreateServiceAppointment
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
        model: UpdateServiceAppointment
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


    // The most recently deleted appointment
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
        serviceAppointmentId: number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/${serviceAppointmentId}/history`);
    }
}
