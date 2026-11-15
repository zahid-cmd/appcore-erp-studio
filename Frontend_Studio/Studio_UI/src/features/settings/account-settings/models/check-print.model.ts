//===============================================================
// Cheque printing (Check Books, 2026-11-15)
//
// A cheque is printed on the real leaf of the check book. Each of
// our bank accounts keeps its own LAYOUT : the leaf size and where
// every field sits, in mm from the top-left corner of the cheque
// (the part right of the counterfoil). Saved on the server as JSON
// (CheckPrintLayouts); edited on Check Books > Cheque Layout.
//
//   Date        8 digit boxes  D D M M Y Y Y Y
//   Payee       one line
//   Words       two lines : line 1 starts at (x1, y1), line 2 at
//               (x2, y2); both end at "right"
//   Figures     right aligned in its box
//   A/C Payee   crossing (two lines, "A/C PAYEE ONLY"), angled
//   Counterfoil the stub left of the cheque : date, payee, amount,
//               voucher no
//
// A/C Payee and Counterfoil are chosen on the print page (toggles),
// not here. The printer offset moves everything (calibration).
//
// chequeFaceHtml() draws one cheque with inline styles only, so the
// same drawing serves the print page and the editor preview.
//===============================================================

import
{
    amountInWords,
    formatMoney
}
from '../../../../shared/components/accounting/accounting.models';


export interface CheckPrintLayout
{
    v: number;

    // Leaf (mm)
    chequeW: number;
    leafH: number;
    stubW: number;

    // Printer offset (mm; + moves right / down)
    offX: number;
    offY: number;

    // Font size (pt)
    font: number;

    // Date boxes : first box (left, top), box pitch, extra gap
    // after DD and after MM
    dateX: number;
    dateY: number;
    dateBox: number;
    dateGap: number;

    // Payee
    payeeX: number;
    payeeY: number;
    payeeW: number;

    // Amount in words
    wordsX1: number;
    wordsY1: number;
    wordsX2: number;
    wordsY2: number;
    wordsRight: number;

    // Amount in figures (right aligned in its box)
    figX: number;
    figY: number;
    figW: number;

    // A/C Payee crossing
    crossX: number;
    crossY: number;
    crossW: number;
    crossAngle: number;

    // Counterfoil (mm from the stub's top-left)
    stubDateX: number;
    stubDateY: number;
    stubPayeeX: number;
    stubPayeeY: number;
    stubPayeeW: number;
    stubAmtX: number;
    stubAmtY: number;
    stubNoteX: number;
    stubNoteY: number;

    // "Taka" is printed on the leaf : leave it out of the words
    stripTaka: boolean;

    // After the figures, e.g. "/-"
    figSuffix: string;
}

// A sensible start (a common Bangladeshi leaf); every bank differs,
// so the owner moves the fields and makes a test print
export const DEFAULT_CHECK_LAYOUT:
    CheckPrintLayout =
{
    v:1,

    chequeW:158,
    leafH:89,
    stubW:45,

    offX:0,
    offY:0,

    font:11,

    dateX:112,
    dateY:8,
    dateBox:5,
    dateGap:1.5,

    payeeX:18,
    payeeY:24,
    payeeW:115,

    wordsX1:32,
    wordsY1:34,
    wordsX2:8,
    wordsY2:42,
    wordsRight:112,

    figX:118,
    figY:40,
    figW:34,

    crossX:6,
    crossY:10,
    crossW:34,
    crossAngle:-18,

    stubDateX:4,
    stubDateY:16,
    stubPayeeX:4,
    stubPayeeY:28,
    stubPayeeW:37,
    stubAmtX:4,
    stubAmtY:50,
    stubNoteX:4,
    stubNoteY:62,

    stripTaka:true,
    figSuffix:'/-'
};

// The number fields of the editor, by section
export interface CheckLayoutField
{
    key: keyof CheckPrintLayout;
    label: string;
    min: number;
    max: number;
}

export interface CheckLayoutSection
{
    title: string;
    icon: string;
    fields: CheckLayoutField[];
}

export const CHECK_LAYOUT_SECTIONS:
    CheckLayoutSection[] =
