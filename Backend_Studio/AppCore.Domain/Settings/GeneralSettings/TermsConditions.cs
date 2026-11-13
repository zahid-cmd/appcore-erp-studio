//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Terms & Conditions (Settings > General Settings, hand-written
// page : NEVER run Code Sync for it; tables made by
// TermsConditions_Engine.sql)
//
//   TermsConditionSets   TC-0001  numbered terms for one operation
//                                 (document type); one Default per
//                                 operation
//   TermsConditionLines           the lines : English + Bangla
//                                 (the database is UTF8)
//===============================================================

public class TermsConditionSets
{
    public long TermsConditionSetId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    // SIMB / SISP / SIAC / SQMB ... (TermsOperations in the repository)
    public string OperationCode { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public string Note { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class TermsConditionLines
{
    public long TermsConditionLineId { get; set; }

    public long TermsConditionSetId { get; set; }

    public int LineNo { get; set; }

    public string TextEn { get; set; } = string.Empty;

    public string TextBn { get; set; } = string.Empty;
}
