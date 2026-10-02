//===============================================================
// Imports
//===============================================================

import
{
    Component,
    inject,
    Input,
    ElementRef,
    ViewChild,
    effect
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    FormsModule
}
from '@angular/forms';

import
{
    GitMessageModalService
}
from './git-message-modal.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-git-message-modal',

    standalone:
        true,

    imports:
    [
        CommonModule,

        FormsModule
    ],

    templateUrl:
        './git-message-modal.html',

    styleUrls:
    [
        './git-message-modal.css'
    ]
})


export class GitMessageModalComponent
{

    //===========================================================
    // Preview Mode
    //===========================================================

    @Input()
    previewMode =
        false;


    //===========================================================
    // Message Input
    //===========================================================

    @ViewChild(
        'messageInput'
    )
    messageInput?:
        ElementRef<HTMLTextAreaElement>;


    //===========================================================
    // Injection
    //===========================================================

    modal =
        inject(
            GitMessageModalService
        );


    //===========================================================
    // State
    //===========================================================

    state =
        this.modal.state;


    //===========================================================
    // Constructor
    //===========================================================

    constructor()
    {
        effect(
            () =>
            {
                const visible =
                    this.state().visible;

                if
                (
                    visible
                )
                {
                    setTimeout(
                        () =>
                        {
                            this.focusMessageInput();
                        },

                        0
                    );
                }
            }
        );
    }


    //===========================================================
    // Focus Message Input
    //===========================================================

    private focusMessageInput():
        void
    {
        this.messageInput
            ?.nativeElement
            .focus();
    }


    //===========================================================
    // Message
    //===========================================================

    get message():
        string
    {
        return this.state().message;
    }


    set message
    (
        value:
            string
    )
    {
        this.modal.updateMessage(
            value
        );
    }


    //===========================================================
    // Confirm
    //===========================================================

    confirm():
        void
    {
        this.modal.confirm();
    }


    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        this.modal.close();
    }


    //===========================================================
    // Valid
    //===========================================================

    get isValid():
        boolean
    {
        return this.state()
            .message
            .trim()
            .length > 0;
    }

}