[
    {
        title:'Leaf & Printer',
        icon:'fas fa-ruler-combined',
        fields:
        [
            { key:'chequeW', label:'Cheque Width', min:60, max:300 },
            { key:'leafH', label:'Leaf Height', min:40, max:200 },
            { key:'stubW', label:'Counterfoil Width', min:0, max:120 },
            { key:'font', label:'Font Size (pt)', min:6, max:20 },
            { key:'offX', label:'Printer Offset X', min:-50, max:50 },
            { key:'offY', label:'Printer Offset Y', min:-50, max:50 }
        ]
    },
    {
        title:'Date Boxes',
        icon:'fas fa-calendar-day',
        fields:
        [
            { key:'dateX', label:'First Box X', min:0, max:300 },
            { key:'dateY', label:'Boxes Y', min:0, max:200 },
            { key:'dateBox', label:'Box Width', min:2, max:15 },
            { key:'dateGap', label:'Gap after DD / MM', min:0, max:15 }
        ]
    },
    {
        title:'Payee',
        icon:'fas fa-user',
        fields:
        [
            { key:'payeeX', label:'X', min:0, max:300 },
            { key:'payeeY', label:'Y', min:0, max:200 },
            { key:'payeeW', label:'Width', min:10, max:300 }
        ]
    },
    {
        title:'Amount in Words',
        icon:'fas fa-font',
        fields:
        [
            { key:'wordsX1', label:'Line 1 X', min:0, max:300 },
            { key:'wordsY1', label:'Line 1 Y', min:0, max:200 },
            { key:'wordsX2', label:'Line 2 X', min:0, max:300 },
            { key:'wordsY2', label:'Line 2 Y', min:0, max:200 },
            { key:'wordsRight', label:'Lines End X', min:10, max:300 }
        ]
    },
    {
        title:'Amount in Figures',
        icon:'fas fa-hashtag',
        fields:
        [
            { key:'figX', label:'X', min:0, max:300 },
            { key:'figY', label:'Y', min:0, max:200 },
            { key:'figW', label:'Width', min:10, max:120 }
        ]
    },
    {
        title:'A/C Payee Crossing',
        icon:'fas fa-slash',
        fields:
        [
            { key:'crossX', label:'X', min:0, max:300 },
            { key:'crossY', label:'Y', min:0, max:200 },
            { key:'crossW', label:'Length', min:10, max:120 },
            { key:'crossAngle', label:'Angle (deg)', min:-90, max:90 }
        ]
    },
    {
        title:'Counterfoil',
        icon:'fas fa-scissors',
        fields:
        [
            { key:'stubDateX', label:'Date X', min:0, max:120 },
            { key:'stubDateY', label:'Date Y', min:0, max:200 },
            { key:'stubPayeeX', label:'Payee X', min:0, max:120 },
            { key:'stubPayeeY', label:'Payee Y', min:0, max:200 },
            { key:'stubPayeeW', label:'Payee Width', min:10, max:120 },
            { key:'stubAmtX', label:'Amount X', min:0, max:120 },
            { key:'stubAmtY', label:'Amount Y', min:0, max:200 },
            { key:'stubNoteX', label:'Voucher No X', min:0, max:120 },
            { key:'stubNoteY', label:'Voucher No Y', min:0, max:200 }
        ]
    }
];

// The saved JSON over the defaults (missing / bad values keep the
// default)
export function parseCheckLayout(json: string | null | undefined): CheckPrintLayout
{
    const layout:
        CheckPrintLayout =
        { ...DEFAULT_CHECK_LAYOUT };

    let saved: any = null;

    try
    {
        saved = json ? JSON.parse(json) : null;
    }
    catch
    {
        saved = null;
    }

    if (!saved || typeof saved !== 'object')
    {
        return layout;
    }

    for (const key of Object.keys(DEFAULT_CHECK_LAYOUT) as (keyof CheckPrintLayout)[])
    {
        const def = DEFAULT_CHECK_LAYOUT[key];
        const value = saved[key];

        if (typeof def === 'number' && typeof value === 'number' && Number.isFinite(value))
        {
            (layout as any)[key] = value;
        }
        else if (typeof def === 'boolean' && typeof value === 'boolean')
        {
            (layout as any)[key] = value;
        }
        else if (typeof def === 'string' && typeof value === 'string')
        {
            (layout as any)[key] = value.slice(0, 10);
        }
    }

    return layout;
}


