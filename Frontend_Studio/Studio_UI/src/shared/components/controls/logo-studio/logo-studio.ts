//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    inject
}
from '@angular/core';


//===============================================================
// Logo Studio (2026-11-15) : a logo / picture picker shown as a
// big framed picture (5 : 4) on a transparency checkerboard, with
// Fit / Replace / Remove on the picture, a small "on the invoice"
// preview, the file facts and a print-quality check. Empty : a
// drop area (drag a file or Browse).
//
//   <app-logo-studio
//       [imageUrl]="companyLogoPreviewUrl"
//       [name]="entity.CompanyName"
//       [disabled]="isViewMode"
//       [busy]="logoUploading"
//       (imageChange)="onCompanyLogoChange($event)">
//   </app-logo-studio>
//
// imageChange : the File picked, or null when removed (the same
// contract as app-image-hub).
//===============================================================

@Component(
{
    selector:'app-logo-studio',

    standalone:true,

    changeDetection:ChangeDetectionStrategy.OnPush,

    templateUrl:'./logo-studio.html',

    styleUrl:'./logo-studio.css'
})
export class LogoStudioComponent
implements OnChanges
{
    private readonly cdr =
        inject(ChangeDetectorRef);

    // the picture to show (a server url or a blob url)
    @Input()
    imageUrl =
        '';

    // the name printed next to the logo on the invoice preview
    @Input()
    name =
        '';

    @Input()
    badge =
        'COMPANY LOGO';

    @Input()
    disabled =
        false;

    // an upload is running
    @Input()
    busy =
        false;

    // largest file accepted, in KB
    @Input()
    maxKb =
        2048;

    // narrowest picture that still prints sharp, in px
    @Input()
    minWidth =
        500;

    @Output()
    readonly imageChange =
        new EventEmitter<File | null>();

    // Fill (cover) or Fit (contain) : the preview only
    fill =
        false;

    dragging =
        false;

    error =
        '';

    fileType =
        '';

    fileSize =
        '';

    pixels =
        '';

    naturalWidth =
        0;

    readonly accept =
        'image/png,image/svg+xml,image/jpeg,image/webp';

    ngOnChanges(changes: SimpleChanges):
        void
    {
        if (changes['imageUrl'])
        {
            this.readFacts();
        }
    }

    get hasImage(): boolean
    {
        return !!this.imageUrl;
    }

    get isVector(): boolean
    {
        return this.fileType === 'SVG';
    }

    // print quality : a vector is always sharp
    get sharp(): boolean
    {
        return this.isVector || this.naturalWidth >= this.minWidth;
    }

    //===========================================================
    // Picking
    //===========================================================

    onPick(input: HTMLInputElement):
        void
    {
        const file = input.files?.[0] ?? null;

        input.value = '';

        if (file)
        {
            this.take(file);
        }
    }

    onDragOver(event: DragEvent):
        void
    {
        if (this.disabled || this.busy)
        {
            return;
        }

        event.preventDefault();

        this.dragging = true;
    }

    onDragLeave():
        void
    {
        this.dragging = false;
    }

    onDrop(event: DragEvent):
        void
    {
        event.preventDefault();

        this.dragging = false;

        if (this.disabled || this.busy)
        {
            return;
        }

        const file = event.dataTransfer?.files?.[0];

        if (file)
        {
            this.take(file);
        }
    }

    remove():
        void
    {
        if (this.disabled || this.busy)
        {
            return;
        }

        this.error = '';

        this.imageChange.emit(null);
    }

    toggleFill():
        void
    {
        this.fill = !this.fill;
    }

    private take(file: File):
        void
    {
        this.error = '';

        if (!this.accept.split(',').includes(file.type))
        {
            this.error = 'Use a PNG, SVG, JPG or WEBP picture.';
            this.cdr.markForCheck();
            return;
        }

        if (file.size > this.maxKb * 1024)
        {
            this.error = `The picture is ${this.kb(file.size)} : the most is ${this.kb(this.maxKb * 1024)}.`;
            this.cdr.markForCheck();
            return;
        }

        this.fileType = this.typeOf(file.name, file.type);
        this.fileSize = this.kb(file.size);

        this.imageChange.emit(file);
    }

    //===========================================================
    // File facts
    //===========================================================

    private readFacts():
        void
    {
        this.pixels = '';
        this.naturalWidth = 0;

        if (!this.imageUrl)
        {
            this.fileType = '';
            this.fileSize = '';
            return;
        }

        if (!this.imageUrl.startsWith('blob:'))
        {
            this.fileType = this.typeOf(this.imageUrl, '');
            this.fileSize = '';
        }

        const image = new Image();

        image.onload = () =>
        {
            this.naturalWidth = image.naturalWidth;
            this.pixels = image.naturalWidth && image.naturalHeight ? `${image.naturalWidth} × ${image.naturalHeight}` : '';
            this.cdr.markForCheck();
        };

        image.src = this.imageUrl;
    }

    private typeOf(name: string, mime: string): string
    {
        const ext = (name.split('?')[0].split('.').pop() ?? '').toLowerCase();

        if (mime === 'image/svg+xml' || ext === 'svg')
        {
            return 'SVG';
        }

        if (mime === 'image/png' || ext === 'png')
        {
            return 'PNG';
        }

        if (mime === 'image/webp' || ext === 'webp')
        {
            return 'WEBP';
        }

        if (mime === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg')
        {
            return 'JPG';
        }

        return ext ? ext.toUpperCase() : '';
    }

    private kb(bytes: number): string
    {
        return bytes >= 1024 * 1024
            ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
}
