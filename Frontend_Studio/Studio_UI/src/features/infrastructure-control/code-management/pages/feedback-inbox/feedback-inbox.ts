//===============================================================
// Feedback Inbox  (2026-11-09)        /developer/feedback
//
// Developers only (Developer role) : not in the menu; opened
// from the topbar Feedback pop-up (Inbox) or a bell item
// (?id=...). Anyone else sees "not available".
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnInit,
    inject
}
from '@angular/core';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    FeedbackItem,
    FeedbackService,
    FeedbackStatus
}
from '../../../../../core/feedback/feedback.service';


@Component(
{
    selector:
        'app-feedback-inbox',

    standalone:
        true,

    templateUrl:
        './feedback-inbox.html',

    styleUrl:
        './feedback-inbox.css'
})
export class FeedbackInboxComponent
    implements OnInit
{
    private readonly service =
        inject(FeedbackService);

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly statuses =
        ['New', 'In progress', 'Done', 'All'];

    readonly kinds =
        ['All', 'Bug', 'Idea', 'Question', 'Praise'];

    status =
        'New';

    kind =
        'All';

    search =
        '';

    loading =
        true;

    denied =
        false;

    items:
        FeedbackItem[] =
        [];

    selected:
        FeedbackItem | null =
        null;

    note =
        '';

    // what the sender sees
    reply =
        '';

    saving =
        false;

    message =
        '';

    zoom =
        false;

    private wantedId =
        '';

    private searchTimer:
        any =
        null;

    ngOnInit():
        void
    {
        this.route.queryParamMap.subscribe(
            params =>
            {
                this.wantedId =
                    params.get('id') ?? '';

                if (this.wantedId)
                {
                    this.status =
                        'All';
                }

                this.load();
            }
        );
    }

    load():
        void
    {
        this.loading =
            true;

        this.service
            .list(this.status, this.kind, this.search)
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.items =
                            rows ?? [];

                        this.loading =
                            false;

                        this.denied =
                            false;

                        const keep =
                            this.wantedId || this.selected?.publicId;

                        const found =
                            this.items.find(x => x.publicId === keep)
                            ?? null;

                        if (found)
                        {
                            this.select(found);
                        }
                        else if (this.wantedId)
                        {
                            this.openById(this.wantedId);
                        }
                        else
                        {
                            this.selected =
                                null;
                        }

                        this.cdr.detectChanges();
                    },
                error:
                    () =>
                    {
                        this.loading =
                            false;

                        this.denied =
                            true;

                        this.cdr.detectChanges();
                    }
            });
    }

    private openById
    (
        id:
            string
    ):
        void
    {
        this.service
            .get(id)
            .subscribe
            ({
                next:
                    item =>
                    {
                        this.select(item);

                        this.cdr.detectChanges();
                    },
                error:
                    () => {}
            });
    }

    setStatus
    (
        value:
            string
    ):
        void
    {
        this.status =
            value;

        this.clearWanted();

        this.load();
    }

    setKind
    (
        event:
            Event
    ):
        void
    {
        this.kind =
            (event.target as HTMLSelectElement).value;

        this.load();
    }

    onSearch
    (
        event:
            Event
    ):
        void
    {
        this.search =
            (event.target as HTMLInputElement).value;

        clearTimeout(this.searchTimer);

        this.searchTimer =
            setTimeout(() => this.load(), 350);
    }

    select
    (
        item:
            FeedbackItem
    ):
        void
    {
        this.selected =
            item;

        this.note =
            item.developerNote ?? '';

        this.reply =
            item.replyToUser ?? '';

        this.message =
            '';

        this.zoom =
            false;
    }

    onReplyInput
    (
        event:
            Event
    ):
        void
    {
        this.reply =
            (event.target as HTMLTextAreaElement).value;
    }

    onNoteInput
    (
        event:
            Event
    ):
        void
    {
        this.note =
            (event.target as HTMLTextAreaElement).value;
    }

    save
    (
        status:
            FeedbackStatus
    ):
        void
    {
        const item =
            this.selected;

        if (!item || this.saving)
        {
            return;
        }

        this.saving =
            true;

        this.service
            .update(item.publicId, status, this.note, this.reply)
            .subscribe
            ({
                next:
                    updated =>
                    {
                        this.saving =
                            false;

                        this.message =
                            `Saved as ${updated.status}.`;

                        this.items =
                            this.items.map(x => x.publicId === updated.publicId ? updated : x);

                        this.selected =
                            updated;

                        this.cdr.detectChanges();
                    },
                error:
                    () =>
                    {
                        this.saving =
                            false;

                        this.message =
                            'Could not save. Try again.';

                        this.cdr.detectChanges();
                    }
            });
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

    kindIcon
    (
        kind:
            string
    ):
        string
    {
        switch (kind)
        {
            case 'Bug':
                return 'fa-solid fa-bug';

            case 'Idea':
                return 'fa-regular fa-lightbulb';

            case 'Question':
                return 'fa-regular fa-circle-question';

            default:
                return 'fa-regular fa-face-smile';
        }
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
            : d.toLocaleString(
                'en-GB',
                {
                    day:'2-digit',
                    month:'short',
                    year:'numeric',
                    hour:'2-digit',
                    minute:'2-digit'
                }
            );
    }

    openPage
    (
        url:
            string
    ):
        void
    {
        if (url)
        {
            void this.router.navigateByUrl(url);
        }
    }

    private clearWanted():
        void
    {
        if (this.wantedId)
        {
            this.wantedId =
                '';

            const tree =
                this.router.parseUrl(this.router.url);

            delete tree.queryParams['id'];

            void this.router.navigateByUrl(tree, { replaceUrl:true });
        }
    }
}
