//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Chart of Services : Service Row (leaf)
//
// One row per Scheduled Service / Labor Chart / Customized
// Service / Membership Service. ItemType is one of
// ChartOfServicesItemTypes.
//===============================================================

public class ChartOfServicesDto
{
    public long Id { get; set; }

    public long SubCategoryId { get; set; }

    public string ItemType { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    // Scheduled / Labor / Customized : Service Name
    // Membership : Display Name ("<Service Name> - <Card>")
    public string Name { get; set; } = string.Empty;

    // Scheduled : Customer Charge; Labor / Customized : Service
    // Charge; Membership : Service Value
    public decimal Charge { get; set; }

    // Labor / Customized : standard minutes, others 0
    public int StandardMinutes { get; set; }

    public string IncomeLedger { get; set; } = string.Empty;

    // Membership only (Selling & Marketing Expenses - Non Cash)
    public string ExpenseLedger { get; set; } = string.Empty;

    // Scheduled : false until priced on the Scheduled Services page
    public bool IsConfigured { get; set; } = true;

    public bool Status { get; set; }
}