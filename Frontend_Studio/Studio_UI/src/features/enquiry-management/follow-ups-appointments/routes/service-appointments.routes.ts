//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Service Appointments (SUB-010-002-003)
//
//   list · add · edit/:id · view/:id (id = PublicId)
//   board : the day board (slots, waiting list), hand-written
//           under enquiry-profiles; ?enquiry=<id>&date=yyyy-MM-dd
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for this
// submenu.
//===============================================================

export const ServiceAppointmentsRoutes:
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
            breadcrumb:'Service Appointments'
        },

        loadComponent:() =>
            import(
                '../pages/service-appointments/list/service-appointments-list'
            )
            .then(
                m =>
                    m.ServiceAppointmentsList
            )
    },

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Appointment'
        },

        loadComponent:() =>
            import(
                '../pages/service-appointments/form/service-appointments-form'
            )
            .then(
                m =>
                    m.ServiceAppointmentsForm
            )
    },

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Appointment'
        },

        loadComponent:() =>
            import(
                '../pages/service-appointments/form/service-appointments-form'
            )
            .then(
                m =>
                    m.ServiceAppointmentsForm
            )
    },

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Appointment'
        },

        loadComponent:() =>
            import(
                '../pages/service-appointments/form/service-appointments-form'
            )
            .then(
                m =>
                    m.ServiceAppointmentsForm
            )
    },

    {
        path:'board',

        data:
        {
            breadcrumb:'Appointment Board'
        },

        loadComponent:() =>
            import(
                '../../enquiry-profiles/pages/service-enquiries/appointments/service-appointments'
            )
            .then(
                m =>
                    m.ServiceAppointmentsPage
            )
    }
];
