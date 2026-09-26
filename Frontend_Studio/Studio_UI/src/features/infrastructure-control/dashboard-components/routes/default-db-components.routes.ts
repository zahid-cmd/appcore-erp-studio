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
 
export const DefaultDbComponentsRoutes: 
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
            breadcrumb:'Default DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/default-db-components/list/default-db-components-list' 
            ) 
            .then( 
                m => 
                    m.DefaultDashboardComponentsList 
            ) 
    }, 
 
 
    //=========================================================== 
    // Add 
    //=========================================================== 
 
    { 
        path:'add', 
 
        data: 
        { 
            breadcrumb:'Add Default DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/default-db-components/form/default-db-components-form' 
            ) 
            .then( 
                m => 
                    m.DefaultDbComponentsForm 
            ) 
    }, 
 
 
    //=========================================================== 
    // Edit 
    //=========================================================== 
 
    { 
        path:'edit/:id', 
 
        data: 
        { 
            breadcrumb:'Edit Default DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/default-db-components/form/default-db-components-form' 
            ) 
            .then( 
                m => 
                    m.DefaultDbComponentsForm 
            ) 
    }, 
 
 
    //=========================================================== 
    // View 
    //=========================================================== 
 
    { 
        path:'view/:id', 
 
        data: 
        { 
            breadcrumb:'View Default DB Components' 
        }, 
 
        loadComponent:() => 
            import( 
                '../pages/default-db-components/form/default-db-components-form' 
            ) 
            .then( 
                m => 
                    m.DefaultDbComponentsForm 
            ) 
    } 
 
]; 