//===============================================================
// One cheque to print
//===============================================================

export interface CheckPrintItem
{
    BankAccountId: number;
    BankAccountName: string;
    CheckNo: string;
    // yyyy-MM-dd
    CheckDate: string;
    PayeeName: string;
    Amount: number;
    // Voucher no (counterfoil)
    Note: string;
    Layout: CheckPrintLayout;
    // false : this account has no saved layout (defaults used)
    LayoutSaved: boolean;
}

export interface CheckFaceOptions
{
    acPayee: boolean;
    counterfoil: boolean;
    // Leaf edge, field outlines (test print / editor)
    guides: boolean;
}

// The paper of one cheque (mm)
export function chequePaper(layout: CheckPrintLayout, counterfoil: boolean): { width: number; height: number }
{
    return {
        width:Math.max(10, Math.round(((counterfoil ? layout.stubW : 0) + layout.chequeW) * 10) / 10),
        height:Math.max(10, Math.round(layout.leafH * 10) / 10)
    };
}

function esc(value: string | number | null | undefined): string
{
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Amount in words as written on a cheque : "One Lac Twenty Thousand
// Only" ("Taka" left out when the leaf prints it)
export function chequeWords(amount: number, layout: CheckPrintLayout): string
{
    const words =
        amountInWords(amount);

    return layout.stripTaka
        ? words.replace(/^Taka\s+/i, '')
        : words;
}

export function chequeFigures(amount: number, layout: CheckPrintLayout): string
{
    return `${formatMoney(amount)}${layout.figSuffix ?? ''}`;
}

// yyyy-MM-dd -> DDMMYYYY digits ('' when no date)
function dateDigits(iso: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    return m ? `${m[3]}${m[2]}${m[1]}` : '';
}

function showDate(iso: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    if (!m)
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${m[3]}-${months[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
}

const mm =
    (value: number) =>
        `${Math.round(value * 100) / 100}mm`;

// One cheque, absolutely placed in mm (inline styles only). The
// container is the paper : chequePaper() wide and high.
export function chequeFaceHtml(item: CheckPrintItem, options: CheckFaceOptions): string
{
    const l =
        item.Layout;

    // The cheque starts right of the counterfoil when it is printed
    const left =
        (options.counterfoil ? l.stubW : 0) + l.offX;

    const top =
        l.offY;

    const font =
        `font-family:Arial, Helvetica, sans-serif;font-size:${l.font}pt;color:#000;line-height:1.15;`;

    const guide =
        options.guides
            ? 'outline:0.25mm dashed #3b82f6;outline-offset:0.4mm;'
            : '';

    const at =
        (x: number, y: number, extra = '') =>
            `position:absolute;left:${mm(left + x)};top:${mm(top + y)};${font}${extra}`;

    const parts:
        string[] =
        [];

    // Leaf edges (guides only)
    if (options.guides)
    {
        parts.push(
            `<div style="position:absolute;left:${mm(left)};top:${mm(top)};width:${mm(l.chequeW)};height:${mm(l.leafH)};border:0.3mm solid #94a3b8;box-sizing:border-box;"></div>`);

        if (options.counterfoil && l.stubW > 0)
        {
            parts.push(
                `<div style="position:absolute;left:${mm(l.offX)};top:${mm(top)};width:${mm(l.stubW)};height:${mm(l.leafH)};border:0.3mm dashed #94a3b8;border-right:none;box-sizing:border-box;"></div>`);
        }
    }

    // Date : 8 boxes D D M M Y Y Y Y
    const digits =
        dateDigits(item.CheckDate);

    for (let i = 0; i < 8; i++)
    {
        const x =
            l.dateX + i * l.dateBox + (i >= 2 ? l.dateGap : 0) + (i >= 4 ? l.dateGap : 0);

        parts.push(
            `<div style="${at(x, l.dateY, `width:${mm(l.dateBox)};text-align:center;font-weight:700;${guide}`)}">${esc(digits.charAt(i))}</div>`);
    }

    // Payee
    parts.push(
        `<div style="${at(l.payeeX, l.payeeY, `width:${mm(l.payeeW)};white-space:nowrap;overflow:hidden;font-weight:700;${guide}`)}">${esc(item.PayeeName)}</div>`);

    // Amount in words : two lines (text-indent puts line 1 at x1)
    const wordsLeft =
        Math.min(l.wordsX1, l.wordsX2);

    const lineGap =
        Math.max(3, l.wordsY2 - l.wordsY1);

    parts.push(
        `<div style="${at(wordsLeft, l.wordsY1, `width:${mm(Math.max(10, l.wordsRight - wordsLeft))};height:${mm(lineGap * 2)};overflow:hidden;line-height:${mm(lineGap)};text-indent:${mm(l.wordsX1 - wordsLeft)};${guide}`)}">${esc(chequeWords(item.Amount, l))}</div>`);

    // Amount in figures
    parts.push(
        `<div style="${at(l.figX, l.figY, `width:${mm(l.figW)};text-align:right;white-space:nowrap;font-weight:700;${guide}`)}">${esc(chequeFigures(item.Amount, l))}</div>`);

    // A/C Payee crossing
    if (options.acPayee)
    {
        parts.push(
            `<div style="${at(l.crossX, l.crossY, `width:${mm(l.crossW)};padding:0.6mm 0;border-top:0.35mm solid #000;border-bottom:0.35mm solid #000;text-align:center;font-size:${Math.max(6, l.font - 3)}pt;font-weight:700;letter-spacing:0.4pt;white-space:nowrap;transform:rotate(${l.crossAngle}deg);transform-origin:center center;`)}">A/C PAYEE ONLY</div>`);
    }

    // Counterfoil
    if (options.counterfoil && l.stubW > 0)
    {
        const stub =
            (x: number, y: number, extra = '') =>
                `position:absolute;left:${mm(l.offX + x)};top:${mm(top + y)};${font}font-size:${Math.max(6, l.font - 2)}pt;${extra}`;

        parts.push(
            `<div style="${stub(l.stubDateX, l.stubDateY, guide)}">${esc(showDate(item.CheckDate))}</div>`,
            `<div style="${stub(l.stubPayeeX, l.stubPayeeY, `width:${mm(l.stubPayeeW)};max-height:${mm(14)};overflow:hidden;${guide}`)}">${esc(item.PayeeName)}</div>`,
            `<div style="${stub(l.stubAmtX, l.stubAmtY, `font-weight:700;${guide}`)}">${esc(chequeFigures(item.Amount, l))}</div>`);

        if (item.Note)
        {
            parts.push(
                `<div style="${stub(l.stubNoteX, l.stubNoteY, guide)}">${esc(item.Note)}</div>`);
        }
    }

    // Check no (guides only : to match the leaf in hand)
    if (options.guides && item.CheckNo)
    {
        parts.push(
            `<div style="position:absolute;left:${mm(left + 2)};top:${mm(top + l.leafH - 5)};font-family:Arial, sans-serif;font-size:7pt;color:#64748b;">${esc(item.CheckNo)} · ${esc(item.BankAccountName)}</div>`);
    }

    return parts.join('');
}

// A sample cheque (editor preview, test print)
export function sampleCheque(layout: CheckPrintLayout, accountName: string, saved: boolean): CheckPrintItem
{
    const d =
        new Date();

    const pad =
        (n: number) => String(n).padStart(2, '0');

    return {
        BankAccountId:0,
        BankAccountName:accountName,
        CheckNo:'TEST',
        CheckDate:`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        PayeeName:'Sample Payee Name Limited',
        Amount:1234567.5,
        Note:'PV-01-2627-11-0001',
        Layout:layout,
        LayoutSaved:saved
    };
}

// The party's basic name for the cheque : a supplier / customer
// shows as "GRAMEEN DISTRIBUTION LIMITED - REVOO - MOTOR BIKES -
// 017..." (display name) : only the part before the first " - "
// goes on the cheque ("+ n more" of a multi-party voucher dropped)
export function basicPartyName(name: string | null | undefined): string
{
    const text =
        String(name ?? '')
            .replace(/\s*\+\s*\d+\s+more\s*$/i, '')
            .trim();

    const cut =
        text.indexOf(' - ');

    return (cut > 0 ? text.substring(0, cut) : text).trim();
}
