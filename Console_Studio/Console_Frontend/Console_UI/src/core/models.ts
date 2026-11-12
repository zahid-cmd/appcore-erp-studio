//===============================================================
// Console API shapes
//===============================================================

export interface StaffMe
{
    PublicId: string;
    LoginId: string;
    FullName: string;
    Email: string | null;
    RoleCode: string;
    RoleName: string;
    MustChangePassword: boolean;
    LastLoginDate: string | null;
}

export interface LoginResult
{
    token: string;
    expiresUtc: string;
    user: StaffMe;
}

export interface ProductRow
{
    PublicId: string;
    ProductCode: string;
    ProductName: string;
    Industry: string;
    Description: string | null;
    Status: 'Planned' | 'Active' | 'Retired';
    Tenants: number;
    Modules: number;
}

export interface CustomerRow
{
    PublicId: string;
    CustomerCode: string;
    LegalName: string;
    DisplayName: string;
    Phone: string | null;
    Email: string | null;
    Status: string;
    Tenants: number;
}

export interface Customer
{
    PublicId: string;
    CustomerCode: string;
    LegalName: string;
    DisplayName: string;
    Phone: string | null;
    Email: string | null;
    Address: string | null;
    Country: string;
    BinNo: string | null;
    TinNo: string | null;
    Remarks: string | null;
    Status: string;
}

export interface CustomerSave
{
    LegalName: string;
    DisplayName: string | null;
    Phone: string | null;
    Email: string | null;
    Address: string | null;
    Country: string | null;
    BinNo: string | null;
    TinNo: string | null;
    Remarks: string | null;
    Status: string | null;
}

export const TENANT_STATUSES =
    ['Provisioning', 'Trial', 'Active', 'Grace', 'ReadOnly', 'Suspended', 'Cancelled'] as const;

export interface TenantRow
{
    PublicId: string;
    TenantCode: string;
    DisplayName: string;
    Status: string;
    TrialEndsOn: string | null;
    DatabaseName: string | null;
    AppVersion: string | null;
    CustomerPublicId: string;
    CustomerName: string;
    ProductCode: string;
    ProductName: string;
    PrimaryHost: string | null;
    CreatedDate: string;
}

export interface TenantDetail
{
    PublicId: string;
    TenantCode: string;
    DisplayName: string;
    Status: string;
    TrialEndsOn: string | null;
    DatabaseServerId: number | null;
    DatabaseName: string | null;
    TimeZone: string;
    Currency: string;
    AppVersion: string | null;
    SchemaVersion: string | null;
    Remarks: string | null;
    CreatedDate: string;
    CustomerPublicId: string;
    CustomerName: string;
    ProductCode: string;
    ProductName: string;
    Domains: { HostName: string; DomainType: string; IsPrimary: boolean }[];
    History: { FromStatus: string | null; ToStatus: string; Reason: string | null; ChangedDate: string }[];
}

export interface TenantSave
{
    TenantCode: string;
    CustomerPublicId: string;
    ProductCode: string;
    DisplayName: string;
    DatabaseServerId: number | null;
    DatabaseName: string | null;
    Status: string | null;
    TrialEndsOn: string | null;
    Remarks: string | null;
    HostNames: string[];
}

export interface ServerRow
{
    DatabaseServerId: number;
    ServerCode: string;
    ServerName: string;
    Host: string;
    Port: number;
    Status: string;
}

// Font Awesome icon for a product
export function productIcon(code: string): string
{
    switch (code)
    {
        case 'TWO-WHEELER': return 'fa-motorcycle';
        case 'AUTOMOBILE': return 'fa-car';
        case 'REAL-ESTATE': return 'fa-building';
        case 'CONSULTANCY': return 'fa-briefcase';
        default: return 'fa-cube';
    }
}

//===============================================================
// Website requests (api/requests)
//===============================================================

export const REQUEST_STATUSES = ['New', 'Contacted', 'DemoBooked', 'Converted', 'Closed'] as const;

export const REQUEST_STATUS_LABEL: Record<string, string> =
{
    New: 'New',
    Contacted: 'Contacted',
    DemoBooked: 'Demo booked',
    Converted: 'Converted',
    Closed: 'Closed'
};

export interface SiteRequestRow
{
    PublicId: string;
    RequestNo: string;
    RequestType: 'Demo' | 'Purchase';
    ProductCode: string;
    ProductName: string;
    LegalName: string;
    ContactName: string;
    Phone: string;
    Email: string;
    City: string | null;
    Country: string | null;
    PreferredDate: string | null;
    Status: string;
    CreatedDate: string;
}

export interface SiteRequest extends SiteRequestRow
{
    DisplayName: string | null;
    BinNo: string | null;
    TinNo: string | null;
    Address: string | null;
    Designation: string | null;
    Branches: number | null;
    Users: number | null;
    PreferredSubdomain: string | null;
    PreferredHost: string | null;
    PreferredTime: string | null;
    Message: string | null;
    HeardFrom: string | null;
    StaffNotes: string | null;
    IpAddress: string | null;
    ModifiedDate: string | null;
    CustomerPublicId: string | null;
    CustomerCode: string | null;
    CustomerName: string | null;
}

// What Convert returns : fills the Register tenant form
export interface TenantPrefill
{
    CustomerPublicId: string;
    CustomerCode: string;
    CustomerName: string;
    ProductCode: string;
    TenantCode: string;
    DisplayName: string;
    HostName: string;
    Status: string;
}

//===============================================================
// Website settings (api/settings/website)
//===============================================================

export interface WebsitePlan
{
    Code: string;
    Name: string;
    Tagline: string | null;
    MonthlyPrice: number | null;
    SetupFee: number | null;
    Branches: string | null;
    Users: string | null;
    Highlight: boolean;
    Features: string[];
}

export interface WebsiteStat
{
    Value: string;
    Label: string;
}

export interface WebsiteSettings
{
    CompanyName: string;
    Tagline: string;
    Phone: string | null;
    WhatsApp: string | null;
    Email: string | null;
    Address: string | null;
    OfficeHours: string | null;
    MapUrl: string | null;
    Facebook: string | null;
    LinkedIn: string | null;
    YouTube: string | null;
    HeroEyebrow: string;
    HeroTitle: string;
    HeroText: string;
    AnnouncementOn: boolean;
    AnnouncementText: string | null;
    Stats: WebsiteStat[];
    AcceptRequests: boolean;
    DemoEnabled: boolean;
    PurchaseEnabled: boolean;
    RequestThanks: string;
    ShowPricing: boolean;
    Currency: string;
    PricingNote: string | null;
    Plans: WebsitePlan[];
    AboutTitle: string;
    AboutText: string;
}
