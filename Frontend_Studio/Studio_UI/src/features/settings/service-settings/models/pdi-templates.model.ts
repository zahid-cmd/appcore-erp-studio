//===============================================================
// PDI Templates (Settings > Service Settings, hand-written page)
//
// The Pre-Delivery Inspection sheet of a bike model : sections
// with items (Check : OK / Not OK / N/A, Reading : number + unit,
// Text). The ...Bn texts are real Bangla here; the service
// encodes / decodes them (the database is WIN1252).
//===============================================================

export type PdiItemType =
    'Check' | 'Reading' | 'Text';

export const PDI_ITEM_TYPES:
    { label: string; value: PdiItemType }[] =
[
    { label:'Check (OK / Not OK / N/A)', value:'Check' },
    { label:'Reading (number + unit)', value:'Reading' },
    { label:'Text', value:'Text' }
];

export interface PdiTemplateListItem
{
    PublicId:
        string;

    Code:
        string;

    Name:
        string;

    ModelsText:
        string;

    ModelCount:
        number;

    SectionCount:
        number;

    ItemCount:
        number;

    IsActive:
        boolean;
}

export interface PdiTemplateModel
{
    BikeModelId:
        number;

    ModelName:
        string;

    BrandName:
        string;
}

export interface PdiTemplateItem
{
    Text:
        string;

    TextBn:
        string;

    ItemType:
        PdiItemType;

    Unit:
        string;

    IsRequired:
        boolean;
}

export interface PdiTemplateSection
{
    Title:
        string;

    TitleBn:
        string;

    HasComments:
        boolean;

    Items:
        PdiTemplateItem[];
}

export interface PdiTemplate
{
    PdiTemplateId:
        number;

    PublicId:
        string;

    Code:
        string;

    Name:
        string;

    NameBn:
        string;

    SheetTitle:
        string;

    SheetTitleBn:
        string;

    FooterNote:
        string;

    FooterNoteBn:
        string;

    // Printed top right (e.g. Swiftech Service Limited)
    ServiceProviderName:
        string;

    // Read only : the most used brand of the models (its logo is
    // printed top left)
    BrandName:
        string;

    BrandImagePath:
        string;

    Remarks:
        string;

    IsActive:
        boolean;

    Models:
        PdiTemplateModel[];

    Sections:
        PdiTemplateSection[];
}

export interface PdiTemplateModelOption
{
    BikeModelId:
        number;

    ModelName:
        string;

    BrandName:
        string;

    BikeType:
        string;

    // '' = in no active template
    TemplateCode:
        string;

    TemplatePublicId:
        string;
}

export interface PdiTemplateDefaults
{
    NextCode:
        string;

    Models:
        PdiTemplateModelOption[];
}

export function emptyPdiItem():
    PdiTemplateItem
{
    return { Text:'', TextBn:'', ItemType:'Check', Unit:'', IsRequired:true };
}

export function emptyPdiSection():
    PdiTemplateSection
{
    return { Title:'', TitleBn:'', HasComments:false, Items:[emptyPdiItem()] };
}
