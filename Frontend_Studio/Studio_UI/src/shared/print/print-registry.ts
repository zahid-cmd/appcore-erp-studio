//===============================================================
// Print Registry
//
// Every printable record type, by its URL key
//   /print-viewer/<key>/<id>?doc=<document key | all>
//
// Each entry loads its templates only when the viewer opens it.
// Adding a new printable page = one template file + one line
// here.
//===============================================================

import
{
    PrintSourceDef
}
from './print.models';


export const PRINT_SOURCES:
    Record<string, () => Promise<PrintSourceDef>> =
{
    'receipt-voucher':
        () =>
            import('../../features/accounts-finance/voucher-management/print/receipt-voucher.print')
                .then(module => module.RECEIPT_VOUCHER_PRINT),

    'payment-voucher':
        () =>
            import('../../features/accounts-finance/voucher-management/print/payment-voucher.print')
                .then(module => module.PAYMENT_VOUCHER_PRINT),

    'journal-voucher':
        () =>
            import('../../features/accounts-finance/voucher-management/print/journal-voucher.print')
                .then(module => module.JOURNAL_VOUCHER_PRINT),

    'fund-transfer':
        () =>
            import('../../features/accounts-finance/voucher-management/print/fund-transfer.print')
                .then(module => module.FUND_TRANSFER_PRINT),

    'check-clearing-voucher':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/check-clearing-voucher.print')
                .then(module => module.CHECK_CLEARING_VOUCHER_PRINT),

    'bank-deposit-slip':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/bank-deposit-slip.print')
                .then(module => module.BANK_DEPOSIT_SLIP_PRINT),

    // Every document of one check (Check Reconciliation list)
    'check-received':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/check-documents.print')
                .then(module => module.CHECK_RECEIVED_PRINT),

    'check-issued':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/check-documents.print')
                .then(module => module.CHECK_ISSUED_PRINT),

    // MFS Reconciliation : settlement / reject voucher (RRV)
    'mfs-reconciliation-voucher':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/mfs-reconciliation-voucher.print')
                .then(module => module.MFS_RECONCILIATION_VOUCHER_PRINT),

    // Every document of one MFS receipt (MFS Reconciliation list)
    'mfs-received':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/mfs-documents.print')
                .then(module => module.MFS_RECEIVED_PRINT),

    // POS Reconciliation : settlement / reject voucher (RRV)
    'pos-reconciliation-voucher':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/pos-reconciliation-voucher.print')
                .then(module => module.POS_RECONCILIATION_VOUCHER_PRINT),

    // Every document of one card receipt (POS Reconciliation list)
    'pos-received':
        () =>
            import('../../features/accounts-finance/accounts-reconciliation/print/pos-documents.print')
                .then(module => module.POS_RECEIVED_PRINT),

    // Procurement : Purchase Orders - MB
    'purchase-orders-mb':
        () =>
            import('../../features/procurement/motor-bike-purchase/print/purchase-orders-mb.print')
                .then(module => module.PURCHASE_ORDERS_MB_PRINT),

    // Procurement : Purchase Orders - SP
    'purchase-orders-sp':
        () =>
            import('../../features/procurement/spare-parts-lubricant-purchase/print/purchase-orders-sp.print')
                .then(module => module.PURCHASE_ORDERS_SP_PRINT),

    // Procurement : Purchase Orders - AC
    'purchase-orders-ac':
        () =>
            import('../../features/procurement/accessories-purchase/print/purchase-orders-ac.print')
                .then(module => module.PURCHASE_ORDERS_AC_PRINT),

    // Procurement : Purchases - MB
    'purchases-mb':
        () =>
            import('../../features/procurement/motor-bike-purchase/print/purchases-mb.print')
                .then(module => module.PURCHASES_MB_PRINT),

    // Procurement : Purchases - SP
    'purchases-sp':
        () =>
            import('../../features/procurement/spare-parts-lubricant-purchase/print/purchases-sp.print')
                .then(module => module.PURCHASES_SP_PRINT),

    // Procurement : Purchases - AC
    'purchases-ac':
        () =>
            import('../../features/procurement/accessories-purchase/print/purchases-ac.print')
                .then(module => module.PURCHASES_AC_PRINT),

    // Inventory Management : Inventory Status (Stock Position /
    // Bike Units; the id is the list's filter token)
    'motor-bike-stock':
        () =>
            import('../../features/inventory-management/inventory-status/print/motor-bike-stock.print')
                .then(module => module.MOTOR_BIKE_STOCK_PRINT),

    'spare-parts-lubricants-stock':
        () =>
            import('../../features/inventory-management/inventory-status/print/spare-parts-lubricants-stock.print')
                .then(module => module.SPARE_PARTS_LUBRICANTS_STOCK_PRINT),

    'accessories-stock':
        () =>
            import('../../features/inventory-management/inventory-status/print/accessories-stock.print')
                .then(module => module.ACCESSORIES_STOCK_PRINT),

    // Sales Operations : Sales Invoices - SP (documents
    // 'sales-invoice' = A4, 'sales-invoice-thermal' = 80 mm roll)
    'sales-invoices-sp':
        () =>
            import('../../features/sales-operations/spare-parts-lubricant-sales/print/sales-invoices-sp.print')
                .then(module => module.SALES_INVOICES_SP_PRINT),

    // Sales Operations : Sales Invoices - AC (same two documents)
    'sales-invoices-ac':
        () =>
            import('../../features/sales-operations/accessories-sales/print/sales-invoices-ac.print')
                .then(module => module.SALES_INVOICES_AC_PRINT),

    // Sales Operations : Sales Invoices - MB (same two documents)
    'sales-invoices-mb':
        () =>
            import('../../features/sales-operations/motor-bike-sales/print/sales-invoices-mb.print')
                .then(module => module.SALES_INVOICES_MB_PRINT),

    // Sales Operations : Sales Quotations - MB / SP / AC (A4)
    'sales-quotations-mb':
        () =>
            import('../../features/sales-operations/shared/sales-invoice/print/sales-quotation.print')
                .then(module => module.SALES_QUOTATIONS_MB_PRINT),

    'sales-quotations-sp':
        () =>
            import('../../features/sales-operations/shared/sales-invoice/print/sales-quotation.print')
                .then(module => module.SALES_QUOTATIONS_SP_PRINT),

    'sales-quotations-ac':
        () =>
            import('../../features/sales-operations/shared/sales-invoice/print/sales-quotation.print')
                .then(module => module.SALES_QUOTATIONS_AC_PRINT),

    // Sales Returns - MB / SP / AC (the credit note)
    'sales-returns-mb':
        () =>
            import('../../features/sales-operations/shared/sales-return/print/sales-return.print')
                .then(module => module.SALES_RETURNS_MB_PRINT),

    'sales-returns-sp':
        () =>
            import('../../features/sales-operations/shared/sales-return/print/sales-return.print')
                .then(module => module.SALES_RETURNS_SP_PRINT),

    'sales-returns-ac':
        () =>
            import('../../features/sales-operations/shared/sales-return/print/sales-return.print')
                .then(module => module.SALES_RETURNS_AC_PRINT),

    // Sales Operations : Bike Deliveries (Delivery Challan / Gate
    // Pass + PDI Sheet; the id is the delivery PublicId)
    'bike-deliveries':
        () =>
            import('../../features/sales-operations/motor-bike-sales/print/bike-deliveries.print')
                .then(module => module.BIKE_DELIVERIES_PRINT),

    // Settings : PDI Templates (blank PDI sheet, Bike + Office
    // copy; the id is the template PublicId)
    'pdi-templates':
        () =>
            import('../../features/settings/service-settings/print/pdi-templates.print')
                .then(module => module.PDI_TEMPLATES_PRINT),

    // Accounts & Finance : Auto Journal Registers (Journal
    // Register; the id is the page's filter token)
    'auto-journal-registers':
        () =>
            import('../../features/accounts-finance/accounting-registers/print/auto-journal-registers.print')
                .then(module => module.AUTO_JOURNAL_REGISTERS_PRINT),

    // Accounts & Finance : Ledger Statements and Cash / Bank /
    // MFS / POS / EMI Registers (Statement / Summary; the id is
    // the page's token)
    'ledger-registers':
        () =>
            import('../../features/accounts-finance/accounting-registers/print/ledger-registers.print')
                .then(module => module.LEDGER_REGISTERS_PRINT),

    // Accounts & Finance : Trial Balance (the id is the page's
    // token)
    'trial-balance':
        () =>
            import('../../features/accounts-finance/financial-statements/print/trial-balance.print')
                .then(module => module.TRIAL_BALANCE_PRINT),

    // Inventory Management : Product Ledgers (Ledger / Summary of
    // Motor Bikes / Spare Parts & Lubricants / Accessories; the
    // id is the page's token)
    'product-ledgers':
        () =>
            import('../../features/inventory-management/product-ledgers/print/product-ledgers.print')
                .then(module => module.PRODUCT_LEDGERS_PRINT),

    // Inventory Management : Product Receiving (Goods Received
    // Note of one receiving; the id is the receiving)
    'motor-bike-receiving':
        () =>
            import('../../features/inventory-management/product-receiving/shared/print/receiving.print')
                .then(module => module.MOTOR_BIKE_RECEIVING_PRINT),

    'spare-parts-lubricants-receiving':
        () =>
            import('../../features/inventory-management/product-receiving/shared/print/receiving.print')
                .then(module => module.SPARE_PARTS_LUBRICANTS_RECEIVING_PRINT),

    'accessories-receiving':
        () =>
            import('../../features/inventory-management/product-receiving/shared/print/receiving.print')
                .then(module => module.ACCESSORIES_RECEIVING_PRINT),

    // Inventory Management : Opening Stock (the note of one
    // document; the id is the document)
    'opening-stock':
        () =>
            import('../../features/inventory-management/store-setup/print/opening-stock.print')
                .then(module => module.OPENING_STOCK_PRINT),

    // Inventory Management : Product Pricing (the price change
    // note of one document; the id is the document)
    'product-pricing':
        () =>
            import('../../features/inventory-management/pricing-labels/print/product-pricing.print')
                .then(module => module.PRODUCT_PRICING_PRINT),

    // Inventory Management : Price Adjustment (the note of one
    // document : products, batches, settlement, journal; the id
    // is the document)
    'price-adjustment':
        () =>
            import('../../features/inventory-management/pricing-labels/print/price-adjustment.print')
                .then(module => module.PRICE_ADJUSTMENT_PRINT),

    // Inventory Management : Product Transfer (the transfer note
    // of one document : lines, batches, chassis, places, journal;
    // the id is the document)
    'product-transfer':
        () =>
            import('../../features/inventory-management/stock-movement/print/product-transfer.print')
                .then(module => module.PRODUCT_TRANSFER_PRINT),

    // Inventory Management : Mass Storing (the rack / shelf
    // placement note of one document; the id is the document)
    'mass-storing':
        () =>
            import('../../features/inventory-management/stock-movement/print/mass-storing.print')
                .then(module => module.MASS_STORING_PRINT),

    // Inventory Management : Mass Storing Rack Overview (the shelf
    // map of the warehouse's racks; the id is the page's token)
    'mass-storing-rack-map':
        () =>
            import('../../features/inventory-management/stock-movement/print/mass-storing-rack-map.print')
                .then(module => module.MASS_STORING_RACK_MAP_PRINT),

    // Inventory Management : Price List (the current MRP of every
    // product of a type; the id is the page's token)
    'price-list':
        () =>
            import('../../features/inventory-management/pricing-labels/print/price-list.print')
                .then(module => module.PRICE_LIST_PRINT),

    // Inventory Management : Barcode Management (labels / motor
    // bike hang-tags on A4 sheets or rolls; the id is the page's
    // token)
    'barcode-labels':
        () =>
            import('../../features/inventory-management/pricing-labels/print/barcode-labels.print')
                .then(module => module.BARCODE_LABELS_PRINT),

    // Enquiry Management : Sales Enquiries (the enquiries on the
    // list's canvas; the id is the list's token)
    'sales-enquiries':
        () =>
            import('../../features/enquiry-management/enquiry-profiles/print/sales-enquiries.print')
                .then(module => module.SALES_ENQUIRIES_PRINT),

    // Human Resource : a report as the page shows it (Staff &
    // Payroll Reports, PF Reports ...) and the payslips of a salary
    // sheet; the id is the page's token
    'hr-report':
        () =>
            import('../../features/human-resource-manangement/print/hr-print')
                .then(module => module.HR_REPORT_PRINT),

    'hr-payslip':
        () =>
            import('../../features/human-resource-manangement/print/hr-print')
                .then(module => module.HR_PAYSLIP_PRINT)
};
