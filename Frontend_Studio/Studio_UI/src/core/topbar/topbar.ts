import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

import { TopbarHeaderComponent } from '../../shared/components/layout/topbar-header/topbar-header';

import { TopbarActionsComponent } from '../../shared/components/layout/topbar-actions/topbar-actions';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [
        CommonModule,
        TopbarHeaderComponent,

        TopbarActionsComponent
    ],
    templateUrl: './topbar.html',
    styleUrls: ['./topbar.css']
})
export class TopbarComponent
{

}