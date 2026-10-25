//===============================================================
// Check Reconciliation vouchers : print source (Print Engine)
//
// RRV / RRP vouchers of Check Reconciliation, printed as Receipt
// Voucher (RRV clearing), Payment Voucher (RRP clearing) or Journal
// Voucher (dishonour charges). One document on the shared voucher
// design;
// mapping : check-clearing-voucher\check-clearing-voucher.adapter.ts
//
// Always printable (posted when created); a reversed voucher
// prints with a REVERSED watermark.
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
    CheckReconciliationsService
}
from '../services/check-reconciliations.service';

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    CheckClearingPrintData,
    checkClearingModel,
    checkClearingTitle
}
from './check-clearing-voucher/check-clearing-voucher.adapter';

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

export const CHECK_CLEARING_VOUCHER_PRINT:
    PrintSourceDef<CheckClearingPrintData> =
{
    key:'check-clearing-voucher',

    title:'Voucher',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<CheckClearingPrintData>
    {
        const voucher =
            await firstValueFrom(
                injector
                    .get(CheckReconciliationsService)
                    .getVoucher(id)
            );

        return {
            voucher
        };
    },

    denyReason():
        string
    {
        return '';
    },

    fileName
    (
        data:
            CheckClearingPrintData
    ):
        string
    {
        return data.voucher.VoucherNo || checkClearingTitle(data.voucher);
    },

    documents:
    [
        {
            key:'voucher',
            title:'Voucher',
            icon:'fas fa-money-check',
            render:
                (data, kit) =>
                    voucherDocumentHtml(checkClearingModel(data, kit), kit),
            css:
                VOUCHER_DOCUMENT_CSS(),
            excel:
                (data, kit) =>
                    voucherDocumentSheet(checkClearingModel(data, kit), kit)
        }
    ]
};