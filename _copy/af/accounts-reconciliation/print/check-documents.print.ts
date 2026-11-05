//===============================================================
// Check documents : print sources (Print Engine)
//
// Every document of one check, from the Check Reconciliation
// list (Print Preview) :
//
//   /print-viewer/check-received/<payment id>
//   /print-viewer/check-issued/<payment id>
//
// Documents (only those that exist are offered; All Documents
// prints them together) :
//   Receipt Voucher / Payment Voucher   the source voucher
//   Bank Deposit Slip                   received, once deposited
//   Clearing Voucher                    Receipt / Payment Voucher (RRV / RRP)
//   Dishonour Voucher                   Journal Voucher (fee / recovery)
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
    CheckDirection,
    CheckReconciliations
}
from '../models/check-reconciliations.model';

import
{
    CheckReconciliationsService
}
from '../services/check-reconciliations.service';

import
{
    PrintDocumentDef,
    PrintSourceDef
}
from '../../../../shared/print/print.models';

// Clearing / dishonour voucher (RRV / RRP)
import
{
    CheckClearingPrintData,
    checkClearingModel
}
from './check-clearing-voucher/check-clearing-voucher.adapter';

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

// Bank Deposit Slip
import
{
    BANK_DEPOSIT_SLIP_CSS,
    DepositSlipPrintData,
    bankDepositSlipHtml,
    bankDepositSlipSheet
}
from './bank-deposit-slip/bank-deposit-slip.template';

// Source vouchers (their own print sources)
import
{
    RECEIPT_VOUCHER_PRINT
}
from '../../voucher-management/print/receipt-voucher.print';

import
{
    PAYMENT_VOUCHER_PRINT
}
from '../../voucher-management/print/payment-voucher.print';


//===============================================================
// Data
//===============================================================

export interface CheckDocumentsData
{
    check:
        CheckReconciliations;

    // Receipt Voucher (received) / Payment Voucher (issued) data
    source:
        any;

    slip:
        DepositSlipPrintData | null;

    clearing:
        CheckClearingPrintData | null;

    dishonour:
        CheckClearingPrintData | null;
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
        console.error('Check documents : optional document failed', error);

        return null;
    }
}

function sourceDef
(
    direction:
        CheckDirection
):
    PrintSourceDef
{
    return direction === 'Issued'
        ? PAYMENT_VOUCHER_PRINT
        : RECEIPT_VOUCHER_PRINT;
}

// The voucher document of the source (not the money receipt /
// payment slip)
function sourceVoucherDoc
(
    direction:
        CheckDirection
):
    PrintDocumentDef
{
    const documents =
        sourceDef(direction).documents;

    return documents.find(doc => doc.key === 'voucher') ?? documents[0];
}


//===============================================================
// Source factory (received / issued)
//===============================================================

function checkDocuments
(
    direction:
        CheckDirection
):
    PrintSourceDef<CheckDocumentsData>
{
    const voucherDoc =
        sourceVoucherDoc(direction);

    const clearingDoc =
        (
            pick:
                (data: CheckDocumentsData) => CheckClearingPrintData | null,
            key:
                string,
            title:
                string,
            icon:
                string
        ):
            PrintDocumentDef<CheckDocumentsData> =>
        ({
            key,

            title,

            icon,

            available:
                data =>
                    !!pick(data),

            render:
                (data, kit) =>
                    voucherDocumentHtml(checkClearingModel(pick(data)!, kit), kit),

            css:
                VOUCHER_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    voucherDocumentSheet(checkClearingModel(pick(data)!, kit), kit)
        });

    return {
        key:
            direction === 'Issued' ? 'check-issued' : 'check-received',

        title:
            'Check',

        async load
        (
            injector:
                Injector,
            id:
                number
        ):
            Promise<CheckDocumentsData>
        {
            const service =
                injector.get(CheckReconciliationsService);

            const checks =
                await firstValueFrom(service.getAll(direction));

            const check =
                (checks ?? []).find(item => Number(item.PaymentId) === id);

            if
            (
                !check
            )
            {
                throw new Error('The check was not found.');
            }

            const [source, slip, clearing, dishonour] =
                await Promise.all(
                [
                    optional(() => sourceDef(direction).load(injector, check.SourceVoucherId)),

                    check.DepositSlipId
                        ? optional(async () => ({ slip:await firstValueFrom(service.getDepositSlip(check.DepositSlipId!)) }))
                        : Promise.resolve(null),

                    check.ClearingVoucherId
                        ? optional(async () => ({ voucher:await firstValueFrom(service.getVoucher(check.ClearingVoucherId!)) }))
                        : Promise.resolve(null),

                    check.DishonourVoucherId
                        ? optional(async () => ({ voucher:await firstValueFrom(service.getVoucher(check.DishonourVoucherId!)) }))
                        : Promise.resolve(null)
                ]);

            return {
                check,
                source,
                slip,
                clearing,
                dishonour
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
                CheckDocumentsData
        ):
            string
        {
            return `Check ${data.check.CheckNo || ''}`.trim();
        },

        documents:
        [
            {
                key:'source-voucher',

                title:
                    direction === 'Issued' ? 'Payment Voucher' : 'Receipt Voucher',

                icon:'fas fa-file-invoice',

                available:
                    data =>
                        !!data.source,

                render:
                    (data, kit) =>
                        voucherDoc.render(data.source, kit),

                css:
                    voucherDoc.css,

                excel:
                    voucherDoc.excel
                        ? (data, kit) => voucherDoc.excel!(data.source, kit)
                        : undefined
            },
            {
                key:'deposit-slip',

                title:'Bank Deposit Slip',

                icon:'fas fa-building-columns',

                available:
                    data =>
                        !!data.slip,

                render:
                    (data, kit) =>
                        bankDepositSlipHtml(data.slip!, kit),

                css:
                    BANK_DEPOSIT_SLIP_CSS(),

                excel:
                    (data, kit) =>
                        bankDepositSlipSheet(data.slip!, kit)
            },
            clearingDoc(
                data => data.clearing,
                'clearing-voucher',
                direction === 'Issued' ? 'Clearing Voucher (Payment)' : 'Clearing Voucher (Receipt)',
                'fas fa-money-check'),
            clearingDoc(
                data => data.dishonour,
                'dishonour-voucher',
                'Dishonour Voucher (Journal)',
                'fas fa-ban')
        ]
    };
}


//===============================================================
// Sources
//===============================================================

export const CHECK_RECEIVED_PRINT:
    PrintSourceDef<CheckDocumentsData> =
    checkDocuments('Received');

export const CHECK_ISSUED_PRINT:
    PrintSourceDef<CheckDocumentsData> =
    checkDocuments('Issued');