//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.SalesOperations.AccessoriesSales;
using AppCore.Application.Settings.ClientSettings;
using AppCore.Domain.Entities.SalesOperations.AccessoriesSales;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.SalesOperations.Shared;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.AccessoriesSales;


//===============================================================
// Sales Invoices - AC : the shared Sales Invoices engine with this
// page's tables, number prefix (SIAC), switch codes
// (CFG-MOD-008-0041 .. 0053) and posting purposes
//===============================================================

public class SalesInvoicesAcRepository
    : SalesInvoiceRepositoryBase<SalesInvoicesAc, SalesInvoicesAcLines, SalesInvoicesAcPayments>,
      ISalesInvoicesAcRepository
{
    protected override SalesInvoicePage Page =>
        SalesInvoicePages.Accessories;


    public SalesInvoicesAcRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVatApplicabilityService vatApplicability,
        IVoucherPostingService postingService,
        IReceiptVoucherRepository receiptVouchers,
        ICustomerProfilesRepository customers)
        : base(
            context,
            numberService,
            vatApplicability,
            postingService,
            receiptVouchers,
            customers)
    {
    }
}
