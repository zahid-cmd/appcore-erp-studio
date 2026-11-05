//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.SalesOperations.SparePartsLubricantSales;
using AppCore.Application.Settings.ClientSettings;
using AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.SalesOperations.Shared;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.SparePartsLubricantSales;


//===============================================================
// Sales Invoices - SP : the shared Sales Invoices engine with this
// page's tables, number prefix (SISP), switch codes
// (CFG-MOD-008-0021 .. 0033) and posting purposes
//===============================================================

public class SalesInvoicesSpRepository
    : SalesInvoiceRepositoryBase<SalesInvoicesSp, SalesInvoicesSpLines, SalesInvoicesSpPayments>,
      ISalesInvoicesSpRepository
{
    protected override SalesInvoicePage Page =>
        SalesInvoicePages.SpareParts;


    public SalesInvoicesSpRepository(
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
