/* ============================================================
   Category Types
============================================================ */

export const SERVICE_CATEGORY_TYPES:
    readonly string[] =
[
    'Brand Services',
    'Differential Services'
];


/* ============================================================
   Sub Category Types allowed per Category Type
============================================================ */

export const SERVICE_SUB_CATEGORY_TYPES:
    Readonly<Record<string, readonly string[]>> =
{
    'Brand Services':
    [
        'Labor Chart',
        'Scheduled Services'
    ],

    'Differential Services':
    [
        'Customized Services',
        'Membership Services'
    ]
};


/* ============================================================
   Service Category
============================================================ */

export interface ServiceCategory
{
    ServiceCategoryId:
        number;

    CategoryCode:
        string;

    CategoryName:
        string;

    //===========================================================
    // Category Type + Brand
    //===========================================================

    CategoryType:
        string;

    // Brand Services only (0 = none)
    BrandManagementId:
        number;

    BrandName?:
        string;

    //===========================================================
    // Income Account Group
    //===========================================================

    IncomeGroupCode:
        string;

    IncomeGroupName:
        string;

    //===========================================================
    // Configuration
    //===========================================================

    SubCategoryCreationAllowed:
        boolean;

    Remarks:
        string;

    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}


/* ============================================================
   Create Service Category
============================================================ */

export interface CreateServiceCategory
{
    CategoryCode:
        string;

    CategoryName:
        string;

    CategoryType:
        string;

    BrandManagementId:
        number | null;

    IncomeGroupCode:
        string;

    IncomeGroupName:
        string;

    SubCategoryCreationAllowed:
        boolean;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Update Service Category
============================================================ */

export interface UpdateServiceCategory
extends CreateServiceCategory
{
    ServiceCategoryId:
        number;
}


/* ============================================================
   Service Category Defaults
============================================================ */

export interface ServiceCategoryDefaults
{
    // Next Category Code per Category Type
    BrandServicesCode:
        string;

    DifferentialServicesCode:
        string;

    IncomeClassId:
        number;

    IncomeClassCode:
        string;

    IncomeClassName:
        string;

    IncomeGroupCode:
        string;
}