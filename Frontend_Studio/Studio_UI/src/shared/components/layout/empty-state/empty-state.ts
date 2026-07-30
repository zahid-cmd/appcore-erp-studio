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

@Component(
{
    selector: 'app-empty-state',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './empty-state.html',

    styleUrl:
        './empty-state.css'
})
export class EmptyStateComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    icon = 'fas fa-database';

    @Input()
    title = 'No Data Found';

    @Input()
    subtitle =
        'No records are available right now.';

    @Input()
    actionText = '';

    @Input()
    showAction = false;

    /* =====================================================
       OUTPUTS
    ====================================================== */

    @Output()
    readonly action =
        new EventEmitter<void>();

    /* =====================================================
       ACTION
    ====================================================== */

    onAction(): void
    {
        this.action.emit();
    }
}