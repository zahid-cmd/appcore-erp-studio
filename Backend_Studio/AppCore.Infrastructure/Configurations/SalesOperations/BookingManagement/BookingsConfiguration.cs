//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.SalesOperations.BookingManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.BookingManagement;


//===============================================================
// Bookings / Booking Collections : EF configuration (tables made
// by BookingsMB_Engine.sql; hand-written page). No database
// defaults for booleans / numbers : EF would skip a 'false' / 0.
//===============================================================

public class BookingsConfiguration
    : IEntityTypeConfiguration<Bookings>
{
    public void Configure(EntityTypeBuilder<Bookings> builder)
    {
        builder.ToTable("Bookings");

        builder.HasKey(x => x.BookingId);

        builder.Property(x => x.BookingId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_Bookings_PublicId");

        builder.Property(x => x.BookingNo).IsRequired().HasMaxLength(40);

        builder.HasIndex(x => x.BookingNo).IsUnique().HasDatabaseName("UX_Bookings_No");

        builder.Property(x => x.BookingDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.CustomerCode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.CustomerPhone).IsRequired().HasMaxLength(20);

        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(250);

        builder.Property(x => x.ValidUntil).HasColumnType("date");

        builder.Property(x => x.ExpectedDate).HasColumnType("date");

        builder.Property(x => x.SalesPersonName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.AdvanceAmount).HasPrecision(18, 2);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);

        builder.Property(x => x.SalesInvoiceNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ConvertedDate).HasColumnType("date");

        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);

        builder.Property(x => x.ForfeitAmount).HasPrecision(18, 2);

        builder.Property(x => x.ForfeitVoucherNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.RefundAmount).HasPrecision(18, 2);
    }
}


public class BookingCollectionsConfiguration
    : IEntityTypeConfiguration<BookingCollections>
{
    public void Configure(EntityTypeBuilder<BookingCollections> builder)
    {
        builder.ToTable("BookingCollections");

        builder.HasKey(x => x.BookingCollectionId);

        builder.Property(x => x.BookingCollectionId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_BookingCollections_PublicId");

        builder.Property(x => x.CollectionDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.Amount).HasPrecision(18, 2);

        builder.Property(x => x.ReceiptVoucherNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.HasIndex(x => x.BookingId).HasDatabaseName("IX_BookingCollections_Booking");
    }
}
