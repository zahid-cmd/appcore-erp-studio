/* ============================================================   
   IMPORTS   
============================================================ */   
   
import   
{   
    Component,   
    Input,   
    ChangeDetectorRef   
}   
from '@angular/core';   
   
import   
{   
    Router,   
    RouterLink,   
    NavigationEnd   
}   
from '@angular/router';   
   
import   
{   
    filter   
}   
from 'rxjs';   
   
   
/* ============================================================   
   COMPONENT   
============================================================ */   
   
@Component(   
{   
    selector:'app-sidebar-header',   
   
    standalone:true,   
   
    imports:   
    [   
        RouterLink   
    ],   
   
    templateUrl:'./sidebar-header.html',   
   
    styleUrl:'./sidebar-header.css'   
})   
   
   
export class SidebarHeaderComponent   
{   
    /* ========================================================   
       INPUTS   
    ======================================================== */   
   
    @Input()   
    isCollapsed:   
        boolean =   
        false;   
   
   
    /* ========================================================   
       PROPERTIES   
    ======================================================== */   
   
    isActive:   
        boolean =   
        false;   
   
   
    /* ========================================================   
       DEPENDENCIES   
    ======================================================== */   
   
    constructor   
    (   
        private readonly router:   
            Router,   
   
        private readonly cdr:   
            ChangeDetectorRef   
    )   
    {   
    }   
   
   
    /* ========================================================   
       LIFECYCLE   
    ======================================================== */   
   
    ngOnInit():   
        void   
    {   
        this.updateActiveState(   
            this.router.url   
        );   
   
        this.router.events   
            .pipe(   
                filter(   
                    event =>   
                        event instanceof NavigationEnd   
                )   
            )   
            .subscribe(   
                (event: NavigationEnd) =>   
                {   
                    this.updateActiveState(   
                        event.urlAfterRedirects   
                    );   
   
                    this.cdr.detectChanges();   
                }   
            );   
    }   
   
   
    /* ========================================================   
       ACTIVE STATE   
    ======================================================== */   
   
    private updateActiveState   
    (   
        url:   
            string   
    ):   
        void   
    {   
        const currentUrl =   
            url.split('?')[0];   
   
        this.isActive =   
            currentUrl === '/dashboard'   
            ||   
            currentUrl.startsWith(   
                '/dashboard/'   
            );   
    }   
}   