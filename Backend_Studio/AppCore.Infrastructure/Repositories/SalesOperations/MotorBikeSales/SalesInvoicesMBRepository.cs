//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.SalesOperations.MotorBikeSales;
using AppCore.Application.Settings.ClientSettings;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.SalesOperations.Shared;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.MotorBikeSales;


//===============================================================
// Sales Invoices - MB : the shared Sales Invoices engine with this
// page's tables, number prefix (SIMB), switch codes
// (CFG-MOD-008-0001 .. 0018) and posting purposes. One bike
// (chassis) per line; posting marks the bikes Sold (Delivery on
// Sale ON : delivered).
//===============================================================

public class SalesInvoicesMbRepository
    : SalesInvoiceRepositoryBase<SalesInvoicesMb, SalesInvoicesMbLines, SalesInvoicesMbPayments>,
      ISalesInvoicesMbRepository
{
    protected override SalesInvoicePage Page =>
        SalesInvoicePages.MotorBikes;


    public SalesInvoicesMbRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVatApplicabilityService vatApplicability,
        IVoucherPostingService postingService,
        IReceiptVoucherRepository receiptVouchers,
        ICustomerProfilesRepository customers,
        IJournalVoucherRepository journalVouchers)
        : base(
            context,
            numberService,
            vatApplicability,
            postingService,
            receiptVouchers,
            customers,
            journalVouchers)
    {
    }
}
