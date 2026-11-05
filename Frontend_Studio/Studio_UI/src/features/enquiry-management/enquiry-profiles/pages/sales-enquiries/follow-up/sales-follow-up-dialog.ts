//===============================================================
// Sales Follow-up Dialog (pop-up)
//
// Logs a call / visit on a sales enquiry. Opened from the Sales
// Enquiries list (phone icon on a row) and from the enquiry form
// (Follow-ups section · Add follow-up).
//   Left  : the call (called by, method, outcome, note) and the
//           update (status or Suspended + reason, expected
//           purchase, interest, next follow-up)
//   Right : where the enquiry stands and the calls so far
// The server logs the call and updates the enquiry; (saved)
// tells the page to reload.
//===============================================================

import
{
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormModalComponent } from '../../../../../../shared/components/utilities/form-modal/form-modal';
import { TextareaComponent } from '../../../../../../shared/components/controls/textarea/textarea';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { AuthenticationStorageService } from '../../../../../../core/authentication/authentication-storage.service';

import
{
    SalesEnquiry,
    SalesEnquiriesDefaults,
    EnquiryOption
}
from '../../../models/sales-enquiries.model';

import
{
    SalesFollowUp,
    LogSalesFollowUp,
    FOLLOW_UP_OUTCOMES
}
from '../../../models/sales-follow-ups.model';

import { SalesEnquiriesService } from '../../../services/sales-enquiries.service';
import { SalesFollowUpsService } from '../../../services/sales-follow-ups.service';


interface Item
{
    label:string;
    value:any;
}


export const OUTCOME_COLORS: Record<string, string> =
{
    'Reached':'#16A34A',
    'No answer':'#9CA3AF',
    'Call back later':'#F59E0B',
    'Visited showroom':'#2563EB',
    'Not interested':'#DC2626'
};


const OUTCOME_ICONS: Record<string, string> =
{
    'Reached':'fas fa-circle-check',
    'No answer':'fas fa-phone-slash',
    'Call back later':'fas fa-clock-rotate-left',
    'Visited showroom':'fas fa-store',
    'Not interested':'fas fa-ban'
};


