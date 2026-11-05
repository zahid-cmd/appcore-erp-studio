//===============================================================
// Journal Voucher : print source (Print Engine)
//
// Loads the voucher, decides who may print, and lists its one
// document : JOURNAL VOUCHER (shared voucher template, A4; a
// separator row per group). Mapping :
//   journal-voucher\journal-voucher.adapter.ts
//
// Printable : Approved (switch 0022), Posted; Cancelled with a
// CANCELLED watermark. Draft is refused.
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
    JournalVoucherService
}
from '../services/journal-voucher.service';

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
    JvPrintData,
    journalVoucherModel
}
from './journal-voucher/journal-voucher.adapter';

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


//===============================================================
// Source
//===============================================================

export const JOURNAL_VOUCHER_PRINT:
    PrintSourceDef<JvPrintData> =
{
    key:'journal-voucher',

    title:'Journal Voucher',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<JvPrintData>
    {
        const voucher =
            await firstValueFrom(
                injector
                    .get(JournalVoucherService)
                    .getById(id)
            );

        return {
            voucher
        };
    },

    // Posted / Cancelled always; Approved when the switch
    // "Journal Voucher : Allow Print On Approval" is ON
    denyReason
    (
        data:
            JvPrintData,
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
            return kit.isOn(VOUCHER_SWITCH.JV_PRINT_ON_APPROVAL, true)
                ? ''
                : 'This voucher prints once it is posted.';
        }

        return `A ${status || 'Draft'} voucher cannot be printed. Approve it first.`;
    },

    fileName
    (
        data:
            JvPrintData
    ):
        string
    {
        return data.voucher.VoucherNo || 'Journal Voucher';
    },

    documents:
    [
        {
            key:'voucher',

            title:'Journal Voucher',

            icon:'fas fa-file-invoice',

            render:
                (data, kit) =>
                    voucherDocumentHtml(journalVoucherModel(data, kit), kit),

            css:
                VOUCHER_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    voucherDocumentSheet(journalVoucherModel(data, kit), kit)
        }
    ]
};