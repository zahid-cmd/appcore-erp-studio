//===============================================================
// User Favorites : EF configuration
//
// Applied only because AppDbContext has a DbSet for it
// (UserFavoriteRows, "Platform Shell" section).
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Platform.Shell;


namespace AppCore.Infrastructure.Platform.Shell;


public class UserFavoritesConfiguration : IEntityTypeConfiguration<UserFavorites>
{
    public void Configure(EntityTypeBuilder<UserFavorites> builder)
    {
        builder.ToTable("UserFavorites");

        builder.HasKey(x => x.UserFavoriteId);

        builder.Property(x => x.UserFavoriteId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.UserProfileId)
               .IsRequired();

        builder.Property(x => x.NavigationSubmenuId)
               .IsRequired();

        builder.Property(x => x.SortOrder)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        // A page is a favorite of a user at most once
        builder.HasIndex(x => new { x.UserProfileId, x.NavigationSubmenuId })
               .IsUnique()
               .HasDatabaseName("UX_UserFavorites_User_Submenu");
    }
}