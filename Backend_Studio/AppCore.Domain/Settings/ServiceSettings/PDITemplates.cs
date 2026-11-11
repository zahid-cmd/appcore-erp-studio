//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// PDI Templates (Settings > Service Settings, hand-written page;
// replaces the Code Sync entity : NEVER run Code Sync for it
// again; tables made by BikeDeliveries_Pdi_Engine.sql)
//
//   PdiTemplates         PDI-0001  one Pre-Delivery Inspection
//                                  sheet layout
//   PdiTemplateModels              the bike models it is used for
//                                  (a model : one active template)
//   PdiTemplateSections            ordered sections
//   PdiTemplateItems               ordered items : Check (OK /
//                                  Not OK / N/A), Reading (number +
//                                  unit), Text
//
// "...Bn" columns hold Bangla escaped as ক ... (the database
// is WIN1252); the pages decode it.
//===============================================================

public class PdiTemplates
{
    public long PdiTemplateId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string NameBn { get; set; } = string.Empty;

    public string SheetTitle { get; set; } = string.Empty;

    public string SheetTitleBn { get; set; } = string.Empty;

    public string FooterNote { get; set; } = string.Empty;

    public string FooterNoteBn { get; set; } = string.Empty;

    // Printed at the top right of the sheet (e.g. Swiftech Service Limited)
    public string ServiceProviderName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class PdiTemplateModels
{
    public long PdiTemplateModelId { get; set; }

    public long PdiTemplateId { get; set; }

    public long BikeModelId { get; set; }
}


public class PdiTemplateSections
{
    public long PdiTemplateSectionId { get; set; }

    public long PdiTemplateId { get; set; }

    public int SortOrder { get; set; }

    public string Title { get; set; } = string.Empty;

    public string TitleBn { get; set; } = string.Empty;

    // Technician's / QC In-charge's comment per item
    public bool HasComments { get; set; }
}


public class PdiTemplateItems
{
    public long PdiTemplateItemId { get; set; }

    public long PdiTemplateSectionId { get; set; }

    public int SortOrder { get; set; }

    public string Text { get; set; } = string.Empty;

    public string TextBn { get; set; } = string.Empty;

    // Check / Reading / Text
    public string ItemType { get; set; } = "Check";

    public string Unit { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = true;
}
