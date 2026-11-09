import {
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output,
    inject
} from '@angular/core';

import { VersionService } from '../../../../core/version/version.service';

import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-about-appcore',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './about-appcore.html',
    styleUrls: ['./about-appcore.css']
})
export class AboutAppCoreComponent {

    @Input()
    visible = false;

    @Output()
    close = new EventEmitter<void>();

    // same source as the footer : version.json of the release
    readonly versions = inject(VersionService);

    // "1.1.0" (no leading v)
    get versionText(): string {

        return this.versions.label().replace(/^v/, '');

    }

    // release date "2026.11.09"; development : "dev"
    get buildText(): string {

        const date = this.versions.current()?.date;

        if (!date) {

            return 'dev';

        }

        const d = new Date(date);

        if (isNaN(d.getTime())) {

            return 'dev';

        }

        const two = (n: number) => String(n).padStart(2, '0');

        return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}`;

    }

    // Production (a deployed release) / Development (localhost)
    get releaseText(): string {

        return this.versions.current() ? 'Production' : 'Development';

    }

    // R-0015 ('' = not deployed)
    get releaseCode(): string {

        return this.versions.current()?.release ?? '';

    }

    closeDialog(): void {

        this.close.emit();

    }

    // Esc closes the dialog
    @HostListener('document:keydown.escape')
    onEscape(): void {

        if (this.visible) {

            this.closeDialog();

        }

    }

}
