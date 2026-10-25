//===============================================================
// POS documents : print source (Print Engine)
//
// Every document of one card (POS) receipt, from the POS Reconciliation
// list (Print Preview) :
//
//   /print-viewer/pos-received/<payment id>
//
// Documents (only those that exist are offered; All Documents
// prints them together) :
//   Receipt Voucher        the source voucher
//   Settlement Voucher     Receipt Voucher (RRV)
//   Reject Voucher         Journal Voucher (RRV)
//
// The designs are the existing ones; this file only collects the
// data and hands each part to its own template.
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
    PosReconciliations
}
from '../models/pos-reconciliations.model';

import
{
    PosReconciliationsService
}
from '../services/pos-reconciliations.service';

import
{
    PrintDocumentDef,
    PrintSourceDef
}
from '../../../../shared/print/print.models';

// Settlement / reject voucher (RRV)
import
{
    PosVoucherPrintData,
    posVoucherModel
}
from './pos-reconciliation-voucher/pos-reconciliation-voucher.adapter';

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

// Source voucher (its own print source)
import
{
    RECEIPT_VOUCHER_PRINT
}
from '../../voucher-management/print/receipt-voucher.print';


//===============================================================
// Data
//===============================================================

export interface PosDocumentsData
{
    txn:
        PosReconciliations;

    // Receipt Voucher data
    source:
        any;

    settlement:
        PosVoucherPrintData | null;

    reject:
        PosVoucherPrintData | null;
}

// A missing optional document must not stop the others
async function optional<T>
(
    load:
        () => Promise<T>
):
    Promise<T | null>
{
    try
    {
        return await load();
    }
    catch (error)
    {
        console.error('POS documents : optional document failed', error);

        return null;
    }
}

// The voucher document of the Receipt Voucher (not the money
// receipt)
const receiptVoucherDoc:
    PrintDocumentDef =
    RECEIPT_VOUCHER_PRINT.documents.find(doc => doc.key === 'voucher')
    ?? RECEIPT_VOUCHER_PRINT.documents[0];

function posVoucherDoc
(
    pick:
        (data: PosDocumentsData) => PosVoucherPrintData | null,
    key:
        string,
    title:
        string,
    icon:
        string
):
    PrintDocumentDef<PosDocumentsData>
{
    return {
        key,

        title,

        icon,

        available:
            data =>
                !!pick(data),

        render:
            (data, kit) =>
                voucherDocumentHtml(posVoucherModel(pick(data)!, kit), kit),

        css:
            VOUCHER_DOCUMENT_CSS(),

        excel:
            (data, kit) =>
                voucherDocumentSheet(posVoucherModel(pick(data)!, kit), kit)
    };
}


//===============================================================
// Source
//===============================================================

export const POS_RECEIVED_PRINT:
    PrintSourceDef<PosDocumentsData> =
{
    key:'pos-received',

    title:'Card Receipt',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<PosDocumentsData>
    {
        const service =
            injector.get(PosReconciliationsService);

        const txns =
            await firstValueFrom(service.getAll());

        const txn =
            (txns ?? []).find(item => Number(item.PaymentId) === id);

        if
        (
            !txn
        )
        {
            throw new Error('The card receipt was not found.');
        }

        const [source, settlement, reject] =
            await Promise.all(
            [
                optional(() => RECEIPT_VOUCHER_PRINT.load(injector, txn.SourceVoucherId)),

                txn.SettlementVoucherId
                    ? optional(async () => ({ voucher:await firstValueFrom(service.getVoucher(txn.SettlementVoucherId!)) }))
                    : Promise.resolve(null),

                txn.RejectVoucherId
                    ? optional(async () => ({ voucher:await firstValueFrom(service.getVoucher(txn.RejectVoucherId!)) }))
                    : Promise.resolve(null)
            ]);

        return {
            txn,
            source,
            settlement,
            reject
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
            PosDocumentsData
    ):
        string
    {
        return data.txn.TransactionRef
            ? `Card ${data.txn.TransactionRef}`
            : `Card ${data.txn.SourceVoucherNo}`;
    },

    documents:
    [
        {
            key:'source-voucher',

            title:'Receipt Voucher',

            icon:'fas fa-file-invoice',

            available:
                data =>
                    !!data.source,

            render:
                (data, kit) =>
                    receiptVoucherDoc.render(data.source, kit),

            css:
                receiptVoucherDoc.css,

            excel:
                receiptVoucherDoc.excel
                    ? (data, kit) => receiptVoucherDoc.excel!(data.source, kit)
                    : undefined
        },
        posVoucherDoc(
            data => data.settlement,
            'settlement-voucher',
            'Settlement Voucher (Receipt)',
            'fas fa-money-bill-transfer'),
        posVoucherDoc(
            data => data.reject,
            'reject-voucher',
            'Reject Voucher (Journal)',
            'fas fa-ban')
    ]
};