//===============================================================
// Version Notice  (2026-11-09)
//
//   * "A new version is available" banner (Reload)
//   * What's new pop-up after an update (once)
//   * Version history (opened from the footer version)
//
// Placed once in the main layout.
//===============================================================

import
{
    Component,
    HostListener,
    inject
}
from '@angular/core';

import
{
    VersionService
}
from '../../../../core/version/version.service';


@Component(
{
    selector:
        'app-version-notice',

    standalone:
        true,

    templateUrl:
        './version-notice.html',

    styleUrl:
        './version-notice.css'
})
export class VersionNoticeComponent
{
    readonly versions =
        inject(VersionService);

    constructor()
    {
        this.versions.start();
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

        const date =
            new Date(value);

        return isNaN(date.getTime())
            ? ''
            : date.toLocaleDateString(
                'en-GB',
                {
                    day:'2-digit',
                    month:'short',
                    year:'numeric'
                }
            );
    }

    typeIcon
    (
        type?:
            string
    ):
        string
    {
        return type === 'Fix'
            ? 'fas fa-screwdriver-wrench'
            : type === 'Major'
                ? 'fas fa-rocket'
                : 'fas fa-wand-magic-sparkles';
    }

    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        if (this.versions.showHistory())
        {
            this.versions.closeHistory();
        }
        else if (this.versions.showWhatsNew())
        {
            this.versions.closeWhatsNew();
        }
    }
}
