//===============================================================
// Check Books : print source (Print Engine)
//
//   /print-viewer/check-books/<book PublicId>?doc=leaf-register
//
// One document : Check Leaf Register (A4 flow, Excel). The head of
// the operational documents (logo | company | QR, title ribbon,
// info strip with the book's status), then one row per leaf :
// Check No · Status · Voucher · Payee · Amount · Date · Reason.
//===============================================================

import
{
    Injector
}
from '@angular/core';

import
{
    firstValueFrom
}
from 'rxjs';

import
{
    ExcelCell,
    ExcelSheet,
    PrintKit,
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    CheckBook,
    CheckLeafStatus,
    checkNumber
}
from '../models/check-books.model';

import
{
    CheckBooksService
}
from '../services/check-books.service';


const TITLE =
    'Check Leaf Register';

const STATUSES:
    CheckLeafStatus[] =
    ['Unused', 'Issued', 'Cancelled', 'Lost', 'Void'];


//===============================================================
// Styles (prefix clr-)
//===============================================================

const CHECK_LEAF_PRINT_CSS = `
.pv-page-inner { padding: 7mm 10mm 6mm; }

.clr-counts { display: flex; flex-wrap: wrap; gap: 1.5mm 3mm; margin: 2.5mm 0 2mm; }
.clr-count { padding: 0.6mm 2.4mm; border: 0.8px solid #cbd5e1; border-radius: 3mm; font-size: 7pt; font-weight: 700; color: #334155; }
.clr-count b { margin-left: 1mm; color: #0b2a5b; }
.clr-count.clr-unused { border-color: #86efac; color: #047857; }
.clr-count.clr-issued { border-color: #93b4f5; color: #1e3a8a; }
.clr-count.clr-bad { border-color: #fca5a5; color: #b42318; }

table.clr-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.clr-lines th { font-size: 6.3pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #475569; text-align: left;
                padding: 1.6mm 1.4mm; border-top: 1.2px solid #0f172a; border-bottom: 1px solid #0f172a; background: #f8fafc; white-space: nowrap; }
.clr-lines td { padding: 1mm 1.4mm; border-bottom: 1px solid #eef2f8; vertical-align: top; font-size: 7.8pt; overflow-wrap: anywhere; }
.clr-c { text-align: center !important; }
.clr-r { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.clr-no { color: #94a3b8; }
.clr-check { font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
.clr-status { display: inline-block; min-width: 14mm; padding: 0 1.4mm; border: 0.8px solid #cbd5e1; border-radius: 3mm; font-size: 6.4pt; font-weight: 700; text-align: center; color: #475569; }
.clr-status.clr-unused { border-color: #86efac; color: #047857; }
.clr-status.clr-issued { border-color: #93b4f5; color: #1e3a8a; }
.clr-status.clr-bad { border-color: #fca5a5; color: #b42318; }
.clr-soft { color: #64748b; }
.clr-total td { padding-top: 1.8mm; padding-bottom: 1.8mm; border-top: 1.4px solid #0f172a; border-bottom: 1.4px solid #0f172a; font-size: 8pt; font-weight: 800; color: #0f172a; }
.clr-remarks { margin-top: 2.5mm; font-size: 7.2pt; color: #475569; }
`;


//===============================================================
// Helpers
//===============================================================

function tone(status: string): string
{
    return status === 'Unused'
        ? 'clr-unused'
        : status === 'Issued'
            ? 'clr-issued'
            : 'clr-bad';
}

function count(book: CheckBook, status: CheckLeafStatus): number
{
    return book.Leaves.filter(l => l.Status === status).length;
}

function firstNo(book: CheckBook): string
{
    return checkNumber(book.Prefix, book.StartNo, 0);
}

function lastNo(book: CheckBook): string
{
    return book.LeafCount > 0 ? checkNumber(book.Prefix, book.StartNo, book.LeafCount - 1) : '';
}


//===============================================================
// Source
//===============================================================

export const CHECK_BOOKS_PRINT:
    PrintSourceDef<CheckBook> =
{
    key:'check-books',

    title:'Check Books',

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<CheckBook>
    {
        return await firstValueFrom(
            injector
                .get(CheckBooksService)
                .getById(String(id)));
    },

    denyReason
    (
        data:
            CheckBook
    ):
        string
    {
        return data.Leaves.length === 0
            ? 'This check book has no leaves to print.'
            : '';
    },

    fileName
    (
        data:
            CheckBook
    ):
        string
    {
        return `${TITLE} ${data.Code}`;
    },

    documents:
    [
        {
            key:'leaf-register',

            title:TITLE,

            icon:'fas fa-money-check',

            render:
                (data: CheckBook, kit: PrintKit) =>
                    registerHtml(data, kit),

            css:
                CHECK_LEAF_PRINT_CSS,

            excel:
                (data: CheckBook, kit: PrintKit) =>
                    registerSheet(data, kit)
        }
    ]
};


//===============================================================
// Check Leaf Register
//===============================================================

