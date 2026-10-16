//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;


//===============================================================
// Create Financial Years DTO
//
// Code and Name are accepted for compatibility but are always
// generated on the server.
//===============================================================

public class CreateFinancialYearsDto
{
    public string FinancialYearCode { get; set; } = string.Empty;

    public string FinancialYearName { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool IsCurrent { get; set; }

    public string YearStatus { get; set; } = "Open";

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }
}