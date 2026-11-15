//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CheckBooks;


//===============================================================
// Check Books (Settings > Account Settings, hand-written page).
// Dates travel as "yyyy-MM-dd" text.
//===============================================================

public class CheckBookListItemDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long BankAccountId { get; set; }

    public string BankAccountName { get; set; } = string.Empty;

    public string Bank { get; set; } = string.Empty;

    public string AccountNumber { get; set; } = string.Empty;

    public string BookNo { get; set; } = string.Empty;

    public string FirstCheckNo { get; set; } = string.Empty;

    public string LastCheckNo { get; set; } = string.Empty;

    public int LeafCount { get; set; }

    public int Unused { get; set; }

    public int Issued { get; set; }

    public int Cancelled { get; set; }

    public int Lost { get; set; }

    public int Void { get; set; }

    // The lowest unused leaf of the book ('' = none left)
    public string NextCheckNo { get; set; } = string.Empty;

    public string ReceivedDate { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // Unused leaves of all the active books of the bank account
    public int AccountUnused { get; set; }

    // AccountUnused is below the Low Check Leaf Warning
    public bool LowLeaf { get; set; }
}


public class CheckBookLeafDto
{
    public long CheckBookLeafId { get; set; }

    public long LeafNo { get; set; }

    public string CheckNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string SourceType { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    public string PayeeName { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string IssuedDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string StatusDate { get; set; } = string.Empty;
}


public class CheckBookDto
{
    public long CheckBookId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long BankAccountId { get; set; }

    public string BankAccountName { get; set; } = string.Empty;

    public string Bank { get; set; } = string.Empty;

    public string AccountNumber { get; set; } = string.Empty;

    public string BookNo { get; set; } = string.Empty;

    public string Prefix { get; set; } = string.Empty;

    // As typed (leading zeros kept)
    public string StartNo { get; set; } = string.Empty;

    public string EndNo { get; set; } = string.Empty;

    public int LeafCount { get; set; }

    public string ReceivedDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // A leaf has been used (issued / cancelled / lost / void) : the
    // account, prefix and range are fixed
    public bool RangeLocked { get; set; }

    public List<CheckBookLeafDto> Leaves { get; set; } = new();
}


public class SaveCheckBookDto
{
    public long BankAccountId { get; set; }

    public string BookNo { get; set; } = string.Empty;

    public string Prefix { get; set; } = string.Empty;

    // Text : leading zeros set the width of the check numbers
    public string StartNo { get; set; } = string.Empty;

    public int LeafCount { get; set; }

    public string ReceivedDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


public class CheckBookLeafActionDto
{
    // Cancelled / Lost
    public string Status { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}


public class CheckBookBankAccountDto
{
    public long BankAccountId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Bank { get; set; } = string.Empty;

    public string AccountNumber { get; set; } = string.Empty;

    public int UnusedLeaves { get; set; }

    public bool LowLeaf { get; set; }

    // The number after the highest leaf of the account's books
    // ('' = no book yet)
    public string SuggestedStartNo { get; set; } = string.Empty;

    public string SuggestedPrefix { get; set; } = string.Empty;
}


public class CheckBookDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    // 0 = the warning is off
    public int LowLeafThreshold { get; set; }

    public bool AllowChooseLeaf { get; set; }

    public List<CheckBookBankAccountDto> BankAccounts { get; set; } = new();
}


// For the vouchers (phase 2) : the unused leaves of a bank account
public class CheckLeafOptionDto
{
    public long CheckBookLeafId { get; set; }

    public string CheckNo { get; set; } = string.Empty;

    public string BookCode { get; set; } = string.Empty;
}


public class AvailableCheckLeavesDto
{
    public long BankAccountId { get; set; }

    // ON : any unused leaf may be picked; OFF : only the first
    // The account has a live check book : its check numbers come
    // from the leaves (false = free text, as before)
    public bool HasBooks { get; set; }

    public bool AllowChooseLeaf { get; set; }

    public int LowLeafThreshold { get; set; }

    public bool LowLeaf { get; set; }

    public int UnusedLeaves { get; set; }

    // Lowest first; the first one is the "next" leaf
    public List<CheckLeafOptionDto> Leaves { get; set; } = new();
}


//===============================================================
// Cheque print layout of a bank account (2026-11-15). LayoutJson
// is owned by the page (mm positions); '' when none is saved yet.
//===============================================================

public class CheckPrintLayoutDto
{
    public long BankAccountId { get; set; }

    public string BankAccountName { get; set; } = string.Empty;

    public string Bank { get; set; } = string.Empty;

    public string AccountNumber { get; set; } = string.Empty;

    public string LayoutJson { get; set; } = string.Empty;

    public bool IsSaved { get; set; }

    // yyyy-MM-dd HH:mm
    public string ModifiedDate { get; set; } = string.Empty;
}

public class SaveCheckPrintLayoutDto
{
    public string LayoutJson { get; set; } = string.Empty;
}
