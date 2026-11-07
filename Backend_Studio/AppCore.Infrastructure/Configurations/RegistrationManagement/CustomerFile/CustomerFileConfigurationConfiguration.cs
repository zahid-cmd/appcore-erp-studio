//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.RegistrationManagement.CustomerFile;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.RegistrationManagement.CustomerFile;


//===============================================================
// Customer File Configuration : EF configurations (tables made by
// CustomerFileConfiguration_Tables.sql; hand-written page). No
// database defaults for booleans : EF would skip a 'false' value.
//===============================================================

public class CustomerFileNameTransferRulesConfiguration
    : IEntityTypeConfiguration<CustomerFileNameTransferRules>
{
    public void Configure(EntityTypeBuilder<CustomerFileNameTransferRules> builder)
    {
        builder.ToTable("CustomerFileNameTransferRules");

        builder.HasKey(x => x.NameTransferRuleId);

        builder.Property(x => x.NameTransferRuleId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_CustomerFileNameTransferRules_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_CustomerFileNameTransferRules_Code");

        builder.Property(x => x.EffectiveFrom).IsRequired().HasColumnType("date");

        builder.Property(x => x.TransfersAllowed).IsRequired();

        builder.Property(x => x.FeePerTransfer).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class CustomerFileDeliveryRulesConfiguration
    : IEntityTypeConfiguration<CustomerFileDeliveryRules>
{
    public void Configure(EntityTypeBuilder<CustomerFileDeliveryRules> builder)
    {
        builder.ToTable("CustomerFileDeliveryRules");

        builder.HasKey(x => x.DeliveryRuleId);

        builder.Property(x => x.DeliveryRuleId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_CustomerFileDeliveryRules_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_CustomerFileDeliveryRules_Code");

        builder.Property(x => x.EffectiveFrom).IsRequired().HasColumnType("date");

        builder.Property(x => x.FreeDays).IsRequired();

        builder.Property(x => x.FirstYearAmount).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.SecondYearAmount).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.PerYearAmount).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class CustomerFileDocumentsConfiguration
    : IEntityTypeConfiguration<CustomerFileDocuments>
{
    public void Configure(EntityTypeBuilder<CustomerFileDocuments> builder)
    {
        builder.ToTable("CustomerFileDocuments");

        builder.HasKey(x => x.CustomerFileDocumentId);

        builder.Property(x => x.CustomerFileDocumentId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_CustomerFileDocuments_PublicId");

        builder.Property(x => x.DocumentFor).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_CustomerFileDocuments_Code");

        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);

        builder.Property(x => x.IsRequired).IsRequired();

        builder.Property(x => x.DisplayOrder).IsRequired();

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
