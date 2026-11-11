//===============================================================
// Bike Deliveries (Sales Operations > Motor Bike Sales,
// hand-written page, 2026-11-10)
//
// Pending : sold bikes of posted Sales Invoices - MB waiting for
// delivery. Deliver : the bike's model PDI sheet + handover; Save
// is final (an admin may Undo with a reason). Bangla texts are
// real letters here (the service decodes them).
//===============================================================

import
{
    PdiTemplate
}
from '../../../settings/service-settings/models/pdi-templates.model';

export type BikeDeliveryStatus =
    'Pending' | 'Delivered' | 'Undone';

export interface BikeDeliveryRow
{
    Key: string;
    Status: BikeDeliveryStatus;
    SalesInvoiceLineId: number;
    InvoicePublicId: string;
    SalesInvoiceNo: string;
    InvoiceDate: string;
    CustomerName: string;
    CustomerPhone: string;
    ProductName: string;
    ModelName: string;
    ColorName: string;
    ChassisNo: string;
    EngineNo: string;
    IsElectric: boolean;
    DaysWaiting: number;
    DueAmount: number;
    PaymentTerm: string;
    DeliveryPublicId: string;
    DeliveryNo: string;
    DeliveryDate: string;
    HasPdi: boolean;
}

export interface BikeDeliveryList
{
    Rows: BikeDeliveryRow[];
    Pending: number;
    Delivered: number;
    Undone: number;
}

export interface BikeDeliveryDefaults
{
    DeliveryWithoutPdi: boolean;
    DeliveryOnSale: boolean;
    CanDeliver: boolean;
    CanUndo: boolean;
    Today: string;
}

export interface BikeDeliveryAccessory
{
    SchemeCode: string;
    SchemeName: string;
    // Additional / Promotional
    SchemeKind: string;
    ProductCode: string;
    AccessoryName: string;
    Unit: string;
    Quantity: number;
}

export interface BikeDeliveryWarrantyPart
{
    PartName: string;
    ExpiryDate: string;
    KmLimit: number | null;
    Notes: string;
}

export interface BikeDeliveryWarranty
{
    Code: string;
    PolicyCode: string;
    PolicyName: string;
    StartDate: string;
    ExpiryDate: string;
    KmLimit: number | null;
    Status: string;
    Parts: BikeDeliveryWarrantyPart[];
}

export interface BikeDeliveryBike
{
    SalesInvoiceLineId: number;
    SalesInvoiceId: number;
    InvoicePublicId: string;
    SalesInvoiceNo: string;
    InvoiceDate: string;
    BranchName: string;
    CustomerCode: string;
    CustomerName: string;
    CustomerPhone: string;
    CustomerAddress: string;
    ProductCode: string;
    ProductName: string;
    ModelName: string;
    BrandName: string;
    ColorName: string;
    ChassisNo: string;
    EngineNo: string;
    ManufactureYear: number | null;
    IsElectric: boolean;
    ImageUrl: string;
    InvoiceTotal: number;
    DueAmount: number;
    PaymentTerm: string;
    SalesPersonName: string;
}

export interface BikeDeliverySheet
{
    Bike: BikeDeliveryBike;
    Template: PdiTemplate | null;
    Accessories: BikeDeliveryAccessory[];
    Defaults: BikeDeliveryDefaults;
}

export interface BikeDeliveryAnswer
{
    SectionOrder: number;
    SectionTitle: string;
    SectionTitleBn: string;
    HasComments: boolean;
    ItemOrder: number;
    ItemText: string;
    ItemTextBn: string;
    ItemType: string;
    Unit: string;
    IsRequired: boolean;
    Answer: string;
    Remark: string;
    TechnicianComment: string;
    QcComment: string;
}

export interface BikeDelivery
{
    BikeDeliveryId: number;
    PublicId: string;
    DeliveryNo: string;
    Status: string;
    DeliveryDate: string;
    ReceivedBy: string;
    ReceiverName: string;
    ReceiverPhone: string;
    OdometerKm: number;
    Remarks: string;
    PdiTemplateCode: string;
    PdiTemplateName: string;
    SheetTitle: string;
    SheetTitleBn: string;
    FooterNote: string;
    FooterNoteBn: string;
    PdiDate: string;
    TechnicianName: string;
    ProblemsFound: string;
    PdiRemarks: string;
    UndoReason: string;
    UndoneDate: string;
    CreatedDate: string;
    Bike: BikeDeliveryBike;
    Answers: BikeDeliveryAnswer[];
    Accessories: BikeDeliveryAccessory[];
    Warranty: BikeDeliveryWarranty | null;
    CanUndo: boolean;
}

// One PDI item as the form fills it
export interface BikeDeliveryEntry
{
    SectionIndex: number;
    ItemIndex: number;
    Answer: string;
    Remark: string;
    TechnicianComment: string;
    QcComment: string;
}

export interface SaveBikeDelivery
{
    SalesInvoiceLineId: number;
    DeliveryDate: string;
    ReceivedBy: 'Customer' | 'Nominee';
    ReceiverName: string;
    ReceiverPhone: string;
    Remarks: string;
    PdiDate: string;
    TechnicianName: string;
    ProblemsFound: string;
    PdiRemarks: string;
    Answers: BikeDeliveryEntry[];
}

// The number of the bike : Motor No for electric bikes
export function bikeNoWord
(
    electric: boolean
):
    string
{
    return electric ? 'Motor No' : 'Engine No';
}
