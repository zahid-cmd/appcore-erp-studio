//===============================================================
// Website Configuration page
// (Settings › General Settings › Website Configuration)
//
// One record, no list : the page opens straight into the form.
// Design tab first : the three website designs; the one set as
// default is the only one published live (visitors never see the
// others). Preview opens a design for this user only.
// Then : General · Contact & Location · Hours & Social ·
// Brands · Hero · Home Sections (moving strip, offer ribbon, why us) ·
// Service & FAQ · EMI · Payments · Section Headings · Policies. Update saves everything in one go (progress
// dialog, toast) and reloads; History shows the changed tabs.
// Company, branches, bikes, prices and stock stay on their own
// pages; this page only says what the website shows.
//===============================================================

import
{
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
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
    DomSanitizer,
    SafeResourceUrl
}
from '@angular/platform-browser';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { FormGridComponent } from '../../../../shared/components/layout/form-grid/form-grid';
import { FormSectionComponent } from '../../../../shared/components/layout/form-section/form-section';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { TextareaComponent } from '../../../../shared/components/controls/textarea/textarea';
import { ImageHubComponent } from '../../../../shared/components/controls/image-hub/image-hub';
import { CheckboxComponent } from '../../../../shared/components/utilities/checkbox/checkbox';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { OrbitLoaderComponent } from '../../../../shared/components/utilities/orbit-loader/orbit-loader';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../shared/components/utilities/progress-dialog/progress-runner';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { HistoryItem } from '../../../../shared/components/utilities/history-drawer/history-drawer.model';

import
{
    WebsiteBike,
    WebsiteBranchSetting,
    WebsiteBrandSetting,
    WebsiteConfiguration,
    WebsiteHour,
    WebsiteItem,
    WebsiteItemKind,
    WebsitePolicy,
    WebsitePolicyKey,
    WebsiteTheme
}
from '../models/website-configuration.model';

import
{
    WebsiteConfigurationService
}
from '../services/website-configuration.service';


interface PolicyChoice
{
    key:WebsitePolicyKey;

    brandManagementId:number;

    label:string;

    sub:string;
}


const POLICY_NAMES:
    Record<WebsitePolicyKey, string> =
{
    warranty:'Warranty',
    terms:'Terms',
    privacy:'Privacy'
};


