//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Test Rides (SUB-010-002-004)
//
//   list · add · edit/:id · view/:id (id = PublicId)
//   board : the day board (slots, waiting list), hand-written
//           under enquiry-profiles; ?enquiry=<id>&date=yyyy-MM-dd
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for this
// submenu.
//===============================================================

export const TestRidesRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },

    {
        path:'list',

        data:
        {
            breadcrumb:'Test Rides'
        },

        loadComponent:() =>
            import(
                '../pages/test-rides/list/test-rides-list'
            )
            .then(
                m =>
                    m.TestRidesList
            )
    },

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Test Ride'
        },

        loadComponent:() =>
            import(
                '../pages/test-rides/form/test-rides-form'
            )
            .then(
                m =>
                    m.TestRidesForm
            )
    },

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Test Ride'
        },

        loadComponent:() =>
            import(
                '../pages/test-rides/form/test-rides-form'
            )
            .then(
                m =>
                    m.TestRidesForm
            )
    },

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Test Ride'
        },

        loadComponent:() =>
            import(
                '../pages/test-rides/form/test-rides-form'
            )
            .then(
                m =>
                    m.TestRidesForm
            )
    },

    {
        path:'board',

        data:
        {
            breadcrumb:'Test Ride Board'
        },

        loadComponent:() =>
            import(
                '../../enquiry-profiles/pages/sales-enquiries/test-rides/sales-test-rides'
            )
            .then(
                m =>
                    m.SalesTestRidesPage
            )
    }
];
