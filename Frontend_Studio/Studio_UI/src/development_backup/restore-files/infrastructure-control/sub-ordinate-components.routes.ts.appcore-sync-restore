//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes
//===============================================================

export const SubOrdinateComponentsRoutes:
Routes =
[


    //===========================================================
    // Default
    //===========================================================

    {
        path:'',

        redirectTo:'list',

        pathMatch:'full'
    },


    //===========================================================
    // List
    //===========================================================

    {
        path:'list',

        data:
        {
            breadcrumb:'Sub Ordinate Components'
        },

        loadComponent:() =>
            import(
                '../pages/sub-ordinate-components/list/sub-ordinate-components-list'
            )
            .then(
                m =>
                    m.SubOrdinateComponentsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sub Ordinate Components'
        },

        loadComponent:() =>
            import(
                '../pages/sub-ordinate-components/form/sub-ordinate-components-form'
            )
            .then(
                m =>
                    m.SubOrdinateComponentsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sub Ordinate Components'
        },

        loadComponent:() =>
            import(
                '../pages/sub-ordinate-components/form/sub-ordinate-components-form'
            )
            .then(
                m =>
                    m.SubOrdinateComponentsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sub Ordinate Components'
        },

        loadComponent:() =>
            import(
                '../pages/sub-ordinate-components/form/sub-ordinate-components-form'
            )
            .then(
                m =>
                    m.SubOrdinateComponentsForm
            )
    }

];