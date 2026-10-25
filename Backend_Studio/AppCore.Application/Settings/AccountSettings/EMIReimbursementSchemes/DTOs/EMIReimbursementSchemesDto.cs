//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// EMI Reimbursement Schemes DTO (list / view)
//===============================================================

public class EmiReimbursementSchemesDto
{
    public long EmiReimbursementSchemeId { get; set; }

    public string SchemeCode { get; set; } = string.Empty;


    //===========================================================
    // Brand (by code) and its Motor Bikes Supplier
    //===========================================================

    public string BrandCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;


    //===========================================================
    // Validity & Tenure (dates yyyy-MM-dd; ValidTo '' = open)
    //===========================================================

    public string ValidFrom { get; set; } = string.Empty;

    public string ValidTo { get; set; } = string.Empty;

    // 0 = all tenures
    public int TenureMonths { get; set; }

    // Valid To is before today (Asia/Dhaka)
    public bool IsExpired { get; set; }

    // Valid From is after today
    public bool IsUpcoming { get; set; }


    //===========================================================
    // Reimbursement
    //===========================================================

    public string SwapBasis { get; set; } = string.Empty;

    public decimal SwapValue { get; set; }

    public decimal? SwapCap { get; set; }

    public string EmiBasis { get; set; } = string.Empty;

    public decimal EmiValue { get; set; }

    public decimal? EmiCap { get; set; }

    public decimal? TotalCap { get; set; }


    //===========================================================
    // Status & Description
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}