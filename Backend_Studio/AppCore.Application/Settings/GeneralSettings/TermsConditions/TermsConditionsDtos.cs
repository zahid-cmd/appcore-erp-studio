//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Terms & Conditions (Settings > General Settings, hand-written
// page). Lines carry English and Bangla text (the database is
// UTF8 : Bangla is stored as typed).
//===============================================================

public class TermsConditionListItemDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string OperationCode { get; set; } = string.Empty;

    public string OperationName { get; set; } = string.Empty;

    public int LineCount { get; set; }

    // Lines with Bangla text
    public int BanglaCount { get; set; }

    public bool IsDefault { get; set; }

    public bool IsActive { get; set; }

    // Search help : the English lines joined
    public string LinesText { get; set; } = string.Empty;
}


public class TermsConditionLineDto
{
    public string TextEn { get; set; } = string.Empty;

    public string TextBn { get; set; } = string.Empty;
}


public class TermsConditionSetDto
{
    public long TermsConditionSetId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string OperationCode { get; set; } = string.Empty;

    public string OperationName { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public string Note { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<TermsConditionLineDto> Lines { get; set; } = new();
}


// Title is not sent : the server names a new set after its
// operation (Sales Invoice - MB 1, 2, 3 ...); the operation of a
// saved set never changes
public class SaveTermsConditionSetDto
{
    public string OperationCode { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public string Note { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<TermsConditionLineDto> Lines { get; set; } = new();
}


public class TermsOperationDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Sales / Procurement : groups the drop-down
    public string Group { get; set; } = string.Empty;

    // Code of the operation's current Default set ('' = none)
    public string DefaultSetCode { get; set; } = string.Empty;

    public Guid? DefaultSetPublicId { get; set; }

    // Title the next set of this operation gets (e.g.
    // "Sales Invoice - MB 2")
    public string NextTitle { get; set; } = string.Empty;
}


public class TermsConditionDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public List<TermsOperationDto> Operations { get; set; } = new();
}
