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
                .then(module => module.PURCHASE_ORDERS_MB_PRINT)
};