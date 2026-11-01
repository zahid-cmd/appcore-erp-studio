//===============================================================
// Topbar Search
// --------------------------------------------------------------
// Page search palette.
//
//   Ctrl K / ⌘K     open or close, from anywhere
//   ↑ ↓             move
//   Enter           open the page
//   Esc             close
//
// Pages come from ShellService (the sidebar's own list, already
// filtered by the user's access). Nothing typed shows the
// user's Favorites then Recent pages.
//===============================================================

import
{
    Component,
    ElementRef,
    HostListener,
    computed,
    inject,
    signal,
    viewChild
}
from '@angular/core';

import
{
    Router
}
from '@angular/router';

import
{
    ShellService
}
from '../../../../core/shell/shell.service';


@Component(
{
    selector:
        'app-topbar-search',

    standalone:
        true,

    imports:
    [
    ],

    templateUrl:
        './topbar-search.html',

    styleUrls:
    [
        './topbar-search.css'
    ]
})
export class TopbarSearchComponent
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly shellService =
        inject(ShellService);

    private readonly router =
        inject(Router);

    private readonly hostElement =
        inject<ElementRef<HTMLElement>>(ElementRef);


    //===========================================================
    // View
    //===========================================================

    private readonly searchInput =
        viewChild<ElementRef<HTMLInputElement>>(
            'searchInput'
        );


    //===========================================================
    // State
    //===========================================================

    readonly isOpen =
        this.shellService.searchOpen;

    readonly query =
        signal<string>('');

    readonly activeIndex =
        signal<number>(0);

    readonly results =
        computed(
            () =>
                this.shellService.search(
                    this.query()
                )
        );

    readonly pageCount =
        computed(
            () =>
                this.shellService.pages().length
        );

    readonly shortcutLabel =
        /Mac|iPhone|iPad/i.test(
            navigator.platform
            ||
            navigator.userAgent
        )
        ? '⌘K'
        : 'Ctrl K';


    //===========================================================
    // Global Shortcut
    //===========================================================

    @HostListener(
        'document:keydown',
        [
            '$event'
        ]
    )
    onDocumentKeydown
    (
        event:
            KeyboardEvent
    ):
        void
    {
        const isShortcut =
            (
                event.ctrlKey
                ||
                event.metaKey
            )
            &&
            !event.altKey
            &&
            !event.shiftKey
            &&
            (event.key ?? '').toLowerCase() === 'k';

        if
        (
            isShortcut
        )
        {
            event.preventDefault();

            if
            (
                this.isOpen()
            )
            {
                this.close();
            }
            else
            {
                this.open();
            }

            return;
        }

        if
        (
            event.key === 'Escape'
            &&
            this.isOpen()
        )
        {
            event.preventDefault();

            this.close();
        }
    }


    //===========================================================
    // Open / Close
    //===========================================================

    // Each time it opens: clear the box and focus it.
    open():
        void
    {
        this.query.set(
            ''
        );

        this.activeIndex.set(
            0
        );

        this.shellService.openSearch();

        setTimeout(
            () =>
                this.searchInput()
                    ?.nativeElement
                    .focus(),
            0
        );
    }


    close():
        void
    {
        this.shellService.closeSearch();
    }


    onBackdrop
    (
        event:
            MouseEvent
    ):
        void
    {
        if
        (
            event.target === event.currentTarget
        )
        {
            this.close();
        }
    }


    //===========================================================
    // Typing
    //===========================================================

    onQuery
    (
        value:
            string
    ):
        void
    {
        this.query.set(
            value ?? ''
        );

        this.activeIndex.set(
            0
        );
    }


    //===========================================================
    // Keys inside the box
    //===========================================================

    onKeydown
    (
        event:
            KeyboardEvent
    ):
        void
    {
        const count =
            this.results().length;

        switch
        (
            event.key
        )
        {
            case 'ArrowDown':

                event.preventDefault();

                if
                (
                    count > 0
                )
                {
                    this.moveTo(
                        (this.activeIndex() + 1) % count
                    );
                }

                break;

            case 'ArrowUp':

                event.preventDefault();

                if
                (
                    count > 0
                )
                {
                    this.moveTo(
                        (this.activeIndex() - 1 + count) % count
                    );
                }

                break;

            case 'Enter':

                event.preventDefault();

                this.openResult(
                    this.activeIndex()
                );

                break;
        }
    }


    //===========================================================
    // Mouse
    //===========================================================

    onItemClick
    (
        event:
            MouseEvent,

        index:
            number
    ):
        void
    {
        // Ctrl / middle click: let the browser open a new tab.
        if
        (
            event.ctrlKey
            ||
            event.metaKey
            ||
            event.shiftKey
            ||
            event.button !== 0
        )
        {
            return;
        }

        event.preventDefault();

        this.openResult(
            index
        );
    }


    //===========================================================
    // Helpers
    //===========================================================

    private moveTo
    (
        index:
            number
    ):
        void
    {
        this.activeIndex.set(
            index
        );

        setTimeout(
            () =>
            {
                const element =
                    this.hostElement.nativeElement
                        .querySelector(
                            `#shell-search-item-${index}`
                        );

                element?.scrollIntoView(
                {
                    block:
                        'nearest'
                });
            },
            0
        );
    }


    private openResult
    (
        index:
            number
    ):
        void
    {
        const result =
            this.results()[index];

        if
        (
            !result
        )
        {
            return;
        }

        this.close();

        void this.router.navigateByUrl(
            result.page.route
        );
    }

}