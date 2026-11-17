//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Accounting;


//===============================================================
// What an account IS, for the financial statements (2026-11-17).
//
// Nothing here reads a class / group / ledger NAME. The statements
// go by three settings :
//
//   Account Class . StatementType     Asset / Liability / Equity /
//                                     Income / Other Income /
//                                     Cost of Goods Sold / Expense
//   Account Class . BusinessLine      MB / SP / AC / SV ("" : none);
//   General Ledger . BusinessLine     a ledger may have its own
//   Account Group . CashFlowActivity  Operating / Investing /
//                                     Financing
//
// The classes of the inventory family have a fixed statement type
// (their Class Type is a fixed list, not a name) :
//   Inventory, Work In Progress       Asset
//   Cost of Goods Sold                Cost of Goods Sold
//
// Columns : Accounts_Code_Oriented.sql
//===============================================================

public static class StatementTypes
{
    public const string Asset = "Asset";

    public const string Liability = "Liability";

    public const string Equity = "Equity";

    public const string Income = "Income";

    public const string OtherIncome = "Other Income";

    public const string Cogs = "Cost of Goods Sold";

    public const string Expense = "Expense";

    public static readonly string[] All =
    {
        Asset,
        Liability,
        Equity,
        Income,
        OtherIncome,
        Cogs,
        Expense
    };

    // Class Types (a fixed list)
    private const string InventoryClass = "Inventory";

    private const string WipClass = "Work In Progress";

    private const string CogsClass = "Cost of Goods Sold";

    // One of the list, or "" (not set / unknown)
    public static string Normalize(string? value)
    {
        string text = (value ?? string.Empty).Trim();

        return All.FirstOrDefault(x => string.Equals(x, text, StringComparison.OrdinalIgnoreCase)) ?? string.Empty;
    }

    // The statement type a class of the inventory family always has
    // ("" : an Account class, which has its own setting)
    public static string FixedOf(string? classType)
    {
        string type = (classType ?? string.Empty).Trim();

        if (string.Equals(type, InventoryClass, StringComparison.OrdinalIgnoreCase)
            || string.Equals(type, WipClass, StringComparison.OrdinalIgnoreCase))
        {
            return Asset;
        }

        return string.Equals(type, CogsClass, StringComparison.OrdinalIgnoreCase) ? Cogs : string.Empty;
    }

    // The statement type of a ledger : the class type (inventory
    // family), else the setting of the class, else (not set, or not
    // in the chart) by the normal side : credit = liability,
    // debit = asset
    public static string Resolve(string? classType, string? statementType, string? mode)
    {
        string fixedType = FixedOf(classType);

        if (fixedType.Length > 0)
        {
            return fixedType;
        }

        string chosen = Normalize(statementType);

        if (chosen.Length > 0)
        {
            return chosen;
        }

        return (mode ?? string.Empty).Trim().StartsWith("c", StringComparison.OrdinalIgnoreCase) ? Liability : Asset;
    }

    // Income / expense (Profit & Loss) : not a balance-sheet account
    public static bool IsNominal(string? statementType) =>
        Normalize(statementType) is Income or OtherIncome or Cogs or Expense;

    // Normal side credit
    public static bool IsCredit(string? statementType) =>
        Normalize(statementType) is Liability or Equity or Income or OtherIncome;
}


public static class BusinessLines
{
    public const string MotorBikes = "MB";

    public const string SpareParts = "SP";

    public const string Accessories = "AC";

    public const string Service = "SV";

    public static readonly string[] All =
    {
        MotorBikes,
        SpareParts,
        Accessories,
        Service
    };

    // One of the list, or "" (none)
    public static string Normalize(string? value)
    {
        string text = (value ?? string.Empty).Trim();

        return All.FirstOrDefault(x => string.Equals(x, text, StringComparison.OrdinalIgnoreCase)) ?? string.Empty;
    }

    // Product Category . CategoryType (a fixed list) -> business line
    public static string OfCategoryType(string? categoryType) =>
        (categoryType ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "motor bikes" => MotorBikes,
            "spare parts" => SpareParts,
            "lubricants" => SpareParts,
            "accessories" => Accessories,
            _ => string.Empty
        };
}


public static class CashFlowActivities
{
    public const string Operating = "Operating";

    public const string Investing = "Investing";

    public const string Financing = "Financing";

    public static readonly string[] All =
    {
        Operating,
        Investing,
        Financing
    };

    // One of the list (Operating when not set)
    public static string Normalize(string? value)
    {
        string text = (value ?? string.Empty).Trim();

        return All.FirstOrDefault(x => string.Equals(x, text, StringComparison.OrdinalIgnoreCase)) ?? Operating;
    }
}
