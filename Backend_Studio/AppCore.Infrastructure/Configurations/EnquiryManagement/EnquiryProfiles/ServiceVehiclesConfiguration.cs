//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Vehicles Configuration (ServiceVehicles_Tables.sql)
//===============================================================

public class ServiceVehiclesConfiguration
    : IEntityTypeConfiguration<ServiceVehicles>
{
    public void Configure(
        EntityTypeBuilder<ServiceVehicles> builder)
    {
        builder.ToTable("ServiceVehicles");

        builder.HasKey(x => x.ServiceVehicleId);

        builder.Property(x => x.ServiceVehicleId).ValueGeneratedOnAdd();

        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.RegistrationNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.ModelId).IsRequired();

        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.BrandManagementId).IsRequired();

        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.ColorName).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ServicePolicyId);

        builder.Property(x => x.PolicyCode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.WarrantyYears).IsRequired();

        builder.Property(x => x.WarrantyKm).IsRequired();

        builder.Property(x => x.WarrantyUntil);

        builder.Property(x => x.SaleDate).IsRequired();

        builder.Property(x => x.SaleSource).IsRequired().HasMaxLength(10);

        builder.Property(x => x.SaleDocType).IsRequired().HasMaxLength(30);

        builder.Property(x => x.SaleDocId);

        builder.Property(x => x.SaleDocNo).IsRequired().HasMaxLength(40);

        builder.Property(x => x.CustomerId);

        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.Mobile).IsRequired().HasMaxLength(20);

        builder.Property(x => x.BranchId).IsRequired();

        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.LastKm);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();

        builder.HasIndex(x => x.ChassisNo).HasDatabaseName("IX_ServiceVehicles_Chassis");

        builder.HasIndex(x => x.Mobile).HasDatabaseName("IX_ServiceVehicles_Mobile");
    }
}
