//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales;
using AppCore.Infrastructure.Configurations.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.SparePartsLubricantSales;


//===============================================================
// Sales Invoices - SP : header + lines + payment rows (replaces
// the generated configuration). The header is registered by Code
// Synchronization (DbSet); the lines and payments have MANUAL
// DbSets and also enter the model through this class.
//===============================================================

public class SalesInvoicesSpConfiguration
    : IEntityTypeConfiguration<SalesInvoicesSp>,
      IEntityTypeConfiguration<SalesInvoicesSpLines>,
      IEntityTypeConfiguration<SalesInvoicesSpPayments>
{
    public void Configure(
        EntityTypeBuilder<SalesInvoicesSp> builder)
    {
        SalesInvoiceModel.ConfigureHeader(builder, "SalesInvoicesSp");
    }


    public void Configure(
        EntityTypeBuilder<SalesInvoicesSpLines> builder)
    {
        SalesInvoiceModel.ConfigureLine(builder, "SalesInvoicesSpLines");
    }


    public void Configure(
        EntityTypeBuilder<SalesInvoicesSpPayments> builder)
    {
        SalesInvoiceModel.ConfigurePayment(builder, "SalesInvoicesSpPayments");
    }
}