@Component(
{
    selector:'app-website-configuration',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        FormGridComponent,
        FormSectionComponent,
        ControlTabsComponent,
        TextboxComponent,
        TextareaComponent,
        ImageHubComponent,
        CheckboxComponent,
        CommandCenterComponent,
        OrbitLoaderComponent,
        ToastComponent,
        ProgressDialogComponent,
        HistoryDrawerComponent
    ],
    templateUrl:'./website-configuration.html',
    styleUrl:'./website-configuration.css'
})
export class WebsiteConfigurationPage
implements OnInit, AfterViewInit, OnDestroy
{
    private readonly service =
        inject(WebsiteConfigurationService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly sanitizer =
        inject(DomSanitizer);

    readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.refreshView());


    //===========================================================
    // Page state
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        { id:'design', label:'Design' },
        { id:'general', label:'General' },
        { id:'contact', label:'Contact & Location' },
        { id:'hours', label:'Hours & Social' },
        { id:'brands', label:'Brands' },
        { id:'bikes', label:'Bikes' },
        { id:'hero', label:'Hero' },
        { id:'home', label:'Home Sections' },
        { id:'service', label:'Service & FAQ' },
        { id:'emi', label:'EMI' },
        { id:'payments', label:'Payments' },
        { id:'texts', label:'Section Headings' },
        { id:'policies', label:'Policies' }
    ];

    selectedTab =
        'design';

    // The website designs (blueprint-dealer-website-designs). The
    // swatches only draw the small previews on the cards.
    readonly designs:
        {
            key:string;
            no:number;
            name:string;
            feel:string;
            suits:string;
            deep:{ bg:string; panel:string; text:string; accent:string };
            light:{ bg:string; panel:string; text:string; accent:string };
        }[] =
    [
        {
            key:'website-page-1', no:1, name:'Velocity',
            feel:'Cinematic : bike slider with a light sweep, electric blue on black.',
            suits:'One or a few brands, performance and EV bikes.',
            deep:{ bg:'#05060a', panel:'#0b1224', text:'#ffffff', accent:'#2563eb' },
            light:{ bg:'#f5f7fb', panel:'#e3eaf8', text:'#0b1220', accent:'#2563eb' }
        },
        {
            key:'website-page-2', no:2, name:'Showroom',
            feel:'Clean and photo-first : one large photo, bikes in a grid with a filter panel.',
            suits:'Multi-brand dealers and large ranges.',
            deep:{ bg:'#121314', panel:'#1b1c1e', text:'#ffffff', accent:'#5b8cff' },
            light:{ bg:'#ffffff', panel:'#f5f5f3', text:'#161616', accent:'#1f5fd6' }
        },
        {
            key:'website-page-3', no:3, name:'Heritage',
            feel:'Warm and trusted : serif headings, arched photo, the range as numbered rows.',
            suits:'Family and neighbourhood dealers, service-led businesses.',
            deep:{ bg:'#14201b', panel:'#1f3029', text:'#faf6ef', accent:'#e07a4f' },
            light:{ bg:'#faf6ef', panel:'#f2ebde', text:'#1f2a24', accent:'#b04a26' }
        }
    ];

    // The design saved as default (the live one)
    savedTemplate =
        'website-page-1';

    readonly themes:
        { id:WebsiteTheme; label:string }[] =
    [
        { id:'auto', label:'Follow device' },
        { id:'light', label:'Light' },
        { id:'deep', label:'Deep' }
    ];

    loading =
        true;

    loadError =
        '';

    model:
        WebsiteConfiguration | null = null;

    historyOpen =
        false;

    historyItems:
        HistoryItem[] = [];

    // Texts & Offer : one row per website section; empty = the
    // website's default wording (shown as the placeholder)
    readonly headings:
        { section:string; kicker:string; title:string; lead?:string; d:Record<string, string> }[] =
    [
        { section:'Bikes', kicker:'bikes.kicker', title:'bikes.title', d:{ k:'Our bikes', t:'Find your ride' } },
        { section:'Why us', kicker:'why.kicker', title:'why.title', d:{ k:'Why buy from us', t:'More than a bike company' } },
        { section:'EMI', kicker:'emi.kicker', title:'emi.title', lead:'emi.lead', d:{ k:'Easy payment', t:'Ride now, pay monthly', l:'Bank card EMI and company instalments. Pick a down payment and months to see an estimate.' } },
        { section:'Service', kicker:'service.kicker', title:'service.title', d:{ k:'After you buy', t:'Service, parts & care' } },
        { section:'Branches', kicker:'branches.kicker', title:'branches.title', d:{ k:'Visit us', t:'Our branches' } },
        { section:'FAQ', kicker:'faq.kicker', title:'faq.title', lead:'faq.lead', d:{ k:'Any questions?', t:'Before you buy', l:'Still not sure? Message us and a sales adviser will reply.' } },
        { section:'Visit us', kicker:'visit.kicker', title:'visit.title', d:{ k:'Visit us', t:'Opening hours & location' } }
    ];

    // Section Headings tab : one card per website section, laid
    // out in two columns. kicker = small line, title = heading,
    // lead = line under it. plain = an ordinary text box (no
    // heading style). d = the website's own wording (placeholder).
    readonly headCards:
        { name:string; icon:string; where:string; kicker?:string; title:string; lead?:string; plain?:boolean; d:Record<string, string> }[] =
    [
        { name:'Bikes', icon:'fa-solid fa-motorcycle', where:'Home · bikes', kicker:'bikes.kicker', title:'bikes.title', d:{ k:'Our bikes', t:'Find your ride' } },
        { name:'Why us', icon:'fa-solid fa-star', where:'Home · why us', kicker:'why.kicker', title:'why.title', d:{ k:'Why buy from us', t:'More than a bike company' } },
        { name:'Service', icon:'fa-solid fa-screwdriver-wrench', where:'Home · service cards', kicker:'service.kicker', title:'service.title', d:{ k:'After you buy', t:'Service, parts & care' } },
        { name:'Branches', icon:'fa-solid fa-code-branch', where:'Home · branch cards', kicker:'branches.kicker', title:'branches.title', d:{ k:'Visit us', t:'Our branches' } },
        { name:'Visit us', icon:'fa-solid fa-location-dot', where:'Above the footer', kicker:'visit.kicker', title:'visit.title', d:{ k:'Visit us', t:'Opening hours & location' } },
        { name:'Price list note', icon:'fa-solid fa-receipt', where:'Brand page · price list', title:'prices.note', plain:true, d:{ t:'MRP includes VAT. Prices can change without notice; please confirm at the branch.' } },
        { name:'EMI', icon:'fa-solid fa-calculator', where:'Home · EMI calculator', kicker:'emi.kicker', title:'emi.title', lead:'emi.lead', d:{ k:'Easy payment', t:'Ride now, pay monthly', l:'Bank card EMI and company instalments. Pick a down payment and months to see an estimate.' } },
        { name:'FAQ', icon:'fa-solid fa-circle-question', where:'Home · questions', kicker:'faq.kicker', title:'faq.title', lead:'faq.lead', d:{ k:'Any questions?', t:'Before you buy', l:'Still not sure? Message us and a sales adviser will reply.' } },
        { name:'Test-ride band', icon:'fa-solid fa-flag-checkered', where:'Home · last band', title:'ride.title', lead:'ride.text', d:{ t:'Feel it before you buy it', l:'Book a free test ride at your nearest branch; bring your driving licence.' } }
    ];

    newPayment =
        '';

    // Inputs for adding chips
    newTag =
        '';

    // Moving strip : the chip loaded into the box by its pencil
    editingTag:
        WebsiteItem | null = null;

    newPercent =
        '';

    newMonth =
        '';

    // Policies tab
    policyChoices:
        PolicyChoice[] = [];

    selectedPolicy =
        'warranty|0';

    addBrandPartId =
        0;


    ngOnInit():
        void
    {
        this.load();
    }


    //===========================================================
    // Canvas frame : ends 10 px above the app footer (measured,
    // so it holds for any screen, zoom or layout mode). The
    // frame's own footer stays put; only the canvas scrolls.
    //===========================================================

    @ViewChild('frame')
    private frame?:
        ElementRef<HTMLElement>;

    frameHeight:
        number | null = null;

    private resizeWatch:
        ResizeObserver | null = null;

    private readonly fitFrame =
        () =>
        {
            const frame =
                this.frame?.nativeElement;

            const footer =
                document.querySelector('app-footer');

            if (!frame || !footer)
            {
                return;
            }

            const height =
                Math.floor(footer.getBoundingClientRect().top - 10 - frame.getBoundingClientRect().top);

            // Too small (phone, tiny window) : let the page flow
            const next =
                height >= 240 ? height : null;

            if (next !== this.frameHeight)
            {
                this.frameHeight = next;
                this.refreshView();
            }
        };

    ngAfterViewInit():
        void
    {
        window.addEventListener('resize', this.fitFrame);

        if (typeof ResizeObserver !== 'undefined')
        {
            this.resizeWatch = new ResizeObserver(() => this.fitFrame());
            this.resizeWatch.observe(document.body);
        }

        setTimeout(this.fitFrame);
        setTimeout(this.fitFrame, 300);
    }

    ngOnDestroy():
        void
    {
        window.removeEventListener('resize', this.fitFrame);

        this.resizeWatch?.disconnect();
    }


    // Frame footer : what the open tab controls
    readonly tabNotes:
        Record<string, { icon:string; text:string }> =
    {
        design:{ icon:'fa-solid fa-swatchbook', text:'The website design. Only the default design is live; the others are never shown to visitors. Set as default, then Update.' },
        general:{ icon:'fa-solid fa-globe', text:'Website on / off, theme, tagline and which home-page parts show.' },
        contact:{ icon:'fa-solid fa-location-dot', text:'Phone, WhatsApp and email on the website, and the map pin.' },
        hours:{ icon:'fa-solid fa-clock', text:'Opening hours in "Visit us" and the social links in the footer.' },
        brands:{ icon:'fa-solid fa-tag', text:'Which brands show, their order and brand pages, and brands per branch.' },
        bikes:{ icon:'fa-solid fa-motorcycle', text:'Which bike models show, the featured ones, their order, tagline, description (saved to Bike Models) and whether the specification sheet shows (saved to Motor Bike Specifications).' },
        hero:{ icon:'fa-solid fa-image', text:'Showroom photo in the hero : welcome slide and / or background behind the bikes.' },
        home:{ icon:'fa-solid fa-house', text:'Moving strip, offer ribbon and the "Why us" section of the home page.' },
        service:{ icon:'fa-solid fa-screwdriver-wrench', text:'Service cards and the questions in the FAQ.' },
        emi:{ icon:'fa-solid fa-calculator', text:'Down payment and month options of the EMI calculator.' },
        payments:{ icon:'fa-solid fa-money-check-dollar', text:'Payment methods shown in the website footer, with their logos.' },
        texts:{ icon:'fa-solid fa-heading', text:'The small line, heading and line under it for each home-page section.' },
        policies:{ icon:'fa-solid fa-shield-halved', text:'Warranty, Terms and Privacy pages, with each brand\'s warranty part.' }
    };

    tabNote():
        { icon:string; text:string }
    {
        return this.tabNotes[this.selectedTab] ?? { icon:'fa-solid fa-circle-info', text:'' };
    }

    tabLabel():
        string
    {
        return this.tabs.find(x => x.id === this.selectedTab)?.label ?? '';
    }


    refreshView():
        void
    {
        this.cdr.markForCheck();
    }


    load():
        void
    {
        this.loading = true;

        this.loadError = '';

        this.service
            .get()
            .subscribe(
                {
                    next:
                        model =>
                        {
                            model.bikes ??= [];
                            model.template = this.designKey(model.template);
                            this.savedTemplate = model.template;
                            this.model = model;
                            this.fillContact(model);
                            this.fillHeadings();
                            this.buildPolicyChoices();
                            this.loading = false;
                            this.refreshView();
                        },
                    error:
                        err =>
                        {
                            this.loadError = this.message(err, 'The website configuration could not be loaded.');
                            this.loading = false;
                            this.refreshView();
                        }
                }
            );
    }


    //===========================================================
    // Commands
    //===========================================================

    save():
        void
    {
        const m =
            this.model;

        if
        (
            !m
            ||
            this.progress.busy
        )
        {
            return;
        }

        this.progress
            .run(
                'Updating Website Configuration',
                'Saving the website settings, please wait…',
                'Website configuration saved.',
                this.service.save(m))
            .subscribe(
                {
                    next:
                        () =>
                        {
                            this.toast.success('Website Configuration', 'Saved. The website shows the changes within a minute.');
                            this.load();
                        },
                    error:
                        err =>
                        {
                            this.toast.error('Not saved', this.message(err, 'The website configuration could not be saved.'));
                            this.refreshView();
                        }
                }
            );
    }


    preview():
        void
    {
        window.open('/', '_blank', 'noopener');
    }


    // A design in a new tab, for this user only (behind the login;
    // visitors keep seeing the default design)
    previewDesign
    (
        key:
            string,
        theme:
            'light' | 'deep'
    ):
        void
    {
        window.open(`/website-preview/${key}?theme=${theme}`, '_blank', 'noopener');
    }


    designKey
    (
        value:
            string | null | undefined
    ):
        string
    {
        return this.designs.some(d => d.key === value)
            ? String(value)
            : 'website-page-1';
    }


    openHistory():
        void
    {
        this.service
            .history()
            .subscribe(
                {
                    next:
                        rows =>
                        {
                            this.historyItems =
                                (rows ?? []).map
                                (
                                    (x:any) =>
                                    ({
                                        title:x?.activityTitle ?? x?.ActivityTitle ?? '',
                                        description:x?.activityDescription ?? x?.ActivityDescription ?? '',
                                        user:x?.performedByName ?? x?.PerformedByName ?? '',
                                        dateTime:this.dateTime(x?.performedDate ?? x?.PerformedDate),
                                        activityType:x?.activityType ?? x?.ActivityType ?? ''
                                    })
                                );
                            this.historyOpen = true;
                            this.refreshView();
                        },
                    error:
                        err =>
                        {
                            this.toast.error('History', this.message(err, 'The history could not be loaded.'));
                        }
                }
            );
    }


    //===========================================================
    // Small helpers for the template
    //===========================================================

    str
    (
        value:
            string | number | null | undefined
    ):
        string
    {
        return String(value ?? '');
    }

    num
    (
        value:
            string | number | null | undefined
    ):
        number
    {
        const n =
            Number(String(value ?? '').replace(/,/g, ''));

        return isFinite(n) && n >= 0 ? n : 0;
    }

    fileUrl
    (
        path:
            string
    ):
        string
    {
        return this.service.fileUrl(path);
    }

    // Bikes tab : the photo shown for a model = its featured colour's
    // photo, else the first colour with a photo
    bikePhoto
    (
        bike:
            WebsiteBike
    ):
        string
    {
        const featured =
            bike.colours.find(x => x.motorBikeId === bike.featuredMotorBikeId && !!x.imagePath);

        return featured?.imagePath
            || bike.colours.find(x => !!x.imagePath)?.imagePath
            || bike.photoPath;
    }

    setFeaturedColour
    (
        bike:
            WebsiteBike,
        value:
            string
    ):
        void
    {
        const id =
            Number(value);

        bike.featuredMotorBikeId =
            id > 0 ? id : null;
    }

    move<T>
    (
        list:
            T[],
        index:
            number,
        step:
            number
    ):
        void
    {
        const to =
            index + step;

        if
        (
            to < 0
            ||
            to >= list.length
        )
        {
            return;
        }

        [list[index], list[to]] = [list[to], list[index]];
    }

    removeAt<T>
    (
        list:
            T[],
        index:
            number
    ):
        void
    {
        list.splice(index, 1);
    }


    //===========================================================
    // Contact & Hours
    //===========================================================

    // Contact : empty boxes are filled from the Company page so the
    // real values show (and save) here. WhatsApp = the hotline's
    // digits with the country code (01… → 8801…).
    private fillContact
    (
        m:
            WebsiteConfiguration
    ):
        void
    {
        if (!m.hotline.trim())
        {
            m.hotline = (m.company.mobile || m.company.phone || '').trim();
        }

        if (!m.email.trim())
        {
            m.email = (m.company.email || '').trim();
        }

        if (!m.whatsApp.trim())
        {
            const digits =
                m.hotline.replace(/\D/g, '');

            m.whatsApp =
                digits.startsWith('0') && digits.length === 11
                    ? '88' + digits
                    : digits;
        }
    }

    // Bikes tab : counts for the header line
    bikeCounts():
        { shown:number; featured:number; total:number }
    {
        const bikes =
            this.model?.bikes ?? [];

        return {
            shown:bikes.filter(b => b.showOnWebsite).length,
            featured:bikes.filter(b => b.showOnWebsite && b.isFeatured).length,
            total:bikes.length
        };
    }

    // Brands switched on for the website (columns of "Brands per branch")
    shownBrands():
        WebsiteBrandSetting[]
    {
        return (this.model?.brands ?? []).filter(b => b.showOnWebsite);
    }

    // Section Headings : empty boxes are filled with suggested
    // wording when the page opens, so they show (and save) as real
    // values. Anything already saved is left as it is.
    private readonly suggestedTexts:
        Record<string, string> =
    {
        'bikes.kicker':'Our bikes',
        'bikes.title':'Find your electric ride',
        'why.kicker':'Why Moto Zone',
        'why.title':'More than a bike shop',
        'service.kicker':'After you buy',
        'service.title':'Service, parts & care',
        'branches.kicker':'Visit us',
        'branches.title':'Our branches',
        'visit.kicker':'Come and see us',
        'visit.title':'Opening hours & location',
        'prices.note':'MRP includes VAT. Prices can change without notice; please confirm at the showroom.',
        'emi.kicker':'Easy payment',
        'emi.title':'Ride now, pay monthly',
        'emi.lead':'Bank card EMI and easy instalments. Pick a down payment and months to see your monthly estimate.',
        'faq.kicker':'Any questions?',
        'faq.title':'Before you buy',
        'faq.lead':'Still not sure? Message us on WhatsApp and a sales adviser will reply.',
        'ride.title':'Feel it before you buy it',
        'ride.text':'Book a free test ride at our showroom; just bring your driving licence.'
    };

    private fillHeadings():
        void
    {
        for (const [key, value] of Object.entries(this.suggestedTexts))
        {
            if (!this.getText(key).trim())
            {
                this.setText(key, value);
            }
        }
    }

    // "10:00" → "10:00 AM"
    private clock
    (
        value:
            string
    ):
        string
    {
        const m =
            /^(\d{1,2}):(\d{2})/.exec(value || '');

        if (!m)
        {
            return '';
        }

        const hour =
            Number(m[1]);

        return `${String(hour % 12 || 12).padStart(2, '0')}:${m[2]} ${hour < 12 ? 'AM' : 'PM'}`;
    }

    // One opening-hours row as the website shows it
    hourLine
    (
        hour:
            WebsiteHour
    ):
        string
    {
        if (hour.isClosed)
        {
            return 'Closed';
        }

        const opens =
            this.clock(hour.opensAt);

        const closes =
            this.clock(hour.closesAt);

        return opens && closes ? `${opens} – ${closes}` : 'Times not set';
    }


    //-----------------------------------------------------------
    // Social links
    //-----------------------------------------------------------

    readonly socials:
        { key:'facebookUrl' | 'youtubeUrl' | 'instagramUrl' | 'tiktokUrl'; label:string; icon:string; color:string; placeholder:string }[] =
    [
        { key:'facebookUrl', label:'Facebook', icon:'fa-brands fa-facebook-f', color:'#1877f2', placeholder:'https://facebook.com/…' },
        { key:'youtubeUrl', label:'YouTube', icon:'fa-brands fa-youtube', color:'#ff0033', placeholder:'https://youtube.com/@…' },
        { key:'instagramUrl', label:'Instagram', icon:'fa-brands fa-instagram', color:'linear-gradient(45deg, #f9a825, #e1306c 55%, #833ab4)', placeholder:'https://instagram.com/…' },
        { key:'tiktokUrl', label:'TikTok', icon:'fa-brands fa-tiktok', color:'#111827', placeholder:'https://tiktok.com/@…' }
    ];

    socialOf
    (
        key:
            'facebookUrl' | 'youtubeUrl' | 'instagramUrl' | 'tiktokUrl'
    ):
        string
    {
        return this.model?.[key] ?? '';
    }

    setSocial
    (
        key:
            'facebookUrl' | 'youtubeUrl' | 'instagramUrl' | 'tiktokUrl',
        value:
            string
    ):
        void
    {
        if (this.model)
        {
            this.model[key] = value;
        }
    }

    isLink
    (
        value:
            string
    ):
        boolean
    {
        return /^https:\/\/\S+\.\S+/i.test((value || '').trim());
    }

    addHour():
        void
    {
        this.model?.openingHours.push(
            {
                days:'',
                opensAt:'10:00',
                closesAt:'20:00',
                isClosed:false
            });
    }

    setClosed
    (
        hour:
            WebsiteHour,
        closed:
            boolean
    ):
        void
    {
        hour.isClosed = closed;

        if
        (
            closed
        )
        {
            hour.opensAt = '';
            hour.closesAt = '';
        }
        else if
        (
            !hour.opensAt
        )
        {
            hour.opensAt = '10:00';
            hour.closesAt = '20:00';
        }
    }

    //-----------------------------------------------------------
    // Map location : paste a Google Maps link → the server reads
    // its pin → live preview. Saved with Update (read again there).
    //-----------------------------------------------------------

    mapState:
        'idle' | 'busy' | 'ok' | 'bad' = 'idle';

    mapMessage =
        '';

    mapName =
        '';

    private mapTimer:
        ReturnType<typeof setTimeout> | null = null;

    private mapAsk =
        0;

    private mapPreviewFor =
        '';

    private mapPreviewUrl:
        SafeResourceUrl | null = null;


    onMapLink
    (
        value:
            string
    ):
        void
    {
        const m =
            this.model;

        if (!m)
        {
            return;
        }

        const link =
            value.trim();

        m.mapLink = link;

        if (this.mapTimer)
        {
            clearTimeout(this.mapTimer);
        }

        const ask =
            ++this.mapAsk;

        this.mapName = '';

        if (!link)
        {
            this.mapState = 'idle';
            this.mapMessage = '';
            this.refreshView();
            return;
        }

        if (!/^https?:\/\//i.test(link))
        {
            this.mapState = 'bad';
            this.mapMessage = 'Paste the whole link, starting with https://';
            this.refreshView();
            return;
        }

        this.mapState = 'busy';
        this.mapMessage = 'Reading the link…';
        this.refreshView();

        this.mapTimer =
            setTimeout(
                () =>
                    this.service
                        .mapPin(link)
                        .subscribe(
                            {
                                next:
                                    pin =>
                                    {
                                        if (ask !== this.mapAsk)
                                        {
                                            return;
                                        }

                                        m.mapQuery = pin?.query ?? '';
                                        this.mapName = pin?.name ?? '';
                                        this.mapState = m.mapQuery ? 'ok' : 'bad';
                                        this.mapMessage = m.mapQuery ? '' : 'No location found in this link.';
                                        this.refreshView();
                                    },
                                error:
                                    err =>
                                    {
                                        if (ask !== this.mapAsk)
                                        {
                                            return;
                                        }

                                        this.mapState = 'bad';
                                        this.mapMessage = this.message(err, 'This link could not be read.');
                                        this.refreshView();
                                    }
                            }
                        ),
                500
            );
    }


    // What the map shows : the pin, else company name + address
    mapQueryNow():
        string
    {
        const m =
            this.model;

        return m
            ? (m.mapQuery || [m.company.name, m.company.address].filter(Boolean).join(', '))
            : '';
    }


    // Same embed as the website; cached so the frame does not reload
    mapPreview():
        SafeResourceUrl | null
    {
        const q =
            this.mapQueryNow();

        if (q !== this.mapPreviewFor)
        {
            this.mapPreviewFor = q;

            this.mapPreviewUrl =
                q
                    ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`)
                    : null;
        }

        return this.mapPreviewUrl;
    }


    mapLink():
        string
    {
        const m =
            this.model;

        if (m?.mapLink)
        {
            return m.mapLink;
        }

        const q =
            this.mapQueryNow();

        return q
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
            : '';
    }


    //===========================================================
    // Brands
    //===========================================================

    hasBrand
    (
        branch:
            WebsiteBranchSetting,
        brand:
            WebsiteBrandSetting
    ):
        boolean
    {
        return branch.brandIds.includes(brand.brandManagementId);
    }

    toggleBranchBrand
    (
        branch:
            WebsiteBranchSetting,
        brand:
            WebsiteBrandSetting,
        on:
            boolean
    ):
        void
    {
        branch.brandIds =
            on
                ? [...new Set([...branch.brandIds, brand.brandManagementId])]
                : branch.brandIds.filter(x => x !== brand.brandManagementId);
    }


    //===========================================================
    // Home Sections : lists by kind
    //===========================================================

    itemsOf
    (
        kind:
            WebsiteItemKind
    ):
        WebsiteItem[]
    {
        return this.model?.items.filter(x => x.kind === kind) ?? [];
    }

    addItem
    (
        kind:
            WebsiteItemKind,
        title:
            string = ''
    ):
        void
    {
        this.model?.items.push({ kind, title, text:'', photoPath:'' });
    }

    addTag():
        void
    {
        const tag =
            this.newTag.trim();

        if
        (
            !tag
        )
        {
            return;
        }

        if (this.editingTag)
        {
            this.editingTag.title = tag;
        }
        else
        {
            this.addItem('tag', tag);
        }

        this.newTag = '';

        this.editingTag = null;
    }

    // Moving strip speed slider : a word for the number
    speedWord
    (
        level:
            number
    ):
        string
    {
        return level <= 2 ? 'Very slow'
            : level <= 4 ? 'Slow'
            : level <= 6 ? 'Normal'
            : level <= 8 ? 'Fast'
            : 'Very fast';
    }

    setSpeed
    (
        value:
            string
    ):
        void
    {
        if (this.model)
        {
            this.model.stripSpeed = Math.min(10, Math.max(1, Math.round(Number(value) || 5)));
        }
    }

    // Pencil : loads the chip into the box; Update writes it back
    editTag
    (
        item:
            WebsiteItem
    ):
        void
    {
        this.editingTag = item;

        this.newTag = item.title;
    }

    cancelTag():
        void
    {
        this.editingTag = null;

        this.newTag = '';
    }

    removeTag
    (
        item:
            WebsiteItem
    ):
        void
    {
        if (this.editingTag === item)
        {
            this.cancelTag();
        }

        this.removeItem(item);
    }

    removeItem
    (
        item:
            WebsiteItem
    ):
        void
    {
        const list =
            this.model?.items;

        const index =
            list?.indexOf(item) ?? -1;

        if
        (
            list
            &&
            index >= 0
        )
        {
            list.splice(index, 1);
        }
    }

    // Swaps with the previous / next item of the same kind
    moveItem
    (
        item:
            WebsiteItem,
        step:
            number
    ):
        void
    {
        const list =
            this.model?.items;

        if
        (
            !list
        )
        {
            return;
        }

        const same =
            list.filter(x => x.kind === item.kind);

        const other =
            same[same.indexOf(item) + step];

        if
        (
            !other
        )
        {
            return;
        }

        const a =
            list.indexOf(item);

        const b =
            list.indexOf(other);

        [list[a], list[b]] = [list[b], list[a]];
    }

    uploadHeroPhoto
    (
        file:
            File | null
    ):
        void
    {
        const m =
            this.model;

        if (!m)
        {
            return;
        }

        if (!file)
        {
            m.heroPhotoPath = '';
            return;
        }

        this.upload(file, path => m.heroPhotoPath = path);
    }

    uploadRoundPhoto
    (
        file:
            File | null
    ):
        void
    {
        const m =
            this.model;

        if (!m)
        {
            return;
        }

        if (!file)
        {
            m.heroRoundPath = '';
            return;
        }

        this.upload(file, path => m.heroRoundPath = path);
    }

    setRoundStrength
    (
        value:
            string
    ):
        void
    {
        if (this.model)
        {
            this.model.heroRoundStrength = Math.min(5, Math.max(1, Math.round(Number(value) || 2)));
        }
    }

    roundOpacity():
        number
    {
        return [0, .14, .22, .32, .44, .58][this.model?.heroRoundStrength ?? 2] ?? .22;
    }

    // Hero background strength : 1 … 5
    strengthWord
    (
        level:
            number
    ):
        string
    {
        return ['', 'Subtle', 'Soft', 'Medium', 'Bold', 'Strong'][level] ?? 'Soft';
    }

    setStrength
    (
        value:
            string
    ):
        void
    {
        if (this.model)
        {
            this.model.heroStrength = Math.min(5, Math.max(1, Math.round(Number(value) || 2)));
        }
    }

    heroOpacity():
        number
    {
        return [0, .16, .26, .38, .52, .68][this.model?.heroStrength ?? 2] ?? .26;
    }

    uploadWhyPhoto
    (
        file:
            File | null
    ):
        void
    {
        const m =
            this.model;

        if
        (
            !m
        )
        {
            return;
        }

        if
        (
            !file
        )
        {
            m.whyPhotoPath = '';
            return;
        }

        this.upload(file, path => m.whyPhotoPath = path);
    }

    uploadItemPhoto
    (
        item:
            WebsiteItem,
        event:
            Event
    ):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0];

        input.value = '';

        if
        (
            file
        )
        {
            this.upload(file, path => item.photoPath = path);
        }
    }

    private upload
    (
        file:
            File,
        done:
            (path:string) => void
    ):
        void
    {
        if
        (
            file.size > 5 * 1024 * 1024
        )
        {
            this.toast.warning('Photo too large', 'Photos can be at most 5 MB.');
            return;
        }

        this.service
            .uploadImage(file)
            .subscribe(
                {
                    next:
                        path =>
                        {
                            done(path);
                            this.toast.success('Photo uploaded', 'It is saved with the next Update.');
                            this.refreshView();
                        },
                    error:
                        err =>
                            this.toast.error('Photo not uploaded', this.message(err, 'The photo could not be uploaded.'))
                }
            );
    }


    //===========================================================
    // Texts & Offer
    //===========================================================

    getText
    (
        key:
            string
    ):
        string
    {
        return this.model?.items.find(x => x.kind === 'text' && x.title === key)?.text ?? '';
    }

    // Empty removes the entry : the website uses its default
    setText
    (
        key:
            string,
        value:
            string
    ):
        void
    {
        const m =
            this.model;

        if
        (
            !m
        )
        {
            return;
        }

        const item =
            m.items.find(x => x.kind === 'text' && x.title === key);

        if
        (
            !value.trim()
        )
        {
            if
            (
                item
            )
            {
                m.items.splice(m.items.indexOf(item), 1);
            }

            return;
        }

        if
        (
            item
        )
        {
            item.text = value;
        }
        else
        {
            m.items.push({ kind:'text', title:key, text:value, photoPath:'' });
        }
    }

    addPayment():
        void
    {
        const name =
            this.newPayment.trim();

        if
        (
            !name
        )
        {
            return;
        }

        this.addItem('payment', name);

        this.newPayment = '';
    }


    //===========================================================
    // EMI
    //===========================================================

    addNumber
    (
        list:
            number[],
        raw:
            string,
        min:
            number,
        max:
            number
    ):
        boolean
    {
        const n =
            Math.round(Number(raw));

        if
        (
            !raw.trim()
            ||
            !isFinite(n)
            ||
            n < min
            ||
            n > max
        )
        {
            this.toast.warning('Not added', `Enter a whole number from ${min} to ${max}.`);
            return false;
        }

        if
        (
            !list.includes(n)
        )
        {
            list.push(n);
            list.sort((a, b) => a - b);
        }

        return true;
    }

    addPercent():
        void
    {
        if
        (
            this.model
            &&
            this.addNumber(this.model.emiDownPercents, this.newPercent, 0, 90)
        )
        {
            this.newPercent = '';
        }
    }

    addMonth():
        void
    {
        if
        (
            this.model
            &&
            this.addNumber(this.model.emiMonths, this.newMonth, 1, 120)
        )
        {
            this.newMonth = '';
        }
    }

    // Preview : the first priced model, else the example price
    emiPreview():
        { price:number; down:number; months:number; downAmount:number; monthly:number }
    {
        const m =
            this.model;

        const price =
            m?.emiExamplePrice || 200000;

        const down =
            m?.emiDownPercents[1] ?? m?.emiDownPercents[0] ?? 20;

        const months =
            m?.emiMonths.includes(12) ? 12 : (m?.emiMonths[0] ?? 12);

        const downAmount =
            Math.round(price * down / 100);

        return {
            price,
            down,
            months,
            downAmount,
            monthly:Math.ceil((price - downAmount) / Math.max(months, 1))
        };
    }

    money
    (
        value:
            number
    ):
        string
    {
        return '৳ ' + new Intl.NumberFormat('en-IN').format(value);
    }


    //===========================================================
    // Policies
    //===========================================================

    buildPolicyChoices():
        void
    {
        const m =
            this.model;

        if
        (
            !m
        )
        {
            return;
        }

        const brandParts =
            m.policies
                .filter(x => x.policyKey === 'warranty' && x.brandManagementId !== 0)
                .map
                (
                    x =>
                    ({
                        key:'warranty' as WebsitePolicyKey,
                        brandManagementId:x.brandManagementId,
                        label:x.brandName || this.brandName(x.brandManagementId),
                        sub:'Warranty · brand part'
                    })
                );

        this.policyChoices =
        [
            { key:'warranty', brandManagementId:0, label:'Warranty', sub:'General · every brand' },
            ...brandParts,
            { key:'terms', brandManagementId:0, label:'Terms', sub:'Company-wide' },
            { key:'privacy', brandManagementId:0, label:'Privacy', sub:'Company-wide' }
        ];

        if
        (
            !this.policyChoices.some(x => this.choiceId(x) === this.selectedPolicy)
        )
        {
            this.selectedPolicy = 'warranty|0';
        }

        this.ensurePolicy(this.selectedPolicy);
    }

    choiceId
    (
        c:
            PolicyChoice
    ):
        string
    {
        return `${c.key}|${c.brandManagementId}`;
    }

    brandName
    (
        id:
            number
    ):
        string
    {
        return this.model?.brands.find(x => x.brandManagementId === id)?.brandName ?? '';
    }

    selectPolicy
    (
        id:
            string
    ):
        void
    {
        this.selectedPolicy = id;

        this.ensurePolicy(id);
    }

    // The policy part being edited
    currentPolicy():
        WebsitePolicy | null
    {
        const [key, id] =
            this.selectedPolicy.split('|');

        const brandId =
            Number(id) || 0;

        return this.model?.policies.find(x => x.policyKey === key && x.brandManagementId === brandId) ?? null;
    }

    // Makes the part when it is first opened
    private ensurePolicy
    (
        choice:
            string
    ):
        void
    {
        const m =
            this.model;

        if
        (
            !m
        )
        {
            return;
        }

        const [key, id] =
            choice.split('|');

        const brandId =
            Number(id) || 0;

        let policy =
            m.policies.find(x => x.policyKey === key && x.brandManagementId === brandId);

        if
        (
            !policy
        )
        {
            policy =
            {
                policyKey:key as WebsitePolicyKey,
                brandManagementId:brandId,
                brandName:this.brandName(brandId),
                title:brandId ? `Warranty · ${this.brandName(brandId)}` : POLICY_NAMES[key as WebsitePolicyKey],
                updatedOn:null,
                sections:[]
            };

            m.policies.push(policy);
        }
    }

    sectionCount
    (
        c:
            PolicyChoice
    ):
        number
    {
        return this.model?.policies
            .find(x => x.policyKey === c.key && x.brandManagementId === c.brandManagementId)
            ?.sections.length ?? 0;
    }

    brandsWithoutPart():
        WebsiteBrandSetting[]
    {
        const m =
            this.model;

        return m
            ? m.brands.filter(b => !m.policies.some(p => p.policyKey === 'warranty' && p.brandManagementId === b.brandManagementId))
            : [];
    }

    addBrandPart():
        void
    {
        const id =
            Number(this.addBrandPartId);

        if
        (
            !id
        )
        {
            return;
        }

        this.selectedPolicy = `warranty|${id}`;

        this.ensurePolicy(this.selectedPolicy);

        this.buildPolicyChoices();

        this.addBrandPartId = 0;
    }

    removeBrandPart
    (
        policy:
            WebsitePolicy
    ):
        void
    {
        const m =
            this.model;

        if
        (
            !m
            ||
            policy.brandManagementId === 0
        )
        {
            return;
        }

        m.policies = m.policies.filter(x => x !== policy);

        this.selectedPolicy = 'warranty|0';

        this.buildPolicyChoices();
    }

    addSection
    (
        policy:
            WebsitePolicy
    ):
        void
    {
        policy.sections.push({ heading:'', text:'' });
    }

    today():
        string
    {
        const d =
            new Date();

        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }


    //===========================================================
    // Messages and dates
    //===========================================================

    private message
    (
        err:
            any,
        fallback:
            string
    ):
        string
    {
        const e =
            err?.error;

        if
        (
            typeof e === 'string'
            &&
            e.trim()
        )
        {
            return e;
        }

        return e?.title || e?.message || fallback;
    }

    private dateTime
    (
        value:
            any
    ):
        string
    {
        const d =
            value ? new Date(value) : null;

        return d && !isNaN(d.getTime())
            ? d.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
            : '';
    }
}
