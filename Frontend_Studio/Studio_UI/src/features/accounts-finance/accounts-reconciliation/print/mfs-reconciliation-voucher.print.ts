//===============================================================
// MFS Reconciliation vouchers : print source (Print Engine)
//
// RRV of MFS Reconciliation, printed as Receipt Voucher
// (settlement) or Journal Voucher (reject). One document on the
// shared voucher design;
// mapping : mfs-reconciliation-voucher\mfs-reconciliation-voucher.adapter.ts
//
//   /print-viewer/mfs-reconciliation-voucher/<voucher id>
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
    MfsReconciliationsService
}
from '../services/mfs-reconciliations.service';

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    MfsVoucherPrintData,
    mfsVoucherModel,
    mfsVoucherTitle
}
from './mfs-reconciliation-voucher/mfs-reconciliation-voucher.adapter';

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

export const MFS_RECONCILIATION_VOUCHER_PRINT:
    PrintSourceDef<MfsVoucherPrintData> =
{
    key:'mfs-reconciliation-voucher',

    title:'Voucher',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<MfsVoucherPrintData>
    {
        const voucher =
            await firstValueFrom(
                injector
                    .get(MfsReconciliationsService)
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
            MfsVoucherPrintData
    ):
        string
    {
        return data.voucher.VoucherNo || mfsVoucherTitle(data.voucher);
    },

    documents:
    [
        {
            key:'voucher',
            title:'Voucher',
            icon:'fas fa-money-bill-transfer',
            render:
                (data, kit) =>
                    voucherDocumentHtml(mfsVoucherModel(data, kit), kit),
            css:
                VOUCHER_DOCUMENT_CSS(),
            excel:
                (data, kit) =>
                    voucherDocumentSheet(mfsVoucherModel(data, kit), kit)
        }
    ]
};