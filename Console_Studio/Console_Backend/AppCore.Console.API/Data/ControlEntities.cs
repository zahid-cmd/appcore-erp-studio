//===============================================================
// AppCore_Control entities (tables made by 02_Control_Schema.sql)
//===============================================================

namespace AppCore.Console.API.Data;


public class Product
{
    public long ProductId { get; set; }
    public Guid PublicId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Planned";
    public int DisplayOrder { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? ModifiedDate { get; set; }
}

public class ProductModule
{
    public long ProductModuleId { get; set; }
    public long ProductId { get; set; }
    public string ModuleCode { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public bool IsCore { get; set; }
    public int DisplayOrder { get; set; }
}

public class DatabaseServer
{
    public long DatabaseServerId { get; set; }
    public string ServerCode { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 5432;
    public string CredentialKey { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public DateTime CreatedDate { get; set; }
}

public class Customer
{
    public long CustomerId { get; set; }
    public Guid PublicId { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string LegalName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string Country { get; set; } = "Bangladesh";
    public string? BinNo { get; set; }
    public string? TinNo { get; set; }
    public string? Remarks { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime CreatedDate { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public long? ModifiedBy { get; set; }
}

public class Tenant
{
    public long TenantId { get; set; }
    public Guid PublicId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public long CustomerId { get; set; }
    public long ProductId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public long? DatabaseServerId { get; set; }
    public string? DatabaseName { get; set; }
    public string TimeZone { get; set; } = "Asia/Dhaka";
    public string Currency { get; set; } = "BDT";
    public string Status { get; set; } = "Provisioning";
    public DateOnly? TrialEndsOn { get; set; }
    public string? AppVersion { get; set; }
    public string? SchemaVersion { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedDate { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public long? ModifiedBy { get; set; }
}

public class TenantDomain
{
    public long TenantDomainId { get; set; }
    public long TenantId { get; set; }
    public string HostName { get; set; } = string.Empty;
    public string DomainType { get; set; } = "Subdomain";
    public bool IsPrimary { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class TenantStatusHistory
{
    public long TenantStatusHistoryId { get; set; }
    public long TenantId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTime ChangedDate { get; set; }
    public long? ChangedBy { get; set; }
}

public class StaffRole
{
    public long StaffRoleId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class StaffUser
{
    public long StaffUserId { get; set; }
    public Guid PublicId { get; set; }
    public string LoginId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public long StaffRoleId { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; } = true;
    public string? TwoFactorSecret { get; set; }
    public int FailedLogins { get; set; }
    public DateTime? LockedUntil { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime CreatedDate { get; set; }
    public DateTime? ModifiedDate { get; set; }
}

public class AuditLogEntry
{
    public long AuditLogId { get; set; }
    public long? StaffUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? EntityName { get; set; }
    public string? EntityId { get; set; }
    public long? TenantId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedDate { get; set; }
}

// A demo / purchase request from the public website (03_Site_Requests.sql)
public class SiteRequest
{
    public long SiteRequestId { get; set; }
    public Guid PublicId { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string RequestType { get; set; } = "Demo";
    public string ProductCode { get; set; } = string.Empty;
    public string LegalName { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? BinNo { get; set; }
    public string? TinNo { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string? Designation { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? Branches { get; set; }
    public int? Users { get; set; }
    public string? PreferredSubdomain { get; set; }
    public DateOnly? PreferredDate { get; set; }
    public string? PreferredTime { get; set; }
    public string? Message { get; set; }
    public string? HeardFrom { get; set; }
    public string Status { get; set; } = "New";
    public string? StaffNotes { get; set; }
    public long? CustomerId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public long? ModifiedBy { get; set; }
}

// Website content and switches (03_Website.sql) : one JSON value per key
public class SiteSetting
{
    public string SettingKey { get; set; } = string.Empty;
    public string SettingValue { get; set; } = "{}";
    public DateTime ModifiedDate { get; set; }
    public long? ModifiedBy { get; set; }
}
