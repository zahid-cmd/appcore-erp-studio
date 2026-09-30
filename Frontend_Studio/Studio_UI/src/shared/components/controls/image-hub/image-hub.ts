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
    selector:
        'app-image-hub',

    standalone:
        true,

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
       LABEL
    ====================================================== */

    @Input()
    label =
        'Image';


    /* =====================================================
       IMAGE
    ====================================================== */

    @Input()
    imageUrl =
        '';

    @Output()
    imageChange =
        new EventEmitter<File | null>();


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
    disabled =
        false;

    @Input()
    readonly =
        false;


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


        this.imageChange.emit(
            file
        );


        /*
         * Reset the input so that selecting
         * the same file again still triggers
         * the change event.
         */

        input.value =
            '';
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


        this.imageUrl =
            '';


        if
        (
            this.fileInput
        )
        {
            this.fileInput
                .nativeElement
                .value =
                '';
        }


        /* =================================================
           Notify Parent Component
        ================================================== */

        this.imageChange.emit(
            null
        );
    }


    /* =====================================================
       CLEAR
    ====================================================== */

    clear(): void
    {
        this.removeImage();
    }

}