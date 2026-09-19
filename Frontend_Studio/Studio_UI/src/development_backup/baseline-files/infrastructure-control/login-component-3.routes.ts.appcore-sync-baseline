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

export const LoginComponent3Routes:
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
            breadcrumb:'Login Component 3'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-3/list/login-component-3-list'
            )
            .then(
                m =>
                    m.LoginComponent3List
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Login Component 3'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-3/form/login-component-3-form'
            )
            .then(
                m =>
                    m.LoginComponent3Form
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Login Component 3'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-3/form/login-component-3-form'
            )
            .then(
                m =>
                    m.LoginComponent3Form
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Login Component 3'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-3/form/login-component-3-form'
            )
            .then(
                m =>
                    m.LoginComponent3Form
            )
    }

];