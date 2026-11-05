//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ClientSettings;


//===============================================================
// Supplier Profiles : paged list request
//---------------------------------------------------------------
// GET api/settings/client-settings/supplier-profiles/paged
//     ?page=1&pageSize=10&search=honda&sort=SupplierCode&dir=asc
//     &type=Local Vendor&supplyType=Spare Parts&brandId=3&status=true
//
// Search : code, name, display name, type, supply type, contact
//          person, phones, brand, BIN, TIN, ledger code, remarks.
// Sort   : SupplierCode, SupplierName, SupplierType, SupplyType,
//          Phone1, BrandName, PayableLedgerCode, IsActive
//          (default SupplierCode).
// Counts : "Total", "Brand Distributor", "Local Vendor",
//          "Service Provider", "Active", "Inactive" (the summary
//          line; supply type, brand and search applied, not the
//          tab or the status filter).
//===============================================================

public class SupplierProfilesPageRequest
    : PagedRequest
{
    // Brand Distributor / Local Vendor / Service Provider (the
    // tab); empty = all
    public string? Type { get; set; }

    // Motor Bikes / Spare Parts / Accessories / General
    public string? SupplyType { get; set; }

    public long? BrandId { get; set; }

    // true = Active, false = Inactive, empty = all
    public bool? Status { get; set; }
}
