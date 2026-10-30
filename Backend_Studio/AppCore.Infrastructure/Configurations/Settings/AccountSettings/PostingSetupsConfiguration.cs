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
// Posting Setups Configuration
//===============================================================

public class PostingSetupsConfiguration
    : IEntityTypeConfiguration<PostingSetups>
{
    public void Configure(
        EntityTypeBuilder<PostingSetups> builder)
    {
        builder.ToTable("PostingSetups");

        builder.HasKey(x => x.PostingSetupId);

        builder.Property(x => x.PostingSetupId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PurposeCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.PurposeCode)
               .IsUnique()
               .HasDatabaseName("IX_PostingSetups_PurposeCode");

        builder.Property(x => x.PurposeName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.GroupName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.Description)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.UsedBy)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.AllowedSubGroupCodes)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.IsRequired)
               .IsRequired();

        builder.Property(x => x.DisplayOrder)
               .IsRequired();

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}


//===============================================================
// Posting Setup History Configuration
//===============================================================

public class PostingSetupHistoryConfiguration
    : IEntityTypeConfiguration<PostingSetupHistory>
{
    public void Configure(
        EntityTypeBuilder<PostingSetupHistory> builder)
    {
        builder.ToTable("PostingSetupHistory");

        builder.HasKey(x => x.PostingSetupHistoryId);

        builder.Property(x => x.PostingSetupHistoryId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PurposeCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.OldLedgerCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.OldLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.NewLedgerCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.NewLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Reason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.ChangedBy)
               .IsRequired();

        builder.Property(x => x.ChangedByName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.ChangedDate)
               .IsRequired();

        builder.HasIndex(x => new { x.PurposeCode, x.ChangedDate })
               .HasDatabaseName("IX_PostingSetupHistory_Purpose");
    }
}
