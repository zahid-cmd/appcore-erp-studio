//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SalesOperations.AccessoriesSales;
using AppCore.Infrastructure.Configurations.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.AccessoriesSales;


//===============================================================
// Sales Invoices - AC : header + lines + payment rows (replaces
// the generated configuration). The header is registered by Code
// Synchronization (DbSet); the lines and payments have MANUAL
// DbSets and also enter the model through this class.
//===============================================================

public class SalesInvoicesAcConfiguration
    : IEntityTypeConfiguration<SalesInvoicesAc>,
      IEntityTypeConfiguration<SalesInvoicesAcLines>,
      IEntityTypeConfiguration<SalesInvoicesAcPayments>
{
    public void Configure(
        EntityTypeBuilder<SalesInvoicesAc> builder)
    {
        SalesInvoiceModel.ConfigureHeader(builder, "SalesInvoicesAc");
    }


    public void Configure(
        EntityTypeBuilder<SalesInvoicesAcLines> builder)
    {
        SalesInvoiceModel.ConfigureLine(builder, "SalesInvoicesAcLines");
    }


    public void Configure(
        EntityTypeBuilder<SalesInvoicesAcPayments> builder)
    {
        SalesInvoiceModel.ConfigurePayment(builder, "SalesInvoicesAcPayments");
    }
}
