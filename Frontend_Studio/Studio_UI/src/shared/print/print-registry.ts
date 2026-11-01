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
                .then(module => module.ACCESSORIES_RECEIVING_PRINT)
};
