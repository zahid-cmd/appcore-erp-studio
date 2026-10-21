//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.AutoAccounts.DTOs;


//===============================================================
// Auto Account Codes
//
// Codes of the account groups / sub groups / ledgers that were
// created automatically by other pages, split by origin:
//
//   Inventory : Product Category, Product Sub Category, Motor
//               Bikes, Spare Parts, Accessories
//   Financial : every other page that creates accounts (Service
//               Category / Sub Category, Service Policy,
//               Scheduled Services, Labor Chart, Customized
//               Services, Membership Services, …)
//
// Anything not listed here was created manually on the Account
// Group / Account Sub Group / General Ledger form pages.
//===============================================================

public class AutoAccountCodesDto
{
    public List<string> InventoryGroupCodes { get; set; } = new List<string>();

    public List<string> InventorySubGroupCodes { get; set; } = new List<string>();

    public List<string> InventoryLedgerCodes { get; set; } = new List<string>();

    public List<string> FinancialGroupCodes { get; set; } = new List<string>();

    public List<string> FinancialSubGroupCodes { get; set; } = new List<string>();

    public List<string> FinancialLedgerCodes { get; set; } = new List<string>();
}