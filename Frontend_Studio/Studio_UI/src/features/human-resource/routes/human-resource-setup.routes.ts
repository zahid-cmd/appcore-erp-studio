import
{
    Routes
}
from '@angular/router';

export const humanResourceSetupRoutes:
    Routes =
[
    //=========================================================
    // Department
    //=========================================================

    {
        path:'department/new',

        data:
        {
            breadcrumb:'Add Department'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/department/form/department-form'
            )
            .then(
                m => m.DepartmentFormComponent
            )
    },

    {
        path:'department/view/:id',

        data:
        {
            breadcrumb:'View Department'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/department/form/department-form'
            )
            .then(
                m => m.DepartmentFormComponent
            )
    },

    {
        path:'department/edit/:id',

        data:
        {
            breadcrumb:'Edit Department'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/department/form/department-form'
            )
            .then(
                m => m.DepartmentFormComponent
            )
    },

    {
        path:'department',

        data:
        {
            breadcrumb:'Department'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/department/list/department-list'
            )
            .then(
                m => m.DepartmentListComponent
            )
    },

    //=========================================================
    // Designation
    //=========================================================

    {
        path:'designation/new',

        data:
        {
            breadcrumb:'Add Designation'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/designation/form/designation-form'
            )
            .then(
                m => m.DesignationFormComponent
            )
    },

    {
        path:'designation/view/:id',

        data:
        {
            breadcrumb:'View Designation'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/designation/form/designation-form'
            )
            .then(
                m => m.DesignationFormComponent
            )
    },

    {
        path:'designation/edit/:id',

        data:
        {
            breadcrumb:'Edit Designation'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/designation/form/designation-form'
            )
            .then(
                m => m.DesignationFormComponent
            )
    },

    {
        path:'designation',

        data:
        {
            breadcrumb:'Designation'
        },

        loadComponent:() =>
            import(
                '../human-resource-setup/pages/designation/list/designation-list'
            )
            .then(
                m => m.DesignationListComponent
            )
    }
];