//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.SparePartsLubricantPurchase;


//===============================================================
// PurchaseReturnsSpConfiguration
//===============================================================

public class PurchaseReturnsSpConfiguration
    : IEntityTypeConfiguration<PurchaseReturnsSp>
{

    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<PurchaseReturnsSp> builder
    )
    {

        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "PurchaseReturnsSp"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.Id
        );


        // Public Id (links and API calls; uuid v7)

        builder.Property(x => x.PublicId)

               .IsRequired()

               .HasDefaultValueSql("uuidv7()");


        builder.HasIndex(x => x.PublicId)

               .IsUnique()

               .HasDatabaseName("UX_PurchaseReturnsSp_PublicId");


        builder.Property(
            x => x.Id
        )
        .HasColumnName(
            "id"
        );


        //=======================================================
        // Code
        //=======================================================

        builder.Property(
            x => x.Code
        )
        .HasColumnName(
            "code"
        )
        .IsRequired()
        .HasMaxLength(50);


        //=======================================================
        // Name
        //=======================================================

        builder.Property(
            x => x.Name
        )
        .HasColumnName(
            "name"
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Sample Search Dropdown
        //=======================================================

        builder.Property(
            x => x.SampleSearchDropdownId
        )
        .HasColumnName(
            "sampleSearchDropdownId"
        )
        .IsRequired(false);


        //=======================================================
        // Sample Field
        //=======================================================

        builder.Property(
            x => x.SampleField
        )
        .HasColumnName(
            "sampleField"
        )
        .IsRequired()
        .HasMaxLength(500);


        //=======================================================
        // Status
        //=======================================================

        builder.Property(
            x => x.Status
        )
        .HasColumnName(
            "status"
        )
        .IsRequired();


        //=======================================================
        // Remarks
        //=======================================================

        builder.Property(
            x => x.Remarks
        )
        .HasColumnName(
            "remarks"
        )
        .IsRequired()
        .HasMaxLength(1000);


        //=======================================================
        // Active
        //=======================================================

        builder.Property(
            x => x.IsActive
        )
        .HasColumnName(
            "isActive"
        )
        .IsRequired();


        //=======================================================
        // Deleted
        //=======================================================

        builder.Property(
            x => x.IsDeleted
        )
        .HasColumnName(
            "isDeleted"
        )
        .IsRequired();


        //=======================================================
        // Created By
        //=======================================================

        builder.Property(
            x => x.CreatedBy
        )
        .HasColumnName(
            "createdBy"
        )
        .IsRequired();


        //=======================================================
        // Created Date
        //=======================================================

        builder.Property(
            x => x.CreatedDate
        )
        .HasColumnName(
            "createdDate"
        )
        .IsRequired();


        //=======================================================
        // Modified By
        //=======================================================

        builder.Property(
            x => x.ModifiedBy
        )
        .HasColumnName(
            "modifiedBy"
        )
        .IsRequired(false);


        //=======================================================
        // Modified Date
        //=======================================================

        builder.Property(
            x => x.ModifiedDate
        )
        .HasColumnName(
            "modifiedDate"
        )
        .IsRequired(false);
    }

}