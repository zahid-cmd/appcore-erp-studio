//===============================================================
// Imports
//===============================================================

import
{
    ProductPricingType
}
from './product-pricing.model';

import
{
    environment
}
from '../../../../environments/environment';


//===============================================================
// Barcode Management : models
//
// A label belongs to one stock batch. Its barcode value is the
// product code without hyphens + "B" + the batch id
// (SP00100100002B1234), the same in the Code-128 and the QR.
// Motor Bikes print a hang-tag per bike (QR adds the chassis no).
//===============================================================

// Menu route of the page
export const BARCODE_MANAGEMENT_ROUTE =
    '/inventory-management/pricing-labels/barcode-management';


//===============================================================
// Sources : where the rows come from
//===============================================================

export type BarcodeSource =
    'pricechange' | 'purchase' | 'products' | 'stock';

export interface BarcodeSourceInfo
{
    source:BarcodeSource;
    title:string;
    icon:string;
    // History name
    history:string;
}

export const BARCODE_SOURCES:
    BarcodeSourceInfo[] =
[
    { source:'pricechange', title:'Price Change', icon:'fas fa-tags', history:'PriceChange' },
    { source:'purchase', title:'Purchase / Receiving', icon:'fas fa-truck-ramp-box', history:'Purchase' },
    { source:'products', title:'Products', icon:'fas fa-boxes-stacked', history:'Products' },
    { source:'stock', title:'Stock', icon:'fas fa-warehouse', history:'Stock' }
];

export function barcodeSource
(
    source:
        BarcodeSource
):
    BarcodeSourceInfo
{
    return BARCODE_SOURCES.find(x => x.source === source) ?? BARCODE_SOURCES[0];
}


//===============================================================
// Papers
//
// Sheets : A4 portrait, the label grid centred (gaps between the
// columns as on the common sticker sheets). Rolls : one label per
// page, the page the size of the label. Motor Bikes : hang-tags,
// 4 per A4 portrait (105 x 148.5 mm).
//===============================================================

export type LabelPaperCode =
    'A4-3x8' | 'A4-4x10' | 'A4-5x13' | 'Roll-38x25' | 'Roll-50x25' | 'Tag-A4-2x2';

export interface LabelPaper
{
    code:LabelPaperCode;
    title:string;
    // sheet : A4 sticker sheet ; roll : thermal roll ; tag : hang-tags
    kind:'sheet' | 'roll' | 'tag';
    // Page (mm)
    pageWidth:number;
    pageHeight:number;
    cols:number;
    rows:number;
    // Label (mm)
    labelWidth:number;
    labelHeight:number;
    colGap:number;
    rowGap:number;
}

export const LABEL_PAPERS:
    LabelPaper[] =
[
    { code:'A4-3x8', title:'A4 · 3 × 8 · 70 × 37 mm (24 per sheet)', kind:'sheet', pageWidth:210, pageHeight:297, cols:3, rows:8, labelWidth:70, labelHeight:37, colGap:0, rowGap:0 },
    { code:'A4-4x10', title:'A4 · 4 × 10 · 48 × 25 mm (40 per sheet)', kind:'sheet', pageWidth:210, pageHeight:297, cols:4, rows:10, labelWidth:48, labelHeight:25, colGap:2, rowGap:0 },
    { code:'A4-5x13', title:'A4 · 5 × 13 · 38 × 21 mm (65 per sheet)', kind:'sheet', pageWidth:210, pageHeight:297, cols:5, rows:13, labelWidth:38, labelHeight:21, colGap:2, rowGap:0 },
    { code:'Roll-38x25', title:'Thermal roll · 38 × 25 mm (one per label)', kind:'roll', pageWidth:38, pageHeight:25, cols:1, rows:1, labelWidth:38, labelHeight:25, colGap:0, rowGap:0 },
    { code:'Roll-50x25', title:'Thermal roll · 50 × 25 mm (one per label)', kind:'roll', pageWidth:50, pageHeight:25, cols:1, rows:1, labelWidth:50, labelHeight:25, colGap:0, rowGap:0 }
];

export const TAG_PAPER:
    LabelPaper =
    { code:'Tag-A4-2x2', title:'Hang-tag · 105 × 148.5 mm (4 per A4)', kind:'tag', pageWidth:210, pageHeight:297, cols:2, rows:2, labelWidth:105, labelHeight:148.5, colGap:0, rowGap:0 };

export function labelPaper
(
    code:
        string
):
    LabelPaper
{
    const key =
        String(code ?? '').trim().toLowerCase();

    if
    (
        key === TAG_PAPER.code.toLowerCase()
    )
    {
        return TAG_PAPER;
    }

    return LABEL_PAPERS.find(x => x.code.toLowerCase() === key) ?? LABEL_PAPERS[0];
}

