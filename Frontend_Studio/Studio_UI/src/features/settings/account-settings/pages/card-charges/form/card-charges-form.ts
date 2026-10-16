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
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    FormsModule
}
from '@angular/forms';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    Observable,
    defer,
    forkJoin,
    of,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    EmptyStateComponent
}
from '../../../../../../shared/components/layout/empty-state/empty-state';

//===============================================================
// Form Controls
//===============================================================

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

//===============================================================
// Utilities
//===============================================================

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

//===============================================================
// Models & Services
//===============================================================

import
{
    CardChargeLine,
    SaveCardCharges
}
from '../../../models/card-charges.model';

import
{
    CardChargesService
}
from '../../../services/card-charges.service';

import
{
    POSAccountsService
}
from '../../../services/pos-accounts.service';

import
{
    CardSetupService
}
from '../../../services/card-setup.service';

//===============================================================
// Constants
//===============================================================

const MAX_CHARGE_PERCENT:
    number =
    100;

//===============================================================
// Case-Insensitive Field Reader
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}

//===============================================================
// Local Types
//===============================================================

interface PosAccountOption
{
    POSAccountId:
        number;
    POSAccountCode:
        string;
    POSAccountName:
        string;
    Status:
        boolean;
}

interface CardOption
{
    CardSetupId:
        number;
    CardCode:
        string;
    CardName:
        string;
    Status:
        boolean;
}

interface CardChargesHeader
{
    POSAccountId:
        number | null;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'card-charges-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        EmptyStateComponent,

        //=======================================================
        // Form Controls
        //=======================================================

        TextboxComponent,
        SearchDropdownComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./card-charges-form.html',

    styleUrls:
    [
        './card-charges-form.css'
    ]
})

//===============================================================
// Card Charges Form
//===============================================================

