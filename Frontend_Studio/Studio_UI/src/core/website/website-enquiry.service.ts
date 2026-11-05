//===============================================================
// Website Enquiry Service
// --------------------------------------------------------------
// The "Enquire Now" form talks to the ERP's public API
// (anonymous) :
//   GET  api/public/website/enquiry-options  areas + showrooms
//   POST api/public/website/enquiry          saves a sales
//        enquiry (Source : Website), or adds a note to the
//        mobile's open enquiry
//   POST api/public/website/service-enquiry  books a service /
//        asks for parts (a Service Enquiry, Source : Website)
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
from '../../environments/environment';


export interface WebsiteEnquiryOption
{
    code:string;

    name:string;

    // Branch : its wing, e.g. Sales Center
    type:string;
}


export interface WebsiteEnquiryOptions
{
    locations:WebsiteEnquiryOption[];

    branches:WebsiteEnquiryOption[];
}


export interface WebsiteEnquiryRequest
{
    mobile:string;

    name:string;

    locationCode:string;

    modelCode:string;

    colour:string;

    // yyyy-MM-dd
    expectedPurchaseDate:string;

    branchCode:string;

    // '' (Cash) / 'EMI', and the calculator's choice
    paymentMode:string;

    emiNote:string;

    // Test ride request
    isTestRide:boolean;

    // yyyy-MM-dd or null
    rideDate:string | null;

    // Morning / Afternoon / Evening
    rideSlot:string;

    hasLicence:boolean | null;

    // Spam checks : must stay empty / time on the form
    website:string;

    filledMs:number;
}


// Book a service / Ask for a part
export interface WebsiteServiceEnquiryRequest
{
    // 'Service' / 'Parts'
    enquiryType:string;

    mobile:string;

    name:string;

    locationCode:string;

    branchCode:string;

    // Optional for parts
    modelCode:string;

    registrationNo:string;

    kmReading:number | null;

    // Free Service / Paid Service / Repair / Other
    serviceNeed:string;

    complaint:string;

    // yyyy-MM-dd or null
    preferredDate:string | null;

    preferredSlot:string;

    // "HH:mm" : a free slot from getServiceSlots ('' = none)
    slotStart:string;

    pickupDrop:boolean;

    parts:{ name:string; quantity:number }[];

    website:string;

    filledMs:number;
}


// A free service time of a day
export interface WebsiteServiceSlot
{
    // "HH:mm"
    start:string;

    end:string;

    // 10:30 AM
    label:string;

    // Places left
    free:number;
}


export interface WebsiteEnquiryResult
{
    enquiryNo:string;

    isExisting:boolean;

    message:string;
}


@Injectable(
{
    providedIn:'root'
})
export class WebsiteEnquiryService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/public/website`;


    private static text
    (
        item:any,
        name:string
    ):
        string
    {
        const camel =
            name.charAt(0).toLowerCase() + name.slice(1);

        return String(item?.[camel] ?? item?.[name] ?? '');
    }


    private static options
    (
        list:any
    ):
        WebsiteEnquiryOption[]
    {
        return (Array.isArray(list) ? list : [])
            .map(
                x =>
                ({
                    code:WebsiteEnquiryService.text(x, 'Code'),
                    name:WebsiteEnquiryService.text(x, 'Name'),
                    type:WebsiteEnquiryService.text(x, 'Type')
                })
            )
            .filter(x => x.code && x.name);
    }


    getOptions():
        Observable<WebsiteEnquiryOptions>
    {
        return this.http
            .get<any>(`${this.apiUrl}/enquiry-options`)
            .pipe(
                map(
                    raw =>
                    ({
                        locations:WebsiteEnquiryService.options(raw?.locations ?? raw?.Locations),
                        branches:WebsiteEnquiryService.options(raw?.branches ?? raw?.Branches)
                    })
                )
            );
    }


    // Free service times of a day at a service centre
    getServiceSlots
    (
        date:string,
        branchCode:string
    ):
        Observable<WebsiteServiceSlot[]>
    {
        return this.http
            .get<any>(`${this.apiUrl}/service-slots`, { params:{ date, branch:branchCode } })
            .pipe(
                map(
                    raw =>
                        (Array.isArray(raw) ? raw : [])
                            .map(
                                x =>
                                ({
                                    start:WebsiteEnquiryService.text(x, 'Start'),
                                    end:WebsiteEnquiryService.text(x, 'End'),
                                    label:WebsiteEnquiryService.text(x, 'Label'),
                                    free:Number(x?.free ?? x?.Free ?? 0)
                                })
                            )
                            .filter(x => x.start)
                )
            );
    }


    send
    (
        request:WebsiteEnquiryRequest
    ):
        Observable<WebsiteEnquiryResult>
    {
        return this.post('enquiry', request);
    }


    sendService
    (
        request:WebsiteServiceEnquiryRequest
    ):
        Observable<WebsiteEnquiryResult>
    {
        return this.post('service-enquiry', request);
    }


    private post
    (
        path:string,
        request:object
    ):
        Observable<WebsiteEnquiryResult>
    {
        return this.http
            .post<any>(`${this.apiUrl}/${path}`, request)
            .pipe(
                map(
                    raw =>
                    ({
                        enquiryNo:WebsiteEnquiryService.text(raw, 'EnquiryNo'),
                        isExisting:Boolean(raw?.isExisting ?? raw?.IsExisting ?? false),
                        message:WebsiteEnquiryService.text(raw, 'Message')
                    })
                )
            );
    }
}
