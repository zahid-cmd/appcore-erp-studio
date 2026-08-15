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

export const {{SUBMENU_ROUTE_EXPORT}}:
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
            breadcrumb:'{{SUBMENU_NAME}}'
        },

        loadComponent:() =>
            import(
                '../pages/{{SUBMENU_ROUTE_KEY}}/list/{{SUBMENU_ROUTE_KEY}}-list'
            )
            .then(
                m =>
                    m.{{SUBMENU_LIST_COMPONENT}}
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add {{SUBMENU_NAME}}'
        },

        loadComponent:() =>
            import(
                '../pages/{{SUBMENU_ROUTE_KEY}}/form/{{SUBMENU_ROUTE_KEY}}-form'
            )
            .then(
                m =>
                    m.{{SUBMENU_FORM_COMPONENT}}
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit {{SUBMENU_NAME}}'
        },

        loadComponent:() =>
            import(
                '../pages/{{SUBMENU_ROUTE_KEY}}/form/{{SUBMENU_ROUTE_KEY}}-form'
            )
            .then(
                m =>
                    m.{{SUBMENU_FORM_COMPONENT}}
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View {{SUBMENU_NAME}}'
        },

        loadComponent:() =>
            import(
                '../pages/{{SUBMENU_ROUTE_KEY}}/form/{{SUBMENU_ROUTE_KEY}}-form'
            )
            .then(
                m =>
                    m.{{SUBMENU_FORM_COMPONENT}}
            )
    }

];