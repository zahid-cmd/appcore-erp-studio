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
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    SalesEnquiry,
    CreateSalesEnquiry,
    UpdateSalesEnquiry,
    SalesEnquiriesDefaults,
    EnquiryOption,
    EnquiryModelOption,
    EnquirerLookup,
    EnquirerHistory,
    EnquiryChipCount,
    SalesEnquiryPage,
    SalesEnquiryPageQuery
}
from '../models/sales-enquiries.model';


//===============================================================
// Sales Enquiries Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SalesEnquiriesService
{
    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/enquiry-management/enquiry-profiles/sales-enquiries`;


    //===========================================================
    // Read a value in PascalCase or camelCase
    //===========================================================

    private pick
    (
        item:
            any,
        name:
            string
    ):
        any
    {
        if
        (
            item == null
        )
        {
            return undefined;
        }

        const camel =
            name.charAt(0).toLowerCase() + name.slice(1);

        return item[name] ?? item[camel];
    }


    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(this.pick(item, name) ?? '');
    }


    private num
    (
        item:
            any,
        name:
            string
    ):
        number
    {
        return Number(this.pick(item, name) ?? 0);
    }


    private optionalNum
    (
        item:
            any,
        name:
            string
    ):
        number | null
    {
        const value =
            this.pick(item, name);

        return value == null
            ? null
            : Number(value);
    }


    private optionalText
    (
        item:
            any,
        name:
            string
    ):
        string | null
    {
        const value =
            this.pick(item, name);

        return value == null || value === ''
            ? null
            : String(value);
    }


    //===========================================================
    // Normalize
    //===========================================================

    normalize
    (
        item:
            any
    ):
        SalesEnquiry
    {
        return {
            SalesEnquiryId: this.num(item, 'SalesEnquiryId'),
            PublicId: this.text(item, 'PublicId'),
            EnquiryNo: this.text(item, 'EnquiryNo'),
            EnquiryDate: this.text(item, 'EnquiryDate'),
            BranchId: this.num(item, 'BranchId'),
            BranchName: this.text(item, 'BranchName'),
            SourceId: this.num(item, 'SourceId'),
            SourceName: this.text(item, 'SourceName'),
            StatusId: this.num(item, 'StatusId'),
            StatusName: this.text(item, 'StatusName'),
            StatusColor: this.text(item, 'StatusColor'),
            StatusStage: this.text(item, 'StatusStage'),
            InterestLevelId: this.optionalNum(item, 'InterestLevelId'),
            InterestLevelName: this.text(item, 'InterestLevelName'),
            InterestLevelColor: this.text(item, 'InterestLevelColor'),
            InterestAuto: Boolean(this.pick(item, 'InterestAuto') ?? false),
            DaysToPurchase: this.optionalNum(item, 'DaysToPurchase'),
            ExecutiveUserId: this.num(item, 'ExecutiveUserId'),
            ExecutiveName: this.text(item, 'ExecutiveName'),
            EnquiryContactId: this.num(item, 'EnquiryContactId'),
            EnquirerMobile: this.text(item, 'EnquirerMobile'),
            EnquirerName: this.text(item, 'EnquirerName'),
            AltPhone: this.text(item, 'AltPhone'),
            LocationId: this.optionalNum(item, 'LocationId'),
            LocationName: this.text(item, 'LocationName'),
            Address: this.text(item, 'Address'),
            EnquiryFor: (this.text(item, 'EnquiryFor') || 'Self') as any,
            ModelId: this.num(item, 'ModelId'),
            ModelName: this.text(item, 'ModelName'),
            BrandName: this.text(item, 'BrandName'),
            SecondModelId: this.optionalNum(item, 'SecondModelId'),
            SecondModelName: this.text(item, 'SecondModelName'),
            Quantity: this.num(item, 'Quantity') || 1,
            Budget: this.num(item, 'Budget'),
            PaymentMode: (this.text(item, 'PaymentMode') || 'Cash') as any,
            ExchangeBike: this.text(item, 'ExchangeBike'),
            ExpectedPurchaseDate: this.optionalText(item, 'ExpectedPurchaseDate'),
            PreferredColor: this.text(item, 'PreferredColor'),
            FromWebsite: Boolean(this.pick(item, 'FromWebsite') ?? false),
            TestRideDate: this.optionalText(item, 'TestRideDate'),
            TestRideSlot: this.text(item, 'TestRideSlot'),
            NextFollowUpDate: this.optionalText(item, 'NextFollowUpDate'),
            FollowUpMethodId: this.optionalNum(item, 'FollowUpMethodId'),
            FollowUpMethodName: this.text(item, 'FollowUpMethodName'),
            LastFollowUpDate: this.optionalText(item, 'LastFollowUpDate'),
            LastFollowUpNote: this.text(item, 'LastFollowUpNote'),
            LostReasonId: this.optionalNum(item, 'LostReasonId'),
            LostReasonName: this.text(item, 'LostReasonName'),
            ClosedDate: this.optionalText(item, 'ClosedDate'),
            Remarks: this.text(item, 'Remarks'),
            IsMatured: Boolean(this.pick(item, 'IsMatured') ?? false),
            MaturedDate: this.optionalText(item, 'MaturedDate'),
            SaleNo: this.text(item, 'SaleNo'),
            CustomerId: this.optionalNum(item, 'CustomerId'),
            CustomerName: this.text(item, 'CustomerName'),
            MaturityDays: this.optionalNum(item, 'MaturityDays')
        };
    }


    private option
    (
        item:
            any
    ):
        EnquiryOption
    {
        return {
            Id: this.num(item, 'Id'),
            Code: this.text(item, 'Code'),
            Name: this.text(item, 'Name'),
            ColorCode: this.text(item, 'ColorCode'),
            Stage: this.text(item, 'Stage'),
            DaysFrom: this.optionalNum(item, 'DaysFrom'),
            DaysTo: this.optionalNum(item, 'DaysTo'),
            IsDefault: Boolean(this.pick(item, 'IsDefault') ?? false),
            IsSystem: Boolean(this.pick(item, 'IsSystem') ?? false)
        };
    }


    private options
    (
        item:
            any,
        name:
            string
    ):
        EnquiryOption[]
    {
        return ((this.pick(item, name) ?? []) as any[])
            .map(x => this.option(x));
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SalesEnquiry[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(
                map(
                    response =>
                        (response ?? []).map(item => this.normalize(item))
                )
            );
    }


    //===========================================================
    // One list page (server paging) with the tab / chip counts
    //===========================================================

    getPaged
    (
        query:
            SalesEnquiryPageQuery
    ):
        Observable<SalesEnquiryPage>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                { params:toPagedParams({ ...query }) }
            )
            .pipe(
                map(
                    raw =>
                    ({
                        ...toPagedResult(raw, x => this.normalize(x)),

                        websiteCount:
                            this.num(raw, 'WebsiteCount'),

                        interests:
                            ((this.pick(raw, 'Interests') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        Key: this.text(x, 'Key'),
                                        Name: this.text(x, 'Name'),
                                        Color: this.text(x, 'Color'),
                                        Count: this.num(x, 'Count')
                                    } as EnquiryChipCount)
                                ),

                        ids:
                            ((this.pick(raw, 'Ids') ?? []) as any[])
                                .map(x => Number(x))
                    })
                )
            );
    }


    //===========================================================
    // Get All for the print report (the API checks "Print")
    //===========================================================

    getForPrint():
        Observable<SalesEnquiry[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/print`)
            .pipe(
                map(
                    response =>
                        (response ?? []).map(item => this.normalize(item))
                )
            );
    }


    //===========================================================
    // Get Defaults (yyyy-MM-dd; empty = today)
    //===========================================================

    getDefaults
    (
        enquiryDate:
            string = ''
    ):
        Observable<SalesEnquiriesDefaults>
    {
        let params =
            new HttpParams();

        if
        (
            enquiryDate
        )
        {
            params =
                params.set('enquiryDate', enquiryDate);
        }

        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                { params }
            )
            .pipe(
                map(
                    response =>
                    ({
                        NextEnquiryNo:
                            this.text(response, 'NextEnquiryNo'),

                        Sources:
                            this.options(response, 'Sources'),

                        Statuses:
                            this.options(response, 'Statuses'),

                        InterestLevels:
                            this.options(response, 'InterestLevels'),

                        FollowUpMethods:
                            this.options(response, 'FollowUpMethods'),

                        LostReasons:
                            this.options(response, 'LostReasons'),

                        Models:
                            ((this.pick(response, 'Models') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        Id: this.num(x, 'Id'),
                                        Code: this.text(x, 'Code'),
                                        Name: this.text(x, 'Name'),
                                        BrandName: this.text(x, 'BrandName')
                                    } as EnquiryModelOption)
                                ),

                        Executives:
                            this.options(response, 'Executives'),

                        Locations:
                            this.options(response, 'Locations'),

                        // Switches : missing = ON (as before)
                        PurchaseDateRequired:
                            this.pick(response, 'PurchaseDateRequired') !== false,

                        AutoInterest:
                            this.pick(response, 'AutoInterest') !== false,

                        CallNoteRequired:
                            this.pick(response, 'CallNoteRequired') !== false
                    })
                )
            );
    }


    //===========================================================
    // Enquirer lookup by mobile
    //===========================================================

    lookupEnquirer
    (
        mobile:
            string,
        excludeId:
            number = 0
    ):
        Observable<EnquirerLookup>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/enquirer`,
                {
                    params:
                        new HttpParams()
                            .set('mobile', mobile)
                            .set('excludeId', String(excludeId || 0))
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        Mobile: this.text(response, 'Mobile'),
                        EnquiryContactId: this.optionalNum(response, 'EnquiryContactId'),
                        ContactName: this.text(response, 'ContactName'),
                        AltPhone: this.text(response, 'AltPhone'),
                        LocationId: this.optionalNum(response, 'LocationId'),
                        Address: this.text(response, 'Address'),
                        CustomerId: this.optionalNum(response, 'CustomerId'),
                        CustomerCode: this.text(response, 'CustomerCode'),
                        CustomerName: this.text(response, 'CustomerName'),
                        Enquiries:
                            ((this.pick(response, 'Enquiries') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        EnquiryType: this.text(x, 'EnquiryType'),
                                        EnquiryId: this.num(x, 'EnquiryId'),
                                        EnquiryNo: this.text(x, 'EnquiryNo'),
                                        EnquiryDate: this.text(x, 'EnquiryDate'),
                                        Subject: this.text(x, 'Subject'),
                                        StatusName: this.text(x, 'StatusName'),
                                        StatusStage: this.text(x, 'StatusStage')
                                    } as EnquirerHistory)
                                )
                    })
                )
            );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    // uuid (links, address bar) or the internal id (the Test
    // Rides board opens an enquiry by its id)
    getById
    (
        id:
            number | string
    ):
        Observable<SalesEnquiry>
    {
        const path =
            /^\d+$/.test(String(id))
                ? `by-id/${id}`
                : String(id);

        return this.http
            .get<any>(`${this.apiUrl}/${path}`)
            .pipe(
                map(response => this.normalize(response))
            );
    }


    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    create
    (
        model:
            CreateSalesEnquiry
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            model
        );
    }


    update
    (
        publicId:
            string,

        model:
            UpdateSalesEnquiry
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,
            model
        );
    }


    // By the uuid
    delete
    (
        id:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }


    restore():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {}
        );
    }


    //===========================================================
    // History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }


    getEntityHistory
    (
        publicId:
            string
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${publicId}/history`
        );
    }
}
