//===============================================================
// Purchase Orders - MB : print source (Print Engine)
//
//   /print-viewer/purchase-orders-mb/<id>?doc=all
//
// The layout is shared by the types (MB / SP / AC); the title
// and the product column follow the order's PageType.
// Loads the order and its supplier profile (address, phone,
// BIN), decides who may print, and lists its one document :
// PURCHASE ORDER (A4, supplier copy). Layout :
//   purchase-order\purchase-order.template.ts
//
// Printable : Approved (switch CFG-MOD-007-0007), Placed,
// Completed, Closed Short;
// Cancelled with a CANCELLED watermark. Draft is refused.
// Logo / BIN-TIN / printed stamp follow the company print
// switches (System Configuration, Accounts & Finance).
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
    PurchaseOrdersMbService
}
from '../services/purchase-orders-mb.service';

import
{
    SupplierProfilesService
}
from '../../../settings/client-settings/services/supplier-profiles.service';

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
    PurchaseOrderPrintData,
    PurchaseOrderPrintSupplier,
    PURCHASE_ORDER_DOCUMENT_CSS,
    purchaseOrderDocumentHtml,
    purchaseOrderDocumentSheet,
    purchaseOrderTitle
}
from './purchase-order/purchase-order.template';


//===============================================================
// Switch : Purchase Orders - MB › Allow Print On Approval
// (System Configuration, by code; missing = allowed)
//===============================================================

const PRINT_ON_APPROVAL_SWITCH:
    string =
    'CFG-MOD-007-0007';


//===============================================================
// Supplier profile (address, phone, BIN); null when unreadable
//===============================================================

async function loadSupplier
(
    injector:
        Injector,
    supplierCode:
        string
):
    Promise<PurchaseOrderPrintSupplier | null>
{
    try
    {
        const suppliers =
            await firstValueFrom(
                injector
                    .get(SupplierProfilesService)
                    .getAll()
            );

        const supplier =
            (suppliers ?? []).find(x => x.SupplierCode === supplierCode);

        if
        (
            !supplier
        )
        {
            return null;
        }

        return {
            Name:supplier.SupplierName,
            Code:supplier.SupplierCode,
            ContactPerson:supplier.ContactPerson ?? '',
            Phone:[supplier.Phone1, supplier.Phone2].filter(x => !!x).join(', '),
            Email:supplier.Email ?? '',
            Address:supplier.Address ?? '',
            BinNo:supplier.BinNo ?? '',
            CreditDays:supplier.CreditDays ?? null
        };
    }
    catch
    {
        // The order still prints with the supplier name it holds
        return null;
    }
}


//===============================================================
// Source
//===============================================================

export const PURCHASE_ORDERS_MB_PRINT:
    PrintSourceDef<PurchaseOrderPrintData> =
{
    key:'purchase-orders-mb',

    title:'Purchase Order',

    async load
    (
        injector:
            Injector,
        id:
            number
    ):
        Promise<PurchaseOrderPrintData>
    {
        const order =
            await firstValueFrom(
                injector
                    .get(PurchaseOrdersMbService)
                    .getById(id)
            );

        return {
            order,
            supplier:
                await loadSupplier(
                    injector,
                    order.SupplierCode
                )
        };
    },

    // Every status after approval prints; a draft does not
    denyReason
    (
        data:
            PurchaseOrderPrintData,
        kit:
            PrintKit
    ):
        string
    {
        const status =
            String(data?.order?.Status ?? '');

        if
        (
            !status
            ||
            status === 'Draft'
        )
        {
            return 'A draft purchase order cannot be printed. Approve it first.';
        }

        // Switch "Allow Print On Approval" (CFG-MOD-007-0007)
        if
        (
            status === 'Approved'
            &&
            !kit.isOn(PRINT_ON_APPROVAL_SWITCH, true)
        )
        {
            return 'This purchase order prints once it is placed.';
        }

        return '';
    },

    fileName
    (
        data:
            PurchaseOrderPrintData
    ):
        string
    {
        return data.order.OrderNo || purchaseOrderTitle(data.order);
    },

    documents:
    [
        {
            key:'purchase-orders-mb',

            title:'Purchase Order',

            icon:'fas fa-file-signature',

            render:
                (data, kit) =>
                    purchaseOrderDocumentHtml(
                        data,
                        kit,
                        {
                            logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
                            legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                            stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                        }
                    ),

            css:
                PURCHASE_ORDER_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    purchaseOrderDocumentSheet(data, kit)
        }
    ]
};