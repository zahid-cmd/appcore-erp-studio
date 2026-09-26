//===============================================================
// Imports
//===============================================================

import
{
    Component,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    PageHeaderComponent
}
from '../../components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../components/utilities/command-center/command-center';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-dashboard-customized',

    standalone:
        true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        CommandCenterComponent
    ],

    templateUrl:
        './dashboard-customized.html',

    styleUrl:
        './dashboard-customized.css'
})


//===============================================================
// Dashboard Customized Component
//===============================================================

export class DashboardCustomizedComponent
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly router =
        inject(Router);


    private readonly route =
        inject(ActivatedRoute);



    //===========================================================
    // Back
    //===========================================================

    back():
        void
    {
        void this.router.navigate
        (
            [
                'list'
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }

}