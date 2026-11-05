//===============================================================
// Receipt Voucher : print source (Print Engine)
//
// Loads the voucher, decides who may print, and lists the two
// documents. The designs are shared by every voucher :
//
//   shared\print\templates\voucher\   office voucher (A4)
//   shared\print\templates\slip\      half-A4 slip, 2 copies
//
// This voucher only maps its data into them :
//   receipt-voucher\receipt-voucher.adapter.ts
//   money-receipt\money-receipt.adapter.ts
//   receipt-voucher-print.helpers.ts : shared by both
//
//   voucher        RECEIPT VOUCHER : official, office use
//                  A4 pages (long vouchers continue on the next
//                  page; header and table header repeat)
//   money-receipt  MONEY RECEIPT : for the customer
//                  A4 sheet, two halves : customer + office copy
//                  "Received with thanks from ... the sum of ...
//                   vide ... on account of ..."
//
// Printable : Approved, Posted; Cancelled with a CANCELLED
// watermark. Draft is refused.
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
    ReceiptVoucherService
}
from '../services/receipt-voucher.service';

import
{
    AccountingLookupService
}
from '../../../../shared/components/accounting/accounting-lookup.service';

import
{
    VoucherLedger
}
from '../../../../shared/components/accounting/accounting.models';

import
{
    VOUCHER_SWITCH
}
from '../../../../shared/components/accounting/voucher-switches';

import
{
    PrintKit,
    PrintSourceDef
}
from '../../../../shared/print/print.models';


import
{
    RvPrintData
}
from './receipt-voucher-print.helpers';

import
{
    receiptVoucherModel
}
from './receipt-voucher/receipt-voucher.adapter';

import
{
    moneyReceiptDocument,
    moneyReceiptSheet
}
from './money-receipt/money-receipt.adapter';

// Shared designs (every voucher)
import
{
    voucherDocumentHtml
}
from '../../../../shared/print/templates/voucher/voucher.template';

import
{
    VOUCHER_DOCUMENT_CSS
}
from '../../../../shared/print/templates/voucher/voucher.styles';

import
{
    voucherDocumentSheet
}
from '../../../../shared/print/templates/voucher/voucher.excel';

import
{
    slipDocumentHtml
}
from '../../../../shared/print/templates/slip/slip.template';

import
{
    SLIP_DOCUMENT_CSS
}
from '../../../../shared/print/templates/slip/slip.styles';

import
{
    slipDocumentSheet
}
from '../../../../shared/print/templates/slip/slip.excel';


//===============================================================
// Source
//===============================================================

export const RECEIPT_VOUCHER_PRINT:
    PrintSourceDef<RvPrintData> =
{
    key:'receipt-voucher',

    title:'Receipt Voucher',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<RvPrintData>
    {
        const [voucher, ledgers] =
            await Promise.all(
            [
                firstValueFrom(
                    injector
                        .get(ReceiptVoucherService)
                        .getById(id)
                ),
                firstValueFrom(
                    injector
                        .get(AccountingLookupService)
                        .getLedgers(false)
                        .pipe(
                            catchError(
                                () =>
                                    of([] as VoucherLedger[])
                            )
                        )
                )
            ]);

        return {
            voucher,
            ledgers
        };
    },

    // Posted / Cancelled always; Approved when the switch
    // "Receipt Voucher : Allow Print On Approval" is ON
    denyReason
    (
        data:
            RvPrintData,
        kit:
            PrintKit
    ):
        string
    {
        const status =
            String(data?.voucher?.Status ?? '');

        if
        (
            status === 'Posted'
            ||
            status === 'Cancelled'
        )
        {
            return '';
        }

        if
        (
            status === 'Approved'
        )
        {
            return kit.isOn(VOUCHER_SWITCH.RV_PRINT_ON_APPROVAL, true)
                ? ''
                : 'This voucher prints once it is posted.';
        }

        return `A ${status || 'Draft'} voucher cannot be printed. Approve it first.`;
    },

    fileName
    (
        data:
            RvPrintData
    ):
        string
    {
        return data.voucher.VoucherNo || 'Receipt Voucher';
    },

    documents:
    [
        {
            key:'voucher',

            title:'Receipt Voucher',

            icon:'fas fa-file-invoice',

            render:
                (data, kit) =>
                    voucherDocumentHtml(receiptVoucherModel(data, kit), kit),

            css:
                VOUCHER_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    voucherDocumentSheet(receiptVoucherModel(data, kit), kit)
        },
        {
            key:'money-receipt',

            title:'Money Receipt',

            icon:'fas fa-receipt',

            render:
                (data, kit) =>
                    slipDocumentHtml(moneyReceiptDocument(data, kit), kit),

            css:
                SLIP_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    slipDocumentSheet(moneyReceiptSheet(data, kit), kit)
        }
    ]
};