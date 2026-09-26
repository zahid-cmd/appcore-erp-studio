//=============================================================== 
// Imports 
//=============================================================== 
 
using AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration; 
 
using Microsoft.EntityFrameworkCore; 
using Microsoft.EntityFrameworkCore.Metadata.Builders; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Infrastructure.Configurations.InfrastructureControl.ApplicationConfiguration; 
 
 
//=============================================================== 
// Widget Configuration Configuration 
//=============================================================== 
 
public class WidgetConfigurationConfiguration 
    : 
    IEntityTypeConfiguration<WidgetConfiguration>, 
    IEntityTypeConfiguration<WidgetConfigurationDetail> 
{ 
    //=========================================================== 
    // Widget Configuration 
    //=========================================================== 
 
    public void Configure 
    ( 
        EntityTypeBuilder<WidgetConfiguration> builder 
    ) 
    { 
        //======================================================= 
        // Table 
        //======================================================= 
 
        builder.ToTable( 
            "WidgetConfigurations" 
        ); 
 
 
        //======================================================= 
        // Primary Key 
        //======================================================= 
 
        builder.HasKey( 
            x => x.WidgetConfigurationId 
        ); 
 
 
        builder.Property( 
            x => x.WidgetConfigurationId 
        ) 
        .ValueGeneratedOnAdd(); 
 
 
        //======================================================= 
        // Dashboard 
        //======================================================= 
 
        builder.Property( 
            x => x.DashboardId 
        ) 
        .IsRequired(); 
 
 
        //======================================================= 
        // Status 
        // 
        // Explicitly sent by EF. 
        // Do not depend on database default values. 
        //======================================================= 
 
        builder.Property( 
            x => x.IsActive 
        ) 
        .IsRequired() 
        .ValueGeneratedNever(); 
 
 
        builder.Property( 
            x => x.IsDeleted 
        ) 
        .IsRequired() 
        .ValueGeneratedNever(); 
 
 
        //======================================================= 
        // Audit 
        //======================================================= 
 
        builder.Property( 
            x => x.CreatedBy 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.CreatedDate 
        ) 
        .IsRequired(); 
 
 
        builder.Property( 
            x => x.ModifiedBy 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.ModifiedDate 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.DeletedBy 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.DeletedDate 
        ) 
        .IsRequired(false); 
 
 
        //======================================================= 
        // Relationship : Details 
        //======================================================= 
 
        builder 
            .HasMany( 
                x => x.Details 
            ) 
            .WithOne( 
                x => x.WidgetConfiguration 
            ) 
            .HasForeignKey( 
                x => x.WidgetConfigurationId 
            ) 
            .OnDelete( 
                DeleteBehavior.Cascade 
            ); 
 
 
        //======================================================= 
        // Indexes 
        //======================================================= 
 
        builder 
            .HasIndex( 
                x => x.DashboardId 
            ) 
            .IsUnique(); 
 
 
        builder.HasIndex( 
            x => x.IsActive 
        ); 
 
 
        builder.HasIndex( 
            x => x.IsDeleted 
        ); 
    } 
 
 
    //=========================================================== 
    // Widget Configuration Detail 
    //=========================================================== 
 
    public void Configure 
    ( 
        EntityTypeBuilder<WidgetConfigurationDetail> builder 
    ) 
    { 
        //======================================================= 
        // Table 
        //======================================================= 
 
        builder.ToTable( 
            "WidgetConfigurationDetails" 
        ); 
 
 
        //======================================================= 
        // Primary Key 
        //======================================================= 
 
        builder.HasKey( 
            x => x.WidgetConfigurationDetailId 
        ); 
 
 
        builder.Property( 
            x => x.WidgetConfigurationDetailId 
        ) 
        .ValueGeneratedOnAdd(); 
 
 
        //======================================================= 
        // Foreign Key 
        //======================================================= 
 
        builder.Property( 
            x => x.WidgetConfigurationId 
        ) 
        .IsRequired(); 
 
 
        //======================================================= 
        // Widget 
        //======================================================= 
 
        builder.Property( 
            x => x.WidgetId 
        ) 
        .IsRequired(); 
 
 
        //======================================================= 
        // Layout 
        //======================================================= 
 
        builder.Property( 
            x => x.ColumnSpan 
        ) 
        .IsRequired() 
        .HasDefaultValue(12); 
 
 
        builder.Property( 
            x => x.DisplayOrder 
        ) 
        .IsRequired() 
        .HasDefaultValue(1); 
 
 
        //======================================================= 
        // Status 
        // 
        // Explicitly sent by EF. 
        //======================================================= 
 
        builder.Property( 
            x => x.IsActive 
        ) 
        .IsRequired() 
        .ValueGeneratedNever(); 
 
 
        builder.Property( 
            x => x.IsDeleted 
        ) 
        .IsRequired() 
        .ValueGeneratedNever(); 
 
 
        //======================================================= 
        // Audit 
        //======================================================= 
 
        builder.Property( 
            x => x.CreatedBy 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.CreatedDate 
        ) 
        .IsRequired(); 
 
 
        builder.Property( 
            x => x.ModifiedBy 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.ModifiedDate 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.DeletedBy 
        ) 
        .IsRequired(false); 
 
 
        builder.Property( 
            x => x.DeletedDate 
        ) 
        .IsRequired(false); 
 
 
        //======================================================= 
        // Relationship : Header 
        //======================================================= 
 
        builder 
            .HasOne( 
                x => x.WidgetConfiguration 
            ) 
            .WithMany( 
                x => x.Details 
            ) 
            .HasForeignKey( 
                x => x.WidgetConfigurationId 
            ) 
            .OnDelete( 
                DeleteBehavior.Cascade 
            ); 
 
 
        //======================================================= 
        // Indexes 
        //======================================================= 
 
        builder.HasIndex( 
            x => x.WidgetConfigurationId 
        ); 
 
 
        builder.HasIndex( 
            x => x.WidgetId 
        ); 
 
 
        builder.HasIndex( 
            x => x.IsActive 
        ); 
 
 
        builder.HasIndex( 
            x => x.IsDeleted 
        ); 
 
 
        //======================================================= 
        // Unique Detail 
        //======================================================= 
 
        builder 
            .HasIndex( 
                x => new 
                { 
                    x.WidgetConfigurationId, 
                    x.WidgetId 
                } 
            ) 
            .IsUnique(); 
    } 
}