function registerHtml
(
    data:
        CheckBook,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    const range =
        `${firstNo(data)} - ${lastNo(data)}`;

    // The head of the operational documents : logo | company | QR,
    // title ribbon with the book code, info strip with the status
    const head =
        kit.voucherHead(
        {
            title:'CHECK LEAF REGISTER',
            numberLabel:'Check Book',
            number:data.Code,
            meta:
            [
                { label:'Bank Account', value:data.BankAccountName },
                ...(data.AccountNumber ? [{ label:'Account No', value:data.AccountNumber }] : []),
                ...(data.Bank ? [{ label:'Bank', value:data.Bank }] : []),
                { label:'Checks', value:`${range} (${data.LeafCount} leaves)` },
                ...(data.BookNo ? [{ label:'Book No', value:data.BookNo }] : []),
                { label:'Received', value:kit.date(data.ReceivedDate) }
            ],
            status:data.IsActive ? 'Active' : 'Inactive',
            qr:
                [
                    kit.company?.CompanyName || 'AppCore ERP',
                    TITLE,
                    data.Code,
                    data.BankAccountName,
                    range
                ]
                .filter(part => !!part)
                .join(' | ')
        });

    const counts =
        STATUSES
            .map(s => `<span class="clr-count ${tone(s)}">${e(s)}<b>${count(data, s)}</b></span>`)
            .join('');

    const money =
        (value: number) =>
            value ? kit.money(value) : '';

    const rows =
        data.Leaves
            .map
            (
                (leaf, index) =>
                    `<tr>
  <td class="clr-c clr-no">${index + 1}</td>
  <td class="clr-check">${e(leaf.CheckNo)}</td>
  <td><span class="clr-status ${tone(leaf.Status)}">${e(leaf.Status)}</span></td>
  <td>${e(leaf.SourceNo)}</td>
  <td>${e(leaf.PayeeName)}</td>
  <td class="clr-r">${money(leaf.Amount)}</td>
  <td>${e(kit.date(leaf.IssuedDate))}</td>
  <td class="clr-soft">${e(leaf.Reason)}</td>
</tr>`
            )
            .join('');

    const issuedTotal =
        data.Leaves
            .filter(l => l.Status === 'Issued')
            .reduce((t, l) => t + l.Amount, 0);

    return `<section class="pv-flow" data-watermark="${data.IsActive ? '' : 'INACTIVE'}">
<div class="pv-run-head">
${head}
</div>
<div class="pv-body">
<div class="clr-counts">${counts}</div>
<table class="pv-split clr-lines">
  <colgroup><col style="width:9mm"><col style="width:26mm"><col style="width:20mm"><col style="width:26mm"><col><col style="width:24mm"><col style="width:20mm"><col style="width:30mm"></colgroup>
  <thead><tr>
    <th class="clr-c">#</th>
    <th>Check No</th>
    <th>Status</th>
    <th>Voucher</th>
    <th>Payee</th>
    <th class="clr-r">Amount</th>
    <th>Date</th>
    <th>Reason</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="clr-total"><td colspan="5" class="clr-r">Issued · ${count(data, 'Issued')} check${count(data, 'Issued') === 1 ? '' : 's'}</td><td class="clr-r">${kit.money(issuedTotal)}</td><td colspan="2"></td></tr>
  </tfoot>
</table>
${data.Remarks ? `<div class="clr-remarks">Remarks : ${e(data.Remarks)}</div>` : ''}
</div>
<div class="pv-end">
${kit.signatures(['Prepared By', 'Checked By', 'Authorised Signature'])}
<div class="pv-printed">Printed ${e(kit.now())}</div>
</div>
</section>`;
}


//===============================================================
// Excel : one row per leaf
//===============================================================

function registerSheet
(
    data:
        CheckBook,
    kit:
        PrintKit
):
    ExcelSheet
{
    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    return {
        name:'Check Leaf Register',
        columns:[6, 18, 12, 20, 32, 14, 13, 36],
        rows:
        [
            [{ v:kit.company?.CompanyName ?? '', s:'title' }],
            [bold(`${TITLE.toUpperCase()} - ${data.Code}`)],
            [bold('Bank Account'), data.BankAccountName, null, bold('Account No'), data.AccountNumber],
            [bold('Checks'), `${firstNo(data)} - ${lastNo(data)}`, null, bold('Leaves'), data.LeafCount],
            [bold('Received'), kit.date(data.ReceivedDate), null, bold('Status'), data.IsActive ? 'Active' : 'Inactive'],
            [],
            [bold('#'), bold('Check No'), bold('Status'), bold('Voucher'), bold('Payee'), bold('Amount'), bold('Date'), bold('Reason')],
            ...data.Leaves.map((leaf, index): ExcelCell[] =>
            [
                index + 1,
                leaf.CheckNo,
                leaf.Status,
                leaf.SourceNo,
                leaf.PayeeName,
                { v:leaf.Amount || null, s:'money' },
                kit.date(leaf.IssuedDate),
                leaf.Reason
            ]),
            [],
            [null, null, null, null, bold('Issued total'), { v:data.Leaves.filter(l => l.Status === 'Issued').reduce((t, l) => t + l.Amount, 0), s:'boldMoney' }]
        ]
    };
}
