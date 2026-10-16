//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;


//===============================================================
// Financial Years DTO
//
// StartDate / EndDate are DateOnly → JSON "2026-07-01".
//===============================================================

public class FinancialYearsDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long FinancialYearId { get; set; }


    //===========================================================
    // Fields
    //===========================================================

    public string FinancialYearCode { get; set; } = string.Empty;

    public string FinancialYearName { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool IsCurrent { get; set; }

    public string YearStatus { get; set; } = "Open";

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; }

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