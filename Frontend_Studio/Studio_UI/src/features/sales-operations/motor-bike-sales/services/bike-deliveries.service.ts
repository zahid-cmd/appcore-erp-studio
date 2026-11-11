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
    decodeBn,
    encodeBn
}
from '../../../../core/bangla/bangla-text';

import
{
    normalizePdiTemplate
}
from '../../../settings/service-settings/services/pdi-templates.service';

import
{
    BikeDelivery,
    BikeDeliveryAccessory,
    BikeDeliveryBike,
    BikeDeliveryDefaults,
    BikeDeliveryList,
    BikeDeliveryRow,
    BikeDeliverySheet,
    BikeDeliveryStatus,
    SaveBikeDelivery
}
from '../models/bike-deliveries.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const flag =
    (x: any, name: string): boolean =>
        !!pick(x, name);

const list =
    (x: any, name: string): any[] =>
    {
        const value = pick(x, name);
        return Array.isArray(value) ? value : [];
    };

const day =
    (value: string): string =>
        String(value ?? '').slice(0, 10);

// ImagePath ('uploads/...') -> an address the browser can open
export function bikeImageUrl
(
    path: string
):
    string
{
    const value =
        (path ?? '').trim();

    if (!value || /^(https?:|blob:|data:)/i.test(value))
    {
        return value;
    }

    const root =
        environment.apiUrl
            .replace(/\/+$/, '')
            .replace(/\/api$/i, '');

    return `${root}/${value.replace(/^\/+/, '')}`;
}

function defaults(x: any): BikeDeliveryDefaults
{
    return {
        DeliveryWithoutPdi:flag(x, 'DeliveryWithoutPdi'),
        DeliveryOnSale:flag(x, 'DeliveryOnSale'),
        CanDeliver:flag(x, 'CanDeliver'),
        CanUndo:flag(x, 'CanUndo'),
        Today:day(text(x, 'Today'))
    };
}

function bike(x: any): BikeDeliveryBike
{
    const year =
        pick(x, 'ManufactureYear');

    return {
        SalesInvoiceLineId:num(x, 'SalesInvoiceLineId'),
        SalesInvoiceId:num(x, 'SalesInvoiceId'),
        InvoicePublicId:text(x, 'InvoicePublicId'),
        SalesInvoiceNo:text(x, 'SalesInvoiceNo'),
        InvoiceDate:day(text(x, 'InvoiceDate')),
        BranchName:text(x, 'BranchName'),
        CustomerCode:text(x, 'CustomerCode'),
        CustomerName:text(x, 'CustomerName'),
        CustomerPhone:text(x, 'CustomerPhone'),
        CustomerAddress:text(x, 'CustomerAddress'),
        ProductCode:text(x, 'ProductCode'),
        ProductName:text(x, 'ProductName'),
        ModelName:text(x, 'ModelName'),
        BrandName:text(x, 'BrandName'),
        ColorName:text(x, 'ColorName'),
        ChassisNo:text(x, 'ChassisNo'),
        EngineNo:text(x, 'EngineNo'),
        ManufactureYear:year == null ? null : Number(year) || null,
        IsElectric:flag(x, 'IsElectric'),
        ImageUrl:bikeImageUrl(text(x, 'ImagePath')),
        InvoiceTotal:num(x, 'InvoiceTotal'),
        DueAmount:num(x, 'DueAmount'),
        PaymentTerm:text(x, 'PaymentTerm'),
        SalesPersonName:text(x, 'SalesPersonName')
    };
}

function accessories(x: any, name: string): BikeDeliveryAccessory[]
{
    return list(x, name).map(a => ({
        SchemeCode:text(a, 'SchemeCode'),
        SchemeName:text(a, 'SchemeName'),
        SchemeKind:text(a, 'SchemeKind'),
        ProductCode:text(a, 'ProductCode'),
        AccessoryName:text(a, 'AccessoryName'),
        Unit:text(a, 'Unit'),
        Quantity:num(a, 'Quantity')
    }));
}

function row(x: any): BikeDeliveryRow
{
    return {
        Key:text(x, 'Key'),
        Status:(text(x, 'Status') || 'Pending') as BikeDeliveryStatus,
        SalesInvoiceLineId:num(x, 'SalesInvoiceLineId'),
        InvoicePublicId:text(x, 'InvoicePublicId'),
        SalesInvoiceNo:text(x, 'SalesInvoiceNo'),
        InvoiceDate:day(text(x, 'InvoiceDate')),
        CustomerName:text(x, 'CustomerName'),
        CustomerPhone:text(x, 'CustomerPhone'),
        ProductName:text(x, 'ProductName'),
        ModelName:text(x, 'ModelName'),
        ColorName:text(x, 'ColorName'),
        ChassisNo:text(x, 'ChassisNo'),
        EngineNo:text(x, 'EngineNo'),
        IsElectric:flag(x, 'IsElectric'),
        DaysWaiting:num(x, 'DaysWaiting'),
        DueAmount:num(x, 'DueAmount'),
        PaymentTerm:text(x, 'PaymentTerm'),
        DeliveryPublicId:text(x, 'DeliveryPublicId'),
        DeliveryNo:text(x, 'DeliveryNo'),
        DeliveryDate:day(text(x, 'DeliveryDate')),
        HasPdi:flag(x, 'HasPdi')
    };
}

