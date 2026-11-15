//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Check Books : EF configurations (tables made by
// CheckBooks_Engine.sql; hand-written page, no Code Sync).
// No database defaults for booleans : EF would skip a 'false'
// value on insert.
//===============================================================

public class CheckBooksConfiguration
    : IEntityTypeConfiguration<CheckBooks>,
      IEntityTypeConfiguration<CheckBookLeaves>,
      IEntityTypeConfiguration<CheckPrintLayouts>
{
    public void Configure(EntityTypeBuilder<CheckBooks> builder)
    {
        builder.ToTable("CheckBooks");
        builder.HasKey(x => x.CheckBookId);
        builder.Property(x => x.CheckBookId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_CheckBooks_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_CheckBooks_Code");
        builder.Property(x => x.BookNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Prefix).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ReceivedDate).HasColumnType("date");
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
        builder.HasIndex(x => x.BankAccountId).HasDatabaseName("IX_CheckBooks_BankAccount");
    }

    public void Configure(EntityTypeBuilder<CheckBookLeaves> builder)
    {
        builder.ToTable("CheckBookLeaves");
        builder.HasKey(x => x.CheckBookLeafId);
        builder.Property(x => x.CheckBookLeafId).ValueGeneratedOnAdd();
        builder.Property(x => x.CheckNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SourceType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.SourceNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.PayeeName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Amount).HasColumnType("numeric(18,2)");
        builder.Property(x => x.IssuedDate).HasColumnType("date");
        builder.Property(x => x.Reason).IsRequired().HasMaxLength(300);
        builder.HasIndex(x => new { x.CheckBookId, x.LeafNo }).IsUnique().HasDatabaseName("UX_CheckBookLeaves_Book_Leaf");
        builder.HasIndex(x => new { x.BankAccountId, x.Status, x.LeafNo }).HasDatabaseName("IX_CheckBookLeaves_Account_Status");
    }

    // Cheque print layouts (CheckPrintLayouts_Engine.sql)
    public void Configure(EntityTypeBuilder<CheckPrintLayouts> builder)
    {
        builder.ToTable("CheckPrintLayouts");
        builder.HasKey(x => x.CheckPrintLayoutId);
        builder.Property(x => x.CheckPrintLayoutId).ValueGeneratedOnAdd();
        builder.Property(x => x.LayoutJson).IsRequired().HasColumnType("text");
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
        builder.HasIndex(x => x.BankAccountId).IsUnique().HasDatabaseName("UX_CheckPrintLayouts_BankAccount");
    }
}