export function labelsPerPage
(
    paper:
        LabelPaper
):
    number
{
    return Math.max(1, paper.cols * paper.rows);
}

// Left / top margin of the grid (centred on the page)
export function paperMargins
(
    paper:
        LabelPaper
):
    { left:number; top:number }
{
    const width =
        paper.cols * paper.labelWidth + (paper.cols - 1) * paper.colGap;

    const height =
        paper.rows * paper.labelHeight + (paper.rows - 1) * paper.rowGap;

    return {
        left:Math.max(0, (paper.pageWidth - width) / 2),
        top:Math.max(0, (paper.pageHeight - height) / 2)
    };
}

// Pages for a number of labels, the first sheet started at a
// position (1 = top left; rolls ignore it)
export function pagesNeeded
(
    paper:
        LabelPaper,
    labels:
        number,
    startAt:
        number
):
    number
{
    if
    (
        labels <= 0
    )
    {
        return 0;
    }

    const perPage =
        labelsPerPage(paper);

    const skip =
        paper.kind === 'roll'
            ? 0
            : Math.min(perPage - 1, Math.max(0, Math.floor(startAt) - 1));

    return Math.ceil((skip + labels) / perPage);
}


//===============================================================
// Label options (switches, changed per print on the page)
//===============================================================

export type BrandAs =
    'Name' | 'Logo';

export interface LabelOptions
{
    printMrp:boolean;
    mrpFormat:string;
    showName:boolean;
    showPart:boolean;
    showBrand:boolean;
    brandAs:BrandAs;
    showBatch:boolean;
    showDate:boolean;
    // Hang-tag : key / battery no of the unit
    showKey?:boolean;
    showBattery?:boolean;
    // Hang-tag design : Classic (black) / Premium (colour)
    tagStyle?:'Classic' | 'Premium';
    // Dotted cut lines with a gap round each label (plain paper,
    // hang-tags; not rolls)
    cutLines?:boolean;
    code128:boolean;
    qr:boolean;
}


//===============================================================
// API models
//===============================================================

export interface BarcodeBrand
{
    Id:number;
    Name:string;
    LogoPath:string;
}

export interface BarcodeCategory
{
    Id:number;
    Name:string;
    BrandId:number;
}

export interface BarcodeProduct
{
    Id:number;
    Code:string;
    Name:string;
    PartNumber:string;
    BrandId:number;
    CategoryId:number;
    Stock:number;
    BatchCount:number;
}

export interface BarcodeSettings
{
    PageType:string;
    Today:string;
    PrintMrp:boolean;
    MrpFormat:string;
    ShowName:boolean;
    ShowPartNumber:boolean;
    ShowBrand:boolean;
    BrandAs:BrandAs;
    ShowBatch:boolean;
    ShowDate:boolean;
    ShowCode128:boolean;
    ShowQr:boolean;
    DefaultPaper:LabelPaperCode;
    KeepHistory:boolean;
    Brands:BarcodeBrand[];
    Categories:BarcodeCategory[];
    Products:BarcodeProduct[];
}

export interface BarcodeDocument
{
    Id:number;
    No:string;
    Date:string;
    Party:string;
    // Priced batches (the ones that get labels)
    Lines:number;
    // Purchase : all received batches, priced or not
    TotalLines:number;
    Units:number;
}

export interface BarcodeRowsFilter
{
    Type:ProductPricingType;
    Source:BarcodeSource;
    Id:number;
    BrandId:number;
    CategoryId:number;
    ProductId:number;
}

export interface BarcodeRow
{
    StockBatchId:number;
    BatchNo:string;
    ProductId:number;
    Code:string;
    Name:string;
    PartNumber:string;
    BrandId:number;
    BrandName:string;
    BrandLogo:string;
    Unit:string;
    Mrp:number;
    Stock:number;
    DefaultQty:number;
    BarcodeValue:string;
    SourceNo:string;
    BatchDate:string;
    BranchName:string;
}

export interface BarcodeUnit
{
    UnitId:number;
    StockBatchId:number;
    BatchNo:string;
    ProductId:number;
    Code:string;
    Model:string;
    Color:string;
    ChassisNo:string;
    EngineNo:string;
    KeyNo:string;
    BatteryNo:string;
    BrandName:string;
    BrandLogo:string;
    Mrp:number;
    BarcodeValue:string;
    QrValue:string;
    SourceNo:string;
    StockInDate:string;
    BranchName:string;
}

export interface BarcodeHistoryLine
{
    StockBatchId:number;
    UnitId:number;
    Quantity:number;
}

export interface BarcodeHistoryInput
{
    Type:ProductPricingType;
    LabelKind:'Label' | 'HangTag';
    Paper:LabelPaperCode;
    Source:string;
    SourceId:number;
    SourceNo:string;
    StartAt:number;
    PrintMrp:boolean;
    SheetCount:number;
    Lines:BarcodeHistoryLine[];
}

