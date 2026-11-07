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
// Customer Files : EF configurations (tables made by
// CustomerFiles_Tables.sql; hand-written page). No database
// defaults for booleans / numbers : EF would skip a 'false' / 0.
//===============================================================

public class CustomerFilesConfiguration
    : IEntityTypeConfiguration<CustomerFiles>
{
    public void Configure(EntityTypeBuilder<CustomerFiles> builder)
    {
        builder.ToTable("CustomerFiles");

        builder.HasKey(x => x.CustomerFileId);

        builder.Property(x => x.CustomerFileId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_CustomerFiles_PublicId");

        builder.Property(x => x.CustomerFileNo).IsRequired().HasMaxLength(60);

        builder.HasIndex(x => x.CustomerFileNo).IsUnique().HasDatabaseName("UX_CustomerFiles_No");

        builder.Property(x => x.Source).IsRequired().HasMaxLength(20);

        builder.Property(x => x.FileDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.BranchId).IsRequired();

        builder.Property(x => x.SalesInvoiceNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.SalesInvoiceDate).HasColumnType("date");

        builder.Property(x => x.SalesmanName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.MotorBikeId).IsRequired();

        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.VehiclePower).IsRequired().HasMaxLength(20);

        builder.Property(x => x.OriginalCustomerId).IsRequired();

        builder.Property(x => x.CurrentCustomerId).IsRequired();

        builder.Property(x => x.RegistrationBy).IsRequired().HasMaxLength(20);

        builder.Property(x => x.RegistrationFileNo).IsRequired().HasMaxLength(60);

        builder.Property(x => x.TransferCount).IsRequired();

        builder.Property(x => x.FileReadyDate).HasColumnType("date");

        builder.Property(x => x.CollectedDate).HasColumnType("date");

        builder.Property(x => x.Status).IsRequired().HasMaxLength(30);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class CustomerFileNameTransfersConfiguration
    : IEntityTypeConfiguration<CustomerFileNameTransfers>
{
    public void Configure(EntityTypeBuilder<CustomerFileNameTransfers> builder)
    {
        builder.ToTable("CustomerFileNameTransfers");

        builder.HasKey(x => x.NameTransferId);

        builder.Property(x => x.NameTransferId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_CustomerFileNameTransfers_PublicId");

        builder.Property(x => x.TransferNo).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.TransferNo).IsUnique().HasDatabaseName("UX_CustomerFileNameTransfers_No");

        builder.Property(x => x.CustomerFileId).IsRequired();

        builder.Property(x => x.TransferDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.FromCustomerId).IsRequired();

        builder.Property(x => x.ToCustomerId).IsRequired();

        builder.Property(x => x.FeeAmount).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.DocumentCodes).IsRequired().HasMaxLength(500);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
