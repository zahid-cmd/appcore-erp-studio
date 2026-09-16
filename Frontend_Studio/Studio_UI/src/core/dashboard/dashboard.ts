//===============================================================
// Imports
//===============================================================

import
{
    Component
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    PageHeaderComponent
}
from '../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../shared/components/utilities/command-center/command-center';


//===============================================================
// Dashboard Widget
//===============================================================

interface DashboardWidget
{
    id:
        string;

    widgetKey:
        string;

    title:
        string;

    icon:
        string;

    columnSpan:
        number;

    rowSpan:
        number;

    displayOrder:
        number;

    visible:
        boolean;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-dashboard',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        CommandCenterComponent
    ],

    templateUrl:'./dashboard.html',

    styleUrl:'./dashboard.css'
})


export class DashboardComponent
{
    //===========================================================
    // Dashboard State
    //===========================================================

    isCustomizeMode:
        boolean =
        false;

    isLoading:
        boolean =
        false;


    //===========================================================
    // Dashboard Widgets
    //===========================================================

    widgets:
        DashboardWidget[]
    =
    [
        {
            id:
                'dashboard-widget-001',

            widgetKey:
                'revenue-kpi',

            title:
                'Revenue',

            icon:
                'fas fa-coins',

            columnSpan:
                3,

            rowSpan:
                1,

            displayOrder:
                1,

            visible:
                true
        },

        {
            id:
                'dashboard-widget-002',

            widgetKey:
                'sales-kpi',

            title:
                'Sales',

            icon:
                'fas fa-chart-line',

            columnSpan:
                3,

            rowSpan:
                1,

            displayOrder:
                2,

            visible:
                true
        },

        {
            id:
                'dashboard-widget-003',

            widgetKey:
                'purchase-kpi',

            title:
                'Purchases',

            icon:
                'fas fa-cart-shopping',

            columnSpan:
                3,

            rowSpan:
                1,

            displayOrder:
                3,

            visible:
                true
        },

        {
            id:
                'dashboard-widget-004',

            widgetKey:
                'outstanding-kpi',

            title:
                'Outstanding',

            icon:
                'fas fa-file-invoice-dollar',

            columnSpan:
                3,

            rowSpan:
                1,

            displayOrder:
                4,

            visible:
                true
        },

        {
            id:
                'dashboard-widget-005',

            widgetKey:
                'sales-overview',

            title:
                'Sales Overview',

            icon:
                'fas fa-chart-area',

            columnSpan:
                8,

            rowSpan:
                2,

            displayOrder:
                5,

            visible:
                true
        },

        {
            id:
                'dashboard-widget-006',

            widgetKey:
                'quick-actions',

            title:
                'Quick Actions',

            icon:
                'fas fa-bolt',

            columnSpan:
                4,

            rowSpan:
                2,

            displayOrder:
                6,

            visible:
                true
        },

        {
            id:
                'dashboard-widget-007',

            widgetKey:
                'recent-sales',

            title:
                'Recent Sales',

            icon:
                'fas fa-receipt',

            columnSpan:
                6,

            rowSpan:
                2,

            displayOrder:
                7,

            visible:
                true
        },

        {
            id:
                'dashboard-widget-008',

            widgetKey:
                'recent-activity',

            title:
                'Recent Activity',

            icon:
                'fas fa-clock-rotate-left',

            columnSpan:
                6,

            rowSpan:
                2,

            displayOrder:
                8,

            visible:
                true
        }
    ];


    //===========================================================
    // Customize Mode
    //===========================================================

    toggleCustomizeMode():
        void
    {
        this.isCustomizeMode =
            !this.isCustomizeMode;
    }


    //===========================================================
    // Refresh Dashboard
    //===========================================================

    refreshDashboard():
        void
    {
        if(this.isLoading)
        {
            return;
        }

        this.isLoading =
            true;

        setTimeout(
            () =>
            {
                this.isLoading =
                    false;
            },
            300
        );
    }


    //===========================================================
    // Visible Widgets
    //===========================================================

    get visibleWidgets():
        DashboardWidget[]
    {
        return this.widgets
            .filter(
                widget =>
                    widget.visible
            )
            .sort(
                (
                    first,
                    second
                ) =>
                    first.displayOrder -
                    second.displayOrder
            );
    }


    //===========================================================
    // Widget Visibility
    //===========================================================

    toggleWidgetVisibility(
        widgetId:
            string
    ):
        void
    {
        const widget =
            this.widgets.find(
                item =>
                    item.id === widgetId
            );

        if(!widget)
        {
            return;
        }

        widget.visible =
            !widget.visible;
    }
}