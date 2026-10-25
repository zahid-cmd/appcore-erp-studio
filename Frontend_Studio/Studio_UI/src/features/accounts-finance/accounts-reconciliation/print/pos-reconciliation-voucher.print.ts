//===============================================================
// POS Reconciliation vouchers : print source (Print Engine)
//
// RRV of POS Reconciliation, printed as Receipt Voucher
// (settlement) or Journal Voucher (reject). One document on the
// shared voucher design;
// mapping : pos-reconciliation-voucher\pos-reconciliation-voucher.adapter.ts
//
//   /print-viewer/pos-reconciliation-voucher/<voucher id>
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
    PosReconciliationsService
}
from '../services/pos-reconciliations.service';

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    PosVoucherPrintData,
    posVoucherModel,
    posVoucherTitle
}
from './pos-reconciliation-voucher/pos-reconciliation-voucher.adapter';

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

export const POS_RECONCILIATION_VOUCHER_PRINT:
    PrintSourceDef<PosVoucherPrintData> =
{
    key:'pos-reconciliation-voucher',

    title:'Voucher',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<PosVoucherPrintData>
    {
        const voucher =
            await firstValueFrom(
                injector
                    .get(PosReconciliationsService)
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
            PosVoucherPrintData
    ):
        string
    {
        return data.voucher.VoucherNo || posVoucherTitle(data.voucher);
    },

    documents:
    [
        {
            key:'voucher',
            title:'Voucher',
            icon:'fas fa-money-bill-transfer',
            render:
                (data, kit) =>
                    voucherDocumentHtml(posVoucherModel(data, kit), kit),
            css:
                VOUCHER_DOCUMENT_CSS(),
            excel:
                (data, kit) =>
                    voucherDocumentSheet(posVoucherModel(data, kit), kit)
        }
    ]
};