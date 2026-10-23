//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Platform.Accounting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Voucher Sequences Configuration
//===============================================================

public class VoucherSequencesConfiguration
    : IEntityTypeConfiguration<VoucherSequences>
{
    public void Configure(
        EntityTypeBuilder<VoucherSequences> builder)
    {
        builder.ToTable("VoucherSequences");

        builder.HasKey(x => x.VoucherSequenceId);

        builder.Property(x => x.VoucherSequenceId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Prefix)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.BranchDigits)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.FinancialYearCode)
               .IsRequired()
               .HasMaxLength(4);

        builder.Property(x => x.PeriodMonth)
               .IsRequired();

        builder.Property(x => x.LastNumber)
               .IsRequired();

        builder.Property(x => x.ModifiedDate)
               .IsRequired();

        // One counter per prefix + branch + year + month
        builder.HasIndex(x => new { x.Prefix, x.BranchDigits, x.FinancialYearCode, x.PeriodMonth })
               .IsUnique()
               .HasDatabaseName("UX_VoucherSequences_Period");
    }
}