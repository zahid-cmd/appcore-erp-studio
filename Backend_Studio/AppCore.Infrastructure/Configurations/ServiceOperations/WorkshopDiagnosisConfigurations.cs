//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.ServiceOperations;


//===============================================================
// Service Operations : observations and diagnoses (tables made by
// ServiceOperations_Diagnosis_Engine.sql; hand-written, no Code
// Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class WorkshopDiagnosisConfigurations
    : IEntityTypeConfiguration<WorkshopObservations>,
      IEntityTypeConfiguration<WorkshopDiagnoses>,
      IEntityTypeConfiguration<WorkshopDiagnosisItems>,
      IEntityTypeConfiguration<ServiceEstimateObservations>
{
    public void Configure(EntityTypeBuilder<WorkshopObservations> builder)
    {
        builder.ToTable("WorkshopObservations");
        builder.HasKey(x => x.WorkshopObservationId);
        builder.Property(x => x.WorkshopObservationId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<WorkshopDiagnoses> builder)
    {
        builder.ToTable("WorkshopDiagnoses");
        builder.HasKey(x => x.WorkshopDiagnosisId);
        builder.Property(x => x.WorkshopDiagnosisId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<WorkshopDiagnosisItems> builder)
    {
        builder.ToTable("WorkshopDiagnosisItems");
        builder.HasKey(x => x.WorkshopDiagnosisItemId);
        builder.Property(x => x.WorkshopDiagnosisItemId).ValueGeneratedOnAdd();
        builder.Property(x => x.LineType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(60);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).HasPrecision(18, 3);
    }

    public void Configure(EntityTypeBuilder<ServiceEstimateObservations> builder)
    {
        builder.ToTable("ServiceEstimateObservations");
        builder.HasKey(x => x.ServiceEstimateObservationId);
        builder.Property(x => x.ServiceEstimateObservationId).ValueGeneratedOnAdd();
        builder.Property(x => x.Observation).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Diagnosis).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(300);
    }
}
