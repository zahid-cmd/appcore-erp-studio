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
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    BikeDelivery,
    BikeDeliveryAccessory,
    BikeDeliveryBike,
    BikeDeliveryDefaults,
    BikeDeliveryEntry,
    bikeNoWord
}
from '../../../models/bike-deliveries.model';

import
{
    PdiTemplate
}
from '../../../../../settings/service-settings/models/pdi-templates.model';

import
{
    BikeDeliveriesService
}
from '../../../services/bike-deliveries.service';


// One row of the sheet on the page (template item or saved answer)
interface SheetItem
{
    entry: BikeDeliveryEntry;
    text: string;
    textBn: string;
    type: string;
    unit: string;
    required: boolean;
}

interface SheetSection
{
    title: string;
    titleBn: string;
    hasComments: boolean;
    items: SheetItem[];
}

const toDay =
    (value: Date): string =>
    {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    };

const fromDay =
    (value: string): Date =>
    {
        const p = String(value ?? '').slice(0, 10).split('-').map(Number);
        return p.length === 3 && p.every(x => x > 0) ? new Date(p[0], p[1] - 1, p[2]) : new Date();
    };


//===============================================================
// Bike Deliveries Form
//
//   deliver/:lineId  the sold bike, its model's PDI sheet (from
//                    PDI Templates), the handover; Save is final
//   view/:id         a saved delivery : prints, admin Undo
//===============================================================

