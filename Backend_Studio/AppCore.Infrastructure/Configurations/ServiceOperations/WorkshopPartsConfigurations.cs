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
// Service Operations, the parts of a job card : EF configuration
// (tables made by ServiceOperations_Parts_Engine.sql; hand-written
// pages, no Code Sync). No database defaults for booleans.
//===============================================================

public class WorkshopPartsConfigurations
    : IEntityTypeConfiguration<PartsRequisitions>,
      IEntityTypeConfiguration<PartsRequisitionLines>,
      IEntityTypeConfiguration<PartsIssues>,
      IEntityTypeConfiguration<PartsIssueLines>,
      IEntityTypeConfiguration<PartsReturns>,
      IEntityTypeConfiguration<PartsReturnLines>,
      IEntityTypeConfiguration<PartsReturnAllocations>
{
    public void Configure(EntityTypeBuilder<PartsRequisitions> builder)
    {
        builder.ToTable("PartsRequisitions");

        builder.HasKey(x => x.PartsRequisitionId);

        builder.Property(x => x.PartsRequisitionId).ValueGeneratedOnAdd();
        builder.Property(x => x.RequisitionNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(15);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<PartsRequisitionLines> builder)
    {
        builder.ToTable("PartsRequisitionLines");

        builder.HasKey(x => x.PartsRequisitionLineId);

        builder.Property(x => x.PartsRequisitionLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.IssuedQuantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<PartsIssues> builder)
    {
        builder.ToTable("PartsIssues");

        builder.HasKey(x => x.PartsIssueId);

        builder.Property(x => x.PartsIssueId).ValueGeneratedOnAdd();
        builder.Property(x => x.IssueNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(15);
        builder.Property(x => x.TotalCost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
    }

    public void Configure(EntityTypeBuilder<PartsIssueLines> builder)
    {
        builder.ToTable("PartsIssueLines");

        builder.HasKey(x => x.PartsIssueLineId);

        builder.Property(x => x.PartsIssueLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Cost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ReturnedQuantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.ReturnedCost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.WipLedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<PartsReturns> builder)
    {
        builder.ToTable("PartsReturns");

        builder.HasKey(x => x.PartsReturnId);

        builder.Property(x => x.PartsReturnId).ValueGeneratedOnAdd();
        builder.Property(x => x.ReturnNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(15);
        builder.Property(x => x.TotalCost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
    }

    public void Configure(EntityTypeBuilder<PartsReturnLines> builder)
    {
        builder.ToTable("PartsReturnLines");

        builder.HasKey(x => x.PartsReturnLineId);

        builder.Property(x => x.PartsReturnLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Cost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<PartsReturnAllocations> builder)
    {
        builder.ToTable("PartsReturnAllocations");

        builder.HasKey(x => x.PartsReturnAllocationId);

        builder.Property(x => x.PartsReturnAllocationId).ValueGeneratedOnAdd();
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(18, 4);
        builder.Property(x => x.Value).IsRequired().HasPrecision(18, 2);
    }
}