export class CardChargesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly cardChargesService =
        inject(CardChargesService);

    private readonly posAccountsService =
        inject(POSAccountsService);

    private readonly cardSetupService =
        inject(CardSetupService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        5000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =
        false;

    //===========================================================
    // Mode
    //
    // entityId = POS Account Id (the master record)
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId:
        number =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Card Charges';

    entityName:
        string =
        'Card Charges';

    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab:
        string =
        'general';

    //===========================================================
    // Tabs
    //===========================================================

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'general',
                label:this.tabTitle
            }
        ];
    }

    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'add':
                return `Add ${this.entityName}`;

            case 'edit':
                return `Update ${this.entityName}`;

            case 'view':
                return `View ${this.entityName}`;

            default:
                return this.entityName;
        }
    }

    //===========================================================
    // Lookups
    //===========================================================

    private posAccounts:
        PosAccountOption[] =
        [];

    // POS Accounts that already have card charges
    private usedPosAccountIds:
        Set<number> =
        new Set<number>();

    private cards:
        CardOption[] =
        [];

    posAccountItems:
        any[] =
        [];

    cardItems:
        any[] =
        [];

    // Name of the loaded POS account (fallback if it is no
    // longer in the POS Accounts list)
    private loadedPosAccountLabel:
        string =
        '';

    //===========================================================
    // Header & Lines
    //===========================================================

    entity:
        CardChargesHeader =
    {
        POSAccountId:null
    };

    lines:
        CardChargeLine[] =
        [];

    //===========================================================
    // Entry Bar (Toolbar)
    //===========================================================

    entryCardSetupId:
        number | null =
        null;

    entryChargeText:
        string =
        '';

    // Index of the line loaded for editing (-1 = adding)
    editingIndex:
        number =
        -1;

    //===========================================================
    // Form State
    //===========================================================

    private originalState:
        string =
        '';

    hasChanges:
        boolean =
        false;

    //===========================================================
    // Empty State (shared app-empty-state)
    //===========================================================

    get emptyIcon():
        string
    {
        return this.entity.POSAccountId
            ? 'fas fa-credit-card'
            : 'fas fa-cash-register';
    }

    get emptyTitle():
        string
    {
        return this.entity.POSAccountId
            ? 'No Cards Added'
            : 'No POS Account Selected';
    }

    get emptySubtitle():
        string
    {
        if
        (
            !this.entity.POSAccountId
        )
        {
            return 'Select a POS account to start adding card charges.';
        }

        return this.isViewMode
            ? 'This POS account has no card charges.'
            : 'Select a card, enter the charge and click Add.';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.resolveMode();

        this.loadLookups();
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        if
        (
            this.isSaving
        )
        {
            this.progressDialog.close();
        }
    }

    //===========================================================
    // Field Helpers
    //===========================================================

    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(
            readField(item, name)
            ??
            ''
        ).trim();
    }

    private num
    (
        item:
            any,
        name:
            string
    ):
        number
    {
        const value =
            Number(
                readField(item, name)
                ??
                0
            );

        return Number.isFinite(value)
            ? value
            : 0;
    }

    private bool
    (
        item:
            any,
        name:
            string,
        fallback:
            boolean
    ):
        boolean
    {
        const value =
            readField(item, name);

        return value == null
            ? fallback
            : Boolean(value);
    }

    //===========================================================
    // Resolve Mode & Id
    //===========================================================

    private resolveMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
        else
        {
            this.mode =
                'add';
        }

        this.entityId =
            this.resolveEntityId();
    }

    private resolveEntityId():
        number
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;

        while
        (
            currentRoute
        )
        {
            const id =
                Number(
                    currentRoute.snapshot.paramMap.get('id')
                );

            if
            (
                id > 0
            )
            {
                return id;
            }

            currentRoute =
                currentRoute.parent;
        }

        return 0;
    }

    //===========================================================
    // Load Lookups
    //
    // POS Accounts, Card Setup and existing Card Charges (to know
    // which POS Accounts are already used) load together.
    //===========================================================

    private loadLookups():
        void
    {
        forkJoin
        ({
            posAccounts:
                this.posAccountsService
                    .getAll()
                    .pipe
                    (
                        catchError
                        (
                            error =>
                            {
                                console.error(
                                    'Load POS Accounts Error:',
                                    error
                                );

                                this.toast.error(
                                    'Error',
                                    'Failed to load POS accounts.'
                                );

                                return of([]);
                            }
                        )
                    ),

            cards:
                this.cardSetupService
                    .getAll()
                    .pipe
                    (
                        catchError
                        (
                            error =>
                            {
                                console.error(
                                    'Load Card Setup Error:',
                                    error
                                );

                                this.toast.error(
                                    'Error',
                                    'Failed to load cards from Card Setup.'
                                );

                                return of([]);
                            }
                        )
                    ),

            charges:
                this.cardChargesService
                    .getAll()
                    .pipe
                    (
                        catchError
                        (
                            error =>
                            {
                                console.error(
                                    'Load Card Charges Error:',
                                    error
                                );

                                return of([]);
                            }
                        )
                    )
        })
        .subscribe
        ({
            next:
            (
                result:
                {
                    posAccounts:
                        any;
                    cards:
                        any;
                    charges:
                        any;
                }
            ):
                void =>
            {
                this.posAccounts =
                    (Array.isArray(result.posAccounts) ? result.posAccounts : [])
                        .map
                        (
                            item =>
                            ({
                                POSAccountId:
                                    this.num(item, 'POSAccountId'),
                                POSAccountCode:
                                    this.text(item, 'POSAccountCode'),
                                POSAccountName:
                                    this.text(item, 'POSAccountName'),
                                Status:
                                    this.bool(item, 'Status', true)
                            })
                        )
                        .filter
                        (
                            item =>
                                item.POSAccountId > 0
                        );

                this.cards =
                    (Array.isArray(result.cards) ? result.cards : [])
                        .map
                        (
                            item =>
                            ({
                                CardSetupId:
                                    this.num(item, 'CardSetupId'),
                                CardCode:
                                    this.text(item, 'CardCode'),
                                CardName:
                                    this.text(item, 'CardName'),
                                Status:
                                    this.bool(item, 'Status', true)
                            })
                        )
                        .filter
                        (
                            item =>
                                item.CardSetupId > 0
                        );

                this.usedPosAccountIds =
                    new Set<number>(
                        (Array.isArray(result.charges) ? result.charges : [])
                            .map
                            (
                                item =>
                                    this.num(item, 'POSAccountId')
                            )
                            .filter
                            (
                                id =>
                                    id > 0
                            )
                    );

                if
                (
                    this.entityId > 0
                )
                {
                    this.loadEntity();

                    return;
                }

                this.initializeEntity();
            }
        });
    }

    //===========================================================
    // Initialize Entity (Add Mode)
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            POSAccountId:null
        };

        this.lines =
            [];

        this.loadedPosAccountLabel =
            '';

        this.resetEntry();

        this.buildPosAccountItems();

        this.buildCardItems();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Entity (Edit / View Mode)
    //===========================================================

    private loadEntity():
        void
    {
        this.cardChargesService
            .getByPosAccount(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response
                ):
                    void =>
                {
                    this.entity =
                    {
                        POSAccountId:
                            response.POSAccountId
                            ||
                            this.entityId
                    };

                    this.loadedPosAccountLabel =
                        [
                            response.POSAccountCode,
                            response.POSAccountName
                        ]
                            .filter(part => !!part)
                            .join(' - ');

                    this.lines =
                        [
                            ...response.Details
                        ];

                    this.resetEntry();

                    this.buildPosAccountItems();

                    this.buildCardItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Card Charges Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load card charges.'
                        )
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }

    //===========================================================
    // Build POS Account Items
    //
    // Label = POS Account Name only (no code)
    //
    // Add       : active POS accounts without card charges
    // Edit/View : only the record's own POS account
    //===========================================================

    private buildPosAccountItems():
        void
    {
        const toItem =
            (
                pos:
                    PosAccountOption
            ):
                any =>
            ({
                label:
                    pos.POSAccountName
                    ||
                    pos.POSAccountCode,
                value:
                    pos.POSAccountId
            });

        if
        (
            !this.isAddMode
        )
        {
            const own =
                this.posAccounts.find
                (
                    pos =>
                        pos.POSAccountId ===
                        this.entity.POSAccountId
                );

            this.posAccountItems =
                own
                    ? [toItem(own)]
                    : this.entity.POSAccountId
                        ? [
                              {
                                  label:
                                      this.loadedPosAccountLabel
                                      ||
                                      `POS Account #${this.entity.POSAccountId}`,
                                  value:
                                      this.entity.POSAccountId
                              }
                          ]
                        : [];

            this.cdr.detectChanges();

            return;
        }

        this.posAccountItems =
            this.posAccounts
                .filter
                (
                    pos =>
                        (
                            pos.Status
                            &&
                            !this.usedPosAccountIds.has(
                                pos.POSAccountId
                            )
                        )
                        ||
                        pos.POSAccountId ===
                        this.entity.POSAccountId
                )
                .sort
                (
                    (a, b) =>
                        (a.POSAccountName || a.POSAccountCode).localeCompare(
                            b.POSAccountName || b.POSAccountCode
                        )
                )
                .map
                (
                    pos =>
                        toItem(pos)
                );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Build Card Items
    //
    // Active cards that are not already on another line.
    // The card of the line being edited is always included.
    //===========================================================

    private buildCardItems():
        void
    {
        const editingCardId =
            this.isEditingLine
                ? this.lines[this.editingIndex].CardSetupId
                : 0;

        const usedCardIds =
            new Set<number>(
                this.lines
                    .filter
                    (
                        (_, index) =>
                            index !==
                            this.editingIndex
                    )
                    .map
                    (
                        line =>
                            line.CardSetupId
                    )
            );

        this.cardItems =
            this.cards
                .filter
                (
                    card =>
                        (
                            card.Status
                            ||
                            card.CardSetupId ===
                            editingCardId
                        )
                        &&
                        !usedCardIds.has(
                            card.CardSetupId
                        )
                )
                .sort
                (
                    (a, b) =>
                        a.CardName.localeCompare(
                            b.CardName
                        )
                )
                .map
                (
                    card =>
                    ({
                        label:
                            card.CardCode
                                ? `${card.CardCode} - ${card.CardName}`
                                : card.CardName,
                        value:
                            card.CardSetupId
                    })
                );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Selected POS Account Name (summary strip)
    //===========================================================

    get selectedPosAccountName():
        string
    {
        const id =
            this.entity.POSAccountId;

        if
        (
            !id
        )
        {
            return '';
        }

        const item =
            this.posAccountItems.find
            (
                option =>
                    option.value ===
                    id
            );

        return item?.label
            ??
            this.loadedPosAccountLabel;
    }

    //===========================================================
    // POS Account Lock
    //
    // Locked in edit / view mode, while saving, and once at
    // least one card line has been added.
    //===========================================================

    get isPosLocked():
        boolean
    {
        return this.isViewMode
            ||
            this.isEditMode
            ||
            this.isSaving
            ||
            this.lines.length > 0;
    }

    //===========================================================
    // Is Editing Line
    //===========================================================

    get isEditingLine():
        boolean
    {
        return this.editingIndex >= 0
            &&
            this.editingIndex < this.lines.length;
    }

    //===========================================================
    // POS Account Changed
    //===========================================================

    onPosAccountChange():
        void
    {
        this.entity.POSAccountId =
            Number(this.entity.POSAccountId) > 0
                ? Number(this.entity.POSAccountId)
                : null;

        this.resetEntry();

        this.buildCardItems();

        this.onValueChange();
    }

    //===========================================================
    // Charge Text Changed
    //
    // Keeps digits and one decimal point, max 2 decimals.
    // The textbox may emit string or number.
    //===========================================================

    onChargeTextChange
    (
        value:
            string | number | null | undefined
    ):
        void
    {
        let cleaned =
            String(value ?? '')
                .replace(/[^0-9.]/g, '');

        const firstDot =
            cleaned.indexOf('.');

        if
        (
            firstDot >= 0
        )
        {
            cleaned =
                cleaned.substring(0, firstDot + 1)
                +
                cleaned
                    .substring(firstDot + 1)
                    .replace(/\./g, '')
                    .substring(0, 2);
        }

        this.entryChargeText =
            cleaned;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Parse Charge
    //
    // Returns null when empty / invalid / out of range.
    //===========================================================

    private parseCharge():
        number | null
    {
        const raw =
            (this.entryChargeText ?? '').trim();

        if
        (
            !raw
            ||
            raw === '.'
        )
        {
            return null;
        }

        const value =
            Number(raw);

        if
        (
            !Number.isFinite(value)
            ||
            value < 0
            ||
            value > MAX_CHARGE_PERCENT
        )
        {
            return null;
        }

        return Math.round(value * 100) / 100;
    }

    //===========================================================
    // Add / Update Line
    //===========================================================

    onAddLine():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        //=======================================================
        // POS Account
        //=======================================================

        if
        (
            !this.entity.POSAccountId
        )
        {
            this.toast.error(
                'Validation',
                'Please select a POS account first.'
            );

            return;
        }

        //=======================================================
        // Card
        //=======================================================

        const cardSetupId =
            Number(this.entryCardSetupId);

        if
        (
            !cardSetupId
            ||
            cardSetupId <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Please select a card.'
            );

            return;
        }

        const card =
            this.cards.find
            (
                item =>
                    item.CardSetupId ===
                    cardSetupId
            );

        if
        (
            !card
        )
        {
            this.toast.error(
                'Validation',
                'The selected card was not found in Card Setup.'
            );

            return;
        }

        //=======================================================
        // Duplicate Card
        //=======================================================

        const duplicate =
            this.lines.some
            (
                (line, index) =>
                    line.CardSetupId ===
                    cardSetupId
                    &&
                    index !==
                    this.editingIndex
            );

        if
        (
            duplicate
        )
        {
            this.toast.error(
                'Validation',
                `${card.CardName} is already added for this POS account.`
            );

            return;
        }

        //=======================================================
        // Charge %
        //=======================================================

        const charge =
            this.parseCharge();

        if
        (
            charge === null
        )
        {
            this.toast.error(
                'Validation',
                `Charge must be a number between 0 and ${MAX_CHARGE_PERCENT}.`
            );

            return;
        }

        //=======================================================
        // Build Line
        //=======================================================

        const line:
            CardChargeLine =
        {
            CardChargeId:
                this.isEditingLine
                    ? this.lines[this.editingIndex].CardChargeId
                    : 0,

            CardSetupId:
                card.CardSetupId,

            CardCode:
                card.CardCode,

            CardName:
                card.CardName,

            ChargePercent:
                charge
        };

        if
        (
            this.isEditingLine
        )
        {
            const index =
                this.editingIndex;

            this.lines =
                this.lines.map
                (
                    (item, i) =>
                        i === index
                            ? line
                            : item
                );
        }
        else
        {
            this.lines =
            [
                ...this.lines,
                line
            ];
        }

        this.resetEntry();

        this.buildCardItems();

        this.onValueChange();
    }

    //===========================================================
    // Row Double Click → load line into the entry bar
    //===========================================================

    onRowDoubleClick
    (
        index:
            number
    ):
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        const line =
            this.lines[index];

        if
        (
            !line
        )
        {
            return;
        }

        this.editingIndex =
            index;

        this.entryCardSetupId =
            line.CardSetupId;

        this.entryChargeText =
            line.ChargePercent.toFixed(2);

        this.buildCardItems();
    }

    //===========================================================
    // Remove Line
    //===========================================================

    removeLine
    (
        index:
            number,
        event?:
            Event
    ):
        void
    {
        event?.stopPropagation();

        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        this.lines =
            this.lines.filter
            (
                (_, i) =>
                    i !== index
            );

        if
        (
            this.editingIndex === index
        )
        {
            this.resetEntry();
        }
        else if
        (
            this.editingIndex > index
        )
        {
            this.editingIndex--;
        }

        this.buildCardItems();

        this.onValueChange();
    }

    //===========================================================
    // Cancel Line Edit
    //===========================================================

    cancelLineEdit():
        void
    {
        this.resetEntry();

        this.buildCardItems();
    }

    //===========================================================
    // Reset Entry Bar
    //===========================================================

    private resetEntry():
        void
    {
        this.entryCardSetupId =
            null;

        this.entryChargeText =
            '';

        this.editingIndex =
            -1;
    }

    //===========================================================
    // Format Charge (e.g. 1.5 → "1.50%")
    //===========================================================

    formatCharge
    (
        value:
            number
    ):
        string
    {
        return `${Number(value ?? 0).toFixed(2)}%`;
    }

    //===========================================================
    // Form State
    //===========================================================

    private snapshot():
        string
    {
        return JSON.stringify
        ({
            pos:
                this.entity.POSAccountId,

            lines:
                this.lines.map
                (
                    line =>
                    [
                        line.CardSetupId,
                        line.ChargePercent
                    ]
                )
        });
    }

    private setInitialFormState():
        void
    {
        this.originalState =
            this.snapshot();

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }

    checkForChanges():
        void
    {
        this.hasChanges =
            this.snapshot() !==
            this.originalState;
    }

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;
    }

    //===========================================================
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }

    //===========================================================
    // Progress Dialog (Animated)
    //===========================================================

    private startProgress
    (
        title:
            string,
        message:
            string
    ):
        void
    {
        this.isSaving =
            true;

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimer();

        this.progressTimer =
            window.setInterval(
                () =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.05
                        );

                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.PROGRESS_TICK_MS
            );

        this.cdr.detectChanges();
    }

    private completeProgress
    (
        message:
            string,
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.update(
            100,
            message
        );

        window.setTimeout(
            () =>
            {
                this.progressDialog.close();

                this.isSaving =
                    false;

                this.cdr.detectChanges();

                done();
            },
            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        this.isSaving =
            false;

        this.cdr.detectChanges();

        done();
    }

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                undefined;
        }
    }

    //===========================================================
    // Minimum Progress Duration
    //===========================================================

    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );

                return source$.pipe(
                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        if
        (
            !this.entity.POSAccountId
        )
        {
            this.toast.error(
                'Validation',
                'POS Account is required.'
            );

            return;
        }

        if
        (
            this.isEditingLine
        )
        {
            this.toast.error(
                'Validation',
                'Please update or cancel the card line you are editing before saving.'
            );

            return;
        }

        if
        (
            this.lines.length === 0
        )
        {
            this.toast.error(
                'Validation',
                'Please add at least one card charge.'
            );

            return;
        }

        const model:
            SaveCardCharges =
        {
            POSAccountId:
                this.entity.POSAccountId,

            Details:
                this.lines.map
                (
                    line =>
                    ({
                        CardChargeId:
                            line.CardChargeId,

                        CardSetupId:
                            line.CardSetupId,

                        ChargePercent:
                            line.ChargePercent
                    })
                )
        };

        if
        (
            this.isAddMode
        )
        {
            this.saveCreate(
                model
            );

            return;
        }

        this.saveUpdate(
            model
        );
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate
    (
        model:
            SaveCardCharges
    ):
        void
    {
        this.startProgress(
            'Saving Card Charges',
            'Please wait while the card charges are being saved...'
        );

        this.withMinimumDuration(
            this.cardChargesService.create(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Card charges saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Card Charges created successfully.'
                        );

                        this.onBackToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Create Card Charges Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create card charges.'
                            )
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Update
    //===========================================================

    private saveUpdate
    (
        model:
            SaveCardCharges
    ):
        void
    {
        this.startProgress(
            'Updating Card Charges',
            'Please wait while the card charges are being updated...'
        );

        this.withMinimumDuration(
            this.cardChargesService.update(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Card charges updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Card Charges updated successfully.'
                        );

                        this.onBackToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Update Card Charges Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update card charges.'
                            )
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Clear
    //
    // Add  : clears POS account and all lines
    // Edit : reloads the saved lines
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.isSaving
            ||
            this.isViewMode
        )
        {
            return;
        }

        const clear =
            ():
                void =>
            {
                if
                (
                    this.isEditMode
                )
                {
                    this.loadEntity();

                    return;
                }

                this.initializeEntity();
            };

        if
        (
            !this.hasChanges
        )
        {
            clear();

            return;
        }

        this.confirmDialog.open(
            'Clear Card Charges',
            'All unsaved card lines will be cleared. Do you want to continue?',
            () =>
                clear(),
            'Clear',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        const listRoute =
        [
            '/settings',
            'account-settings',
            'card-charges',
            'list'
        ];

        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate(
                listRoute
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    listRoute
                );
            },
            'Leave',
            'Stay',
            'primary'
        );
    }

    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.isEditMode
            ? 'Update'
            : 'Save';
    }

    //===========================================================
    // Mode Helpers
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        this.onBackToList();
    }

    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        this.loadLookups();
    }
}