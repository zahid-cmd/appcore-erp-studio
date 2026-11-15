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

//===============================================================
// Cheque (Check Books)
//===============================================================

import
{
    CHEQUE_PRINT_CSS,
    CHEQUE_TOGGLES,
    chequePagesHtml,
    withChequeLayouts
}
from '../../../settings/account-settings/print/check-print.template';

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
            number | string
    ):
        Promise<FtPrintData>
    {
        const [voucher, ledgers] =
            await Promise.all(
            [
                firstValueFrom(
                    injector
                        .get(FundTransferService)
                        .getForPrint(id)
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

        // From Bank rows paid by cheque : the cheques to print on
        // their leaves (the payee : the To accounts)
        const lines =
            voucher.Lines ?? [];

        const payee =
            Array.from(new Set(
                lines
                    .filter(line => line.Side === 'To')
                    .map(line => line.LedgerName)
                    .filter(name => !!name)))
                .join(', ');

        let cheques =
            [] as Awaited<ReturnType<typeof withChequeLayouts>>;

        try
        {
            cheques =
                await withChequeLayouts(
                    injector,
                    lines
                        .filter(line => line.Side === 'From' && line.AccountType === 'Bank' && line.Method === 'Cheque')
                        .map(line => ({
                            BankAccountId:line.AccountId,
                            BankAccountName:line.LedgerName,
                            CheckNo:line.CheckNo,
                            CheckDate:line.CheckDate || voucher.VoucherDate,
                            PayeeName:payee,
                            Amount:line.Amount,
                            Note:voucher.VoucherNo
                        })));
        }
        catch
        {
            cheques = [];
        }

        return {
            voucher,
            ledgers,
            cheques
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
        },
        {
            // On the real leaf (layout : Check Books > Cheque
            // Layout); printed on its own, not with All Documents
            key:'cheque',

            title:'Cheque',

            icon:'fas fa-money-check-dollar',

            separate:true,

            toggles:CHEQUE_TOGGLES,

            available:
                data =>
                    (data.cheques?.length ?? 0) > 0
                    &&
                    data.voucher.Status !== 'Cancelled',

            render:
                (data, kit) =>
                    chequePagesHtml(data.cheques ?? [], kit),

            css:
                CHEQUE_PRINT_CSS
        }
    ]
};