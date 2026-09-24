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

export const LoginComponent4Routes:
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
            breadcrumb:'Login Component 4'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-4/list/login-component-4-list'
            )
            .then(
                m =>
                    m.LoginComponent4List
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Login Component 4'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-4/form/login-component-4-form'
            )
            .then(
                m =>
                    m.LoginComponent4Form
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Login Component 4'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-4/form/login-component-4-form'
            )
            .then(
                m =>
                    m.LoginComponent4Form
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Login Component 4'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-4/form/login-component-4-form'
            )
            .then(
                m =>
                    m.LoginComponent4Form
            )
    }

];