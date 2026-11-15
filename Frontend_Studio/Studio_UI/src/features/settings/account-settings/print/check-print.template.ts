//===============================================================
// Cheque print (Print Engine template, 2026-11-15)
//
// One page per cheque, on the paper of the leaf (data-paper-w /
// -h : the printer gets that size, margin 0). The fields come from
// the bank account's layout (Check Books > Cheque Layout).
//
// Page toggles (print page buttons, not System Configuration) :
//   acpayee      A/C Payee crossing           default ON
//   counterfoil  print the counterfoil too     default ON
//                (the paper grows by its width)
//   guides       leaf edges + field outlines   test print only
//
// Used by :
//   Payment Voucher print   document "cheque" (its Check rows)
//   Fund Transfer print     document "cheque" (From Bank cheques)
//   check-print source      a Check Books leaf / a test print
//===============================================================

import
{
    Injector
}
from '@angular/core';

import
{
    firstValueFrom,
    of,
    catchError
}
from 'rxjs';

import
{
    PrintKit,
    PrintToggleDef
}
from '../../../../shared/print/print.models';

import
{
    CheckPrintItem,
    chequeFaceHtml,
    chequePaper,
    parseCheckLayout
}
from '../models/check-print.model';

import
{
    CheckBooksService,
    CheckPrintLayoutRow
}
from '../services/check-books.service';


export const CHEQUE_TOGGLES:
    PrintToggleDef[] =
[
    { key:'acpayee', label:'A/C Payee', on:true },
    { key:'counterfoil', label:'Counterfoil', on:true }
];

export const CHEQUE_GUIDES_TOGGLE:
    PrintToggleDef =
    { key:'guides', label:'Guides', on:true };

export const CHEQUE_PRINT_CSS = `
.chq-page { overflow: hidden; }
.chq-face { position: absolute; inset: 0; }
@media print { .chq-page { margin: 0 !important; box-shadow: none !important; } }
`;


// A cheque before its layout is known
export interface ChequeRow
{
    BankAccountId: number;
    BankAccountName?: string;
    CheckNo: string;
    // yyyy-MM-dd
    CheckDate: string;
    PayeeName: string;
    Amount: number;
    Note: string;
}

// Adds each bank account's layout (defaults when none is saved or
// the layouts cannot be read)
export async function withChequeLayouts
(
    injector:
        Injector,
    rows:
        ChequeRow[]
):
    Promise<CheckPrintItem[]>
{
    if (rows.length === 0)
    {
        return [];
    }

    const ids =
        Array.from(new Set(rows.map(r => r.BankAccountId).filter(id => id > 0)));

    const layouts:
        CheckPrintLayoutRow[] =
        ids.length === 0
            ? []
            : await firstValueFrom(
                injector
                    .get(CheckBooksService)
                    .getPrintLayouts(ids)
                    .pipe(catchError(() => of([] as CheckPrintLayoutRow[]))));

    return rows.map
    (
        row =>
        {
            const found =
                layouts.find(l => l.BankAccountId === row.BankAccountId);

            return {
                BankAccountId:row.BankAccountId,
                BankAccountName:row.BankAccountName || found?.BankAccountName || '',
                CheckNo:row.CheckNo,
                CheckDate:row.CheckDate,
                PayeeName:row.PayeeName,
                Amount:row.Amount,
                Note:row.Note,
                Layout:found ? found.Layout : parseCheckLayout(''),
                LayoutSaved:!!found?.IsSaved
            };
        }
    );
}

// The pages : one per cheque
export function chequePagesHtml
(
    items:
        CheckPrintItem[],
    kit:
        PrintKit
):
    string
{
    const on =
        (key: string, fallback: boolean) =>
            kit.toggles?.[key] ?? fallback;

    const options =
    {
        acPayee:on('acpayee', true),
        counterfoil:on('counterfoil', true),
        guides:on('guides', false)
    };

    return items
        .map
        (
            item =>
            {
                const paper =
                    chequePaper(item.Layout, options.counterfoil);

                return `<section class="pv-page chq-page" data-paper-w="${paper.width}" data-paper-h="${paper.height}">
<div class="chq-face">${chequeFaceHtml(item, options)}</div>
</section>`;
            }
        )
        .join('');
}
