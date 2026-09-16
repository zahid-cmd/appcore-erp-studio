//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    signal
}
from '@angular/core';


//===============================================================
// MODAL MODE
//===============================================================

export type GitMessageModalMode =
    | 'commit'
    | 'sync';


//===============================================================
// MODAL STATE
//===============================================================

export interface GitMessageModalState
{
    visible:
        boolean;

    mode:
        GitMessageModalMode;

    title:
        string;

    placeholder:
        string;

    confirmText:
        string;

    message:
        string;

    callback:
        ((message: string) => void)
        |
        null;
}


//===============================================================
// GIT MESSAGE MODAL SERVICE
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})
export class GitMessageModalService
{
    //===========================================================
    // State
    //===========================================================

    state =
        signal<GitMessageModalState>(
        {
            visible:
                false,

            mode:
                'commit',

            title:
                '',

            placeholder:
                '',

            confirmText:
                '',

            message:
                '',

            callback:
                null
        });


    //===========================================================
    // OPEN COMMIT
    //===========================================================

    openCommit
    (
        callback:
            (message: string) => void
    ):
        void
    {
        this.state.set(
        {
            visible:
                true,

            mode:
                'commit',

            title:
                'Commit Changes',

            placeholder:
                'Enter commit message...',

            confirmText:
                'Commit',

            message:
                '',

            callback:
                callback
        });
    }


    //===========================================================
    // OPEN SYNC
    //===========================================================

    openSync
    (
        callback:
            (message: string) => void
    ):
        void
    {
        this.state.set(
        {
            visible:
                true,

            mode:
                'sync',

            title:
                'Sync Repository',

            placeholder:
                'Enter sync message...',

            confirmText:
                'Sync',

            message:
                '',

            callback:
                callback
        });
    }


    //===========================================================
    // UPDATE MESSAGE
    //===========================================================

    updateMessage
    (
        value:
            string
    ):
        void
    {
        this.state.update(
            current =>
            ({
                ...current,

                message:
                    value
            })
        );
    }


    //===========================================================
    // CONFIRM
    //===========================================================

    confirm():
        void
    {
        const current =
            this.state();


        const message =
            current
                .message
                .trim();


        if
        (
            !message ||
            !current.callback
        )
        {
            return;
        }


        const callback =
            current.callback;


        callback(
            message
        );


        this.close();
    }


    //===========================================================
    // CLOSE
    //===========================================================

    close():
        void
    {
        this.state.set(
        {
            visible:
                false,

            mode:
                'commit',

            title:
                '',

            placeholder:
                '',

            confirmText:
                '',

            message:
                '',

            callback:
                null
        });
    }
}