export function normalizeBikeDelivery(x: any): BikeDelivery
{
    const w =
        pick(x, 'Warranty');

    return {
        BikeDeliveryId:num(x, 'BikeDeliveryId'),
        PublicId:text(x, 'PublicId'),
        DeliveryNo:text(x, 'DeliveryNo'),
        Status:text(x, 'Status'),
        DeliveryDate:day(text(x, 'DeliveryDate')),
        ReceivedBy:text(x, 'ReceivedBy'),
        ReceiverName:text(x, 'ReceiverName'),
        ReceiverPhone:text(x, 'ReceiverPhone'),
        OdometerKm:num(x, 'OdometerKm'),
        Remarks:decodeBn(text(x, 'Remarks')),
        PdiTemplateCode:text(x, 'PdiTemplateCode'),
        PdiTemplateName:text(x, 'PdiTemplateName'),
        SheetTitle:text(x, 'SheetTitle'),
        SheetTitleBn:decodeBn(text(x, 'SheetTitleBn')),
        FooterNote:text(x, 'FooterNote'),
        FooterNoteBn:decodeBn(text(x, 'FooterNoteBn')),
        PdiDate:day(text(x, 'PdiDate')),
        TechnicianName:text(x, 'TechnicianName'),
        ProblemsFound:decodeBn(text(x, 'ProblemsFound')),
        PdiRemarks:decodeBn(text(x, 'PdiRemarks')),
        UndoReason:text(x, 'UndoReason'),
        UndoneDate:text(x, 'UndoneDate'),
        CreatedDate:text(x, 'CreatedDate'),
        Bike:bike(pick(x, 'Bike') ?? {}),
        Answers:list(x, 'Answers').map(a => ({
            SectionOrder:num(a, 'SectionOrder'),
            SectionTitle:text(a, 'SectionTitle'),
            SectionTitleBn:decodeBn(text(a, 'SectionTitleBn')),
            HasComments:flag(a, 'HasComments'),
            ItemOrder:num(a, 'ItemOrder'),
            ItemText:text(a, 'ItemText'),
            ItemTextBn:decodeBn(text(a, 'ItemTextBn')),
            ItemType:text(a, 'ItemType'),
            Unit:text(a, 'Unit'),
            IsRequired:flag(a, 'IsRequired'),
            Answer:text(a, 'Answer'),
            Remark:decodeBn(text(a, 'Remark')),
            TechnicianComment:decodeBn(text(a, 'TechnicianComment')),
            QcComment:decodeBn(text(a, 'QcComment'))
        })),
        Accessories:accessories(x, 'Accessories'),
        Warranty:w
            ? {
                Code:text(w, 'Code'),
                PolicyCode:text(w, 'PolicyCode'),
                PolicyName:text(w, 'PolicyName'),
                StartDate:day(text(w, 'StartDate')),
                ExpiryDate:day(text(w, 'ExpiryDate')),
                KmLimit:pick(w, 'KmLimit') == null ? null : num(w, 'KmLimit'),
                Status:text(w, 'Status'),
                Parts:list(w, 'Parts').map(p => ({
                    PartName:text(p, 'PartName'),
                    ExpiryDate:day(text(p, 'ExpiryDate')),
                    KmLimit:pick(p, 'KmLimit') == null ? null : num(p, 'KmLimit'),
                    Notes:text(p, 'Notes')
                }))
            }
            : null,
        CanUndo:flag(x, 'CanUndo')
    };
}


//===============================================================
// Bike Deliveries Service :
// api/sales-operations/motor-bike-sales/bike-deliveries
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class BikeDeliveriesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/sales-operations/motor-bike-sales/bike-deliveries`;

    getDefaults():
        Observable<BikeDeliveryDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(map(defaults));
    }

    getList(tab: string, search: string):
        Observable<BikeDeliveryList>
    {
        return this.http
            .get<any>(this.apiUrl, { params:{ tab, search } })
            .pipe(
                map(x => ({
                    Rows:list(x, 'Rows').map(row),
                    Pending:num(x, 'Pending'),
                    Delivered:num(x, 'Delivered'),
                    Undone:num(x, 'Undone')
                })));
    }

    getSheet(lineId: number):
        Observable<BikeDeliverySheet>
    {
        return this.http
            .get<any>(`${this.apiUrl}/sheet/${lineId}`)
            .pipe(
                map(x => {
                    const template = pick(x, 'Template');
                    return {
                        Bike:bike(pick(x, 'Bike') ?? {}),
                        Template:template ? normalizePdiTemplate(template) : null,
                        Accessories:accessories(x, 'Accessories'),
                        Defaults:defaults(pick(x, 'Defaults') ?? {})
                    };
                }));
    }

    getById(publicId: string):
        Observable<BikeDelivery>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizeBikeDelivery));
    }

    create(body: SaveBikeDelivery):
        Observable<BikeDelivery>
    {
        // Bangla typed in the answers / comments is kept escaped
        const payload =
        {
            ...body,
            Remarks:encodeBn(body.Remarks),
            ProblemsFound:encodeBn(body.ProblemsFound),
            PdiRemarks:encodeBn(body.PdiRemarks),
            Answers:body.Answers.map(a => ({
                ...a,
                Remark:encodeBn(a.Remark),
                TechnicianComment:encodeBn(a.TechnicianComment),
                QcComment:encodeBn(a.QcComment)
            }))
        };

        return this.http
            .post<any>(this.apiUrl, payload)
            .pipe(map(normalizeBikeDelivery));
    }

    undo(publicId: string, reason: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}/undo`, { Reason:reason });
    }

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }
}
