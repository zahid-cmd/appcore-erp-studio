//===============================================================
// Feedback Service  (2026-11-09)
//
// Topbar Feedback button (everyone) and the developers' inbox.
// api/platform/feedback
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient,
    HttpParams
}
from '@angular/common/http';

import
{
    Observable
}
from 'rxjs';

import
{
    environment
}
from '../../environments/environment';


export type FeedbackKind =
    'Bug' | 'Idea' | 'Question' | 'Praise';

export type FeedbackStatus =
    'New' | 'In progress' | 'Done';

export interface SendFeedback
{
    kind:
        FeedbackKind;

    message:
        string;

    // data URL ('' = none)
    screenshotData:
        string;

    pageUrl:
        string;

    pageTitle:
        string;

    appVersion:
        string;
}

export interface FeedbackItem
{
    publicId:
        string;

    number:
        number;

    kind:
        FeedbackKind;

    message:
        string;

    screenshotPath:
        string;

    pageUrl:
        string;

    pageTitle:
        string;

    branchName:
        string;

    appVersion:
        string;

    userName:
        string;

    status:
        FeedbackStatus;

    developerNote:
        string;

    replyToUser:
        string;

    handledByName:
        string;

    createdDate:
        string;

    modifiedDate?:
        string | null;
}

// the sender's own feedback (My feedback)
export interface MyFeedbackItem
{
    publicId:
        string;

    number:
        number;

    kind:
        FeedbackKind;

    message:
        string;

    screenshotPath:
        string;

    pageTitle:
        string;

    status:
        FeedbackStatus;

    replyToUser:
        string;

    createdDate:
        string;

    modifiedDate?:
        string | null;
}

export interface FeedbackMe
{
    isDeveloper:
        boolean;

    newCount:
        number;
}


@Injectable(
{
    providedIn:'root'
})
export class FeedbackService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/platform/feedback`;

    send
    (
        dto:
            SendFeedback
    ):
        Observable<{ publicId:string }>
    {
        return this.http.post<{ publicId:string }>(
            this.apiUrl,
            dto
        );
    }

    mine():
        Observable<MyFeedbackItem[]>
    {
        return this.http.get<MyFeedbackItem[]>(
            `${this.apiUrl}/mine`
        );
    }

    me():
        Observable<FeedbackMe>
    {
        return this.http.get<FeedbackMe>(
            `${this.apiUrl}/me`
        );
    }

    list
    (
        status:
            string,
        kind:
            string,
        search:
            string
    ):
        Observable<FeedbackItem[]>
    {
        let params =
            new HttpParams()
                .set('status', status)
                .set('kind', kind);

        if (search.trim())
        {
            params =
                params.set('search', search.trim());
        }

        return this.http.get<FeedbackItem[]>(
            this.apiUrl,
            { params }
        );
    }

    get
    (
        publicId:
            string
    ):
        Observable<FeedbackItem>
    {
        return this.http.get<FeedbackItem>(
            `${this.apiUrl}/${publicId}`
        );
    }

    update
    (
        publicId:
            string,
        status:
            FeedbackStatus,
        developerNote:
            string,
        replyToUser:
            string
    ):
        Observable<FeedbackItem>
    {
        return this.http.put<FeedbackItem>(
            `${this.apiUrl}/${publicId}`,
            {
                status,
                developerNote,
                replyToUser
            }
        );
    }

    // /uploads/feedback/x.jpg -> full URL on the API
    imageUrl
    (
        path:
            string
    ):
        string
    {
        if (!path)
        {
            return '';
        }

        if (/^https?:/i.test(path))
        {
            return path;
        }

        const root =
            environment.apiUrl.replace(/\/api\/?$/i, '');

        return root + path;
    }
}
