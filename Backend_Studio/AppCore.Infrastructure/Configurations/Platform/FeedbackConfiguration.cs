//===============================================================
// Feedbacks table (Database\Feedback_Setup.sql)
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Platform.Feedbacks;

namespace AppCore.Infrastructure.Configurations.Platform;

public class FeedbackConfiguration : IEntityTypeConfiguration<FeedbackEntry>
{
    public void Configure(EntityTypeBuilder<FeedbackEntry> builder)
    {
        builder.ToTable("Feedbacks");

        builder.HasKey(x => x.FeedbackId);

        builder.Property(x => x.FeedbackId)
               .ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId)
               .IsUnique();

        builder.Property(x => x.Kind).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Message).IsRequired().HasMaxLength(2000);
        builder.Property(x => x.ScreenshotPath).IsRequired().HasMaxLength(400);
        builder.Property(x => x.PageUrl).IsRequired().HasMaxLength(400);
        builder.Property(x => x.PageTitle).IsRequired().HasMaxLength(200);
        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.AppVersion).IsRequired().HasMaxLength(40);
        builder.Property(x => x.UserName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.DeveloperNote).IsRequired().HasMaxLength(2000);
        builder.Property(x => x.ReplyToUser).IsRequired().HasMaxLength(2000);
        builder.Property(x => x.HandledByName).IsRequired().HasMaxLength(200);
    }
}
