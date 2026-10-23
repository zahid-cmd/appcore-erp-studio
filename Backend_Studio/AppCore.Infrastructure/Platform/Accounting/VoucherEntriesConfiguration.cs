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
// Voucher Entries Configuration
//===============================================================

public class VoucherEntriesConfiguration
    : IEntityTypeConfiguration<VoucherEntries>
{
    public void Configure(
        EntityTypeBuilder<VoucherEntries> builder)
    {
        builder.ToTable("VoucherEntries");

        builder.HasKey(x => x.VoucherEntryId);

        builder.Property(x => x.VoucherEntryId)
               .ValueGeneratedOnAdd();

        //=======================================================
        // Voucher
        //=======================================================

        builder.Property(x => x.VoucherType)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.VoucherId)
               .IsRequired();

        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.VoucherDate)
               .IsRequired();

        builder.Property(x => x.FinancialYearId)
               .IsRequired();

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.BranchCode)
               .IsRequired()
               .HasMaxLength(50);

        //=======================================================
        // Line
        //=======================================================

        builder.Property(x => x.GroupNo)
               .IsRequired();

        builder.Property(x => x.LineNo)
               .IsRequired();

        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.LedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.LedgerType)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.Debit)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Credit)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(500);

        //=======================================================
        // Party / Reference
        //=======================================================

        builder.Property(x => x.PartyType)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.PartyCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.ReferenceNo)
               .IsRequired()
               .HasMaxLength(100);

        //=======================================================
        // Reversal / Audit
        //=======================================================

        builder.Property(x => x.IsReversal)
               .IsRequired();

        builder.Property(x => x.ReversalReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.PostedBy)
               .IsRequired();

        builder.Property(x => x.PostedDate)
               .IsRequired();

        //=======================================================
        // Indexes
        //=======================================================

        // Ledger statement / balances
        builder.HasIndex(x => new { x.LedgerCode, x.VoucherDate })
               .HasDatabaseName("IX_VoucherEntries_Ledger_Date");

        // One voucher's lines; also stops a voucher being posted
        // (or reversed) twice by two requests at the same moment
        builder.HasIndex(x => new { x.VoucherNo, x.IsReversal, x.LineNo })
               .IsUnique()
               .HasDatabaseName("UX_VoucherEntries_VoucherNo_Line");

        builder.HasIndex(x => new { x.VoucherType, x.VoucherId })
               .HasDatabaseName("IX_VoucherEntries_Type_Id");

        // Day book
        builder.HasIndex(x => new { x.VoucherDate, x.BranchId })
               .HasDatabaseName("IX_VoucherEntries_Date_Branch");
    }
}