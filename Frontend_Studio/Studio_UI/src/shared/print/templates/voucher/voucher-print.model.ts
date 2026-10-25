//===============================================================
// Shared VOUCHER print : model
//
// One office-copy design (A4 pages) for every voucher : Receipt,
// Payment, Journal, Fund Transfer. Each voucher only maps its
// own data into this model (its "adapter"); the look lives in
// voucher.template.ts / voucher.styles.ts.
//===============================================================

import
{
    PrintWorkflowStep
}
from '../../print.models';


// One Dr / Cr row of the table
export interface VoucherPrintLine
{
    name: string;

    code: string;

    // Second line under the name (mode details, sub group …)
    details: string;

    notes: string;

    debit: number;

    credit: number;

    // Added by the system (charges …) : italic, no SL
    system: boolean;

    // Optional group label (Journal Voucher : "Group 1 · Tk 5,000.00");
    // a separator row is printed where it changes
    group?: string;
}

// A note under the narration
export interface VoucherPrintNote
{
    text: string;

    // warn (amber, default) / danger (red)
    tone?: 'warn' | 'danger';
}

export interface VoucherPrintModel
{
    //-----------------------------------------------------------
    // Header (kit.voucherHead)
    //-----------------------------------------------------------

    // 'Receipt Voucher'
    title: string;

    // 'Office Copy'; '' = none
    copy: string;

    // 'Voucher No'
    numberLabel: string;

    number: string;

    // Info strip under the title ribbon
    meta: { label: string; value: string }[];

    // Approved / Posted / Cancelled (stamp)
    status: string;

    // QR text; '' = no QR
    qr: string;

    // Logo / BIN-TIN (switches)
    logo: boolean;

    legal: boolean;

    //-----------------------------------------------------------
    // Body
    //-----------------------------------------------------------

    // 'Total Received', 'Total Paid' …
    totalLabel: string;

    // Amount of the bar (normally the debit total)
    total: number;

    lines: VoucherPrintLine[];

    // Show "· CODE" after each ledger name (switch)
    showCodes: boolean;

    narration: string;

    notes: VoucherPrintNote[];

    // Created → Approved → Posted; [] = hidden (switch)
    workflow: PrintWorkflowStep[];

    signatures: string[];

    // Bottom line of the last page ("Branch · Printed …");
    // '' = hidden (switch)
    stamp: string;

    // 'CANCELLED' watermark; '' = none
    watermark: string;

    //-----------------------------------------------------------
    // Excel
    //-----------------------------------------------------------

    // Sheet tab name
    sheetName: string;

    // Header pairs of the sheet (two per row)
    sheetInfo: { label: string; value: string }[];
}