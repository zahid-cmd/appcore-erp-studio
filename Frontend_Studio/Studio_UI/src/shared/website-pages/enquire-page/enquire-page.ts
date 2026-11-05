//===============================================================
// Website : Enquire Now  ( /enquire?bike=<slug>&colour=<name>
//                          &type=test-ride|service|parts
//                          &emi=<down%>-<months> )
// --------------------------------------------------------------
// A live preview of the chosen bike (photo by colour, price,
// stock, key specs) beside a short form : mobile, name, area,
// bike, colour (optional), when they plan to buy, showroom.
//
// Sent to the ERP (POST api/public/website/enquiry) it becomes a
// Sales Enquiry (Source : Website, unassigned) — or a note on
// the mobile's open enquiry. Test ride mode adds a ride date,
// a slot (Morning / Afternoon / Evening) and the licence
// question; an EMI request (from the EMI calculator) sends
// Payment Mode EMI with "20% down · 12 months".
// Service mode books a service (registration, km, need, date +
// time, pick-up / drop) and Parts mode asks for up to 5 parts;
// both become a Service Enquiry
// (POST api/public/website/service-enquiry).
// Bikes need their ERP model code;
// without the ERP (JSON only) the page offers call / WhatsApp.
//===============================================================

import
{
    Component,
    OnInit,
    computed,
    effect,
    inject,
    signal
}
from '@angular/core';

import
{
    ActivatedRoute,
    RouterLink
}
from '@angular/router';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    retry,
    timer
}
from 'rxjs';

import
{
    WebsiteDataService
}
from '../../../core/website/website-data.service';

import
{
    WebsiteEnquiryOptions,
    WebsiteEnquiryResult,
    WebsiteEnquiryService,
    WebsiteServiceSlot
}
from '../../../core/website/website-enquiry.service';

import
{
    STOCK_LABELS,
    formatPrice,
    priceLabel,
    telLink,
    whatsAppLink
}
from '../../../core/website/website-links';

import
{
    WebsiteBike
}
from '../../../core/website/website.models';

import
{
    WebComboComponent,
    WebComboItem
}
from '../../components/website-components/web-combo/web-combo';


type EnquireMode =
    'enquiry' | 'ride' | 'service' | 'parts';


// "When do you plan to buy?" quick choices
interface WhenChoice
{
    id:string;

    label:string;

    days:number;
}


