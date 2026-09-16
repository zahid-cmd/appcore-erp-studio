//=============================================================== 
// Imports 
//=============================================================== 
 
import 
{ 
    Component, 
    OnInit, 
    OnDestroy, 
    ChangeDetectorRef, 
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
    Router, 
    RouterOutlet, 
    NavigationEnd 
} 
from '@angular/router'; 
 
import 
{ 
    filter, 
    Subscription 
} 
from 'rxjs'; 
 
import 
{ 
    TopbarComponent 
} 
from '../topbar/topbar'; 
 
import 
{ 
    SidebarComponent 
} 
from '../sidebar/sidebar'; 
 
import 
{ 
    FooterComponent 
} 
from '../footer/footer'; 
 
import 
{ 
    BreadcrumbComponent 
} 
from '../../shared/components/layout/breadcrumb/breadcrumb'; 
 
import 
{ 
    SidebarService 
} 
from '../sidebar/sidebar.service'; 
 
//=============================================================== 
// Component 
//=============================================================== 
 
@Component( 
{ 
    selector: 'app-layout', 
 
    standalone: true, 
 
    imports: 
    [ 
        CommonModule, 
        RouterOutlet, 
        TopbarComponent, 
        SidebarComponent, 
        FooterComponent, 
        BreadcrumbComponent 
    ], 
 
    templateUrl: 
        './layout.html', 
 
    styleUrls: 
    [ 
        './layout.css' 
    ] 
}) 
 
//=============================================================== 
// Layout Component 
//=============================================================== 
 
export class LayoutComponent 
implements OnInit, OnDestroy 
{ 
    //=========================================================== 
    // Dependencies 
    //=========================================================== 
 
    private readonly router = 
        inject(Router); 
 
    private readonly sidebarService = 
        inject(SidebarService); 
 
    private readonly cdr = 
        inject(ChangeDetectorRef); 
 
    //=========================================================== 
    // Properties 
    //=========================================================== 
 
    isSidebarCollapsed = 
        false; 
 
    isDashboard = 
        false; 
 
    private readonly subscriptions = 
        new Subscription(); 
 
    //=========================================================== 
    // Lifecycle 
    //=========================================================== 
 
    ngOnInit(): 
        void 
    { 
        this.updateDashboardState( 
            this.router.url 
        ); 
 
        this.subscriptions.add( 
            this.sidebarService.sidebarCollapsed$ 
                .subscribe( 
                collapsed => 
                { 
                    this.isSidebarCollapsed = 
                        collapsed; 
 
                    this.cdr.detectChanges(); 
                }) 
        ); 
 
        this.subscriptions.add( 
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
                        this.updateDashboardState( 
                            event.urlAfterRedirects 
                        ); 
 
                        this.cdr.detectChanges(); 
                    } 
                ) 
        ); 
    } 
 
    //=========================================================== 
    // Dashboard State 
    //=========================================================== 
 
    private updateDashboardState( 
        url: 
            string 
    ): 
        void 
    { 
        const currentUrl = 
            url.split('?')[0]; 
 
        this.isDashboard = 
            currentUrl === '/dashboard' 
            || 
            currentUrl.startsWith( 
                '/dashboard/' 
            ); 
    } 
 
    //=========================================================== 
    // Lifecycle 
    //=========================================================== 
 
    ngOnDestroy(): 
        void 
    { 
        this.subscriptions.unsubscribe(); 
    } 
}