@Component(
{
    selector:'bike-deliveries-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        DatepickerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./bike-deliveries-form.html',
    styleUrl:'./bike-deliveries-form.css'
})
export class BikeDeliveriesForm
implements OnInit
{
    private readonly service = inject(BikeDeliveriesService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(ProgressDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly checkAnswers =
        ['OK', 'Not OK', 'N/A'];

    mode:
        'deliver' | 'view' =
        'deliver';

    loading =
        true;

    loadError =
        '';

    isSaving =
        false;

    lineId =
        0;

    bike:
        BikeDeliveryBike | null = null;

    template:
        PdiTemplate | null = null;

    accessories:
        BikeDeliveryAccessory[] = [];

    defaults:
        BikeDeliveryDefaults =
        { DeliveryWithoutPdi:false, DeliveryOnSale:false, CanDeliver:false, CanUndo:false, Today:'' };

    delivery:
        BikeDelivery | null = null;

    sections:
        SheetSection[] = [];

    // Handover
    deliveryDate =
        '';

    receivedBy:
        'Customer' | 'Nominee' =
        'Customer';

    receiverName =
        '';

    receiverPhone =
        '';

    remarks =
        '';

    // PDI
    pdiDate =
        '';

    technicianName =
        '';

    problemsFound =
        '';

    pdiRemarks =
        '';

    // Undo (admin)
    undoOpen =
        false;

    undoReason =
        '';

    private dirty =
        false;

    get isView(): boolean
    {
        return this.mode === 'view';
    }

    get noWord(): string
    {
        return bikeNoWord(!!this.bike?.IsElectric);
    }

    get pageTitle(): string
    {
        return this.isView
            ? `View Bike Delivery ${this.delivery?.DeliveryNo ?? ''}`.trim()
            : 'Bike Delivery';
    }

    get pdiRequired(): boolean
    {
        return !this.defaults.DeliveryWithoutPdi;
    }

    // Deliver mode : no template while the PDI is required
    get blocked(): string
    {
        if (this.isView || !this.bike)
        {
            return '';
        }

        if (!this.defaults.CanDeliver)
        {
            return 'You do not have the "Add" permission on Bike Deliveries.';
        }

        if (!this.template && this.pdiRequired)
        {
            return `Model ${this.bike.ModelName || this.bike.ProductName} has no PDI template. Add it on Settings > Service Settings > PDI Templates (or an admin turns ON "Delivery without PDI").`;
        }

        return '';
    }

    get filledCount(): number
    {
        return this.sections.reduce((n, s) => n + s.items.filter(i => i.entry.Answer.trim()).length, 0);
    }

    get itemCount(): number
    {
        return this.sections.reduce((n, s) => n + s.items.length, 0);
    }

    get notOkCount(): number
    {
        return this.sections.reduce((n, s) => n + s.items.filter(i => i.entry.Answer === 'Not OK').length, 0);
    }

    get canUndo(): boolean
    {
        return this.isView && !!this.delivery?.CanUndo && this.delivery?.Status === 'Delivered';
    }

    get additional(): BikeDeliveryAccessory[]
    {
        return this.accessories.filter(a => a.SchemeKind !== 'Promotional');
    }

    get promotional(): BikeDeliveryAccessory[]
    {
        return this.accessories.filter(a => a.SchemeKind === 'Promotional');
    }

    get deliveryDateValue(): Date
    {
        return fromDay(this.deliveryDate);
    }

    get pdiDateValue(): Date
    {
        return fromDay(this.pdiDate || this.deliveryDate);
    }

    get minDate(): Date | null
    {
        return this.bike?.InvoiceDate ? fromDay(this.bike.InvoiceDate) : null;
    }

    get maxDate(): Date
    {
        return this.defaults.Today ? fromDay(this.defaults.Today) : new Date();
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const params =
            this.route.snapshot.paramMap;

        const id =
            params.get('id') ?? '';

        if (id)
        {
            this.mode = 'view';
            this.loadDelivery(id);
            return;
        }

        this.mode = 'deliver';
        this.lineId = Number(params.get('lineId') ?? 0) || 0;
        this.loadSheet();
    }

    private loadSheet():
        void
    {
        this.service
            .getSheet(this.lineId)
            .subscribe(
            {
                next:sheet =>
                {
                    this.bike = sheet.Bike;
                    this.template = sheet.Template;
                    this.accessories = sheet.Accessories;
                    this.defaults = sheet.Defaults;

                    const today =
                        this.defaults.Today || toDay(new Date());

                    this.deliveryDate = today;
                    this.pdiDate = today;
                    this.receiverName = this.bike.CustomerName;
                    this.receiverPhone = this.bike.CustomerPhone;

                    this.sections =
                        (this.template?.Sections ?? []).map((s, si) => ({
                            title:s.Title,
                            titleBn:s.TitleBn,
                            hasComments:s.HasComments,
                            items:s.Items.map((i, ii) => ({
                                entry:{ SectionIndex:si, ItemIndex:ii, Answer:'', Remark:'', TechnicianComment:'', QcComment:'' },
                                text:i.Text,
                                textBn:i.TextBn,
                                type:i.ItemType,
                                unit:i.Unit,
                                required:i.IsRequired
                            }))
                        }));

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadError = error?.error?.message ?? 'The bike could not be loaded.';
                    this.cdr.detectChanges();
                }
            });
    }

    private loadDelivery(id: string):
        void
    {
        this.service
            .getById(id)
            .subscribe(
            {
                next:d =>
                {
                    this.delivery = d;
                    this.bike = d.Bike;
                    this.accessories = d.Accessories;
                    this.deliveryDate = d.DeliveryDate;
                    this.receivedBy = d.ReceivedBy === 'Nominee' ? 'Nominee' : 'Customer';
                    this.receiverName = d.ReceiverName;
                    this.receiverPhone = d.ReceiverPhone;
                    this.remarks = d.Remarks;
                    this.pdiDate = d.PdiDate;
                    this.technicianName = d.TechnicianName;
                    this.problemsFound = d.ProblemsFound;
                    this.pdiRemarks = d.PdiRemarks;

                    const bySection =
                        new Map<number, SheetSection>();

                    for (const a of d.Answers)
                    {
                        let section =
                            bySection.get(a.SectionOrder);

                        if (!section)
                        {
                            section = { title:a.SectionTitle, titleBn:a.SectionTitleBn, hasComments:a.HasComments, items:[] };
                            bySection.set(a.SectionOrder, section);
                        }

                        section.items.push({
                            entry:{ SectionIndex:a.SectionOrder - 1, ItemIndex:a.ItemOrder - 1, Answer:a.Answer, Remark:a.Remark, TechnicianComment:a.TechnicianComment, QcComment:a.QcComment },
                            text:a.ItemText,
                            textBn:a.ItemTextBn,
                            type:a.ItemType,
                            unit:a.Unit,
                            required:a.IsRequired
                        });
                    }

                    this.sections =
                        [...bySection.entries()].sort((x, y) => x[0] - y[0]).map(x => x[1]);

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadError = error?.error?.message ?? 'The bike delivery could not be loaded.';
                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Inputs
    //===========================================================

    private touch():
        void
    {
        this.dirty = true;
        this.cdr.detectChanges();
    }

    onDeliveryDate(value: Date):
        void
    {
        this.deliveryDate = toDay(value);

        if (this.pdiDate > this.deliveryDate)
        {
            this.pdiDate = this.deliveryDate;
        }

        this.touch();
    }

    onPdiDate(value: Date):
        void
    {
        this.pdiDate = toDay(value);
        this.touch();
    }

    setReceivedBy(value: 'Customer' | 'Nominee'):
        void
    {
        if (this.isView)
        {
            return;
        }

        this.receivedBy = value;

        if (value === 'Customer' && this.bike)
        {
            this.receiverName = this.bike.CustomerName;
            this.receiverPhone = this.bike.CustomerPhone;
        }
        else
        {
            this.receiverName = '';
            this.receiverPhone = '';
        }

        this.touch();
    }

    onField(field: 'receiverName' | 'receiverPhone' | 'remarks' | 'technicianName' | 'problemsFound' | 'pdiRemarks' | 'undoReason', event: Event):
        void
    {
        let value =
            (event.target as HTMLInputElement).value;

        if (field === 'receiverPhone')
        {
            value = value.replace(/[^0-9]/g, '').slice(0, 11);
            (event.target as HTMLInputElement).value = value;
        }

        this[field] = value;
        this.touch();
    }

    setAnswer(item: SheetItem, answer: string):
        void
    {
        if (this.isView)
        {
            return;
        }

        item.entry.Answer = item.entry.Answer === answer ? '' : answer;
        this.touch();
    }

    onEntry(item: SheetItem, field: 'Answer' | 'Remark' | 'TechnicianComment' | 'QcComment', event: Event):
        void
    {
        item.entry[field] = (event.target as HTMLInputElement).value;
        this.touch();
    }

    // Every Check item of the section still empty -> OK
    // Section button : every Check point of the section answered
    // -> "Uncheck all"
    sectionChecked(section: SheetSection): boolean
    {
        const checks =
            section.items.filter(i => i.type === 'Check');

        return checks.length > 0 && checks.every(i => !!i.entry.Answer);
    }

    // Check all : every unanswered Check point of the section -> OK
    // (Not OK / N/A already picked stay). Uncheck all : clears every
    // Check point of the section. Readings / text are not touched.
    toggleSection(section: SheetSection):
        void
    {
        if (this.isView)
        {
            return;
        }

        const clear =
            this.sectionChecked(section);

        for (const item of section.items)
        {
            if (item.type !== 'Check')
            {
                continue;
            }

            if (clear)
            {
                item.entry.Answer = '';
            }
            else if (!item.entry.Answer)
            {
                item.entry.Answer = 'OK';
            }
        }

        this.touch();
    }

    allOk(section: SheetSection):
        void
    {
        for (const item of section.items)
        {
            if (item.type === 'Check' && !item.entry.Answer)
            {
                item.entry.Answer = 'OK';
            }
        }

        this.touch();
    }

    //===========================================================
    // Save (final)
    //===========================================================

    private validate():
        string
    {
        if (this.blocked)
        {
            return this.blocked;
        }

        if (this.receivedBy === 'Nominee')
        {
            if (!this.receiverName.trim())
            {
                return 'Write the nominee\'s name.';
            }

            if (!/^01[0-9]{9}$/.test(this.receiverPhone))
            {
                return 'The nominee\'s phone must be 11 digits starting 01.';
            }
        }

        const pdi =
            !!this.template && (this.pdiRequired || this.filledCount > 0 || !!this.technicianName.trim());

        if (pdi)
        {
            if (!this.technicianName.trim())
            {
                return 'Write the Technician\'s name (PDI sheet).';
            }

            for (const section of this.sections)
            {
                for (const item of section.items)
                {
                    const answer =
                        item.entry.Answer.trim();

                    if (item.required && !answer)
                    {
                        return `"${item.text}" (${section.title}) is not filled. Fill every item of the PDI sheet.`;
                    }

                    if (answer === 'Not OK' && !item.entry.Remark.trim())
                    {
                        return `"${item.text}" is Not OK : write a remark.`;
                    }

                    if (item.type === 'Reading' && answer && isNaN(Number(answer)))
                    {
                        return `"${item.text}" : the reading must be a number.`;
                    }
                }
            }
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isView || this.isSaving || !this.bike)
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

        const word =
            this.noWord;

        this.confirmDialog.open(
            'Deliver Bike',
            `Deliver chassis ${this.bike.ChassisNo} (${word} ${this.bike.EngineNo}) to ${this.receivedBy === 'Nominee' ? this.receiverName + ' (nominee)' : this.bike.CustomerName}? Saving is final.`,
            () => this.save(),
            'Deliver',
            'Cancel',
            'primary');
    }

    private save():
        void
    {
        if (!this.bike)
        {
            return;
        }

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the delivery...', false);

        this.service
            .create({
                SalesInvoiceLineId:this.lineId,
                DeliveryDate:this.deliveryDate,
                ReceivedBy:this.receivedBy,
                ReceiverName:this.receiverName,
                ReceiverPhone:this.receiverPhone,
                Remarks:this.remarks,
                PdiDate:this.pdiDate,
                TechnicianName:this.technicianName,
                ProblemsFound:this.problemsFound,
                PdiRemarks:this.pdiRemarks,
                Answers:this.sections.flatMap(s => s.items.map(i => i.entry))
            })
            .subscribe(
            {
                next:d =>
                {
                    this.progressDialog.close();
                    this.isSaving = false;
                    this.dirty = false;
                    this.toast.success(
                        'Delivered',
                        `${d.DeliveryNo} saved.${d.Warranty ? ' Warranty ' + d.Warranty.Code + ' until ' + d.Warranty.ExpiryDate + '.' : ''}`);
                    // The view page opens the saved delivery (prints, undo)
                    void this.router.navigate(['/sales-operations/motor-bike-sales/bike-deliveries/view', d.PublicId], { replaceUrl:true });
                },
                error:error =>
                {
                    this.progressDialog.close();
                    this.isSaving = false;
                    this.toast.error('Error', error?.error?.message ?? 'The delivery could not be saved.');
                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Prints / Undo / Back
    //===========================================================

    print(doc: 'pdi-sheet' | 'delivery-challan'):
        void
    {
        if (!this.delivery)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', 'bike-deliveries', this.delivery.PublicId], { queryParams:{ doc } }));

        if (!window.open(url, '_blank'))
        {
            this.toast.warning('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
    }

    toggleUndo():
        void
    {
        this.undoOpen = !this.undoOpen;
        this.undoReason = '';
        this.cdr.detectChanges();
    }

    confirmUndo():
        void
    {
        if (!this.delivery || !this.undoReason.trim())
        {
            return;
        }

        const delivery =
            this.delivery;

        this.confirmDialog.open(
            'Undo Delivery',
            `Undo ${delivery.DeliveryNo}? Chassis ${delivery.Bike.ChassisNo} goes back to Pending and its warranty record becomes Void.`,
            () =>
                this.service
                    .undo(delivery.PublicId, this.undoReason.trim())
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success('Undone', `${delivery.DeliveryNo} was undone.`);
                            this.undoOpen = false;
                            this.loading = true;
                            this.loadDelivery(delivery.PublicId);
                        },
                        error:error =>
                            this.toast.error('Error', error?.error?.message ?? 'The delivery could not be undone.')
                    }),
            'Undo',
            'Keep',
            'danger');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/sales-operations/motor-bike-sales/bike-deliveries/list']);
    }

    onBack():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.dirty || this.isView)
        {
            this.goToList();
            return;
        }

        this.confirmDialog.open(
            'Cancel Delivery',
            'The PDI sheet and handover you filled will be lost. Leave this page?',
            () => this.goToList(),
            'Leave',
            'Stay',
            'primary');
    }

    money(value: number): string
    {
        return (value ?? 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    shortDate(iso: string): string
    {
        const p = String(iso ?? '').slice(0, 10).split('-');
        return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : '-';
    }
}
