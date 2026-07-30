import
{
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

/* =====================================================
   CONTROL TAB MODEL
===================================================== */

export interface ControlTab
{
    id: string;

    label: string;

    disabled?: boolean;
}

@Component({
    selector: 'app-control-tabs',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './control-tabs.html',

    styleUrl:
        './control-tabs.css'
})
export class ControlTabsComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    tabs: ControlTab[] = [];

    @Input()
    selectedTab = '';

    /* =====================================================
       OUTPUTS
    ====================================================== */

    @Output()
    selectedTabChange =
        new EventEmitter<string>();

    @Output()
    tabChanged =
        new EventEmitter<ControlTab>();

    /* =====================================================
       SELECT TAB
    ====================================================== */

    selectTab(
        tab: ControlTab
    ): void
    {
        if (tab.disabled)
        {
            return;
        }

        if (this.selectedTab === tab.id)
        {
            return;
        }

        this.selectedTab =
            tab.id;

        this.selectedTabChange.emit(
            this.selectedTab
        );

        this.tabChanged.emit(
            tab
        );
    }
}