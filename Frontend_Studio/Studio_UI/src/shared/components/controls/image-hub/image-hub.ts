/* =====================================================
   IMPORTS
===================================================== */

import
{
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

/* =====================================================
   IMAGE HUB
===================================================== */

@Component(
{
    selector: 'app-image-hub',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './image-hub.html',

    styleUrl:
        './image-hub.css'
})
export class ImageHubComponent
{
    /* =====================================================
       FILE INPUT
    ====================================================== */

    @ViewChild('fileInput')
    fileInput!:
        ElementRef<HTMLInputElement>;

    /* =====================================================
       IMAGE
    ====================================================== */

    @Input()
    imageUrl = '';

    @Output()
    imageChange =
        new EventEmitter<File>();

    /* =====================================================
       PLACEHOLDER
    ====================================================== */

    @Input()
    placeholder =
        'No Image Selected';

    /* =====================================================
       BEHAVIOUR
    ====================================================== */

    @Input()
    disabled = false;

    @Input()
    readonly = false;

    /* =====================================================
       FILE SELECTED
    ====================================================== */

    onFileSelected(
        event: Event
    ): void
    {
        if
        (
            this.disabled
            ||
            this.readonly
        )
        {
            return;
        }

        const input =
            event.target as HTMLInputElement;

        if
        (
            !input.files
            ||
            input.files.length === 0
        )
        {
            return;
        }

        const file =
            input.files[0];

        this.imageChange.emit(file);

        input.value = '';
    }

    /* =====================================================
       REMOVE IMAGE
    ====================================================== */

    removeImage(): void
    {
        if
        (
            this.disabled
            ||
            this.readonly
        )
        {
            return;
        }

        this.imageUrl = '';

        if (this.fileInput)
        {
            this.fileInput.nativeElement.value = '';
        }
    }

    /* =====================================================
       CLEAR
    ====================================================== */

    clear(): void
    {
        this.removeImage();
    }
}