/* ============================================================
   Sub Category Types per Category Type (shared with Service
   Category : SERVICE_SUB_CATEGORY_TYPES)
============================================================ */

export
{
    SERVICE_SUB_CATEGORY_TYPES
}
from './service-category.model';


/* ============================================================
   Service Sub Category
============================================================ */

export interface ServiceSubCategory
{
    ServiceSubCategoryId:
        number;

    SubCategoryCode:
        string;

    //===========================================================
    // Service Category (locked after saving)
    //===========================================================

    ServiceCategoryId:
        number;

    CategoryCode?:
        string;

    CategoryName?:
        string;

    CategoryType?:
        string;

    BrandName?:
        string;

    //===========================================================
    // Sub Category Type + Name
    //===========================================================

    // Labor Chart / Scheduled Services / Customized Services / Membership Services
    SubCategoryType:
        string;

    // Brand Services : "<Brand> <Type>" (built); Differential Services : typed
    SubCategoryName:
        string;

    //===========================================================
    // Income Account Sub Group
    //===========================================================

    IncomeGroupCode?:
        string;

    IncomeSubGroupCode:
        string;

    IncomeSubGroupName:
        string;

    //===========================================================
    // Configuration
    //===========================================================

    ItemCreationAllowed:
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
   Create Service Sub Category
============================================================ */

export interface CreateServiceSubCategory
{
    SubCategoryCode:
        string;

    ServiceCategoryId:
        number;

    SubCategoryType:
        string;

    SubCategoryName:
        string;

    IncomeSubGroupCode:
        string;

    IncomeSubGroupName:
        string;

    ItemCreationAllowed:
        boolean;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Update Service Sub Category
============================================================ */

export interface UpdateServiceSubCategory
extends CreateServiceSubCategory
{
    ServiceSubCategoryId:
        number;
}


/* ============================================================
   Service Category option (with the next codes under it)
============================================================ */

export interface ServiceSubCategoryCategoryOption
{
    ServiceCategoryId:
        number;

    CategoryCode:
        string;

    CategoryName:
        string;

    CategoryType:
        string;

    BrandName:
        string;

    IsActive:
        boolean;

    SubCategoryCreationAllowed:
        boolean;

    IncomeClassCode:
        string;

    IncomeClassName:
        string;

    IncomeGroupCode:
        string;

    IncomeGroupName:
        string;

    // <Category Code>-sss
    NextSubCategoryCode:
        string;

    // SUB-ccc-ggg-sss
    NextSubGroupCode:
        string;

    // Brand Services : types already used (one per type)
    UsedSubCategoryTypes:
        string[];
}


/* ============================================================
   Service Sub Category Defaults
============================================================ */

export interface ServiceSubCategoryDefaults
{
    Categories:
        ServiceSubCategoryCategoryOption[];
}