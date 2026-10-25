//===============================================================
// Print Engine : models
//
// A PRINT SOURCE is a kind of record that can be printed
// (Receipt Voucher, Payment Voucher, ...). It loads the record
// by id, says whether it may print, and lists its DOCUMENTS
// (Receipt Voucher, Money Receipt, ...).
//
// A document's render() returns HTML in one of two forms:
//
//   Fixed pages : <section class="pv-page"> ... </section>
//                 (the template fills the whole page itself)
//
//   Flow        : <section class="pv-flow" data-watermark="...">
//                   <div class="pv-run-head"> repeated on every page </div>
//                   <div class="pv-body">
//                     blocks ... (a <table class="pv-split"> is
//                     split across pages, its <thead> repeated)
//                   </div>
//                   <div class="pv-end"> kept at the bottom of the
//                     last page (signatures) </div>
//                 </section>
//                 The engine cuts it into A4 pages and numbers them.
//===============================================================

import
{
    Injector
}
from '@angular/core';

import
{
    Company
}
from '../../features/settings/general-settings/models/company.model';


//===============================================================
// Excel
//===============================================================

export type ExcelStyle =
    'normal' | 'bold' | 'money' | 'boldMoney' | 'title' | 'muted';

export type ExcelCell =
    string
    | number
    | null
    | undefined
    | {
        v: string | number | null;
        s?: ExcelStyle;
    };

export interface ExcelSheet
{
    name: string;

    rows: ExcelCell[][];

    // Column widths (characters)
    columns?: number[];

    // e.g. 'A1:D1'
    merges?: string[];
}


//===============================================================
// Kit : shared pieces every template uses
//===============================================================

export interface PrintHeaderOptions
{
    // Company logo (default true)
    logo?: boolean;

    // BIN / TIN line items (default true)
    legal?: boolean;
}

// Voucher header (logo | company | QR, title ribbon, info strip)
export interface PrintVoucherHead
{
    // 'Office Copy' / 'Customer Copy' (top right); '' = none
    copy?: string;

    // 'RECEIPT VOUCHER'
    title: string;

    // 'Voucher No'
    numberLabel?: string;

    number: string;

    // Info strip under the ribbon
    meta: { label: string; value: string }[];

    // Stamp at the end of the info strip (Approved / Posted /
    // Cancelled …); '' = none
    status?: string;

    // QR text (plain text, read by any phone); '' = no QR
    qr?: string;

    // Logo / BIN-TIN (switches), default true
    logo?: boolean;

    legal?: boolean;
}

// One step of the workflow line (Created → Approved → Posted)
export interface PrintWorkflowStep
{
    label: string;

    // Date / time text
    value: string;

    // Dot colour : 'done' (blue), 'final' (green), 'cancel' (red)
    tone?: 'done' | 'final' | 'cancel';
}

export interface PrintKit
{
    // First active company (null when none is set up)
    company: Company | null;

    // Company logo (data: URL or address); '' when none
    logo: string;

    escape(value: string | number | null | undefined): string;

    money(value: number): string;

    words(value: number): string;

    // yyyy-MM-dd → 22-Oct-2026
    date(iso: string | null | undefined): string;

    // ISO date-time → 22-Oct-2026 14:05 (local)
    dateTime(value: string | null | undefined): string;

    now(): string;

    // Settings › System Configuration switches (code → enabled)
    switches: Record<string, boolean>;

    // false when the switches could not be read (defaults used)
    switchesLoaded: boolean;

    // A switch by its code; fallback when it does not exist
    isOn(code: string, fallback: boolean): boolean;

    // Company block + document title (right); status badge
    // under the title when given
    header(title: string, caption?: string, status?: string, options?: PrintHeaderOptions): string;

    // A row of signature lines
    signatures(labels: string[]): string;

    // Voucher header : copy label, logo | company | QR, title
    // ribbon with the number, info strip with the status stamp
    voucherHead(head: PrintVoucherHead): string;

    // Created → Approved → Posted line with dates
    workflow(steps: PrintWorkflowStep[]): string;

    // QR Code as inline SVG (built in, no package)
    qr(text: string): string;
}


//===============================================================
// Documents / sources
//===============================================================

export interface PrintDocumentDef<T = any>
{
    // 'voucher', 'money-receipt'
    key: string;

    title: string;

    // Font Awesome icon for the viewer
    icon: string;

    render(data: T, kit: PrintKit): string;

    // Optional : false hides the document for this record (e.g. a
    // check with no deposit slip yet). Missing = always shown.
    available?(data: T): boolean;

    // Extra CSS of this template (prefix its classes)
    css?: string;

    excel?(data: T, kit: PrintKit): ExcelSheet;
}

export interface PrintSourceDef<T = any>
{
    // URL key : /print-viewer/<key>/<id>
    key: string;

    title: string;

    load(injector: Injector, id: number): Promise<T>;

    // '' when it may print; otherwise the reason shown
    denyReason(data: T, kit: PrintKit): string;

    // Download name without extension
    fileName(data: T): string;

    documents: PrintDocumentDef<T>[];
}