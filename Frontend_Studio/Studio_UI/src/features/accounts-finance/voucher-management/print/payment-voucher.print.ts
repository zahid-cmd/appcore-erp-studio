//===============================================================
// Payment Voucher : print source (Print Engine)
//
// Loads the voucher, decides who may print, and lists the two
// documents. The designs are shared by every voucher :
//
//   shared\print\templates\voucher\   office voucher (A4)
//   shared\print\templates\slip\      half-A4 slip, 2 copies
//
// This voucher only maps its data into them :
//   payment-voucher\payment-voucher.adapter.ts
//   payment-slip\payment-slip.adapter.ts
//   payment-voucher-print.helpers.ts : shared by both
//
//   voucher        PAYMENT VOUCHER : official, office use
//                  A4 pages (long vouchers continue on the next
//                  page; header and table header repeat)
//   payment-slip   PAYMENT SLIP : for the payee
//                  A4 sheet, two halves : payee + office copy
//                  "Paid to ... the sum of ... vide ... on
//                   account of ..."; receiver's + authorised
//                   signature
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
    PaymentVoucherService
}
from '../services/payment-voucher.service';

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
    PvPrintData
}
from './payment-voucher-print.helpers';

import
{
    paymentVoucherModel
}
from './payment-voucher/payment-voucher.adapter';

import
{
    paymentSlipDocument,
    paymentSlipSheet
}
from './payment-slip/payment-slip.adapter';

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

export const PAYMENT_VOUCHER_PRINT:
    PrintSourceDef<PvPrintData> =
{
    key:'payment-voucher',

    title:'Payment Voucher',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<PvPrintData>
    {
        const [voucher, ledgers] =
            await Promise.all(
            [
                firstValueFrom(
                    injector
                        .get(PaymentVoucherService)
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
    // "Payment Voucher : Allow Print On Approval" is ON
    denyReason
    (
        data:
            PvPrintData,
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
            return kit.isOn(VOUCHER_SWITCH.PV_PRINT_ON_APPROVAL, true)
                ? ''
                : 'This voucher prints once it is posted.';
        }

        return `A ${status || 'Draft'} voucher cannot be printed. Approve it first.`;
    },

    fileName
    (
        data:
            PvPrintData
    ):
        string
    {
        return data.voucher.VoucherNo || 'Payment Voucher';
    },

    documents:
    [
        {
            key:'voucher',

            title:'Payment Voucher',

            icon:'fas fa-file-invoice',

            render:
                (data, kit) =>
                    voucherDocumentHtml(paymentVoucherModel(data, kit), kit),

            css:
                VOUCHER_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    voucherDocumentSheet(paymentVoucherModel(data, kit), kit)
        },
        {
            key:'payment-slip',

            title:'Payment Slip',

            icon:'fas fa-money-check',

            render:
                (data, kit) =>
                    slipDocumentHtml(paymentSlipDocument(data, kit), kit),

            css:
                SLIP_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    slipDocumentSheet(paymentSlipSheet(data, kit), kit)
        }
    ]
};