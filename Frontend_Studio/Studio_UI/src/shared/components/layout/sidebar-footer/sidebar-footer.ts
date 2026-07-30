import {
    Component
} from '@angular/core';

import {
    CommonModule
} from '@angular/common';

interface SidebarFooterItem {

    icon: string;

    tooltip: string;

    action: string;

}

@Component({

    selector: 'app-sidebar-footer',

    standalone: true,

    imports: [
        CommonModule
    ],

    templateUrl: './sidebar-footer.html',

    styleUrls: ['./sidebar-footer.css']

})
export class SidebarFooterComponent {

    readonly items: SidebarFooterItem[] = [

        {

            icon: 'fas fa-house',

            tooltip: 'Dashboard',

            action: 'dashboard'

        },

        {

            icon: 'fas fa-star',

            tooltip: 'Favorites',

            action: 'favorites'

        },

        {

            icon: 'fas fa-clock-rotate-left',

            tooltip: 'Recent Pages',

            action: 'recent'

        },

        {

            icon: 'fas fa-gear',

            tooltip: 'Navigation Settings',

            action: 'settings'

        }

    ];

    onItemClick(action: string): void {

        switch (action) {

            case 'dashboard':

                console.log('Dashboard');

                break;

            case 'favorites':

                console.log('Favorites');

                break;

            case 'recent':

                console.log('Recent Pages');

                break;

            case 'settings':

                console.log('Navigation Settings');

                break;

        }

    }

}