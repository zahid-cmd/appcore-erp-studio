//=============================================================== 
// Namespaces 
//=============================================================== 
 
using Microsoft.EntityFrameworkCore; 
using Microsoft.EntityFrameworkCore.Metadata.Builders; 
 
using AppCore.Domain.Entities.InfrastructureControl.LoginComponents; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Infrastructure.Configurations.InfrastructureControl.LoginComponents; 
 
 
//=============================================================== 
// LoginComponent2Configuration 
//=============================================================== 
 
public class LoginComponent2Configuration 
    : IEntityTypeConfiguration<LoginComponent2> 
{ 
 
    //=========================================================== 
    // Configure 
    //=========================================================== 
 
    public void Configure 
    ( 
        EntityTypeBuilder<LoginComponent2> builder 
    ) 
    { 
 
        //======================================================= 
        // Table 
        //======================================================= 
 
        builder.ToTable( 
            "LoginComponent2" 
        ); 
 
 
        //======================================================= 
        // Primary Key 
        //======================================================= 
 
        builder.HasKey( 
            x => x.Id 
        ); 
 
 
        builder.Property( 
            x => x.Id 
        ) 
        .HasColumnName( 
            "id" 
        ) 
        .ValueGeneratedOnAdd() 
        .UseIdentityByDefaultColumn(); 
 
 
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
        // Tab Name 
        //======================================================= 
 
        builder.Property( 
            x => x.TabName 
        ) 
        .HasColumnName( 
            "tabName" 
        ) 
        .IsRequired() 
        .HasMaxLength(200); 
 
 
        //======================================================= 
        // Icon 
        //======================================================= 
 
        builder.Property( 
            x => x.Icon 
        ) 
        .HasColumnName( 
            "icon" 
        ) 
        .IsRequired() 
        .HasMaxLength(200); 
 
 
        //======================================================= 
        // Folder Name 
        //======================================================= 
 
        builder.Property( 
            x => x.FolderName 
        ) 
        .HasColumnName( 
            "folderName" 
        ) 
        .IsRequired() 
        .HasMaxLength(200); 
 
 
        //======================================================= 
        // Feature Folder 
        //======================================================= 
 
        builder.Property( 
            x => x.FeatureFolder 
        ) 
        .HasColumnName( 
            "featureFolder" 
        ) 
        .IsRequired() 
        .HasMaxLength(200); 
 
 
        //======================================================= 
        // Feature Sub Folder 
        //======================================================= 
 
        builder.Property( 
            x => x.FeatureSubFolder 
        ) 
        .HasColumnName( 
            "featureSubFolder" 
        ) 
        .IsRequired() 
        .HasMaxLength(200); 
 
 
        //======================================================= 
        // Component Path 
        //======================================================= 
 
        builder.Property( 
            x => x.ComponentPath 
        ) 
        .HasColumnName( 
            "componentPath" 
        ) 
        .IsRequired() 
        .HasMaxLength(500); 
 
 
        //======================================================= 
        // Registration File Path 
        //======================================================= 
 
        builder.Property( 
            x => x.RegistrationFilePath 
        ) 
        .HasColumnName( 
            "registrationFilePath" 
        ) 
        .IsRequired() 
        .HasMaxLength(500); 
 
 
        //======================================================= 
        // HTML File Path 
        //======================================================= 
 
        builder.Property( 
            x => x.HtmlFilePath 
        ) 
        .HasColumnName( 
            "htmlFilePath" 
        ) 
        .IsRequired() 
        .HasMaxLength(500); 
 
 
        //======================================================= 
        // TS File Path 
        //======================================================= 
 
        builder.Property( 
            x => x.TsFilePath 
        ) 
        .HasColumnName( 
            "tsFilePath" 
        ) 
        .IsRequired() 
        .HasMaxLength(500); 
 
 
        //======================================================= 
        // CSS File Path 
        //======================================================= 
 
        builder.Property( 
            x => x.CssFilePath 
        ) 
        .HasColumnName( 
            "cssFilePath" 
        ) 
        .IsRequired() 
        .HasMaxLength(500); 
 
 
        //======================================================= 
        // Display Order 
        //======================================================= 
 
        builder.Property( 
            x => x.DisplayOrder 
        ) 
        .HasColumnName( 
            "displayOrder" 
        ) 
        .IsRequired(); 
 
 
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