//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Financial Years
//
// FinancialYearCode : system generated (FY-0001), never reused
// FinancialYearName : system generated from the dates
//                     FY 2026-2027 / FY 2026
// YearStatus        : Open | Closed | Locked
// IsCurrent         : only one active year can be current
//===============================================================

public class FinancialYears
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long FinancialYearId { get; set; }


    //===========================================================
    // Financial Year Code (auto generated)
    //===========================================================

    public string FinancialYearCode { get; set; } = string.Empty;


    //===========================================================
    // Financial Year Name (auto generated)
    //===========================================================

    public string FinancialYearName { get; set; } = string.Empty;


    //===========================================================
    // Period
    //===========================================================

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }


    //===========================================================
    // Current Year
    //===========================================================

    public bool IsCurrent { get; set; }


    //===========================================================
    // Year Status (Open / Closed / Locked)
    //===========================================================

    public string YearStatus { get; set; } = "Open";


    //===========================================================
    // Remarks
    //===========================================================

    public string Remarks { get; set; } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool Status { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; } = false;

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}