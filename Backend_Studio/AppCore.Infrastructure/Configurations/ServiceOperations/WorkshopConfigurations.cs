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
// Service Operations, the workshop : EF configuration (tables made
// by ServiceOperations_Workshop_Engine.sql; hand-written pages, no
// Code Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class WorkshopConfigurations
    : IEntityTypeConfiguration<WorkshopBays>,
      IEntityTypeConfiguration<WorkshopTechnicians>,
      IEntityTypeConfiguration<WorkshopChecklistItems>,
      IEntityTypeConfiguration<WorkshopConfiguration>,
      IEntityTypeConfiguration<JobCards>,
      IEntityTypeConfiguration<JobCardComplaints>,
      IEntityTypeConfiguration<JobCardServices>,
      IEntityTypeConfiguration<JobCardParts>,
      IEntityTypeConfiguration<JobCardWorkEntries>,
      IEntityTypeConfiguration<JobCardTechnicians>,
      IEntityTypeConfiguration<JobCardObservations>,
      IEntityTypeConfiguration<WorkshopServiceBikes>,
      IEntityTypeConfiguration<JobCardChecklist>,
      IEntityTypeConfiguration<JobCardStatusHistory>
{
    public void Configure(EntityTypeBuilder<WorkshopBays> builder)
    {
        builder.ToTable("WorkshopBays");
        builder.HasKey(x => x.WorkshopBayId);
        builder.Property(x => x.WorkshopBayId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<WorkshopTechnicians> builder)
    {
        builder.ToTable("WorkshopTechnicians");
        builder.HasKey(x => x.WorkshopTechnicianId);
        builder.Property(x => x.WorkshopTechnicianId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Skill).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<WorkshopChecklistItems> builder)
    {
        builder.ToTable("WorkshopChecklistItems");
        builder.HasKey(x => x.WorkshopChecklistItemId);
        builder.Property(x => x.WorkshopChecklistItemId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<WorkshopConfiguration> builder)
    {
        builder.ToTable("WorkshopConfiguration");
        builder.HasKey(x => x.WorkshopConfigurationId);
        builder.Property(x => x.WorkshopConfigurationId).ValueGeneratedOnAdd();
        builder.Property(x => x.RequireKm).IsRequired();
        builder.Property(x => x.RequireChecklist).IsRequired();
        builder.Property(x => x.RequireEstimate).IsRequired();
        builder.Property(x => x.IssueWithoutRequisition).IsRequired();
        builder.Property(x => x.IssueToMultipleJobs).IsRequired();
        builder.Property(x => x.IssueBulkPerJob).IsRequired();
        builder.Property(x => x.AllowCreditInvoice).IsRequired();
        builder.Property(x => x.DiagnosisSuggests).IsRequired();
    }

    public void Configure(EntityTypeBuilder<JobCards> builder)
    {
        builder.ToTable("JobCards");
        builder.HasKey(x => x.JobCardId);
        builder.Property(x => x.JobCardId).ValueGeneratedOnAdd();
        builder.Property(x => x.JobCardNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.WelcomeTokenNo).IsRequired().HasMaxLength(20);
        builder.Property(x => x.DeliveryTokenNo).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.RegistrationNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ColorName).IsRequired().HasMaxLength(60);
        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Mobile).IsRequired().HasMaxLength(20);
        builder.Property(x => x.FuelLevel).IsRequired().HasMaxLength(15);
        builder.Property(x => x.JobType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.BasicRequirement).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.PickupDrop).IsRequired();
        builder.Property(x => x.Status).IsRequired().HasMaxLength(15);
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(300);
        builder.Property(x => x.LabourTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PartsTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<JobCardComplaints> builder)
    {
        builder.ToTable("JobCardComplaints");
        builder.HasKey(x => x.JobCardComplaintId);
        builder.Property(x => x.JobCardComplaintId).ValueGeneratedOnAdd();
        builder.Property(x => x.Complaint).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Result).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ResultNote).IsRequired().HasMaxLength(300);
    }

    public void Configure(EntityTypeBuilder<JobCardServices> builder)
    {
        builder.ToTable("JobCardServices");
        builder.HasKey(x => x.JobCardServiceId);
        builder.Property(x => x.JobCardServiceId).ValueGeneratedOnAdd();
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Rate).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.IsFree).IsRequired();
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<JobCardParts> builder)
    {
        builder.ToTable("JobCardParts");
        builder.HasKey(x => x.JobCardPartId);
        builder.Property(x => x.JobCardPartId).ValueGeneratedOnAdd();
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Rate).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<JobCardWorkEntries> builder)
    {
        builder.ToTable("JobCardWorkEntries");
        builder.HasKey(x => x.JobCardWorkEntryId);
        builder.Property(x => x.JobCardWorkEntryId).ValueGeneratedOnAdd();
        builder.Property(x => x.WorkNote).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<JobCardTechnicians> builder)
    {
        builder.ToTable("JobCardTechnicians");
        builder.HasKey(x => x.JobCardTechnicianId);
        builder.Property(x => x.JobCardTechnicianId).ValueGeneratedOnAdd();
    }

    public void Configure(EntityTypeBuilder<JobCardObservations> builder)
    {
        builder.ToTable("JobCardObservations");
        builder.HasKey(x => x.JobCardObservationId);
        builder.Property(x => x.JobCardObservationId).ValueGeneratedOnAdd();
        builder.Property(x => x.Observation).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Result).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ResultNote).IsRequired().HasMaxLength(300);
    }

    public void Configure(EntityTypeBuilder<WorkshopServiceBikes> builder)
    {
        builder.ToTable("WorkshopServiceBikes");
        builder.HasKey(x => x.WorkshopServiceBikeId);
        builder.Property(x => x.WorkshopServiceBikeId).ValueGeneratedOnAdd();
        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<JobCardChecklist> builder)
    {
        builder.ToTable("JobCardChecklist");
        builder.HasKey(x => x.JobCardChecklistId);
        builder.Property(x => x.JobCardChecklistId).ValueGeneratedOnAdd();
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Result).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<JobCardStatusHistory> builder)
    {
        builder.ToTable("JobCardStatusHistory");
        builder.HasKey(x => x.JobCardStatusHistoryId);
        builder.Property(x => x.JobCardStatusHistoryId).ValueGeneratedOnAdd();
        builder.Property(x => x.Status).IsRequired().HasMaxLength(15);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(300);
    }
}
