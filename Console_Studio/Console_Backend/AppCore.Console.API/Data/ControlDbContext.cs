//===============================================================
// AppCore_Control database context
// --------------------------------------------------------------
// Tables and columns are created by Console_Studio\Database\
// 02_Control_Schema.sql (no EF migrations); names match exactly.
//===============================================================

using Microsoft.EntityFrameworkCore;

namespace AppCore.Console.API.Data;


public class ControlDbContext : DbContext
{
    public ControlDbContext(DbContextOptions<ControlDbContext> options)
        : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductModule> ProductModules => Set<ProductModule>();
    public DbSet<DatabaseServer> DatabaseServers => Set<DatabaseServer>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantDomain> TenantDomains => Set<TenantDomain>();
    public DbSet<TenantStatusHistory> TenantStatusHistory => Set<TenantStatusHistory>();
    public DbSet<StaffRole> StaffRoles => Set<StaffRole>();
    public DbSet<StaffUser> StaffUsers => Set<StaffUser>();
    public DbSet<AuditLogEntry> AuditLog => Set<AuditLogEntry>();
    public DbSet<SiteRequest> SiteRequests => Set<SiteRequest>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Product>(e =>
        {
            e.ToTable("Products");
            e.HasKey(x => x.ProductId);
            e.Property(x => x.PublicId).HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });

        b.Entity<ProductModule>(e =>
        {
            e.ToTable("ProductModules");
            e.HasKey(x => x.ProductModuleId);
        });

        b.Entity<DatabaseServer>(e =>
        {
            e.ToTable("DatabaseServers");
            e.HasKey(x => x.DatabaseServerId);
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });

        b.Entity<Customer>(e =>
        {
            e.ToTable("Customers");
            e.HasKey(x => x.CustomerId);
            e.Property(x => x.PublicId).HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });

        b.Entity<Tenant>(e =>
        {
            e.ToTable("Tenants");
            e.HasKey(x => x.TenantId);
            e.Property(x => x.PublicId).HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });

        b.Entity<TenantDomain>(e =>
        {
            e.ToTable("TenantDomains");
            e.HasKey(x => x.TenantDomainId);
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });

        b.Entity<TenantStatusHistory>(e =>
        {
            e.ToTable("TenantStatusHistory");
            e.HasKey(x => x.TenantStatusHistoryId);
            e.Property(x => x.ChangedDate).HasDefaultValueSql("now()");
        });

        b.Entity<StaffRole>(e =>
        {
            e.ToTable("StaffRoles");
            e.HasKey(x => x.StaffRoleId);
        });

        b.Entity<StaffUser>(e =>
        {
            e.ToTable("StaffUsers");
            e.HasKey(x => x.StaffUserId);
            e.Property(x => x.PublicId).HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });

        b.Entity<SiteRequest>(e =>
        {
            e.ToTable("SiteRequests");
            e.HasKey(x => x.SiteRequestId);
            e.Property(x => x.PublicId).HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });

        b.Entity<SiteSetting>(e =>
        {
            e.ToTable("SiteSettings");
            e.HasKey(x => x.SettingKey);
        });

        b.Entity<AuditLogEntry>(e =>
        {
            e.ToTable("AuditLog");
            e.HasKey(x => x.AuditLogId);
            e.Property(x => x.CreatedDate).HasDefaultValueSql("now()");
        });
    }
}
