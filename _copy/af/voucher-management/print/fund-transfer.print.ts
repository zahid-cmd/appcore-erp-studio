//===============================================================
// Fund Transfer : print source (Print Engine)
//
// Loads the transfer, decides who may print, and lists the two
// documents. The designs are shared by every voucher :
//
//   shared\print\templates\voucher\   office voucher (A4)
//   shared\print\templates\slip\      half-A4 slip, 2 copies
//
// This voucher only maps its data into them :
//   fund-transfer\fund-transfer.adapter.ts
//   fund-transfer-advice\fund-transfer-advice.adapter.ts
//   fund-transfer-print.helpers.ts : shared by both
//
//   voucher   FUND TRANSFER : official, office use (A4 pages)
//   advice    FUND TRANSFER ADVICE : A4 sheet, Sender Copy +
//             Receiver Copy; "Transferred from ... to ... the
//             sum of ... vide ..."; Received By + Authorised
//
// Printable : Approved (switch 0027), Posted; Cancelled with a
// CANCELLED watermark. Draft is refused.
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
    FundTransferService
}
from '../services/fund-transfer.service';

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
    FtPrintData
}
from './fund-transfer-print.helpers';

import
{
    fundTransferModel
}
from './fund-transfer/fund-transfer.adapter';

import
{
    fundTransferAdviceDocument,
    fundTransferAdviceSheet
}
from './fund-transfer-advice/fund-transfer-advice.adapter';

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

export const FUND_TRANSFER_PRINT:
    PrintSourceDef<FtPrintData> =
{
    key:'fund-transfer',

    title:'Fund Transfer',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<FtPrintData>
    {
        const [voucher, ledgers] =
            await Promise.all(
            [
                firstValueFrom(
                    injector
                        .get(FundTransferService)
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
    // "Fund Transfer : Allow Print On Approval" is ON
    denyReason
    (
        data:
            FtPrintData,
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
            return kit.isOn(VOUCHER_SWITCH.FT_PRINT_ON_APPROVAL, true)
                ? ''
                : 'This voucher prints once it is posted.';
        }

        return `A ${status || 'Draft'} voucher cannot be printed. Approve it first.`;
    },

    fileName
    (
        data:
            FtPrintData
    ):
        string
    {
        return data.voucher.VoucherNo || 'Fund Transfer';
    },

    documents:
    [
        {
            key:'voucher',

            title:'Fund Transfer',

            icon:'fas fa-file-invoice',

            render:
                (data, kit) =>
                    voucherDocumentHtml(fundTransferModel(data, kit), kit),

            css:
                VOUCHER_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    voucherDocumentSheet(fundTransferModel(data, kit), kit)
        },
        {
            key:'advice',

            title:'Fund Transfer Advice',

            icon:'fas fa-right-left',

            render:
                (data, kit) =>
                    slipDocumentHtml(fundTransferAdviceDocument(data, kit), kit),

            css:
                SLIP_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    slipDocumentSheet(fundTransferAdviceSheet(data, kit), kit)
        }
    ]
};