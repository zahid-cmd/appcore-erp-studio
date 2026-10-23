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
                .then(module => module.RECEIPT_VOUCHER_PRINT)
};