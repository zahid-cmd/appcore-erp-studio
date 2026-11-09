//===============================================================
// Topbar Feedback  (2026-11-09)
//
// Button next to the bell : any signed-in user sends a Bug /
// Idea / Question / Praise with an optional screenshot (attach
// or paste with Ctrl + V). Goes to the developers only.
// Developers also get a link to the Feedback inbox.
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    inject,
    signal
}
from '@angular/core';

import
{
    NavigationEnd,
    Router
}
from '@angular/router';

import
{
    filter,
    finalize,
    timeout
}
from 'rxjs';

import
{
    FeedbackKind,
    FeedbackService,
    MyFeedbackItem
}
from '../../../../core/feedback/feedback.service';

import
{
    VersionService
}
from '../../../../core/version/version.service';


import
{
    ChatService
}
from '../../../../core/chat/chat.service';

import
{
    ChatPanelComponent
}
from '../topbar-chat/chat-panel';


@Component(
{
    selector:
        'app-topbar-feedback',

    standalone:
        true,

    imports:
        [ChatPanelComponent],

    templateUrl:
        './topbar-feedback.html',

    styleUrl:
        './topbar-feedback.css'
})
export class TopbarFeedbackComponent
{
    private readonly service =
        inject(FeedbackService);

    private readonly versions =
        inject(VersionService);

    private readonly router =
        inject(Router);

    private readonly host =
        inject(ElementRef<HTMLElement>);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly kinds:
        { value:FeedbackKind; label:string; icon:string }[] =
    [
        { value:'Bug',      label:'Bug',      icon:'fa-solid fa-bug' },
        { value:'Idea',     label:'Idea',     icon:'fa-regular fa-lightbulb' },
        { value:'Question', label:'Question', icon:'fa-regular fa-circle-question' },
        { value:'Praise',   label:'Praise',   icon:'fa-regular fa-face-smile' }
    ];

    readonly isOpen =
        signal(false);

    readonly isDeveloper =
        signal(false);

    readonly newCount =
        signal(0);

    kind:
        FeedbackKind =
        'Bug';

    message =
        '';

    screenshot =
        '';

    error =
        '';

    sending =
        false;

    sent =
        false;

    // Team chat (2026-11-10) / Feedback (to the developers)
    section:
        'chat' | 'feedback' =
        'chat';

    readonly chat =
        inject(ChatService);

    // Send / Mine
    tab:
        'send' | 'mine' =
        'send';

    mine:
        MyFeedbackItem[] =
        [];

    // The panel's height on the Send tab : My feedback keeps it
    // (both tabs the same size; measured, not guessed)
    panelHeight:
        number | null =
        null;

    // "My feedback" could not be loaded (shown instead of the list)
    mineFailed =
        false;

    private mineRequest =
        0;

    // Measure the Send form before leaving it
    private keepPanelHeight():
        void
    {
        if (this.tab !== 'send')
        {
            return;
        }

        const panel =
            (this.host.nativeElement as HTMLElement).querySelector('.fb-panel') as HTMLElement | null;

        if (panel && panel.offsetHeight > 0)
        {
            this.panelHeight = panel.offsetHeight;
        }
    }

    mineLoading =
        false;

    openedMine:
        MyFeedbackItem | null =
        null;

    showSection
    (
        section:
            'chat' | 'feedback'
    ):
        void
    {
        this.section =
            section;
    }

    constructor()
    {
        this.refreshMe();

        // Team chat : connect once signed in (live messages, the
        // unread count on the button)
        void this.chat.start();

        // Signed out (the top bar goes away) : close the live
        // connection, so the next user starts clean
        inject(DestroyRef).onDestroy(() => void this.chat.stop());

        // a bell item opens "My feedback" on its feedback
        // (/dashboard?myFeedback=<id>)
        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(() => this.checkLink());

        setTimeout(() => this.checkLink(), 0);
    }

    private checkLink():
        void
    {
        const id =
            this.router.parseUrl(this.router.url).queryParams['myFeedback'];

        if (!id)
        {
            return;
        }

        this.isOpen.set(true);

        this.section =
            'feedback';

        this.showMine(String(id));

        // drop ?myFeedback= from the address, stay on the page
        const tree =
            this.router.parseUrl(this.router.url);

        delete tree.queryParams['myFeedback'];

        void this.router.navigateByUrl(
            tree,
            {
                replaceUrl:true
            }
        );
    }

    showSend():
        void
    {
        this.tab =
            'send';

        this.openedMine =
            null;
    }

    showMine
    (
        openId?:
            string
    ):
        void
    {
        this.keepPanelHeight();

        this.tab =
            'mine';

        this.openedMine =
            null;

        this.mineLoading =
            true;

        this.mineFailed =
            false;

        // Only the latest request may finish the loading
        const request =
            ++this.mineRequest;

        this.redraw();

        this.service
            .mine()
            .pipe
            (
                // a request that never answers must not leave
                // "Loading..." on screen
                timeout(15000),
                finalize
                (
                    () =>
                    {
                        if (request === this.mineRequest && this.mineLoading)
                        {
                            this.mineLoading = false;

                            this.redraw();
                        }
                    }
                )
            )
            .subscribe
            ({
                next:
                    rows =>
                    {
                        if (request !== this.mineRequest)
                        {
                            return;
                        }

                        this.mine =
                            rows ?? [];

                        this.mineLoading =
                            false;

                        if (openId)
                        {
                            this.openedMine =
                                this.mine.find(x => x.publicId === openId) ?? null;
                        }

                        this.redraw();
                    },
                error:
                    () =>
                    {
                        if (request !== this.mineRequest)
                        {
                            return;
                        }

                        this.mine =
                            [];

                        this.mineLoading =
                            false;

                        this.mineFailed =
                            true;

                        this.redraw();
                    }
            });
    }

