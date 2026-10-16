//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;


//===============================================================
// Update Financial Years DTO
//
// Code is locked after creation. Name is always regenerated
// on the server from the dates.
//===============================================================

public class UpdateFinancialYearsDto
{
    public long FinancialYearId { get; set; }

    public string FinancialYearCode { get; set; } = string.Empty;

    public string FinancialYearName { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool IsCurrent { get; set; }

    public string YearStatus { get; set; } = "Open";

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }
}