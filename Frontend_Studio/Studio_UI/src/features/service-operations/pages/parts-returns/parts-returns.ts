//===============================================================
// Imports
//===============================================================
import
{
    Component,
    OnInit,
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
    ActivatedRoute,
    Router
}
from '@angular/router';
import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { WorkspaceArtComponent } from '../../../../shared/components/layout/workspace-art/workspace-art';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';
import { WsService } from '../../shared/ws.service';
import
{
    ReturnJob,
    ReturnPart,
    wsDay,
    wsPlaceTitle,
    wsStatusColor
}
from '../../shared/ws.models';

//===============================================================
// Model
//===============================================================

interface Option
{
    label: string;
    value: any;
    // the serial token of the job : the big figure of its row
    token?: string;
}

// A part of a job card on the return
interface SlipLine
{
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Allocated: number;
    Issued: number;
    Returned: number;
    OnJob: number;
    Rate: number;
    Location: string;

    // what comes back now (typed)
    Quantity: string;
}

// A job card on the return
interface SlipJob
{
    job: ReturnJob;
    lines: SlipLine[];
}

//===============================================================
// Add Parts Return (owner 2026-11-19) : the form works as the Parts
// Issue page - the job card, then its part, with what the job was
// allocated, what it has got and what sits on it; the quantity; Add.
//
// Only what sits on a job (issued, not returned yet) can come back.
// The parts come back of the issues of the job, the newest first :
// a return (its own number) for every parts issue it touches. Posted
// at once : stock in, cost off Workshop WIP.
//
// The list and the view of a return : the Parts Documents page.
//===============================================================