@Component(
{
    selector:'app-enquire-page',
    standalone:true,
    imports:
    [
        RouterLink,
        WebComboComponent
    ],
    templateUrl:'./enquire-page.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        './enquire-page.css'
    ]
})
export class EnquirePage
implements OnInit
{
    private readonly data =
        inject(WebsiteDataService);

    private readonly enquiries =
        inject(WebsiteEnquiryService);

    private readonly route =
        inject(ActivatedRoute);


    readonly content =
        this.data.content;


    //===========================================================
    // Options from the ERP (areas, showrooms)
    //===========================================================

    readonly options =
        signal<WebsiteEnquiryOptions | null>(null);

    readonly optionsFailed =
        signal(false);


    // Bikes the form can send (they carry the ERP model code)
    readonly bikes =
        computed(
            () =>
                (this.content()?.bikes ?? []).filter(x => !!x.code)
        );


    // The form works with the ERP only
    readonly available =
        computed(
            () =>
                !this.optionsFailed()
                &&
                (this.options() === null || this.bikes().length > 0)
        );


    readonly bikeItems =
        computed<WebComboItem[]>(
            () =>
                this.bikes().map(
                    b =>
                    ({
                        value:b.code!,
                        label:b.model,
                        sub:[b.brand, this.priceOf(b)].filter(Boolean).join(' · '),
                        img:b.photo || b.colours[0]?.photo || ''
                    })
                )
        );


    readonly areaItems =
        computed<WebComboItem[]>(
            () =>
                (this.options()?.locations ?? []).map(
                    x =>
                    ({
                        value:x.code,
                        label:x.name
                    })
                )
        );


    // Showrooms : the sales ones (service centres for service and
    // parts) when the ERP marks them, else all
    readonly showrooms =
        computed(
            () =>
            {
                const all =
                    this.options()?.branches ?? [];

                const pattern =
                    this.isSales() ? /sale|show/i : /serv|work|part/i;

                const wing =
                    all.filter(x => pattern.test(x.type));

                return wing.length ? wing : all;
            }
        );


    //===========================================================
    // Form
    //===========================================================

    readonly mobile =
        signal('');

    readonly name =
        signal('');

    readonly areaCode =
        signal('');

    readonly modelCode =
        signal('');

    readonly colour =
        signal('');

    // yyyy-MM-dd
    readonly buyDate =
        signal('');

    readonly whenId =
        signal('');

    readonly branchCode =
        signal('');

    // Spam trap : people never see or fill it
    readonly trap =
        signal('');


    // Enquiry / Test ride / Service / Parts
    readonly mode =
        signal<EnquireMode>('enquiry');

    readonly isSales =
        computed(
            () =>
                this.mode() === 'enquiry' || this.mode() === 'ride'
        );


    readonly heading =
        computed(
            () =>
            {
                switch (this.mode())
                {
                    case 'ride':
                        return {
                            kicker:'Book a Test Ride',
                            title:'Feel it first',
                            lead:"Pick a bike, a day and a time. We'll call you to confirm and have it ready at the showroom."
                        };

                    case 'service':
                        return {
                            kicker:'Book a Service',
                            title:'Keep it running sweet',
                            lead:"Tell us your bike, what it needs and when you can come. We'll call you to confirm the slot."
                        };

                    case 'parts':
                        return {
                            kicker:'Ask for a Part',
                            title:'Genuine parts, ready for you',
                            lead:"Tell us the parts you need. We'll check the stock and call you with the price."
                        };

                    default:
                        return {
                            kicker:'Enquire Now',
                            title:'Find your ride',
                            lead:'Pick a bike, tell us when you plan to buy, and our executive will call you with the best offer.'
                        };
                }
            }
        );


    readonly submitText =
        computed(
            () =>
                ({
                    ride:'Book my test ride',
                    service:'Book my service',
                    parts:'Ask for these parts',
                    enquiry:'Submit enquiry'
                })[this.mode()]
        );


    //===========================================================
    // Service / Parts
    //===========================================================

    readonly regNo =
        signal('');

    readonly km =
        signal('');

    readonly serviceNeed =
        signal('');

    readonly complaint =
        signal('');

    // yyyy-MM-dd
    readonly svcDate =
        signal('');

    // The chosen time's label ("10:30 AM") : preview and request
    readonly svcSlot =
        signal('');

    // The chosen time's start ("HH:mm") : books that slot
    readonly svcStart =
        signal('');

    // Free times of the date at the branch ('' date / branch = none)
    readonly svcSlots =
        signal<WebsiteServiceSlot[]>([]);

    readonly slotsLoading =
        signal(false);

    // Loaded at least once for this date + branch
    readonly slotsLoaded =
        signal(false);

    private slotsKey =
        '';

    readonly pickup =
        signal(false);

    readonly partRows =
        signal<{ name:string; qty:string }[]>([{ name:'', qty:'1' }]);

    // Preview : the chosen branch's name and the parts typed so far
    readonly branchName =
        computed(
            () =>
                this.showrooms().find(x => x.code === this.branchCode())?.name ?? ''
        );

    readonly bikeDetails =
        computed(
            () =>
                [this.regNo(), this.km() ? `${this.km()} km` : ''].filter(x => !!x).join(' · ')
        );

    readonly partsAsked =
        computed(
            () =>
                this.partRows()
                    .filter(x => x.name.trim().length >= 2)
                    .map(x => ({ name:x.name.trim(), qty:Math.max(1, Number(x.qty) || 1) }))
        );


    readonly serviceNeeds:
        string[] =
    [
        'Free Service',
        'Paid Service',
        'Repair',
        'Other'
    ];

    // yyyy-MM-dd
    readonly rideDate =
        signal('');

    readonly rideSlot =
        signal('');

    // 'yes' / 'no' / '' (not answered)
    readonly licence =
        signal('');

    // Test ride details : folded on load, opened by a click
    readonly rideOpen =
        signal(false);

    // One line on the folded bar
    readonly rideSummary =
        computed(
            () =>
            {
                const parts =
                [
                    this.rideDate() ? EnquirePage.longDate(this.rideDate()) : '',
                    this.rideSlot(),
                    this.licence() === 'yes' ? 'Has licence' : this.licence() === 'no' ? 'No licence yet' : ''
                ]
                .filter(Boolean);

                return parts.length
                    ? parts.join(' · ')
                    : 'Choose a day, a time and tell us about your licence';
            }
        );

    readonly rideHasError =
        computed(
            () =>
                !!(this.errors().rideDate || this.errors().rideSlot || this.errors().licence)
        );

    readonly slots:
        string[] =
    [
        'Morning',
        'Afternoon',
        'Evening'
    ];

    // EMI plan asked from the calculator (null = no)
    readonly emiDown =
        signal<number | null>(null);

    readonly emiMonths =
        signal<number | null>(null);

    readonly emiText =
        computed(
            () =>
                this.emiDown() !== null && this.emiMonths() !== null
                    ? `${this.emiDown()}% down · ${this.emiMonths()} months`
                    : ''
        );


    // Payment plan : folded on load, opened by a click
    readonly payOpen =
        signal(false);

    // Choices from the website's EMI settings
    readonly downChoices =
        computed(
            () =>
                this.content()?.emi.downPercents?.length
                    ? this.content()!.emi.downPercents
                    : [10, 20, 30, 50]
        );

    readonly monthChoices =
        computed(
            () =>
                this.content()?.emi.months?.length
                    ? this.content()!.emi.months
                    : [3, 6, 12, 18, 24]
        );

    // Monthly estimate for the chosen bike (no price = none)
    readonly emiMonthly =
        computed(
            () =>
            {
                const price =
                    this.bike()?.price ?? null;

                const down =
                    this.emiDown();

                const months =
                    this.emiMonths();

                if
                (
                    price === null
                    ||
                    down === null
                    ||
                    !months
                )
                {
                    return '';
                }

                const monthly =
                    Math.round((price - Math.round(price * down / 100)) / months);

                return `${this.content()?.currency ?? ''} ${formatPrice(monthly)} / month`;
            }
        );

    readonly paySummary =
        computed(
            () =>
                this.emiText()
                    ? `EMI · ${this.emiText()}${this.emiMonthly() ? ' · about ' + this.emiMonthly() : ''}`
                    : 'Cash · tap to ask for an EMI plan'
        );

    private readonly openedAt =
        Date.now();


    readonly whenChoices:
        WhenChoice[] =
    [
        { id:'3d',  label:'Within 3 days', days:3 },
        { id:'7d',  label:'This week',     days:7 },
        { id:'14d', label:'In 2 weeks',    days:14 },
        { id:'30d', label:'This month',    days:30 }
    ];


    readonly today =
        EnquirePage.iso(new Date());

    readonly maxDate =
        EnquirePage.iso(EnquirePage.addDays(new Date(), 365));

    readonly rideMax =
        EnquirePage.iso(EnquirePage.addDays(new Date(), 60));


    // Bike / colour from the address, applied once bikes arrive
    private pendingSlug =
        '';

    private pendingColour =
        '';


    //===========================================================
    // Preview
    //===========================================================

    readonly bike =
        computed<WebsiteBike | null>(
            () =>
                this.bikes().find(x => x.code === this.modelCode()) ?? null
        );


    readonly colourIndex =
        computed(
            () =>
                this.bike()?.colours.findIndex(x => x.name === this.colour()) ?? -1
        );


    readonly photo =
        computed(
            () =>
            {
                const b =
                    this.bike();

                if
                (
                    !b
                )
                {
                    return '';
                }

                const i =
                    this.colourIndex();

                return (i >= 0 ? b.colours[i].photo : '')
                    || b.photo
                    || b.colours[0]?.photo
                    || '';
            }
        );


    readonly price =
        computed(
            () =>
            {
                const b =
                    this.bike();

                return b
                    ? this.priceOf(b)
                    : '';
            }
        );


    readonly stock =
        computed(
            () =>
                STOCK_LABELS[this.bike()?.stock ?? ''] ?? ''
        );


    // "Fri, 06 Nov 2026"
    private static longDate
    (
        value:
            string
    ):
        string
    {
        if
        (
            !value
        )
        {
            return '';
        }

        const [y, m, d] =
            value.split('-').map(Number);

        return new Date(y, m - 1, d).toLocaleDateString(
            'en-GB',
            {
                weekday:'short',
                day:'2-digit',
                month:'short',
                year:'numeric'
            }
        );
    }


    readonly buyText =
        computed(
            () =>
                this.isSales()
                    ? EnquirePage.longDate(this.buyDate())
                    : ''
        );


    // "Sat, 07 Nov 2026 · Morning" (service visit)
    readonly svcText =
        computed(
            () =>
                this.mode() === 'service' && this.svcDate()
                    ? EnquirePage.longDate(this.svcDate()) + (this.svcSlot() ? ` · ${this.svcSlot()}` : '')
                    : ''
        );


    // "Sat, 07 Nov 2026 · Morning"
    readonly rideText =
        computed(
            () =>
                this.mode() === 'ride' && this.rideDate()
                    ? EnquirePage.longDate(this.rideDate()) + (this.rideSlot() ? ` · ${this.rideSlot()}` : '')
                    : ''
        );


    //===========================================================
    // Checks (shown after the first Submit)
    //===========================================================

    readonly tried =
        signal(false);


    readonly errors =
        computed(
            () =>
            ({
                mobile:
                    /^01\d{9}$/.test(this.mobile())
                        ? ''
                        : 'Enter your 11-digit mobile number starting with 01.',

                name:
                    this.name().trim().length >= 2
                        ? ''
                        : 'Enter your name.',

                area:
                    this.areaCode()
                        ? ''
                        : 'Choose your area.',

                bike:
                    this.modelCode() || this.mode() === 'parts'
                        ? ''
                        : this.isSales() ? 'Choose the bike you like.' : 'Choose your bike.',

                when:
                    !this.isSales()
                    ||
                    (this.buyDate() && this.buyDate() >= this.today && this.buyDate() <= this.maxDate)
                        ? ''
                        : 'Tell us when you plan to buy.',

                branch:
                    this.branchCode()
                        ? ''
                        : this.isSales() ? 'Choose a showroom.' : 'Choose a branch.',

                need:
                    this.mode() !== 'service' || this.serviceNeed()
                        ? ''
                        : 'Tell us what the bike needs.',

                svcDate:
                    this.mode() !== 'service'
                    ||
                    (this.svcDate() >= this.today && this.svcDate() <= this.rideMax)
                        ? ''
                        : 'Choose the service date (within 60 days).',

                // Time is no longer asked on the website
                svcSlot:
                    '',

                parts:
                    this.mode() !== 'parts' || this.partRows().some(x => x.name.trim().length >= 2)
                        ? ''
                        : 'Tell us which part you need.',

                rideDate:
                    this.mode() !== 'ride'
                    ||
                    (this.rideDate() >= this.today && this.rideDate() <= this.rideMax)
                        ? ''
                        : 'Choose the test ride date (within 60 days).',

                rideSlot:
                    this.mode() !== 'ride' || this.rideSlot()
                        ? ''
                        : 'Choose a time.',

                licence:
                    this.mode() !== 'ride' || this.licence()
                        ? ''
                        : 'Tell us if you have a driving licence.'
            })
        );


    readonly valid =
        computed(
            () =>
                Object.values(this.errors()).every(x => !x)
        );


    //===========================================================
    // Send
    //===========================================================

    readonly sending =
        signal(false);

    readonly sendError =
        signal('');

    readonly result =
        signal<WebsiteEnquiryResult | null>(null);


    readonly links =
        computed(
            () =>
            {
                const c =
                    this.content();

                const b =
                    this.bike();

                return {
                    whatsApp:
                        c
                            ? whatsAppLink(
                                c.company.whatsApp,
                                b ? `I'm interested in ${b.model}` : 'I would like to know about your bikes')
                            : '',

                    call:
                        c
                            ? telLink(c.company.hotline)
                            : '',

                    hotline:
                        c?.company.hotline ?? ''
                };
            }
        );


    constructor()
    {
        // Address bike / colour, once the bikes are there
        effect(
            () =>
            {
                const list =
                    this.bikes();

                if
                (
                    !this.pendingSlug
                    ||
                    !list.length
                )
                {
                    return;
                }

                const b =
                    list.find(x => x.slug === this.pendingSlug);

                this.pendingSlug =
                    '';

                if
                (
                    b
                )
                {
                    this.modelCode.set(b.code!);

                    if
                    (
                        b.colours.some(x => x.name === this.pendingColour)
                    )
                    {
                        this.colour.set(this.pendingColour);
                    }
                }
            }
        );


        // One showroom only : chosen for them
        effect(
            () =>
            {
                const list =
                    this.showrooms();

                if
                (
                    list.length === 1
                    &&
                    !this.branchCode()
                )
                {
                    this.branchCode.set(list[0].code);
                }
            }
        );


        // Service : the free times of the chosen date and branch
        effect(
            () =>
            {
                const key =
                    this.mode() === 'service' && this.svcDate() && this.branchCode()
                        ? `${this.svcDate()}|${this.branchCode()}`
                        : '';

                if
                (
                    key !== this.slotsKey
                )
                {
                    this.slotsKey =
                        key;

                    this.loadSlots(key);
                }
            }
        );


        effect(
            () =>
            {
                const c =
                    this.content();

                if
                (
                    c
                )
                {
                    document.title =
                        `${this.heading().kicker} · ${c.company.name}`;
                }
            }
        );
    }


    ngOnInit():
        void
    {
        const query =
            this.route.snapshot.queryParamMap;

        this.pendingSlug =
            query.get('bike') ?? '';

        this.pendingColour =
            query.get('colour') ?? '';

        const type =
            query.get('type');

        if
        (
            type === 'test-ride'
        )
        {
            this.mode.set('ride');
        }
        else if
        (
            type === 'service'
            ||
            type === 'parts'
        )
        {
            this.mode.set(type);
        }

        // emi=20-12 : 20 % down, 12 months
        const emi =
            /^(\d{1,2})-(\d{1,2})$/.exec(query.get('emi') ?? '');

        if
        (
            emi
        )
        {
            this.emiDown.set(Number(emi[1]));

            this.emiMonths.set(Number(emi[2]));
        }

        this.loadOptions();
    }


    //===========================================================
    // Options : retried 3 times (2 s, 4 s, 6 s) so a short drop of
    // the server or the network does not hide the form; the form
    // stays on screen meanwhile. "Try again" starts over.
    //===========================================================

    readonly optionsRetrying =
        signal(false);

    private loadOptions():
        void
    {
        this.enquiries
            .getOptions()
            .pipe(
                retry(
                    {
                        count:3,
                        delay:
                            (_error: unknown, attempt: number) =>
                                timer(attempt * 2000)
                    }
                )
            )
            .subscribe
            ({
                next:
                    (options): void =>
                    {
                        this.options.set(options);

                        this.optionsFailed.set(false);

                        this.optionsRetrying.set(false);
                    },

                error:
                    (): void =>
                    {
                        this.optionsFailed.set(true);

                        this.optionsRetrying.set(false);
                    }
            });
    }

    retryOptions():
        void
    {
        if (this.optionsRetrying())
        {
            return;
        }

        this.optionsRetrying.set(true);

        this.optionsFailed.set(false);

        this.loadOptions();
    }



    //===========================================================
    // Helpers
    //===========================================================

    private static iso
    (
        date:
            Date
    ):
        string
    {
        const pad =
            (n: number): string =>
                String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }


    private static addDays
    (
        date:
            Date,

        days:
            number
    ):
        Date
    {
        const next =
            new Date(date);

        next.setDate(next.getDate() + days);

        return next;
    }


    private priceOf
    (
        b:
            WebsiteBike
    ):
        string
    {
        return priceLabel(b.price, b.priceText, this.content()?.currency ?? '');
    }


    private value
    (
        event:
            Event
    ):
        string
    {
        return (event.target as HTMLInputElement | HTMLSelectElement).value ?? '';
    }



    //===========================================================
    // Field changes
    //===========================================================

    onMobile
    (
        event:
            Event
    ):
        void
    {
        const digits =
            this.value(event)
                .replace(/^\+?88/, '')
                .replace(/\D/g, '')
                .slice(0, 11);

        this.mobile.set(digits);

        (event.target as HTMLInputElement).value = digits;
    }


    onName
    (
        event:
            Event
    ):
        void
    {
        this.name.set(this.value(event).slice(0, 100));
    }


    onTrap
    (
        event:
            Event
    ):
        void
    {
        this.trap.set(this.value(event));
    }


    pickBike
    (
        code:
            string
    ):
        void
    {
        if
        (
            code === this.modelCode()
        )
        {
            return;
        }

        this.modelCode.set(code);

        // A colour belongs to its bike
        this.colour.set('');
    }


    pickColour
    (
        name:
            string
    ):
        void
    {
        this.colour.set(this.colour() === name ? '' : name);
    }


    pickWhen
    (
        choice:
            WhenChoice
    ):
        void
    {
        this.whenId.set(choice.id);

        this.buyDate.set(EnquirePage.iso(EnquirePage.addDays(new Date(), choice.days)));
    }


    onDate
    (
        event:
            Event
    ):
        void
    {
        this.whenId.set('');

        this.buyDate.set(this.value(event));
    }


    onBranch
    (
        event:
            Event
    ):
        void
    {
        this.branchCode.set(this.value(event));
    }


    setMode
    (
        mode:
            EnquireMode
    ):
        void
    {
        const wasSales =
            this.isSales();

        this.mode.set(mode);

        this.sendError.set('');

        // Showroom vs service centre : a different list
        if
        (
            wasSales !== this.isSales()
            &&
            !this.showrooms().some(x => x.code === this.branchCode())
        )
        {
            this.branchCode.set('');
        }
    }


    onRegNo
    (
        event:
            Event
    ):
        void
    {
        this.regNo.set(this.value(event).toUpperCase().slice(0, 30));
    }


    onKm
    (
        event:
            Event
    ):
        void
    {
        const digits =
            this.value(event).replace(/\D/g, '').slice(0, 6);

        this.km.set(digits);

        (event.target as HTMLInputElement).value = digits;
    }


    pickNeed
    (
        need:
            string
    ):
        void
    {
        this.serviceNeed.set(need);
    }


    onComplaint
    (
        event:
            Event
    ):
        void
    {
        this.complaint.set(this.value(event).slice(0, 500));
    }


    onSvcDate
    (
        event:
            Event
    ):
        void
    {
        this.svcDate.set(this.value(event));
    }


    private loadSlots
    (
        key:
            string
    ):
        void
    {
        this.svcSlots.set([]);

        this.slotsLoaded.set(false);

        this.pickSlot(null);

        if
        (
            !key
        )
        {
            return;
        }

        const [date, branch] =
            key.split('|');

        this.slotsLoading.set(true);

        this.enquiries
            .getServiceSlots(date, branch)
            .subscribe
            ({
                next:
                    (list): void =>
                    {
                        if (key !== this.slotsKey) { return; }

                        this.svcSlots.set(list);

                        this.slotsLoading.set(false);

                        this.slotsLoaded.set(true);
                    },

                // No times : the request still goes, we call to fix one
                error:
                    (): void =>
                    {
                        if (key !== this.slotsKey) { return; }

                        this.slotsLoading.set(false);

                        this.slotsLoaded.set(true);
                    }
            });
    }


    // Tap again to clear (time is optional)
    pickSlot
    (
        slot:
            WebsiteServiceSlot | null
    ):
        void
    {
        const same =
            !!slot && slot.start === this.svcStart();

        this.svcStart.set(slot && !same ? slot.start : '');

        this.svcSlot.set(slot && !same ? slot.label : '');
    }


    onPartName
    (
        index:
            number,

        event:
            Event
    ):
        void
    {
        const name =
            this.value(event).slice(0, 200);

        this.partRows.update(
            rows =>
                rows.map((x, i) => i === index ? { ...x, name } : x)
        );
    }


    onPartQty
    (
        index:
            number,

        event:
            Event
    ):
        void
    {
        const qty =
            this.value(event).replace(/\D/g, '').slice(0, 2);

        (event.target as HTMLInputElement).value = qty;

        this.partRows.update(
            rows =>
                rows.map((x, i) => i === index ? { ...x, qty } : x)
        );
    }


    addPart():
        void
    {
        if
        (
            this.partRows().length < 5
        )
        {
            this.partRows.update(rows => [...rows, { name:'', qty:'1' }]);
        }
    }


    removePart
    (
        index:
            number
    ):
        void
    {
        this.partRows.update(rows => rows.filter((_, i) => i !== index));
    }


    onRideDate
    (
        event:
            Event
    ):
        void
    {
        this.rideDate.set(this.value(event));
    }


    toggleRide():
        void
    {
        this.rideOpen.set(!this.rideOpen());
    }


    togglePay():
        void
    {
        this.payOpen.set(!this.payOpen());
    }


    // Cash : no EMI plan
    payCash():
        void
    {
        this.clearEmi();
    }


    // EMI : the calculator's usual choice (2nd down %, 3rd month)
    payEmi():
        void
    {
        if
        (
            this.emiText()
        )
        {
            return;
        }

        const downs =
            this.downChoices();

        const months =
            this.monthChoices();

        this.emiDown.set(downs[Math.min(1, downs.length - 1)]);

        this.emiMonths.set(months[Math.min(2, months.length - 1)]);
    }


    pickDown
    (
        value:
            number
    ):
        void
    {
        this.emiDown.set(value);

        if
        (
            this.emiMonths() === null
        )
        {
            const months =
                this.monthChoices();

            this.emiMonths.set(months[Math.min(2, months.length - 1)]);
        }
    }


    pickMonths
    (
        value:
            number
    ):
        void
    {
        this.emiMonths.set(value);

        if
        (
            this.emiDown() === null
        )
        {
            const downs =
                this.downChoices();

            this.emiDown.set(downs[Math.min(1, downs.length - 1)]);
        }
    }


    clearEmi():
        void
    {
        this.emiDown.set(null);

        this.emiMonths.set(null);
    }



    //===========================================================
    // Submit
    //===========================================================

    submit
    (
        event:
            Event
    ):
        void
    {
        event.preventDefault();

        this.tried.set(true);

        this.sendError.set('');

        if
        (
            !this.valid()
            ||
            this.sending()
        )
        {
            // A missing ride detail : show the ride box
            if
            (
                this.mode() === 'ride'
                &&
                this.rideHasError()
            )
            {
                this.rideOpen.set(true);
            }

            return;
        }

        this.sending.set(true);

        const service =
            this.mode() === 'service';

        const request$ =
            this.isSales()
                ? this.enquiries.send(
                {
                    mobile:this.mobile(),
                    name:this.name().trim(),
                    locationCode:this.areaCode(),
                    modelCode:this.modelCode(),
                    colour:this.colour(),
                    expectedPurchaseDate:this.buyDate(),
                    branchCode:this.branchCode(),
                    paymentMode:this.emiText() ? 'EMI' : '',
                    emiNote:this.emiText(),
                    isTestRide:this.mode() === 'ride',
                    rideDate:this.mode() === 'ride' ? this.rideDate() : null,
                    rideSlot:this.mode() === 'ride' ? this.rideSlot() : '',
                    hasLicence:this.mode() === 'ride' ? this.licence() === 'yes' : null,
                    website:this.trap(),
                    filledMs:Date.now() - this.openedAt
                })
                : this.enquiries.sendService(
                {
                    enquiryType:service ? 'Service' : 'Parts',
                    mobile:this.mobile(),
                    name:this.name().trim(),
                    locationCode:this.areaCode(),
                    branchCode:this.branchCode(),
                    modelCode:this.modelCode(),
                    registrationNo:service ? this.regNo().trim() : '',
                    kmReading:service && this.km() ? Number(this.km()) : null,
                    serviceNeed:service ? this.serviceNeed() : '',
                    complaint:service ? this.complaint().trim() : '',
                    preferredDate:service ? this.svcDate() : null,
                    preferredSlot:service ? this.svcSlot() : '',
                    slotStart:service ? this.svcStart() : '',
                    pickupDrop:service && this.pickup(),
                    parts:service
                        ? []
                        : this.partRows()
                            .filter(x => x.name.trim().length >= 2)
                            .map(x => ({ name:x.name.trim(), quantity:Math.max(1, Number(x.qty) || 1) })),
                    website:this.trap(),
                    filledMs:Date.now() - this.openedAt
                });

        request$
            .subscribe
            ({
                next:
                    (result): void =>
                    {
                        this.sending.set(false);

                        this.result.set(result);
                    },

                error:
                    (error: HttpErrorResponse): void =>
                    {
                        this.sending.set(false);

                        const message =
                            error?.error?.message ?? error?.error?.Message;

                        this.sendError.set(
                            typeof message === 'string' && message
                                ? message
                                : 'Sorry, your enquiry could not be sent. Please try again, or call us.'
                        );
                    }
            });
    }


    // Send another (keeps nothing personal on screen)
    startAgain():
        void
    {
        this.result.set(null);

        this.tried.set(false);

        this.colour.set('');

        this.whenId.set('');

        this.buyDate.set('');

        this.rideDate.set('');

        this.rideSlot.set('');

        this.clearEmi();

        this.serviceNeed.set('');

        this.complaint.set('');

        this.svcDate.set('');

        this.svcSlot.set('');

        this.svcStart.set('');

        this.pickup.set(false);

        this.partRows.set([{ name:'', qty:'1' }]);
    }
}