@Component(
{
    selector:'app-sales-follow-up-dialog',

    standalone:true,

    imports:
    [
        CommonModule,
        FormModalComponent,
        TextareaComponent,
        SearchDropdownComponent,
        DatepickerComponent
    ],

    templateUrl:'./sales-follow-up-dialog.html',

    styleUrl:'./sales-follow-up-dialog.css'
})
export class SalesFollowUpDialog
implements OnChanges
{
    // The enquiry to log a call on (null = closed)
    @Input()
    enquiry: SalesEnquiry | null = null;

    @Output()
    saved = new EventEmitter<void>();

    @Output()
    closed = new EventEmitter<void>();


    private readonly enquiries = inject(SalesEnquiriesService);

    private readonly followUps = inject(SalesFollowUpsService);

    private readonly toast = inject(ToastService);

    private readonly auth = inject(AuthenticationStorageService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    private readonly myId = Number(this.auth.getUser()?.userProfileId ?? 0);

    private defaults: SalesEnquiriesDefaults | null = null;

    readonly outcomes = FOLLOW_UP_OUTCOMES;

    readonly minDate = new Date();

    executiveItems: Item[] = [];

    methodItems: Item[] = [];

    statusItems: Item[] = [];

    interestItems: Item[] = [];

    lostReasonItems: Item[] = [];

    private stages = new Map<number, string>();

    calls: SalesFollowUp[] = [];

    callsLoading = false;

    draft =
    {
        ExecutiveUserId: 0,
        MethodId: null as number | null,
        Outcome: '',
        Note: '',
        StatusId: 0,
        InterestLevelId: null as number | null,
        LostReasonId: null as number | null,
        ExpectedPurchaseDate: null as Date | null,
        NextFollowUpDate: null as Date | null
    };


    get open(): boolean
    {
        return !!this.enquiry;
    }


    ngOnChanges(changes: SimpleChanges): void
    {
        if (changes['enquiry'] && this.enquiry)
        {
            this.start(this.enquiry);
        }
    }


    // Esc / Cancel / X : the form modal emits (closed)


    //===========================================================
    // Start
    //===========================================================

    private start(e: SalesEnquiry): void
    {
        const tomorrow = new Date();

        tomorrow.setDate(tomorrow.getDate() + 1);

        this.draft =
        {
            ExecutiveUserId: this.myId || e.ExecutiveUserId || 0,
            MethodId: e.FollowUpMethodId,
            Outcome: '',
            Note: '',
            StatusId: e.StatusId,
            InterestLevelId: e.InterestLevelId,
            LostReasonId: null,
            ExpectedPurchaseDate: SalesFollowUpDialog.fromIso(e.ExpectedPurchaseDate),
            NextFollowUpDate: tomorrow
        };

        if (this.defaults)
        {
            this.afterDefaults(e);
        }
        else
        {
            this.enquiries
                .getDefaults()
                .subscribe
                ({
                    next: (d: SalesEnquiriesDefaults): void =>
                    {
                        this.defaults = d;

                        this.buildItems();

                        this.afterDefaults(e);

                        this.cdr.detectChanges();
                    },

                    error: (error: unknown): void =>
                        this.toast.error('Load Failed', this.errorText(error, 'The enquiry lists could not be loaded.'))
                });
        }

        this.loadCalls(e.SalesEnquiryId);
    }

    private afterDefaults(e: SalesEnquiry): void
    {
        // Still New : the caller chooses where it moves to
        if (!this.statusItems.some(x => x.value === this.draft.StatusId))
        {
            this.draft.StatusId = 0;
        }

        const d = this.defaults!;

        if (!this.executiveItems.some(x => x.value === this.draft.ExecutiveUserId))
        {
            this.draft.ExecutiveUserId = e.ExecutiveUserId > 0 ? e.ExecutiveUserId : 0;
        }

        this.draft.MethodId ??= d.FollowUpMethods.find(x => x.IsDefault)?.Id ?? null;
    }

    private loadCalls(enquiryId: number): void
    {
        this.callsLoading = true;

        this.calls = [];

        this.followUps
            .getByEnquiry(enquiryId)
            .subscribe
            ({
                next: (rows: SalesFollowUp[]): void =>
                {
                    this.calls = rows ?? [];

                    this.callsLoading = false;

                    this.cdr.detectChanges();
                },

                error: (): void =>
                {
                    this.callsLoading = false;

                    this.cdr.detectChanges();
                }
            });
    }

    private buildItems(): void
    {
        const d = this.defaults!;

        const opt = (list: EnquiryOption[]): Item[] => list.map(x => ({ label:x.Name, value:x.Id }));

        this.executiveItems = opt(d.Executives);

        this.methodItems = opt(d.FollowUpMethods);

        this.statusItems =
            d.Statuses
                // New (the system open status) is where an enquiry
                // starts; a follow-up always moves it on
                .filter(x => (x.Stage === 'Open' && !x.IsSystem) || x.Stage === 'Lost')
                .map(x => ({ label: x.Stage === 'Lost' ? `${x.Name} (suspend)` : x.Name, value:x.Id }));

        this.interestItems = opt(d.InterestLevels);

        this.lostReasonItems = opt(d.LostReasons);

        this.stages = new Map(d.Statuses.map(x => [x.Id, x.Stage] as [number, string]));
    }


    //===========================================================
    // Texts
    //===========================================================

    private static iso(date: Date): string
    {
        const pad = (n: number): string => String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    private static fromIso(value: string | null): Date | null
    {
        if (!value)
        {
            return null;
        }

        const [y, m, d] = value.slice(0, 10).split('-').map(Number);

        return y && m && d ? new Date(y, m - 1, d) : null;
    }

    formatDate(value: string | null): string
    {
        const date = SalesFollowUpDialog.fromIso(value);

        return date
            ? date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
            : '—';
    }

    timeOf(value: string): string
    {
        const date = new Date(value);

        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    }

    outcomeColor(outcome: string): string
    {
        return OUTCOME_COLORS[outcome] ?? '#64748B';
    }

    outcomeIcon(outcome: string): string
    {
        return OUTCOME_ICONS[outcome] ?? 'fas fa-phone';
    }

    // Header line under the title
    get subtitle(): string
    {
        const e = this.enquiry;

        return e ? [e.EnquiryNo, e.ModelName, e.BrandName].filter(x => !!x).join(' · ') : '';
    }

    get callLink(): string
    {
        return this.enquiry ? `tel:${this.enquiry.EnquirerMobile}` : '';
    }

    get isSuspend(): boolean
    {
        return this.stages.get(this.draft.StatusId) === 'Lost';
    }

    // Interest follows the days left when the setup has ranges
    get autoInterest(): EnquiryOption | null
    {
        const levels = this.defaults?.InterestLevels ?? [];

        const date = this.draft.ExpectedPurchaseDate;

        if (!date || this.isSuspend)
        {
            return null;
        }

        const start = new Date();

        start.setHours(0, 0, 0, 0);

        const days = Math.max(0, Math.round((date.getTime() - start.getTime()) / 86400000));

        return levels.find(x => x.DaysFrom != null && days >= x.DaysFrom && (x.DaysTo == null || days <= x.DaysTo)) ?? null;
    }


    //===========================================================
    // Inputs
    //===========================================================

    private unwrap(value: any): any
    {
        return value !== null && typeof value === 'object' && 'value' in value ? value.value : value;
    }

    private toId(value: any): number | null
    {
        const id = Number(this.unwrap(value) ?? 0);

        return id > 0 ? id : null;
    }

    onExecutive(value: any): void { this.draft.ExecutiveUserId = this.toId(value) ?? 0; }

    onMethod(value: any): void { this.draft.MethodId = this.toId(value); }

    onStatus(value: any): void { this.draft.StatusId = this.toId(value) ?? 0; }

    onInterest(value: any): void { this.draft.InterestLevelId = this.toId(value); }

    onLostReason(value: any): void { this.draft.LostReasonId = this.toId(value); }

    onNote(value: string | number): void { this.draft.Note = String(value ?? ''); }

    onExpected(date: Date): void { this.draft.ExpectedPurchaseDate = date ?? null; }

    onNext(date: Date): void { this.draft.NextFollowUpDate = date ?? null; }

    pickOutcome(outcome: string): void
    {
        this.draft.Outcome = outcome;

        // No answer : try again tomorrow
        if (outcome === 'No answer')
        {
            this.nextIn(1);
        }
    }

    nextIn(days: number): void
    {
        const date = new Date();

        date.setDate(date.getDate() + days);

        this.draft.NextFollowUpDate = date;
    }

    isNextIn(days: number): boolean
    {
        const date = new Date();

        date.setDate(date.getDate() + days);

        return !!this.draft.NextFollowUpDate
            && SalesFollowUpDialog.iso(this.draft.NextFollowUpDate) === SalesFollowUpDialog.iso(date);
    }


    //===========================================================
    // Save / close
    //===========================================================

    // Switch (System Configurations) : a call needs a note
    get noteRequired(): boolean
    {
        return this.defaults?.CallNoteRequired !== false;
    }

    private validate(): string
    {
        const d = this.draft;

        if (!(d.ExecutiveUserId > 0)) return 'Choose who made the call.';

        if (!d.Outcome) return 'Choose the outcome of the call.';

        if (this.noteRequired && d.Outcome !== 'No answer' && d.Note.trim().length < 2) return 'Write a short note : what the customer said.';

        if (!(d.StatusId > 0)) return 'Choose the enquiry status.';

        if (this.isSuspend && !d.LostReasonId) return 'Choose the Suspend Reason.';

        if (!this.isSuspend && !d.NextFollowUpDate) return 'Choose the Next Follow-up Date.';

        if (!this.isSuspend && SalesFollowUpDialog.iso(d.NextFollowUpDate!) < SalesFollowUpDialog.iso(new Date())) return 'The Next Follow-up Date cannot be in the past.';

        return '';
    }

    save(): void
    {
        const e = this.enquiry;

        if (!e || this.progress.busy)
        {
            return;
        }

        const problem = this.validate();

        if (problem)
        {
            this.toast.warning('Check the Follow-up', problem);

            return;
        }

        const d = this.draft;

        const suspend = this.isSuspend;

        const body: LogSalesFollowUp =
        {
            SalesEnquiryId: e.SalesEnquiryId,
            ExecutiveUserId: d.ExecutiveUserId,
            MethodId: d.MethodId,
            Outcome: d.Outcome,
            Note: d.Note.trim(),
            NextFollowUpDate: suspend || !d.NextFollowUpDate ? null : SalesFollowUpDialog.iso(d.NextFollowUpDate),
            StatusId: d.StatusId,
            InterestLevelId: d.InterestLevelId,
            ExpectedPurchaseDate: d.ExpectedPurchaseDate ? SalesFollowUpDialog.iso(d.ExpectedPurchaseDate) : null,
            LostReasonId: suspend ? d.LostReasonId : null
        };

        this.progress
            .run<unknown>(
                'Updating the Enquiry',
                `Please wait while the follow-up of ${e.EnquiryNo} is being updated...`,
                'Enquiry updated.',
                this.followUps.log(body)
            )
            .subscribe
            ({
                next: (): void =>
                {
                    this.toast.success(
                        'Follow-up Updated',
                        suspend
                            ? `${e.EnquiryNo} suspended.`
                            : `${e.EnquiryNo} : next follow-up ${this.formatDate(body.NextFollowUpDate)}.`);

                    this.saved.emit();
                },

                error: (error: unknown): void =>
                {
                    console.error('Log Follow-up Error:', error);

                    this.toast.error('Update Failed', this.errorText(error, 'The follow-up could not be updated.'));
                }
            });
    }

    close(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.closed.emit();
    }


    private errorText(error: unknown, fallback: string): string
    {
        const err = error as any;

        const body = err?.error;

        if (err?.status === 403)
        {
            return body?.message || body?.Message || 'You do not have permission for this action.';
        }

        if (typeof body === 'string' && body.trim())
        {
            return body.trim();
        }

        return body?.message || body?.Message || body?.title || fallback;
    }
}
