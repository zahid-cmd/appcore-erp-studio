//===============================================================
// Shared SLIP print : model
//
// One half-A4 slip design (Customer / Office copies on one A4
// sheet) for : Money Receipt (RV), Payment Slip (PV), Fund
// Transfer Advice (FT). Each voucher only maps its own data into
// this model; the look lives in slip.template.ts / slip.styles.ts.
//===============================================================


// A piece of a filled-in line; muted = small grey (codes, notes)
export interface SlipPart
{
    text: string;

    muted?: boolean;
}

// One row of a "vide" table : tag (CASH / MFS …), details, amount
export interface SlipRow
{
    tag: string;

    detail: string;

    amount: number;
}

// One line of the wording : "Received with thanks from ……"
//   parts : the filled-in text
//   words : serif italic (the sum in words)
//   rows  : a small table instead of text ("vide")
export interface SlipFill
{
    label: string;

    parts?: SlipPart[];

    words?: boolean;

    rows?: SlipRow[];
}

export interface SlipPrintModel
{
    // 'MONEY RECEIPT', 'MONEY RECEIPT · CASH', 'PAYMENT SLIP' …
    title: string;

    // 'Receipt No' / 'Slip No' / 'Advice No'
    numberLabel: string;

    number: string;

    dateLabel: string;

    date: string;

    // QR text; '' = no QR
    qr: string;

    // Logo / BIN-TIN (switches)
    logo: boolean;

    legal: boolean;

    fills: SlipFill[];

    // Amount box
    amount: number;

    // Amber note beside the amount ('' = none)
    note: string;

    // 'Authorised Signature'
    signature: string;

    // Bottom left ("Branch · Printed …"); '' = hidden (switch)
    stamp: string;

    // Bottom right ('This receipt is valid …')
    footnote: string;
}

// The whole document : one A4 sheet per slip
export interface SlipDocument
{
    slips: SlipPrintModel[];

    // ['Customer Copy', 'Office Copy'] or one copy
    copies: string[];

    // 'CANCELLED' watermark; '' = none
    watermark: string;
}

// Excel sheet of the slip(s)
export interface SlipSheet
{
    name: string;

    title: string;

    // Header pairs (two per row)
    info: { label: string; value: string }[];

    // One row per mode
    rows: SlipRow[];

    // Extra rows after the modes (charges …)
    extras: SlipRow[];

    totalLabel: string;

    total: number;
}