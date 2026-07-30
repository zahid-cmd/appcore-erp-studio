//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations;


//===============================================================
// Activity History Configuration
//===============================================================

public class ActivityHistoryConfiguration :
    IEntityTypeConfiguration<ActivityHistory>
{

    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ActivityHistory> builder)
    {

        //===========================================================
        // Table
        //===========================================================

        builder.ToTable(
            "ActivityHistories"
        );


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(
            x => x.Id
        );


        //===========================================================
        // Id
        //===========================================================

        builder.Property(
            x => x.Id
        )
        .ValueGeneratedOnAdd();



        //===========================================================
        // Module
        //===========================================================

        builder.Property(
            x => x.Module
        )
        .HasMaxLength(100)
        .IsRequired();



        //===========================================================
        // Entity Name
        //===========================================================

        builder.Property(
            x => x.EntityName
        )
        .HasMaxLength(150)
        .IsRequired();



        //===========================================================
        // Entity Id
        //===========================================================

        builder.Property(
            x => x.EntityId
        )
        .IsRequired();



        //===========================================================
        // Activity Type
        //===========================================================

        builder.Property(
            x => x.ActivityType
        )
        .HasMaxLength(50)
        .IsRequired();



        //===========================================================
        // Activity Title
        //===========================================================

        builder.Property(
            x => x.ActivityTitle
        )
        .HasMaxLength(200)
        .IsRequired();



        //===========================================================
        // Activity Description
        //===========================================================

        builder.Property(
            x => x.ActivityDescription
        )
        .HasMaxLength(1000);



        //===========================================================
        // User
        //===========================================================

        builder.Property(
            x => x.PerformedByName
        )
        .HasMaxLength(150)
        .IsRequired();



        builder.Property(
            x => x.PerformedBy
        )
        .IsRequired();



        //===========================================================
        // Date
        //===========================================================

        builder.Property(
            x => x.PerformedDate
        )
        .IsRequired();



        //===========================================================
        // Indexes
        //===========================================================

        builder.HasIndex(
            x => new
            {
                x.Module,
                x.EntityName,
                x.EntityId
            });


        builder.HasIndex(
            x => x.PerformedDate);

    }
}