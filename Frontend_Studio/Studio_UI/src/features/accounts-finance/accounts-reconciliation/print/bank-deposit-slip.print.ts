//===============================================================
// Bank Deposit Slip : print source (Print Engine)
//
// Received checks deposited together (Check Reconciliation ›
// Deposit). One A4 document : bank-deposit-slip\
// bank-deposit-slip.template.ts. Always printable.
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
    BANK_DEPOSIT_SLIP_CSS,
    DepositSlipPrintData,
    bankDepositSlipHtml,
    bankDepositSlipSheet
}
from './bank-deposit-slip/bank-deposit-slip.template';


//===============================================================
// Source
//===============================================================

export const BANK_DEPOSIT_SLIP_PRINT:
    PrintSourceDef<DepositSlipPrintData> =
{
    key:'bank-deposit-slip',

    title:'Bank Deposit Slip',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<DepositSlipPrintData>
    {
        const slip =
            await firstValueFrom(
                injector
                    .get(CheckReconciliationsService)
                    .getDepositSlip(id)
            );

        return {
            slip
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
            DepositSlipPrintData
    ):
        string
    {
        return data.slip.SlipNo || 'Bank Deposit Slip';
    },

    documents:
    [
        {
            key:'slip',
            title:'Bank Deposit Slip',
            icon:'fas fa-building-columns',
            render:
                (data, kit) =>
                    bankDepositSlipHtml(data, kit),
            css:
                BANK_DEPOSIT_SLIP_CSS(),
            excel:
                (data, kit) =>
                    bankDepositSlipSheet(data, kit)
        }
    ]
};