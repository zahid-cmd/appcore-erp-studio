//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
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

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { FormModalComponent } from '../../../../../../shared/components/utilities/form-modal/form-modal';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import
{
    CHECK_LAYOUT_SECTIONS,
    CheckPrintLayout,
    DEFAULT_CHECK_LAYOUT,
    chequeFaceHtml,
    chequePaper,
    sampleCheque
}
from '../../../models/check-print.model';

import
{
    CheckBook,
    CheckBookBankAccount,
    CheckBookLeaf,
    CheckLeafStatus,
    checkNumber,
    dateToText,
    showDay,
    textToDate,
    todayText
}
from '../../../models/check-books.model';

import
{
    CheckBooksService
}
from '../../../services/check-books.service';


type LeafFilter =
    'all' | 'unused' | 'used';


//===============================================================
// Check Books Form (Settings > Account Settings)
//
// Left : the book (bank account, book no, prefix, first number,
// leaves, received date). Once a leaf is used the account, prefix
// and range are fixed.
// Right : the leaves. Add : the numbers the book will have. Saved :
// every leaf with its status and voucher; an unused leaf can be
// marked Cancelled or Lost (with a reason) and brought back.
// Print : the leaf register of the book.
//===============================================================

@Component(
{
    selector:'check-books-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        FormModalComponent
    ],
    templateUrl:'./check-books-form.html',
    styleUrl:'./check-books-form.css'
})
export class CheckBooksForm
implements OnInit
{
    private readonly service = inject(CheckBooksService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(ProgressDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly sanitizer = inject(DomSanitizer);

    readonly statusItems =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    readonly asDate = textToDate;

    readonly day = showDay;

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        CheckBook =
        this.emptyEntity();

    accounts:
        CheckBookBankAccount[] = [];

    lowLeafThreshold =
        0;

    leafFilter:
        LeafFilter =
        'all';

    // The leaf being marked Cancelled / Lost
    marking:
        { leaf: CheckBookLeaf; status: 'Cancelled' | 'Lost'; reason: string } | null =
        null;

    leafBusy =
        false;

    isSaving =
        false;

    hasChanges =
        false;

    loading =
        false;

    private initialJson =
        '';

    // The saved range (edit) : the leaves are made again only when
    // the range changes
    private savedRange =
        '';

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'add'
            ? 'Check Book'
            : this.mode === 'edit'
                ? `Update Check Book ${this.entity.Code}`
                : `View Check Book ${this.entity.Code}`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    // A used leaf fixes the account, prefix and range
    get rangeLocked(): boolean
    {
        return this.isViewMode || this.entity.RangeLocked;
    }

    get accountItems(): any[]
    {
        return this.accounts.map(a => ({
            label:[a.Code, a.Name, a.AccountNumber].filter(t => t).join(' · '),
            value:a.BankAccountId
        }));
    }

    get selectedAccount(): CheckBookBankAccount | undefined
    {
        return this.accounts.find(a => a.BankAccountId === this.entity.BankAccountId);
    }

    get lastCheckNo(): string
    {
        const count =
            Number(this.entity.LeafCount) || 0;

        return count > 0 ? checkNumber(this.entity.Prefix, this.entity.StartNo, count - 1) : '';
    }

    get firstCheckNo(): string
    {
        return checkNumber(this.entity.Prefix, this.entity.StartNo, 0);
    }

    private get rangeKey(): string
    {
        return [this.entity.BankAccountId, this.entity.Prefix.trim().toUpperCase(), this.entity.StartNo.trim(), Number(this.entity.LeafCount) || 0].join('|');
    }

    // The range was typed / changed and not saved yet : the right
    // side shows the numbers the book will have
    get showsPreview(): boolean
    {
        return this.mode === 'add' || (!this.entity.RangeLocked && this.rangeKey !== this.savedRange);
    }

    get previewLeaves(): string[]
    {
        const count =
            Math.min(Number(this.entity.LeafCount) || 0, 200);

        if (count <= 0 || !this.firstCheckNo)
        {
            return [];
        }

        return Array.from({ length:count }, (_, i) => checkNumber(this.entity.Prefix, this.entity.StartNo, i));
    }

    get leaves(): CheckBookLeaf[]
    {
        return this.entity.Leaves.filter(l =>
            this.leafFilter === 'all'
            || (this.leafFilter === 'unused') === (l.Status === 'Unused'));
    }

    count(status: CheckLeafStatus): number
    {
        return this.entity.Leaves.filter(l => l.Status === status).length;
    }

    money(value: number): string
    {
        return value
            ? value.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })
            : '';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'add';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.loadDefaults();

        if (this.entityId)
        {
            this.loadBook();
        }
        else
        {
            this.setInitialState();
        }
    }

    private loadBook():
        void
    {
        this.loading = true;

        this.service
            .getById(this.entityId)
            .subscribe(
            {
                next:b =>
                {
                    this.entity = b;
                    this.loading = false;
                    this.savedRange = this.rangeKey;
                    this.setInitialState();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Error', error?.error?.message ?? 'The check book could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private emptyEntity():
        CheckBook
    {
        return {
            CheckBookId:0,
            PublicId:'',
            Code:'',
            BankAccountId:0,
            BankAccountName:'',
            Bank:'',
            AccountNumber:'',
            BookNo:'',
            Prefix:'',
            StartNo:'',
            EndNo:'',
            LeafCount:50,
            ReceivedDate:todayText(),
            Remarks:'',
            IsActive:true,
            RangeLocked:false,
            Leaves:[]
        };
    }

    private loadDefaults():
        void
    {
        this.service
            .getDefaults()
            .subscribe(
            {
                next:d =>
                {
                    this.accounts = d.BankAccounts;
                    this.lowLeafThreshold = d.LowLeafThreshold;

                    // a saved book of an account that is no longer
                    // a payment account still shows its name
                    if (this.entity.BankAccountId && !this.selectedAccount)
                    {
                        this.accounts =
                        [
                            ...this.accounts,
                            {
                                BankAccountId:this.entity.BankAccountId,
                                Code:'',
                                Name:this.entity.BankAccountName,
                                Bank:this.entity.Bank,
                                AccountNumber:this.entity.AccountNumber,
                                UnusedLeaves:0,
                                LowLeaf:false,
                                SuggestedStartNo:'',
                                SuggestedPrefix:''
                            }
                        ];
                    }

                    if (this.mode === 'add' && !this.entity.Code)
                    {
                        this.entity.Code = d.NextCode;
                        this.initialJson = JSON.stringify(this.entity);
                    }

                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The bank accounts could not be loaded.')
            });
    }

    private setInitialState():
        void
    {
        this.initialJson = JSON.stringify(this.entity);
        this.hasChanges = false;
        this.cdr.detectChanges();
    }

    changed():
        void
    {
        this.hasChanges = JSON.stringify(this.entity) !== this.initialJson;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Fields
    //===========================================================

    onAccount(value: any):
        void
    {
        if (this.rangeLocked)
        {
            return;
        }

        this.entity.BankAccountId = Number(value) || 0;

        const a =
            this.selectedAccount;

        this.entity.BankAccountName = a?.Name ?? '';

        // a new book : start after the account's last book
        if (this.mode === 'add' && a && !this.entity.StartNo.trim() && a.SuggestedStartNo)
        {
            this.entity.StartNo = a.SuggestedStartNo;
            this.entity.Prefix = a.SuggestedPrefix;
        }

        this.changed();
    }

    onText(field: 'BookNo' | 'Remarks', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onPrefix(value: any):
        void
    {
        this.entity.Prefix = String(value ?? '').replace(/\s+/g, '').toUpperCase().slice(0, 10);
        this.changed();
    }

    onStartNo(value: any):
        void
    {
        this.entity.StartNo = String(value ?? '').replace(/\D/g, '').slice(0, 15);
        this.changed();
    }

    onLeafCount(value: any):
        void
    {
        const n =
            parseInt(String(value ?? '').replace(/\D/g, ''), 10);

        this.entity.LeafCount = isNaN(n) ? 0 : Math.min(n, 200);
        this.changed();
    }

    onDate(date: Date | null):
        void
    {
        this.entity.ReceivedDate = dateToText(date);
        this.changed();
    }

    onStatus(value: any):
        void
    {
        this.entity.IsActive = value === true || value === 'true';
        this.changed();
    }

    setFilter(value: LeafFilter):
        void
    {
        this.leafFilter = value;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Leaves : Cancelled / Lost and back (saved books only)
    //===========================================================

    startMark(leaf: CheckBookLeaf, status: 'Cancelled' | 'Lost'):
        void
    {
        this.marking = { leaf, status, reason:'' };
        this.cdr.detectChanges();
    }

    onMarkReason(value: any):
        void
    {
        if (this.marking)
        {
            this.marking.reason = String(value ?? '');
        }
    }

    cancelMark():
        void
    {
        this.marking = null;
        this.cdr.detectChanges();
    }

    confirmMark():
        void
    {
        const m =
            this.marking;

        if (!m || this.leafBusy)
        {
            return;
        }

        if (!m.reason.trim())
        {
            this.toast.error('Reason', 'Give the reason.');
            return;
        }

        this.leafBusy = true;

        this.service
            .markLeaf(this.entity.PublicId, m.leaf.CheckBookLeafId, m.status, m.reason.trim())
            .subscribe(
            {
                next:() =>
                {
                    this.leafBusy = false;
                    this.marking = null;
                    this.toast.success('Done', `Check ${m.leaf.CheckNo} is ${m.status.toLowerCase()}.`);
                    this.reloadLeaves();
                },
                error:error =>
                {
                    this.leafBusy = false;
                    this.toast.error('Error', error?.error?.message ?? 'The leaf could not be changed.');
                    this.cdr.detectChanges();
                }
            });
    }

    undoLeaf(leaf: CheckBookLeaf):
        void
    {
        this.confirmDialog.open(
            'Back To Unused',
            `Check ${leaf.CheckNo} is ${leaf.Status.toLowerCase()}. Make it unused again? It can then be issued.`,
            () =>
            {
                this.leafBusy = true;

                this.service
                    .undoLeaf(this.entity.PublicId, leaf.CheckBookLeafId)
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.leafBusy = false;
                            this.toast.success('Done', `Check ${leaf.CheckNo} is unused again.`);
                            this.reloadLeaves();
                        },
                        error:error =>
                        {
                            this.leafBusy = false;
                            this.toast.error('Error', error?.error?.message ?? 'The leaf could not be changed.');
                            this.cdr.detectChanges();
                        }
                    });
            },
            'Make Unused',
            'Cancel',
            'primary');
    }

    // After a leaf action : the leaves again, the typed fields kept
    private reloadLeaves():
        void
    {
        this.service
            .getById(this.entityId)
            .subscribe(
            {
                next:b =>
                {
                    const dirty =
                        this.hasChanges;

                    this.entity.Leaves = b.Leaves;
                    this.entity.RangeLocked = b.RangeLocked;

                    if (!dirty)
                    {
                        this.entity = b;
                        this.savedRange = this.rangeKey;
                        this.setInitialState();
                        return;
                    }

                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The leaves could not be loaded again.')
            });
    }

    //===========================================================
    // Cheque Layout (2026-11-15) : where each field prints on the
    // bank account's real leaf. One layout per bank account (all
    // its books); live preview with sample values; Save & Test
    // Print opens the test cheque with guides.
    //===========================================================

    readonly layoutSections =
        CHECK_LAYOUT_SECTIONS;

    readonly takaItems =
    [
        { label:'Without "Taka" (on the leaf)', value:true },
        { label:'With "Taka"', value:false }
    ];

    layoutOpen = false;

    layoutBusy = false;

    layoutSaved = false;

    layoutSection = 0;

    layoutAccountId = 0;

    layoutAccountName = '';

    layout:
        CheckPrintLayout =
        { ...DEFAULT_CHECK_LAYOUT };

    previewCounterfoil = true;

    previewAcPayee = true;

    previewHtml:
        SafeHtml = '';

    get layoutSubtitle(): string
    {
        return this.layoutAccountName
            ? `${this.layoutAccountName} : every book of this account prints with it`
            : 'Every book of this bank account prints with it';
    }

    get previewPaper(): { width: number; height: number }
    {
        return chequePaper(this.layout, this.previewCounterfoil);
    }

    // The preview fits about 860 px (1 mm = 3.78 px on screen)
    get previewScale(): number
    {
        const px =
            this.previewPaper.width * 3.7795;

        return Math.min(1.2, 860 / Math.max(1, px));
    }

    get previewBoxWidth(): number
    {
        return Math.round(this.previewPaper.width * 3.7795 * this.previewScale);
    }

    get previewBoxHeight(): number
    {
        return Math.round(this.previewPaper.height * 3.7795 * this.previewScale);
    }

    private refreshPreview(): void
    {
        // Our own drawing (values escaped) : inline styles kept
        this.previewHtml =
            this.sanitizer.bypassSecurityTrustHtml(
                chequeFaceHtml(
                    sampleCheque(this.layout, this.layoutAccountName, this.layoutSaved),
                    {
                        acPayee:this.previewAcPayee,
                        counterfoil:this.previewCounterfoil,
                        guides:true
                    }));
    }

    openLayout(): void
    {
        const id =
            this.entity.BankAccountId;

        if (!id || this.layoutBusy)
        {
            return;
        }

        this.layoutBusy = true;

        this.service
            .getPrintLayouts([id])
            .subscribe(
            {
                next:rows =>
                {
                    const row =
                        rows.find(r => r.BankAccountId === id);

                    this.layoutAccountId = id;
                    this.layoutAccountName = row?.BankAccountName || this.selectedAccount?.Name || this.entity.BankAccountName;
                    this.layout = row ? { ...row.Layout } : { ...DEFAULT_CHECK_LAYOUT };
                    this.layoutSaved = !!row?.IsSaved;
                    this.layoutSection = 0;
                    this.layoutBusy = false;
                    this.layoutOpen = true;
                    this.refreshPreview();
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.layoutBusy = false;
                    this.toast.error('Error', error?.error?.message ?? 'The cheque layout could not be loaded. Run CheckPrintLayouts_Engine.sql.');
                    this.cdr.detectChanges();
                }
            });
    }

    closeLayout(): void
    {
        this.layoutOpen = false;
    }

    layoutText(key: keyof CheckPrintLayout): string
    {
        return String(this.layout[key] ?? '');
    }

    onLayoutField(key: keyof CheckPrintLayout, value: any): void
    {
        const n =
            Number(String(value ?? '').trim().replace(',', '.'));

        if (String(value ?? '').trim() === '' || !Number.isFinite(n))
        {
            return;
        }

        this.layout = { ...this.layout, [key]:n };

        this.refreshPreview();
    }

    onStripTaka(value: any): void
    {
        this.layout = { ...this.layout, stripTaka:value === true || value === 'true' };

        this.refreshPreview();
    }

    onFigSuffix(value: any): void
    {
        this.layout = { ...this.layout, figSuffix:String(value ?? '').slice(0, 10) };

        this.refreshPreview();
    }

    togglePreview(which: 'counterfoil' | 'acpayee'): void
    {
        if (which === 'counterfoil')
        {
            this.previewCounterfoil = !this.previewCounterfoil;
        }
        else
        {
            this.previewAcPayee = !this.previewAcPayee;
        }

        this.refreshPreview();
    }

    resetLayout(): void
    {
        this.layout = { ...DEFAULT_CHECK_LAYOUT };

        this.refreshPreview();
    }

    // Every number inside its range
    private clampedLayout(): CheckPrintLayout
    {
        const out:
            CheckPrintLayout =
            { ...this.layout };

        for (const section of CHECK_LAYOUT_SECTIONS)
        {
            for (const field of section.fields)
            {
                const n =
                    Number(out[field.key]);

                (out as any)[field.key] =
                    Number.isFinite(n)
                        ? Math.min(field.max, Math.max(field.min, Math.round(n * 10) / 10))
                        : DEFAULT_CHECK_LAYOUT[field.key];
            }
        }

        return out;
    }

    // Save (and open the test cheque in a new tab)
    saveLayout(testPrint: boolean): void
    {
        if (!this.layoutAccountId || this.layoutBusy)
        {
            return;
        }

        // The tab is opened now (a tab opened after the save would be
        // blocked as a pop-up) and pointed at the test print after it
        const tab =
            testPrint ? window.open('', '_blank') : null;

        if (testPrint && !tab)
        {
            this.toast.error('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');

            return;
        }

        this.layout = this.clampedLayout();
        this.refreshPreview();
        this.layoutBusy = true;

        this.service
            .savePrintLayout(this.layoutAccountId, this.layout)
            .subscribe(
            {
                next:row =>
                {
                    this.layoutBusy = false;
                    this.layoutSaved = true;
                    this.layout = { ...row.Layout };
                    this.refreshPreview();

                    if (tab)
                    {
                        tab.location.href =
                            this.router.serializeUrl(
                                this.router.createUrlTree(['/print-viewer', 'check-print', `test_${this.layoutAccountId}`], { queryParams:{ doc:'test' } }));
                    }
                    else
                    {
                        this.layoutOpen = false;
                    }

                    this.toast.success('Saved', 'The cheque layout is saved.');
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.layoutBusy = false;
                    tab?.close();
                    this.toast.error('Error', error?.error?.message ?? 'The cheque layout could not be saved.');
                    this.cdr.detectChanges();
                }
            });
    }

    // An issued leaf : its cheque on the real leaf (Print Engine)
    printLeaf(leaf: CheckBookLeaf): void
    {
        if (!this.entity.PublicId || leaf.Status !== 'Issued')
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', 'check-print', `${this.entity.PublicId}_${leaf.CheckBookLeafId}`], { queryParams:{ doc:'cheque' } }));

        if (!window.open(url, '_blank'))
        {
            this.toast.error('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
    }


    //===========================================================
    // Print : the leaf register
    //===========================================================

    // The leaf register through the shared Print Engine (company
    // header, A4, Excel), in a new tab
    printRegister():
        void
    {
        if (!this.entity.PublicId)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', 'check-books', this.entity.PublicId], { queryParams:{ doc:'leaf-register' } }));

        if (!window.open(url, '_blank'))
        {
            this.toast.error('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
    }

    //===========================================================
    // Save / Clear / Back
    //===========================================================

    private validate():
        string
    {
        if (!this.entity.BankAccountId)
        {
            return 'Pick the bank account.';
        }

        if (!/^\d{1,15}$/.test(this.entity.StartNo.trim()))
        {
            return 'Enter the first check number (digits only).';
        }

        const n =
            Number(this.entity.LeafCount) || 0;

        if (n < 1 || n > 200)
        {
            return 'A check book has 1 to 200 leaves.';
        }

        if (!this.entity.ReceivedDate)
        {
            return 'Enter the date the book was received.';
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        const save =
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', 'Saving the check book...', false);

                const done =
                    (message: string) =>
                    {
                        this.progressDialog.close();
                        this.isSaving = false;
                        this.setInitialState();
                        this.toast.success('Success', message);
                        this.goToList();
                    };

                const fail =
                    (error: any) =>
                    {
                        this.progressDialog.close();
                        this.isSaving = false;
                        this.toast.error('Error', error?.error?.message ?? 'The check book could not be saved.');
                        this.cdr.detectChanges();
                    };

                if (this.mode === 'edit')
                {
                    this.service
                        .update(this.entityId, this.entity)
                        .subscribe({ next:() => done(`${this.entity.Code} updated.`), error:fail });
                }
                else
                {
                    this.service
                        .create(this.entity)
                        .subscribe({ next:b => done(`${b.Code} created with ${b.LeafCount} leaves.`), error:fail });
                }
            };

        // edit : a new range makes the leaves again
        if (this.mode === 'edit' && this.showsPreview)
        {
            this.confirmDialog.open(
                'Change The Numbers',
                `The leaves of ${this.entity.Code} are made again as ${this.firstCheckNo} - ${this.lastCheckNo}. None of them is used yet. Continue?`,
                save,
                'Update',
                'Cancel',
                'primary');
            return;
        }

        save();
    }

    onClear():
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        this.confirmDialog.open(
            'Clear Form',
            this.entity.RangeLocked
                ? 'Clear Book No and Remarks? (The account and numbers are fixed : a leaf is used.)'
                : 'Clear every field of the form?',
            () =>
            {
                if (this.entity.RangeLocked)
                {
                    this.entity.BookNo = '';
                    this.entity.Remarks = '';
                }
                else
                {
                    const keep =
                        this.entity;

                    this.entity = this.emptyEntity();
                    this.entity.Code = keep.Code;
                    this.entity.PublicId = keep.PublicId;
                    this.entity.CheckBookId = keep.CheckBookId;
                    this.entity.Leaves = keep.Leaves;
                }

                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/settings/account-settings/check-books/list']);
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.hasChanges || this.isViewMode)
        {
            this.goToList();
            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () => this.goToList(),
            'Leave',
            'Stay',
            'primary');
    }
}
