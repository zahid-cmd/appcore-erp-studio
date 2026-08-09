//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnDestroy,
    OnInit,
    ChangeDetectorRef
}
from '@angular/core';

import
{
    NavigationEnd,
    Router,
    RouterModule
}
from '@angular/router';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Subject,
    filter,
    takeUntil
}
from 'rxjs';


//===============================================================
// Breadcrumb Item
//===============================================================

interface BreadcrumbItem
{
    label: string;

    url: string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector: 'app-breadcrumb',

    standalone: true,

    imports:
    [
        CommonModule,

        RouterModule
    ],

    templateUrl: './breadcrumb.html',

    styleUrls:
    [
        './breadcrumb.css'
    ]
})


//===============================================================
// Breadcrumb Component
//===============================================================

export class BreadcrumbComponent
implements OnInit, OnDestroy
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly destroy$ =
        new Subject<void>();


    breadcrumbs: BreadcrumbItem[] =
        [];


    //===========================================================
    // Constructor
    //===========================================================

    constructor
    (
        private readonly router: Router,

        private readonly cdr: ChangeDetectorRef
    )
    {
    }


    //===========================================================
    // Component Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.router.events

            .pipe
            (
                filter
                (
                    event =>
                        event instanceof NavigationEnd
                ),

                takeUntil
                (
                    this.destroy$
                )
            )

            .subscribe
            (
                () =>
                {
                    setTimeout
                    (
                        () =>
                        {
                            this.build();
                        },

                        0
                    );
                }
            );


        this.build();
    }


    //===========================================================
    // Component Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.destroy$.next();

        this.destroy$.complete();
    }


    //===========================================================
    // Build Breadcrumb
    //===========================================================

    private build():
        void
    {
        console.log
        (
            '=============================='
        );


        console.log
        (
            'BREADCRUMB BUILD'
        );


        console.log
        (
            'URL:',

            this.router.url
        );


        this.breadcrumbs =
            this.collect
            (
                this.router.routerState.snapshot.root
            );


        this.cdr.detectChanges();


        console.log
        (
            'RESULT:',

            this.breadcrumbs
        );


        console.log
        (
            '=============================='
        );
    }


    //===========================================================
    // Collect Breadcrumb Items
    //===========================================================

    private collect
    (
        route: any,

        url: string = '',

        items: BreadcrumbItem[] = []
    ):
        BreadcrumbItem[]
    {
        const child =
            route.firstChild;


        //=======================================================
        // No More Child Routes
        //=======================================================

        if
        (
            !child
        )
        {
            return items;
        }


        //=======================================================
        // Route Segment
        //=======================================================

        const segment =
            child.url

                .map
                (
                    (part: any) =>
                        part.path
                )

                .join('/');


        //=======================================================
        // Next URL
        //=======================================================

        const nextUrl =
            segment

                ? `${url}/${segment}`

                : url;


        //=======================================================
        // Breadcrumb Label
        //=======================================================

        const label =
            child.data['breadcrumb'];


        //=======================================================
        // Add Breadcrumb
        //=======================================================

        if
        (
            label
        )
        {
            const previousItem =
                items.length > 0

                    ? items[items.length - 1]

                    : null;


            //===================================================
            // Prevent Consecutive Duplicate Breadcrumb
            //===================================================

            const isDuplicate =
                previousItem != null
                &&
                previousItem.label
                    .trim()
                    .toLowerCase()
                ===
                label
                    .trim()
                    .toLowerCase();


            if
            (
                !isDuplicate
            )
            {
                items.push
                (
                    {
                        label,

                        url: nextUrl
                    }
                );
            }
        }


        //=======================================================
        // Continue Through Route Tree
        //=======================================================

        return this.collect
        (
            child,

            nextUrl,

            items
        );
    }
}