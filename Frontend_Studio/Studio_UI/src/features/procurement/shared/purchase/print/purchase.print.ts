//===============================================================
// Purchases : print source (Print Engine), shared by MB / SP /
// AC. Each page's print file calls purchasePrintSource with its
// config and service :
//
//   /print-viewer/purchases-<type>/<id>?doc=all
//
// Loads the purchase and its supplier profile (address, phone,
// BIN), decides who may print, and lists its one document :
// PURCHASE (A4). Layout : purchase.template.ts
//
// Printable : Approved (the page's Print On Approval switch),
// Posted; Cancelled with a CANCELLED watermark. Draft is refused.
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
    PurchaseService
}
from '../purchase.service';

import
{
    PurchasePageConfig
}
from '../purchase.config';

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
    PurchasePrintData,
    PurchasePrintSupplier,
    PURCHASE_DOCUMENT_CSS,
    purchaseDocumentHtml,
    purchaseDocumentSheet,
    purchaseTitle
}
from './purchase.template';


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
    Promise<PurchasePrintSupplier | null>
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
        // The purchase still prints with the supplier name it holds
        return null;
    }
}


//===============================================================
// Source
//===============================================================

export function purchasePrintSource
(
    page:
        PurchasePageConfig,
    service:
        Type<PurchaseService>
):
    PrintSourceDef<PurchasePrintData>
{
    return {
    key:page.printKey,

    title:'Purchase',

    async load
    (
        injector:
            Injector,
        id:
            number | string
    ):
        Promise<PurchasePrintData>
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
                )
        };
    },

    // Every status after approval prints; a draft does not
    denyReason
    (
        data:
            PurchasePrintData,
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
            return 'A draft purchase cannot be printed. Approve it first.';
        }

        // Switch "Allow Print On Approval" of the page
        if
        (
            status === 'Approved'
            &&
            !kit.isOn(page.switches.PRINT_ON_APPROVAL, true)
        )
        {
            return 'This purchase prints once it is posted.';
        }

        return '';
    },

    fileName
    (
        data:
            PurchasePrintData
    ):
        string
    {
        return data.order.PurchaseNo || purchaseTitle(data.order);
    },

    documents:
    [
        {
            key:page.printKey,

            title:'Purchase',

            icon:'fas fa-file-invoice-dollar',

            render:
                (data, kit) =>
                    purchaseDocumentHtml(
                        data,
                        kit,
                        {
                            logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
                            legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                            stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                        }
                    ),

            css:
                PURCHASE_DOCUMENT_CSS(),

            excel:
                (data, kit) =>
                    purchaseDocumentSheet(data, kit)
        },

        // MB : the same purchase plus Motor Bike Technical
        // Information (chassis, engine, key, battery per unit)
        ...(page.pageType === 'MB'
            ? [
                {
                    key:`${page.printKey}-technical`,

                    title:'Purchase (Technical Information)',

                    icon:'fas fa-motorcycle',

                    render:
                        (data: PurchasePrintData, kit: PrintKit) =>
                            purchaseDocumentHtml(
                                data,
                                kit,
                                {
                                    logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
                                    legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                                    stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true),
                                    technical:true
                                }
                            ),

                    css:
                        PURCHASE_DOCUMENT_CSS()
                }
            ]
            : [])
    ]
};
}
