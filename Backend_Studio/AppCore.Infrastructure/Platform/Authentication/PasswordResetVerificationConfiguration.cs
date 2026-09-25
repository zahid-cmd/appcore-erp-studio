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
// Password Reset Verification Configuration
//===============================================================

public class PasswordResetVerificationConfiguration
    : IEntityTypeConfiguration<PasswordResetVerification>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PasswordResetVerification> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "PasswordResetVerifications"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x =>
                x.PasswordResetVerificationId
        );


        builder.Property(
            x =>
                x.PasswordResetVerificationId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // User Profile Reference
        //=======================================================

        builder.Property(
            x =>
                x.UserProfileId
        )
        .IsRequired();


        //=======================================================
        // User Profile Relationship
        //=======================================================

        builder.HasOne<UserProfile>()
        .WithMany()
        .HasForeignKey(
            x =>
                x.UserProfileId
        )
        .OnDelete(
            DeleteBehavior.Cascade
        );


        //=======================================================
        // Verification Code Hash
        //=======================================================

        builder.Property(
            x =>
                x.CodeHash
        )
        .IsRequired()
        .HasMaxLength(
            500
        );


        //=======================================================
        // Expiration
        //=======================================================

        builder.Property(
            x =>
                x.ExpiresAt
        )
        .IsRequired();


        //=======================================================
        // Used Date
        //=======================================================

        builder.Property(
            x =>
                x.UsedAt
        );


        //=======================================================
        // Attempt Count
        //=======================================================

        builder.Property(
            x =>
                x.AttemptCount
        )
        .IsRequired()
        .HasDefaultValue(
            0
        );


        //=======================================================
        // Created Date
        //=======================================================

        builder.Property(
            x =>
                x.CreatedDate
        )
        .IsRequired();
    }
}