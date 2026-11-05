//===============================================================
// Service Enquiries Service
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
    ServiceEnquiry,
    ServiceEnquiryLine,
    CreateServiceEnquiry,
    UpdateServiceEnquiry,
    ServiceEnquiriesDefaults,
    ServiceItemOption,
    ServiceModelOption,
    PartOption,
    EnquiryOption,
    EnquirerLookup,
    EnquirerHistory,
    ServiceVehicle,
    ServiceVehicleSchedule,
    SaveServiceVehicle
}
from '../models/service-enquiries.model';


@Injectable(
{
    providedIn:'root'
})

export class ServiceEnquiriesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/enquiry-profiles/service-enquiries`;


    //===========================================================
    // Read a value in PascalCase or camelCase
    //===========================================================

    private pick(item: any, name: string): any
    {
        if (item == null)
        {
            return undefined;
        }

        const camel =
            name.charAt(0).toLowerCase() + name.slice(1);

        return item[name] ?? item[camel];
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

    private list(item: any, name: string): any[]
    {
        return (this.pick(item, name) ?? []) as any[];
    }


    //===========================================================
    // Normalize
    //===========================================================

    private line(x: any): ServiceEnquiryLine
    {
        return {
            LineType: (this.text(x, 'LineType') || 'Service') as any,
            ItemKind: (this.text(x, 'ItemKind') || 'Other') as any,
            ItemId: this.optionalNum(x, 'ItemId'),
            ItemCode: this.text(x, 'ItemCode'),
            ItemName: this.text(x, 'ItemName'),
            Quantity: this.num(x, 'Quantity') || 1,
            Rate: this.num(x, 'Rate'),
            Amount: this.num(x, 'Amount'),
            Note: this.text(x, 'Note')
        };
    }

    normalize(item: any): ServiceEnquiry
    {
        return {
            ServiceEnquiryId: this.num(item, 'ServiceEnquiryId'),
            EnquiryNo: this.text(item, 'EnquiryNo'),
            EnquiryDate: this.text(item, 'EnquiryDate'),
            BranchId: this.num(item, 'BranchId'),
            BranchName: this.text(item, 'BranchName'),
            EnquiryType: (this.text(item, 'EnquiryType') || 'Service') as any,
            SourceId: this.num(item, 'SourceId'),
            SourceName: this.text(item, 'SourceName'),
            StatusId: this.num(item, 'StatusId'),
            StatusName: this.text(item, 'StatusName'),
            StatusColor: this.text(item, 'StatusColor'),
            StatusStage: this.text(item, 'StatusStage'),
            ExecutiveUserId: this.num(item, 'ExecutiveUserId'),
            ExecutiveName: this.text(item, 'ExecutiveName'),
            EnquiryContactId: this.num(item, 'EnquiryContactId'),
            EnquirerMobile: this.text(item, 'EnquirerMobile'),
            EnquirerName: this.text(item, 'EnquirerName'),
            AltPhone: this.text(item, 'AltPhone'),
            LocationId: this.optionalNum(item, 'LocationId'),
            LocationName: this.text(item, 'LocationName'),
            Address: this.text(item, 'Address'),
            ModelId: this.optionalNum(item, 'ModelId'),
            ModelName: this.text(item, 'ModelName'),
            BrandManagementId: this.optionalNum(item, 'BrandManagementId'),
            BrandName: this.text(item, 'BrandName'),
            RegistrationNo: this.text(item, 'RegistrationNo'),
            ChassisNo: this.text(item, 'ChassisNo'),
            KmReading: this.optionalNum(item, 'KmReading'),
            Complaint: this.text(item, 'Complaint'),
            PreferredDate: this.optionalText(item, 'PreferredDate'),
            PreferredSlot: this.text(item, 'PreferredSlot'),
            PickupDrop: this.flag(item, 'PickupDrop'),
            EstimatedTotal: this.num(item, 'EstimatedTotal'),
            Lines: this.list(item, 'Lines').map(x => this.line(x)),
            RequestSummary: this.text(item, 'RequestSummary'),
            NextFollowUpDate: this.optionalText(item, 'NextFollowUpDate'),
            FollowUpMethodId: this.optionalNum(item, 'FollowUpMethodId'),
            FollowUpMethodName: this.text(item, 'FollowUpMethodName'),
            LastFollowUpDate: this.optionalText(item, 'LastFollowUpDate'),
            LastFollowUpNote: this.text(item, 'LastFollowUpNote'),
            LostReasonId: this.optionalNum(item, 'LostReasonId'),
            LostReasonName: this.text(item, 'LostReasonName'),
            ClosedDate: this.optionalText(item, 'ClosedDate'),
            Remarks: this.text(item, 'Remarks'),
            FromWebsite: this.flag(item, 'FromWebsite'),
            ServiceVehicleScheduleId: this.optionalNum(item, 'ServiceVehicleScheduleId'),
            IsConverted: this.flag(item, 'IsConverted'),
            ConvertedDate: this.optionalText(item, 'ConvertedDate'),
            ConvertedDocType: this.text(item, 'ConvertedDocType'),
            ConvertedDocNo: this.text(item, 'ConvertedDocNo')
        };
    }

    private option(x: any): EnquiryOption
    {
        return {
            Id: this.num(x, 'Id'),
            Code: this.text(x, 'Code'),
            Name: this.text(x, 'Name'),
            ColorCode: this.text(x, 'ColorCode'),
            Stage: this.text(x, 'Stage'),
            IsDefault: this.flag(x, 'IsDefault'),
            IsSystem: this.flag(x, 'IsSystem')
        };
    }

    private options(item: any, name: string): EnquiryOption[]
    {
        return this.list(item, name).map(x => this.option(x));
    }


    //===========================================================
    // Read
    //===========================================================

    getAll(): Observable<ServiceEnquiry[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(map(response => (response ?? []).map(item => this.normalize(item))));
    }

    getById(id: number): Observable<ServiceEnquiry>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${id}`)
            .pipe(map(response => this.normalize(response)));
    }

    // yyyy-MM-dd; empty = today
    getDefaults(enquiryDate: string = ''): Observable<ServiceEnquiriesDefaults>
    {
        let params = new HttpParams();

        if (enquiryDate)
        {
            params = params.set('enquiryDate', enquiryDate);
        }

        return this.http
            .get<any>(`${this.apiUrl}/defaults`, { params })
            .pipe(
                map(response => ({
                    NextEnquiryNo: this.text(response, 'NextEnquiryNo'),
                    Sources: this.options(response, 'Sources'),
                    Statuses: this.options(response, 'Statuses'),
                    FollowUpMethods: this.options(response, 'FollowUpMethods'),
                    LostReasons: this.options(response, 'LostReasons'),
                    Models: this.list(response, 'Models').map(x => ({
                        Id: this.num(x, 'Id'),
                        Code: this.text(x, 'Code'),
                        Name: this.text(x, 'Name'),
                        BrandName: this.text(x, 'BrandName'),
                        BrandManagementId: this.optionalNum(x, 'BrandManagementId')
                    } as ServiceModelOption)),
                    Executives: this.options(response, 'Executives'),
                    Locations: this.options(response, 'Locations'),
                    CallNoteRequired: this.pick(response, 'CallNoteRequired') !== false,
                    ServiceItems: this.list(response, 'ServiceItems').map(x => ({
                        Kind: this.text(x, 'Kind') as any,
                        Id: this.num(x, 'Id'),
                        Code: this.text(x, 'Code'),
                        Name: this.text(x, 'Name'),
                        BrandManagementId: this.optionalNum(x, 'BrandManagementId'),
                        Rate: this.num(x, 'Rate'),
                        IsFree: this.flag(x, 'IsFree'),
                        Info: this.text(x, 'Info')
                    } as ServiceItemOption))
                }))
            );
    }

    // Spare parts + accessories with MRP and stock
    getParts(): Observable<PartOption[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/parts`)
            .pipe(
                map(response => (response ?? []).map(x => ({
                    Kind: this.text(x, 'Kind') as any,
                    Id: this.num(x, 'Id'),
                    Code: this.text(x, 'Code'),
                    PartNumber: this.text(x, 'PartNumber'),
                    Name: this.text(x, 'Name'),
                    Unit: this.text(x, 'Unit'),
                    BrandManagementId: this.optionalNum(x, 'BrandManagementId'),
                    BrandName: this.text(x, 'BrandName'),
                    Price: this.optionalNum(x, 'Price'),
                    OnHand: this.num(x, 'OnHand')
                } as PartOption)))
            );
    }

    lookupEnquirer(mobile: string, excludeId: number = 0): Observable<EnquirerLookup>
    {
        return this.http
            .get<any>(`${this.apiUrl}/enquirer`, {
                params: new HttpParams().set('mobile', mobile).set('excludeId', String(excludeId || 0))
            })
            .pipe(
                map(response => ({
                    Mobile: this.text(response, 'Mobile'),
                    EnquiryContactId: this.optionalNum(response, 'EnquiryContactId'),
                    ContactName: this.text(response, 'ContactName'),
                    AltPhone: this.text(response, 'AltPhone'),
                    LocationId: this.optionalNum(response, 'LocationId'),
                    Address: this.text(response, 'Address'),
                    CustomerId: this.optionalNum(response, 'CustomerId'),
                    CustomerCode: this.text(response, 'CustomerCode'),
                    CustomerName: this.text(response, 'CustomerName'),
                    Enquiries: this.list(response, 'Enquiries').map(x => ({
                        EnquiryType: this.text(x, 'EnquiryType'),
                        EnquiryId: this.num(x, 'EnquiryId'),
                        EnquiryNo: this.text(x, 'EnquiryNo'),
                        EnquiryDate: this.text(x, 'EnquiryDate'),
                        Subject: this.text(x, 'Subject'),
                        StatusName: this.text(x, 'StatusName'),
                        StatusStage: this.text(x, 'StatusStage')
                    } as EnquirerHistory))
                } as EnquirerLookup))
            );
    }


    //===========================================================
    // Create / Update / Delete / Restore / History
    //===========================================================

    create(model: CreateServiceEnquiry): Observable<number>
    {
        return this.http.post<number>(this.apiUrl, model);
    }

    update(model: UpdateServiceEnquiry): Observable<void>
    {
        return this.http.put<void>(this.apiUrl, model);
    }

    delete(id: number): Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    restore(): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/restore`, {});
    }

    getHistory(): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }

    getEntityHistory(id: number): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/${id}/history`);
    }



    //===========================================================
    // Sold bikes (our outlet) : service schedules
    //===========================================================

    private schedule(x: any): ServiceVehicleSchedule
    {
        return {
            ServiceVehicleScheduleId: this.num(x, 'ServiceVehicleScheduleId'),
            SequenceNo: this.num(x, 'SequenceNo'),
            ServiceType: this.text(x, 'ServiceType'),
            ServiceName: this.text(x, 'ServiceName'),
            ScheduledServiceId: this.optionalNum(x, 'ScheduledServiceId'),
            ServiceCode: this.text(x, 'ServiceCode'),
            CustomerCharge: this.num(x, 'CustomerCharge'),
            IntervalDays: this.num(x, 'IntervalDays'),
            IntervalKm: this.num(x, 'IntervalKm'),
            GraceDays: this.num(x, 'GraceDays'),
            DueDate: this.text(x, 'DueDate'),
            DueKm: this.num(x, 'DueKm'),
            LastDate: this.text(x, 'LastDate'),
            DueDateEdited: this.flag(x, 'DueDateEdited'),
            Status: this.text(x, 'Status'),
            StatusText: this.text(x, 'StatusText'),
            ServiceEnquiryId: this.optionalNum(x, 'ServiceEnquiryId'),
            EnquiryNo: this.text(x, 'EnquiryNo'),
            TakenDate: this.optionalText(x, 'TakenDate'),
            TakenKm: this.optionalNum(x, 'TakenKm'),
            TakenDocType: this.text(x, 'TakenDocType'),
            TakenDocNo: this.text(x, 'TakenDocNo'),
            Note: this.text(x, 'Note')
        };
    }

    normalizeVehicle(x: any): ServiceVehicle
    {
        return {
            ServiceVehicleId: this.num(x, 'ServiceVehicleId'),
            ChassisNo: this.text(x, 'ChassisNo'),
            EngineNo: this.text(x, 'EngineNo'),
            RegistrationNo: this.text(x, 'RegistrationNo'),
            ModelId: this.num(x, 'ModelId'),
            ModelName: this.text(x, 'ModelName'),
            BrandManagementId: this.num(x, 'BrandManagementId'),
            BrandName: this.text(x, 'BrandName'),
            ColorName: this.text(x, 'ColorName'),
            ServicePolicyId: this.optionalNum(x, 'ServicePolicyId'),
            PolicyCode: this.text(x, 'PolicyCode'),
            WarrantyYears: this.num(x, 'WarrantyYears'),
            WarrantyKm: this.num(x, 'WarrantyKm'),
            WarrantyUntil: this.optionalText(x, 'WarrantyUntil'),
            InWarranty: this.flag(x, 'InWarranty'),
            SaleDate: this.text(x, 'SaleDate'),
            SaleSource: this.text(x, 'SaleSource') || 'Manual',
            SaleDocType: this.text(x, 'SaleDocType'),
            SaleDocId: this.optionalNum(x, 'SaleDocId'),
            SaleDocNo: this.text(x, 'SaleDocNo'),
            CustomerId: this.optionalNum(x, 'CustomerId'),
            CustomerCode: this.text(x, 'CustomerCode'),
            CustomerName: this.text(x, 'CustomerName'),
            Mobile: this.text(x, 'Mobile'),
            BranchId: this.num(x, 'BranchId'),
            BranchName: this.text(x, 'BranchName'),
            LastKm: this.optionalNum(x, 'LastKm'),
            Remarks: this.text(x, 'Remarks'),
            IsActive: this.flag(x, 'IsActive'),
            TakenCount: this.num(x, 'TakenCount'),
            TotalCount: this.num(x, 'TotalCount'),
            NextServiceName: this.text(x, 'NextServiceName'),
            NextDueDate: this.optionalText(x, 'NextDueDate'),
            NextStatusText: this.text(x, 'NextStatusText'),
            NextEnquiryNo: this.text(x, 'NextEnquiryNo'),
            Schedules: this.list(x, 'Schedules').map(r => this.schedule(r))
        };
    }

    getVehicles(): Observable<ServiceVehicle[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/vehicles`)
            .pipe(map(response => (response ?? []).map(x => this.normalizeVehicle(x))));
    }

    getVehicle(id: number): Observable<ServiceVehicle>
    {
        return this.http
            .get<any>(`${this.apiUrl}/vehicles/${id}`)
            .pipe(map(response => this.normalizeVehicle(response)));
    }

    // The schedule a model gets from a sale date (yyyy-MM-dd)
    previewSchedule(modelId: number, saleDate: string): Observable<ServiceVehicleSchedule[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/vehicles/preview`, {
                params: new HttpParams().set('modelId', String(modelId)).set('saleDate', saleDate)
            })
            .pipe(map(response => (response ?? []).map(x => this.schedule(x))));
    }

    createVehicle(model: SaveServiceVehicle): Observable<number>
    {
        return this.http.post<number>(`${this.apiUrl}/vehicles`, model);
    }

    updateVehicle(model: SaveServiceVehicle): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/vehicles`, model);
    }

    deleteVehicle(id: number): Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/vehicles/${id}`);
    }

    restoreVehicle(): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/vehicles/restore`, {});
    }

    getVehicleHistory(): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/vehicles/history`);
    }
}
