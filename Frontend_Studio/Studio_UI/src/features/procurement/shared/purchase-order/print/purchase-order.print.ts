//===============================================================
// Purchase Orders : print source (Print Engine), shared by MB /
// SP / AC. Each page's print file calls purchaseOrderPrintSource
// with its config and service :
//
//   /print-viewer/purchase-orders-<type>/<id>?doc=all
//
// The layout is shared by the types (MB / SP / AC); the title
// and the product column follow the order's PageType.
// Loads the order and its supplier profile (address, phone,
// BIN), decides who may print, and lists its one document :
// PURCHASE ORDER (A4, supplier copy). Layout :
//   purchase-order.template.ts
//
// Printable : Approved (the page's Print On Approval switch), Placed,
// Completed, Closed Short;
// Cancelled with a CANCELLED watermark. Draft is refused.
// Logo / BIN-TIN / printed stamp follow the company print
// switches (System Configuration, Accounts & Finance).
//===============================================================

import
{
    Injector,
    Type
}
from '@angular/core';

import
{
    firstValueFrom
}
from 'rxjs';

import
{
    PurchaseOrderService
}
from '../purchase-order.service';

import
{
    PurchaseOrder,
    PurchaseOrderProductOption
}
from '../purchase-order.model';

import
{
    PurchaseOrderPageConfig
}
from '../purchase-order.config';

import
{
    SupplierProfilesService
}
from '../../../../settings/client-settings/services/supplier-profiles.service';

import
{
    VOUCHER_SWITCH
}
from '../../../../../shared/components/accounting/voucher-switches';

import
{
    PrintKit,
    PrintSourceDef
}
from '../../../../../shared/print/print.models';

import
{
    PurchaseOrderPrintData,
    PurchaseOrderPrintSupplier,
    PURCHASE_ORDER_DOCUMENT_CSS,
    purchaseOrderDocumentHtml,
    purchaseOrderDocumentSheet,
    purchaseOrderTitle
}
from './purchase-order.template';


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
// Items with stock levels (Internal copy); [] when unreadable
//===============================================================

async function loadProducts
(
    injector:
        Injector,
    service:
        Type<PurchaseOrderService>,
    page:
        PurchaseOrderPageConfig,
    order:
        PurchaseOrder
):
    Promise<PurchaseOrderProductOption[]>
{
    try
    {
        const defaults =
            await firstValueFrom(
                injector
                    .get(service)
                    .getDefaults(
                        page.pageType,
                        order.BranchId,
                        String(order.OrderDate ?? '').slice(0, 10)
                    )
            );

        return defaults?.Products ?? [];
    }
    catch
    {
        // The internal copy still prints, its stock shown as —
        return [];
    }
}


//===============================================================
// Source
//===============================================================

export function purchaseOrderPrintSource
(
    page:
        PurchaseOrderPageConfig,
    service:
        Type<PurchaseOrderService>
):
    PrintSourceDef<PurchaseOrderPrintData>
{
    return {
    key:page.printKey,

    title:'Purchase Order',

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<PurchaseOrderPrintData>
    {
        const order =
            await firstValueFrom(
                injector
                    .get(service)
                    .getById(String(id))
            );

        return {
            order,
            supplier:
                await loadSupplier(
                    injector,
                    order.SupplierCode
                ),
            products:
                await loadProducts(
                    injector,
                    service,
                    page,
                    order
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

        // Switch "Allow Print On Approval" of the page
        if
        (
            status === 'Approved'
            &&
            !kit.isOn(page.switches.PRINT_ON_APPROVAL, true)
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
            key:page.printKey,

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
        },

        // Internal copy : the same order plus each line's stock
        // position (company wide). Never sent to the supplier.
        {
            key:`${page.printKey}-internal`,

            title:'Purchase Order (Internal)',

            icon:'fas fa-boxes-stacked',

            render:
                (data, kit) =>
                    purchaseOrderDocumentHtml(
                        data,
                        kit,
                        {
                            logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
                            legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                            stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true),
                            internal:true
                        }
                    ),

            css:
                PURCHASE_ORDER_DOCUMENT_CSS()
        }
    ]
};
}
