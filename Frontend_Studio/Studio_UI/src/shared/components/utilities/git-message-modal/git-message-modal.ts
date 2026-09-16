//===============================================================
// Imports
//===============================================================

import
{
    Component,
    inject,
    Input
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