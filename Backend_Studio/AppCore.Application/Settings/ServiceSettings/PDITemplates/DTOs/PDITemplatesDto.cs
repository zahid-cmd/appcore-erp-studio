//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// PDI Templates (Settings > Service Settings, hand-written page)
//
// "...Bn" texts : Bangla escaped as ক ... (ASCII; the
// database is WIN1252). The page escapes before sending and
// decodes on reading; the server escapes anything left.
//===============================================================

public class PdiTemplateListItemDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string ModelsText { get; set; } = string.Empty;

    public int ModelCount { get; set; }

    public int SectionCount { get; set; }

    public int ItemCount { get; set; }

    public bool IsActive { get; set; }
}


public class PdiTemplateModelDto
{
    public long BikeModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;
}


public class PdiTemplateItemDto
{
    public string Text { get; set; } = string.Empty;

    public string TextBn { get; set; } = string.Empty;

    // Check / Reading / Text
    public string ItemType { get; set; } = "Check";

    public string Unit { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = true;
}


public class PdiTemplateSectionDto
{
    public string Title { get; set; } = string.Empty;

    public string TitleBn { get; set; } = string.Empty;

    public bool HasComments { get; set; }

    public List<PdiTemplateItemDto> Items { get; set; } = new();
}


public class PdiTemplateDto
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

    public string ServiceProviderName { get; set; } = string.Empty;

    // Brand of the template's models (the most used one) : the
    // logo printed at the top left of the sheet
    public string BrandName { get; set; } = string.Empty;

    public string BrandImagePath { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<PdiTemplateModelDto> Models { get; set; } = new();

    public List<PdiTemplateSectionDto> Sections { get; set; } = new();
}


public class SavePdiTemplateDto
{
    public string Name { get; set; } = string.Empty;

    public string NameBn { get; set; } = string.Empty;

    public string SheetTitle { get; set; } = string.Empty;

    public string SheetTitleBn { get; set; } = string.Empty;

    public string FooterNote { get; set; } = string.Empty;

    public string FooterNoteBn { get; set; } = string.Empty;

    public string ServiceProviderName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<long> ModelIds { get; set; } = new();

    public List<PdiTemplateSectionDto> Sections { get; set; } = new();
}


// A bike model the form can pick, with the template it is in now
public class PdiTemplateModelOptionDto
{
    public long BikeModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string BikeType { get; set; } = string.Empty;

    // '' = in no active template
    public string TemplateCode { get; set; } = string.Empty;

    public Guid? TemplatePublicId { get; set; }
}


public class PdiTemplateDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public List<PdiTemplateModelOptionDto> Models { get; set; } = new();
}