    // Zoneless : mark and draw now (the panel may sit in an
    // OnPush parent)
    private redraw():
        void
    {
        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch
        {
            // the panel was closed meanwhile
        }
    }

    openMine
    (
        item:
            MyFeedbackItem | null
    ):
        void
    {
        this.openedMine =
            item;
    }

    imageUrl
    (
        path:
            string
    ):
        string
    {
        return this.service.imageUrl(path);
    }

    statusText
    (
        status:
            string
    ):
        string
    {
        return status === 'New'
            ? 'Received'
            : status;
    }

    dateText
    (
        value?:
            string | null
    ):
        string
    {
        if (!value)
        {
            return '';
        }

        const d =
            new Date(value);

        return isNaN(d.getTime())
            ? ''
            : d.toLocaleDateString(
                'en-GB',
                {
                    day:'2-digit',
                    month:'short',
                    year:'numeric'
                }
            );
    }

    toggle():
        void
    {
        this.isOpen.set(!this.isOpen());

        if (this.isOpen())
        {
            this.sent =
                false;

            this.tab =
                'send';

            this.openedMine =
                null;

            this.error =
                '';

            this.refreshMe();
        }
    }

    close():
        void
    {
        this.isOpen.set(false);
    }

    private refreshMe():
        void
    {
        this.service
            .me()
            .subscribe
            ({
                next:
                    me =>
                    {
                        this.isDeveloper.set(!!me?.isDeveloper);

                        this.newCount.set(me?.newCount ?? 0);
                    },
                error:
                    () =>
                        this.isDeveloper.set(false)
            });
    }

    get where():
        string
    {
        return this.router.url.split('?')[0];
    }

    get version():
        string
    {
        return this.versions.label();
    }

    onMessageInput
    (
        event:
            Event
    ):
        void
    {
        this.message =
            (event.target as HTMLTextAreaElement).value;

        this.error =
            '';
    }


    //===========================================================
    // Screenshot : attach a file or paste a picture
    //===========================================================

    onFilePicked
    (
        event:
            Event
    ):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0];

        input.value =
            '';

        if (file)
        {
            this.readImage(file);
        }
    }

    onPaste
    (
        event:
            ClipboardEvent
    ):
        void
    {
        const item =
            Array.from(event.clipboardData?.items ?? [])
                .find(x => x.type.startsWith('image/'));

        const file =
            item?.getAsFile();

        if (file)
        {
            event.preventDefault();

            this.readImage(file);
        }
    }

    removeScreenshot():
        void
    {
        this.screenshot =
            '';
    }

    // max 1600 px wide, JPEG : small enough to send quickly
    private readImage
    (
        file:
            File
    ):
        void
    {
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type))
        {
            this.error =
                'Attach a JPG, PNG or WEBP picture.';

            return;
        }

        const reader =
            new FileReader();

        reader.onload =
            () =>
            {
                const image =
                    new Image();

                image.onload =
                    () =>
                    {
                        const scale =
                            Math.min(1, 1600 / image.width);

                        const canvas =
                            document.createElement('canvas');

                        canvas.width =
                            Math.round(image.width * scale);

                        canvas.height =
                            Math.round(image.height * scale);

                        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

                        this.screenshot =
                            canvas.toDataURL('image/jpeg', 0.82);

                        this.error =
                            '';

                        this.cdr.detectChanges();
                    };

                image.src =
                    String(reader.result ?? '');
            };

        reader.readAsDataURL(file);
    }


    //===========================================================
    // Send
    //===========================================================

    send():
        void
    {
        if (this.sending)
        {
            return;
        }

        if (this.message.trim().length < 3)
        {
            this.error =
                'Write a few words first.';

            return;
        }

        this.sending =
            true;

        this.error =
            '';

        this.service
            .send
            ({
                kind:this.kind,
                message:this.message.trim(),
                screenshotData:this.screenshot,
                pageUrl:this.where,
                pageTitle:document.title,
                appVersion:this.version
            })
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.sending =
                            false;

                        this.keepPanelHeight();

                        this.sent =
                            true;

                        this.message =
                            '';

                        this.screenshot =
                            '';

                        this.kind =
                            'Bug';

                        this.refreshMe();

                        this.cdr.detectChanges();
                    },
                error:
                    response =>
                    {
                        this.sending =
                            false;

                        this.error =
                            response?.error?.message
                            ?? 'The feedback could not be sent. Try again.';

                        this.cdr.detectChanges();
                    }
            });
    }

    openInbox():
        void
    {
        this.close();

        void this.router.navigateByUrl('/developer/feedback');
    }


    //===========================================================
    // Close on outside click / Esc
    //===========================================================

    @HostListener('document:mousedown', ['$event'])
    onDocumentDown
    (
        event:
            MouseEvent
    ):
        void
    {
        if
        (
            this.isOpen()
            &&
            !this.host.nativeElement.contains(event.target as Node)
        )
        {
            this.close();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        if (this.isOpen())
        {
            this.close();
        }
    }
}
