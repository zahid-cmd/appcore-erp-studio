//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;


//===============================================================
// Brand Management Defaults DTO
//
// Next code for a new brand, the Motor Bikes suppliers for the
// dropdown and the brand ledger sub groups with their next ledger
// codes (preview only : Save assigns the real codes).
//===============================================================

public class BrandManagementDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    // Live suppliers with Supply Type Motor Bikes (inactive ones
    // only for brands that already use them)
    public List<BrandSupplierOptionDto> MotorBikesSuppliers { get; set; } = new();

    // SUB-002-002-008 Offer Adjustment Account
    public string OfferAdjustmentSubGroupCode { get; set; } = string.Empty;

    public string OfferAdjustmentSubGroupName { get; set; } = string.Empty;

    public string NextOfferAdjustmentLedgerCode { get; set; } = string.Empty;

    // SUB-002-002-009 EMI Claim Receivable
    public string EmiClaimSubGroupCode { get; set; } = string.Empty;

    public string EmiClaimSubGroupName { get; set; } = string.Empty;

    public string NextEmiClaimLedgerCode { get; set; } = string.Empty;

    // Why a sub group cannot be used ('' = fine)
    public string LedgerMessage { get; set; } = string.Empty;
}


public class BrandSupplierOptionDto
{
    public string SupplierCode { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}