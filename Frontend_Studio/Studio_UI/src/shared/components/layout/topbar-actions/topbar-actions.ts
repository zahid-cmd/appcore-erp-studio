import {
    Component,
    EventEmitter,
    Input,
    Output
} from '@angular/core';

import {
    CommonModule
} from '@angular/common';

import {
    SearchBoxComponent
} from '../../utilities/search-box/search-box';

@Component({
    selector: 'app-topbar-actions',
    standalone: true,
    imports: [
        CommonModule,
        SearchBoxComponent
    ],
    templateUrl: './topbar-actions.html',
    styleUrls: ['./topbar-actions.css']
})
export class TopbarActionsComponent
{
    @Input()
    userName =
        'Administrator';

    @Input()
    userRole =
        'System Administrator';

    @Input()
    avatarIcon =
        'fas fa-user-circle';

    @Input()
    searchPlaceholder =
        'Search anything...';

    @Output()
    search =
        new EventEmitter<string>();

    @Output()
    userMenuClick =
        new EventEmitter<void>();

    @Output()
    logout =
        new EventEmitter<void>();

    onSearch(
        value: string
    ): void
    {
        this.search.emit(value);
    }

    onUserMenuClick(): void
    {
        this.userMenuClick.emit();
    }

    onLogout(): void
    {
        this.logout.emit();
    }
}