//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Platform.Authentication;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Authentication;


//===============================================================
// User Credential Configuration
//===============================================================

public class UserCredentialConfiguration
    : IEntityTypeConfiguration<UserCredential>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<UserCredential> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("UserCredentials");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x => x.UserCredentialId);

        builder.Property(x => x.UserCredentialId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // User Profile Reference
        //=======================================================

        builder.Property(x => x.UserProfileId)
               .IsRequired();


        //=======================================================
        // User Profile Relationship
        //=======================================================

        builder.HasOne<UserProfile>()
               .WithOne()
               .HasForeignKey<UserCredential>(
                   x => x.UserProfileId)
               .OnDelete(DeleteBehavior.Cascade);


        //=======================================================
        // User Profile Unique Constraint
        //=======================================================

        builder.HasIndex(x => x.UserProfileId)
               .IsUnique();


        //=======================================================
        // Password Hash
        //=======================================================

        builder.Property(x => x.PasswordHash)
               .IsRequired()
               .HasMaxLength(500);


        //=======================================================
        // Password Audit
        //=======================================================

        builder.Property(x => x.PasswordChangedDate);


        //=======================================================
        // Audit Information
        //=======================================================

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedDate);
    }
}