export interface BarcodeHistorySaved
{
    Saved:boolean;
    RunId:number;
    Labels:number;
}


//===============================================================
// Grid row (page) : a batch (label) or a bike (hang-tag)
//===============================================================

export interface BarcodeGridRow
{
    // 'B<batch>' / 'U<unit>'
    Key:string;
    Kind:'batch' | 'unit';
    StockBatchId:number;
    UnitId:number;
    BatchNo:string;
    ProductId:number;
    Code:string;
    Name:string;
    PartNumber:string;
    BrandName:string;
    BrandLogo:string;
    Unit:string;
    Mrp:number;
    Stock:number;
    Qty:number;
    Ticked:boolean;
    BarcodeValue:string;
    QrValue:string;
    BatchDate:string;
    SourceNo:string;
    BranchName:string;
    // Hang-tag
    Color:string;
    ChassisNo:string;
    EngineNo:string;
    KeyNo:string;
    BatteryNo:string;
    // Where it came from (history)
    Source:BarcodeSource;
    SourceId:number;
}

export function gridRowOfBatch
(
    row:
        BarcodeRow,
    source:
        BarcodeSource,
    sourceId:
        number
):
    BarcodeGridRow
{
    return {
        Key:`B${row.StockBatchId}`,
        Kind:'batch',
        StockBatchId:row.StockBatchId,
        UnitId:0,
        BatchNo:row.BatchNo,
        ProductId:row.ProductId,
        Code:row.Code,
        Name:row.Name,
        PartNumber:row.PartNumber,
        BrandName:row.BrandName,
        BrandLogo:row.BrandLogo,
        Unit:row.Unit,
        Mrp:row.Mrp,
        Stock:row.Stock,
        Qty:Math.max(0, Math.floor(row.DefaultQty)),
        Ticked:row.DefaultQty > 0,
        BarcodeValue:row.BarcodeValue,
        QrValue:row.BarcodeValue,
        BatchDate:row.BatchDate,
        SourceNo:row.SourceNo,
        BranchName:row.BranchName,
        Color:'',
        ChassisNo:'',
        EngineNo:'',
        KeyNo:'',
        BatteryNo:'',
        Source:source,
        SourceId:sourceId
    };
}

export function gridRowOfUnit
(
    unit:
        BarcodeUnit,
    source:
        BarcodeSource,
    sourceId:
        number
):
    BarcodeGridRow
{
    return {
        Key:`U${unit.UnitId}`,
        Kind:'unit',
        StockBatchId:unit.StockBatchId,
        UnitId:unit.UnitId,
        BatchNo:unit.BatchNo,
        ProductId:unit.ProductId,
        Code:unit.Code,
        Name:unit.Model,
        PartNumber:'',
        BrandName:unit.BrandName,
        BrandLogo:unit.BrandLogo,
        Unit:'Pcs',
        Mrp:unit.Mrp,
        Stock:1,
        Qty:1,
        Ticked:true,
        BarcodeValue:unit.BarcodeValue,
        QrValue:unit.QrValue || unit.BarcodeValue,
        BatchDate:unit.StockInDate,
        SourceNo:unit.SourceNo,
        BranchName:unit.BranchName,
        Color:unit.Color,
        ChassisNo:unit.ChassisNo,
        EngineNo:unit.EngineNo,
        KeyNo:unit.KeyNo,
        BatteryNo:unit.BatteryNo,
        Source:source,
        SourceId:sourceId
    };
}


//===============================================================
// Helpers
//===============================================================

// 600 → "600.00"
export function formatLabelMoney
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// "MRP {0}" + 600 → "MRP 600.00" ; unpriced → "MRP —"
export function mrpText
(
    format:
        string,
    mrp:
        number
):
    string
{
    const pattern =
        String(format ?? '').trim() || 'MRP {0}';

    const text =
        pattern.includes('{0}')
            ? pattern
            : `${pattern} {0}`;

    return text.split('{0}').join(mrp > 0 ? formatLabelMoney(mrp) : '—');
}

// yyyy-MM-dd → 01-Nov-26
export function formatLabelDate
(
    iso:
        string
):
    string
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    if
    (
        !match
    )
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${match[3]}-${months[Number(match[2]) - 1] ?? match[2]}-${match[1].slice(2)}`;
}

// Brand Management image path → address (as the brand pages do)
export function brandLogoUrl
(
    path:
        string | null | undefined
):
    string
{
    const value =
        (path ?? '').trim();

    if
    (
        !value
        ||
        /^(https?:|blob:|data:)/i.test(value)
    )
    {
        return value;
    }

    const root =
        environment.apiUrl
            .replace(/\/+$/, '')
            .replace(/\/api$/i, '');

    return `${root}/${value.replace(/^\/+/, '')}`;
}
