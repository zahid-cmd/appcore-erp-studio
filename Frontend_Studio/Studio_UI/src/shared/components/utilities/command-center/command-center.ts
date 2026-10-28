//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    Input,
    Output,
    OnChanges,
    SimpleChanges,
    ChangeDetectorRef,
    DestroyRef,
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
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    SidebarService
}
from '../../../../core/sidebar/sidebar.service';

import
{
    EffectiveAccessService
}
from '../../../../core/effective-access/effective-access.service';

import
{
    TooltipDirective
}
from '../tooltip/tooltip.directive';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-command-center',
    standalone:true,
    imports:
    [
        CommonModule,
        TooltipDirective
    ],
    templateUrl:
        './command-center.html',
    styleUrl:
        './command-center.css'
})

export class CommandCenterComponent
implements OnChanges
{
    //=============================================================
    // Dependencies
    //=============================================================

    private readonly sidebarService =
        inject(SidebarService);

    private readonly effectiveAccessService =
        inject(EffectiveAccessService);

    private readonly changeDetectorRef =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);


    //=============================================================
    // Constructor
    //=============================================================

    constructor()
    {
        this.effectiveAccessService
            .permissionsLoaded$
            .pipe(
                takeUntilDestroyed(
                    this.destroyRef
                )
            )
            .subscribe(
                () =>
                {
                    this.changeDetectorRef.markForCheck();
                }
            );

        this.sidebarService
            .currentNavigationContext$
            .pipe(
                takeUntilDestroyed(
                    this.destroyRef
                )
            )
            .subscribe(
                () =>
                {
                    this.changeDetectorRef.markForCheck();
                }
            );
    }


    //=============================================================
    // Preview Mode
    //=============================================================

    @Input()
    previewMode =
        false;


    //=============================================================
    // Left Command 1
    //=============================================================

    @Input() command1Text = '';

    @Input() command1Icon = '';

    @Input() command1Visible = true;
    // Tooltip; empty = the button text
    @Input() command1Title = '';

    @Input()
    command1Permission:
        'add'
        |
        'update'
        |
        'restore'
        |
        '' =
        '';

    // Page / common activity the button needs, by its Master
    // Activity name ('Approve', 'Place Order', 'Print' …);
    // empty = the Add / Update / Restore rule above
    @Input() command1Activity = '';

    @Output() command1Click =
        new EventEmitter<void>();


    //=============================================================
    // Left Command 2
    //=============================================================

    @Input() command2Text = '';

    @Input() command2Icon = '';

    @Input() command2Visible = true;
    // Tooltip; empty = the button text
    @Input() command2Title = '';

    @Input()
    command2Permission:
        'add'
        |
        'update'
        |
        'restore'
        |
        '' =
        '';

    // Page / common activity the button needs, by its Master
    // Activity name ('Approve', 'Place Order', 'Print' …);
    // empty = the Add / Update / Restore rule above
    @Input() command2Activity = '';

    @Output() command2Click =
        new EventEmitter<void>();


    //=============================================================
    // Left Command 3
    //=============================================================

    @Input() command3Text = '';

    @Input() command3Icon = '';

    @Input() command3Visible = true;
    // Tooltip; empty = the button text
    @Input() command3Title = '';

    @Input()
    command3Permission:
        'add'
        |
        'update'
        |
        'restore'
        |
        '' =
        '';

    // Page / common activity the button needs, by its Master
    // Activity name ('Approve', 'Place Order', 'Print' …);
    // empty = the Add / Update / Restore rule above
    @Input() command3Activity = '';

    @Output() command3Click =
        new EventEmitter<void>();


    //=============================================================
    // Right Command
    //=============================================================

    @Input() rightCommandIcon = '';

    @Input() rightCommandVisible = true;
    // Tooltip of the icon button (empty = none)
    @Input() rightCommandTitle = '';

    @Output() rightCommandClick =
        new EventEmitter<void>();


    //=============================================================
    // Changes
    //=============================================================

    ngOnChanges(
        changes:
            SimpleChanges
    ):
        void
    {
        if
        (
            changes['previewMode']
            &&
            this.previewMode
        )
        {
            this.applyPreviewData();
        }
    }


    //=============================================================
    // Preview Data
    //=============================================================

    private applyPreviewData():
        void
    {
        this.command1Text =
            'Add';

        this.command1Icon =
            'fas fa-plus';

        this.command1Visible =
            true;

        this.command2Text =
            'Refresh';

        this.command2Icon =
            'fas fa-rotate-right';

        this.command2Visible =
            true;

        this.command3Text =
            'Restore';

        this.command3Icon =
            'fas fa-trash-arrow-up';

        this.command3Visible =
            true;

        this.rightCommandIcon =
            'fas fa-clock-rotate-left';

        this.rightCommandVisible =
            true;
    }


    //=============================================================
    // Current Submenu ID
    //=============================================================

    private getCurrentSubMenuId():
        number | null
    {
        return this.sidebarService
            .getCurrentNavigationContext()
            .subMenuId;
    }


    //=============================================================
    // Resolve Command Permission
    //=============================================================

    private resolveCommandPermission(
        text: string,
        explicitPermission:
            'add'
            |
            'update'
            |
            'restore'
            |
            ''
    ):
        'add'
        |
        'update'
        |
        'restore'
        |
        ''
    {
        if
        (
            explicitPermission
        )
        {
            return explicitPermission;
        }

        const normalizedText =
            text
                .trim()
                .toLowerCase();

        if
        (
            normalizedText
            ===
            'add'
        )
        {
            return 'add';
        }

        if
        (
            normalizedText
            ===
            'save'
        )
        {
            return 'add';
        }

        if
        (
            normalizedText
            ===
            'update'
        )
        {
            return 'update';
        }

        if
        (
            normalizedText
            ===
            'restore'
        )
        {
            return 'restore';
        }

        return '';
    }


    //=============================================================
    // Check Command Permission
    //=============================================================

    private hasCommandPermission(
        text: string,
        explicitPermission:
            'add'
            |
            'update'
            |
            'restore'
            |
            '',
        activity:
            string =
            ''
    ):
        boolean
    {
        // Named activity : the user needs it on this page
        if
        (
            activity.trim()
        )
        {
            const activitySubMenuId =
                this.getCurrentSubMenuId();

            return activitySubMenuId !== null
                &&
                this.effectiveAccessService.canDo(
                    activitySubMenuId,
                    activity
                );
        }

        const permission =
            this.resolveCommandPermission(
                text,
                explicitPermission
            );

        if
        (
            !permission
        )
        {
            return true;
        }

        const subMenuId =
            this.getCurrentSubMenuId();

        if
        (
            subMenuId === null
        )
        {
            return false;
        }

        if
        (
            permission
            ===
            'add'
        )
        {
            return this.effectiveAccessService
                .canAdd(
                    subMenuId
                );
        }

        if
        (
            permission
            ===
            'update'
        )
        {
            return this.effectiveAccessService
                .canUpdate(
                    subMenuId
                );
        }

        if
        (
            permission
            ===
            'restore'
        )
        {
            return this.effectiveAccessService
                .canRestore(
                    subMenuId
                );
        }

        return true;
    }


    //=============================================================
    // Command 1 Visibility
    //=============================================================

    isCommand1Visible():
        boolean
    {
        return (
            this.command1Visible
            &&
            !!(
                this.command1Text
                ||
                this.command1Icon
            )
            &&
            this.hasCommandPermission(
                this.command1Text,
                this.command1Permission,
                this.command1Activity
            )
        );
    }


    //=============================================================
    // Command 2 Visibility
    //=============================================================

    isCommand2Visible():
        boolean
    {
        return (
            this.command2Visible
            &&
            !!(
                this.command2Text
                ||
                this.command2Icon
            )
            &&
            this.hasCommandPermission(
                this.command2Text,
                this.command2Permission,
                this.command2Activity
            )
        );
    }


    //=============================================================
    // Command 3 Visibility
    //=============================================================

    isCommand3Visible():
        boolean
    {
        return (
            this.command3Visible
            &&
            !!(
                this.command3Text
                ||
                this.command3Icon
            )
            &&
            this.hasCommandPermission(
                this.command3Text,
                this.command3Permission,
                this.command3Activity
            )
        );
    }


    //=============================================================
    // Right Command Visibility
    //=============================================================

    isRightCommandVisible():
        boolean
    {
        return (
            this.rightCommandVisible
            &&
            !!this.rightCommandIcon
        );
    }


    //=============================================================
    // Left Command Visibility
    //=============================================================

    hasVisibleLeftCommands():
        boolean
    {
        return (
            this.isCommand1Visible()
            ||
            this.isCommand2Visible()
            ||
            this.isCommand3Visible()
        );
    }


    //=============================================================
    // Left Command 1 Click
    //=============================================================

    onCommand1Click():
        void
    {
        if
        (
            !this.isCommand1Visible()
        )
        {
            return;
        }

        this.command1Click.emit();
    }


    //=============================================================
    // Left Command 2 Click
    //=============================================================

    onCommand2Click():
        void
    {
        if
        (
            !this.isCommand2Visible()
        )
        {
            return;
        }

        this.command2Click.emit();
    }


    //=============================================================
    // Left Command 3 Click
    //=============================================================

    onCommand3Click():
        void
    {
        if
        (
            !this.isCommand3Visible()
        )
        {
            return;
        }

        this.command3Click.emit();
    }


    //=============================================================
    // Right Command Click
    //=============================================================

    onRightCommandClick():
        void
    {
        if
        (
            !this.isRightCommandVisible()
        )
        {
            return;
        }

        this.rightCommandClick.emit();
    }
}