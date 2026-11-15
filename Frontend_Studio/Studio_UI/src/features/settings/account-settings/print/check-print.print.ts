//===============================================================
// Cheque Print : print source (Print Engine, 2026-11-15)
//
//   /print-viewer/check-print/<book PublicId>_<leaf id>
//        the cheque of one issued leaf (Check Books leaf row)
//   /print-viewer/check-print/test_<bank account id>
//        a test cheque with sample values and guides, to line the
//        layout up with the real leaf (Cheque Layout > Test Print)
//
// The Payment Voucher and Fund Transfer prints have their own
// "Cheque" document (same template).
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
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    CheckPrintItem,
    basicPartyName,
    parseCheckLayout,
    sampleCheque
}
from '../models/check-print.model';

import
{
    CheckBooksService,
    CheckPrintLayoutRow
}
from '../services/check-books.service';

import
{
    CHEQUE_GUIDES_TOGGLE,
    CHEQUE_PRINT_CSS,
    CHEQUE_TOGGLES,
    chequePagesHtml,
    withChequeLayouts
}
from './check-print.template';


interface CheckPrintData
{
    title: string;
    test: boolean;
    // Why it cannot print ('' = it can)
    reason: string;
    items: CheckPrintItem[];
}


export const CHECK_PRINT:
    PrintSourceDef<CheckPrintData> =
{
    key:'check-print',

    title:'Cheque',

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<CheckPrintData>
    {
        const raw =
            String(id ?? '');

        const service =
            injector.get(CheckBooksService);

        // Test print of a bank account's layout
        if (raw.startsWith('test_'))
        {
            const accountId =
                Number(raw.substring(5)) || 0;

            const rows =
                await firstValueFrom(
                    service
                        .getPrintLayouts([accountId])
                        .pipe(catchError(() => of([] as CheckPrintLayoutRow[]))));

            const row =
                rows[0];

            return {
                title:`Test ${row?.BankAccountName ?? ''}`.trim(),
                test:true,
                reason:accountId > 0 ? '' : 'Unknown bank account.',
                items:[sampleCheque(row ? row.Layout : parseCheckLayout(''), row?.BankAccountName ?? '', !!row?.IsSaved)]
            };
        }

        // One leaf of a book
        const cut =
            raw.lastIndexOf('_');

        const publicId =
            cut > 0 ? raw.substring(0, cut) : raw;

        const leafId =
            cut > 0 ? Number(raw.substring(cut + 1)) || 0 : 0;

        const book =
            await firstValueFrom(service.getById(publicId));

        const leaf =
            book.Leaves.find(l => l.CheckBookLeafId === leafId);

        if (!leaf)
        {
            return { title:book.Code, test:false, reason:'The check leaf was not found.', items:[] };
        }

        const reason =
            leaf.Status === 'Issued'
                ? ''
                : `Check ${leaf.CheckNo} is ${leaf.Status} : only an issued check can be printed.`;

        const items =
            await withChequeLayouts(
                injector,
                [{
                    BankAccountId:book.BankAccountId,
                    BankAccountName:book.BankAccountName,
                    CheckNo:leaf.CheckNo,
                    CheckDate:leaf.IssuedDate,
                    // Payment Voucher : the party's basic name
                    PayeeName:leaf.SourceType === 'PV' ? basicPartyName(leaf.PayeeName) : leaf.PayeeName,
                    Amount:leaf.Amount,
                    Note:leaf.SourceNo
                }]);

        return {
            title:leaf.CheckNo,
            test:false,
            reason,
            items
        };
    },

    denyReason
    (
        data:
            CheckPrintData
    ):
        string
    {
        return data.reason
            || (data.items.length === 0 ? 'There is no cheque to print.' : '');
    },

    fileName
    (
        data:
            CheckPrintData
    ):
        string
    {
        return `Cheque ${data.title}`.trim();
    },

    documents:
    [
        {
            key:'cheque',

            title:'Cheque',

            icon:'fas fa-money-check-dollar',

            available:
                (data: CheckPrintData) =>
                    !data.test,

            toggles:
                CHEQUE_TOGGLES,

            render:
                (data, kit) =>
                    chequePagesHtml(data.items, kit),

            css:
                CHEQUE_PRINT_CSS
        },
        {
            key:'test',

            title:'Cheque Test Print',

            icon:'fas fa-ruler-combined',

            available:
                (data: CheckPrintData) =>
                    data.test,

            toggles:
                [...CHEQUE_TOGGLES, CHEQUE_GUIDES_TOGGLE],

            render:
                (data, kit) =>
                    chequePagesHtml(data.items, kit),

            css:
                CHEQUE_PRINT_CSS
        }
    ]
};