@Component(
{
    selector:'parts-returns',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        WorkspaceArtComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        CommandCenterComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./parts-returns.html',
    // built as the Parts Issue page : its styles as they are
    styleUrl:'../parts-issues/parts-issues.css'
})
export class PartsReturnsPage
implements OnInit
{
    private readonly ws = inject(WsService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progress = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly day = wsDay;

    readonly asDate = hrToDate;

    readonly statusColor = wsStatusColor;

    readonly quantityOf = quantityText;

    readonly moneyOf = moneyText;

    // the hover text of a row : where the part sits
    readonly placeTitle = wsPlaceTitle;

    loading =
        false;

    readonly formConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    // the jobs with parts on them
    jobs:
        ReturnJob[] = [];

    // the job cards on the return
    slip:
        SlipJob[] = [];

    returnDate =
        '';

    remarks =
        '';

    // the entry row : job card, part, quantity
    entryJobId:
        string | null = null;

    entryPartKey:
        string | null = null;

    entryQty =
        '';

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loading = true;

        this.ws
            .getReturnJobs()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.loading = false;
                    this.jobs = lookups?.Jobs ?? [];
                    this.returnDate = (lookups?.Today ?? '').substring(0, 10);
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.failed(error, 'The jobs could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Error', error?.error?.message ?? fallback);
    }

    goToList():
        void
    {
        this.router.navigate(['../list'], { relativeTo:this.route });
    }

    //===========================================================
    // The head
    //===========================================================

    get jobCount(): number
    {
        return this.jobs.length;
    }

    // the service center of the job cards of the return (of the
    // picked one, of the only one)
    get branchName(): string
    {
        const job = this.slip[0]?.job ?? this.entryJob ?? (this.jobs.length > 0 ? this.jobs[0] : null);

        return job?.BranchName ?? '';
    }

    onDate(date: Date | null):
        void
    {
        this.returnDate = date ? hrToText(date) : '';
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    //===========================================================
    // The entry row
    //===========================================================

    get jobItems(): Option[]
    {
        return this.jobs.map(x => ({
            label:[x.JobCardNo, x.CustomerName, x.SerialToken].filter(v => !!v).join('  -  '),
            value:x.PublicId,
            token:x.SerialToken
        }));
    }

    get entryJob(): ReturnJob | null
    {
        return this.jobs.find(x => x.PublicId === this.entryJobId) ?? null;
    }

    get entryPart(): ReturnPart | null
    {
        return (this.entryJob?.Parts ?? []).find(x => keyOf(x) === this.entryPartKey) ?? null;
    }

    // the parts of the job that are not on the return yet
    get partItems(): Option[]
    {
        const job = this.entryJob;

        if (!job)
        {
            return [];
        }

        const on = new Set((this.slip.find(x => x.job.PublicId === job.PublicId)?.lines ?? []).map(x => keyOf(x)));

        return job.Parts
            .filter(x => !on.has(keyOf(x)))
            .map(x => ({
                label:`${x.ItemName}  -  ${x.ItemCode}  -  on job ${quantityText(x.OnJob)}`,
                value:keyOf(x)
            }));
    }

    get entryIssuedText(): string
    {
        const part = this.entryPart;

        return part ? quantityText(part.Issued) : '';
    }

    get entryRateText(): string
    {
        const part = this.entryPart;

        return part ? moneyText(part.Rate) : '';
    }

    get entryOnJobText(): string
    {
        const part = this.entryPart;

        return part ? quantityText(part.OnJob) : '';
    }

    onEntryJob(value: any):
        void
    {
        this.entryJobId = value ? String(value) : null;
        this.entryPartKey = null;
        this.entryQty = '';
    }

    onEntryPart(value: any):
        void
    {
        this.entryPartKey = value ? String(value) : null;

        // all that sits on the job, to be typed over
        const part = this.entryPart;

        this.entryQty = part ? quantityText(part.OnJob) : '';
    }

    onEntryQty(value: any):
        void
    {
        this.entryQty = String(value ?? '');
    }

    // Enter in the Qty box : the Add button
    onEntryEnter(event: Event, row: HTMLElement):
        void
    {
        if ((event.target as HTMLElement).closest('.jr-e-qty'))
        {
            event.preventDefault();
            this.focusEntry(row, 'add');
        }
    }

    // Puts the cursor in a box of the entry row (after the page is
    // drawn again); 'part' : the list of the parts is opened
    focusEntry(row: HTMLElement, what: 'part' | 'qty' | 'add'):
        void
    {
        setTimeout(() =>
        {
            if (what === 'part')
            {
                const box = row.querySelector('.mi-e-part .dropdown-selector') as HTMLElement | null;

                if (box && box.getAttribute('aria-expanded') !== 'true' && !box.classList.contains('disabled'))
                {
                    box.click();
                }

                return;
            }

            const element = row.querySelector(what === 'qty' ? '.jr-e-qty input' : 'button.jr-add') as HTMLInputElement | HTMLButtonElement | null;

            if (element && !element.disabled)
            {
                element.focus();

                if (what === 'qty')
                {
                    (element as HTMLInputElement).select?.();
                }
            }
        }, 60);
    }

    // Returns true when the line went on the return
    addEntry(): boolean
    {
        const job = this.entryJob;

        const part = this.entryPart;

        if (!job)
        {
            this.toast.error('Parts Return', 'Select the job card first.');

            return false;
        }

        if (!part)
        {
            this.toast.error('Parts Return', 'Select the part.');

            return false;
        }

        const quantity = toNumber(this.entryQty);

        if (quantity === null || quantity <= 0)
        {
            this.toast.error('Parts Return', 'Give the quantity.');

            return false;
        }

        // what sits on the job is the limit
        if (quantity > part.OnJob)
        {
            this.toast.error('Parts Return', `${part.ItemName} : only ${quantityText(part.OnJob)} sits on ${job.JobCardNo} (issued ${quantityText(part.Issued)}, returned ${quantityText(part.Returned)}).`);

            return false;
        }

        const line: SlipLine =
        {
            ItemKind:part.ItemKind,
            ItemId:part.ItemId,
            ItemCode:part.ItemCode,
            ItemName:part.ItemName,
            Allocated:Number(part.Allocated) || 0,
            Issued:Number(part.Issued) || 0,
            Returned:Number(part.Returned) || 0,
            OnJob:Number(part.OnJob) || 0,
            Rate:Number(part.Rate) || 0,
            Location:part.Location ?? '',
            Quantity:quantityText(quantity)
        };

        const entry = this.slip.find(x => x.job.PublicId === job.PublicId);

        if (entry)
        {
            entry.lines = [...entry.lines, line];
        }
        else
        {
            this.slip = [...this.slip, { job, lines:[line] }];
        }

        // the job card stays : its next part
        this.entryPartKey = null;
        this.entryQty = '';

        this.cdr.detectChanges();

        return true;
    }

    //===========================================================
    // The return
    //===========================================================

    get lineCount(): number
    {
        return this.slip.reduce((sum, x) => sum + x.lines.length, 0);
    }

    get totalQuantity(): number
    {
        return round2(this.slip.reduce((sum, x) => sum + x.lines.reduce((s, l) => s + (toNumber(l.Quantity) ?? 0), 0), 0));
    }

    // the cost that comes back : quantity at the rate
    get totalValue(): number
    {
        return round2(this.slip.reduce((sum, x) => sum + x.lines.reduce((s, l) => s + (toNumber(l.Quantity) ?? 0) * l.Rate, 0), 0));
    }

    valueOf(line: SlipLine): string
    {
        return moneyText((toNumber(line.Quantity) ?? 0) * line.Rate);
    }

    onQuantity(line: SlipLine, event: Event):
        void
    {
        line.Quantity = (event.target as HTMLInputElement).value;
    }

    // A part is taken off the return (its job card too, with its last)
    removeLine(entry: SlipJob, line: SlipLine):
        void
    {
        entry.lines = entry.lines.filter(x => x !== line);

        if (entry.lines.length === 0)
        {
            this.slip = this.slip.filter(x => x !== entry);
        }

        this.cdr.detectChanges();
    }

    removeJob(entry: SlipJob):
        void
    {
        this.slip = this.slip.filter(x => x !== entry);

        this.cdr.detectChanges();
    }

    clear():
        void
    {
        this.slip = [];
        this.entryJobId = null;
        this.entryPartKey = null;
        this.entryQty = '';
        this.remarks = '';

        this.cdr.detectChanges();
    }

    //===========================================================
    // Post
    //===========================================================

    post():
        void
    {
        if (this.slip.length === 0)
        {
            this.toast.error('Validation', 'Nothing is on the return : select the job card and the part, then press Add.');

            return;
        }

        if (!this.returnDate)
        {
            this.toast.error('Validation', 'Give the date of the return.');

            return;
        }

        for (const entry of this.slip)
        {
            for (const line of entry.lines)
            {
                const text = line.Quantity.trim();

                const quantity = text === '' ? 0 : toNumber(text);

                if (quantity === null || quantity < 0)
                {
                    this.toast.error('Validation', `${line.ItemName} (${entry.job.JobCardNo}) : the quantity is not a number.`);

                    return;
                }

                if (quantity > line.OnJob)
                {
                    this.toast.error('Validation', `${line.ItemName} : only ${quantityText(line.OnJob)} sits on ${entry.job.JobCardNo}.`);

                    return;
                }
            }
        }

        const jobs =
            this.slip
                .map(x => ({
                    JobCardPublicId:x.job.PublicId,
                    Lines:x.lines
                        .filter(l => (toNumber(l.Quantity) ?? 0) > 0)
                        .map(l => ({ ItemKind:l.ItemKind, ItemId:l.ItemId, Quantity:toNumber(l.Quantity) ?? 0 }))
                }))
                .filter(x => x.Lines.length > 0);

        if (jobs.length === 0)
        {
            this.toast.error('Validation', 'Give the quantity that comes back of a part at least.');

            return;
        }

        const parts = jobs.reduce((sum, x) => sum + x.Lines.length, 0);

        const what =
            `${jobs.length} job ${jobs.length === 1 ? 'card' : 'cards'}, ${parts} ${parts === 1 ? 'part' : 'parts'}, quantity ${quantityText(this.totalQuantity)}`;

        this.confirmDialog.open(
            'Return Parts',
            `Return the parts now (${what})? The stock comes back at once and the return cannot be changed.`,
            () =>
            {
                this.progress.show('Returning the parts', what);

                this.ws.postJobReturns({ ReturnDate:this.returnDate, Remarks:this.remarks.trim(), Jobs:jobs }).subscribe(
                {
                    next:result =>
                        this.progress.finish(() =>
                        {
                            const numbers = (result ?? []).map(x => x.DocumentNo).filter(x => !!x);

                            this.toast.success('Returned', numbers.length > 0 ? `${numbers.join(', ')} ${numbers.length === 1 ? 'is' : 'are'} posted.` : 'The return is posted.');
                            this.goToList();
                        }),
                    error:error =>
                    {
                        this.progress.fail();
                        this.failed(error, 'The parts could not be returned.');
                    }
                });
            },
            'Return Parts',
            'Not Yet',
            'primary');
    }
}

//===============================================================
// Helpers
//===============================================================

function keyOf(x: { ItemKind: string; ItemId: number }): string
{
    return `${x.ItemKind}:${x.ItemId}`;
}

function toNumber(text: string): number | null
{
    const value = String(text ?? '').replace(/,/g, '').trim();

    if (value === '' || !/^-?\d+(\.\d+)?$/.test(value))
    {
        return null;
    }

    return Number(value);
}

function round2(value: number): number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

// 2 -> "2", 2.5 -> "2.5"
function quantityText(value: number | null | undefined): string
{
    return String(round2(Number(value) || 0));
}

// 1250 -> "1,250.00"
function moneyText(value: number | null | undefined): string
{
    return round2(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
