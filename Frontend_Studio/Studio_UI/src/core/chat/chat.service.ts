//===============================================================
// Team Chat service (2026-11-10)
// --------------------------------------------------------------
// Chat between the active users of this company : direct and
// group conversations, text and pictures. REST for the data
// (api/platform/chat), SignalR (/hubs/chat) for live delivery :
// new messages, read marks, typing and who is online.
//
// State lives in signals, so every view redraws by itself
// (zoneless). start() once after login (the topbar does it);
// stop() on logout.
//
// Needs the package : npm i @microsoft/signalr
//===============================================================

import
{
    Injectable,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    map,
    tap
}
from 'rxjs';

import
{
    HubConnection,
    HubConnectionBuilder,
    HubConnectionState,
    LogLevel
}
from '@microsoft/signalr';

import
{
    environment
}
from '../../environments/environment';

import
{
    AuthenticationStorageService
}
from '../authentication/authentication-storage.service';


export interface ChatUser
{
    userId:number;
    name:string;
    photoPath:string;
    online:boolean;
}

export interface ChatMessage
{
    id:number;
    senderId:number;
    senderName:string;
    body:string;
    imagePath:string;
    createdDate:string;
    isDeleted:boolean;
}

export interface ChatConversation
{
    id:string;
    kind:'Direct' | 'Group';
    title:string;
    photoPath:string;
    otherUserId:number;
    isOwner:boolean;
    isMember:boolean;
    members:ChatUser[];
    lastMessage:ChatMessage | null;
    unread:number;
    myLastRead:number;
    otherLastRead:number;
    lastMessageDate:string | null;
}


@Injectable(
{
    providedIn:'root'
})
export class ChatService
{
    private readonly http =
        inject(HttpClient);

    private readonly storage =
        inject(AuthenticationStorageService);

    private readonly apiUrl =
        `${environment.apiUrl}/platform/chat`;

    private readonly hubUrl =
        `${environment.apiUrl.replace(/\/api\/?$/i, '')}/hubs/chat`;

    private hub:
        HubConnection | null =
        null;

    //-----------------------------------------------------------
    // State
    //-----------------------------------------------------------

    readonly conversations =
        signal<ChatConversation[]>([]);

    readonly users =
        signal<ChatUser[]>([]);

    // Messages loaded per conversation (oldest first)
    readonly messages =
        signal<Record<string, ChatMessage[]>>({});

    // Conversations with older messages still on the server
    readonly hasOlder =
        signal<Record<string, boolean>>({});

    // Who is typing where : conversation id -> names
    readonly typing =
        signal<Record<string, string[]>>({});

    readonly online =
        signal<Set<number>>(new Set());

    readonly connected =
        signal(false);

    // The conversation open on screen (its messages count as read)
    readonly openId =
        signal<string | null>(null);

    readonly unreadTotal =
        computed(() => this.conversations().reduce((s, x) => s + (x.isMember ? x.unread : 0), 0));

    get myId():
        number
    {
        return Number(this.storage.getUser()?.userProfileId ?? 0);
    }

    private typingTimers =
        new Map<string, number>();


    //===========================================================
    // Start / stop
    //===========================================================

    async start():
        Promise<void>
    {
        if (this.hub || !this.storage.getToken())
        {
            return;
        }

        this.loadConversations().subscribe();

        const hub =
            new HubConnectionBuilder()
                .withUrl(this.hubUrl,
                {
                    accessTokenFactory:() => this.storage.getToken() ?? '',
                    // the API's CORS does not allow credentials
                    withCredentials:false
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
                .configureLogging(LogLevel.Warning)
                .build();

        hub.on('chatMessage', (e:any) => this.onMessage(String(e.conversationId), this.toMessage(e.message)));

        hub.on('chatMessageDeleted', (e:any) => this.onDeleted(String(e.conversationId), Number(e.messageId)));

        hub.on('chatConversation', (e:any) => this.upsert(this.toConversation(e.conversation)));

        hub.on('chatRead', (e:any) => this.onRead(String(e.conversationId), Number(e.userId), Number(e.lastReadMessageId)));

        hub.on('chatTyping', (e:any) => this.onTyping(String(e.conversationId), String(e.name ?? '')));

        hub.on('chatPresence', (e:any) => this.onPresence(Number(e.userId), !!e.online));

        hub.onreconnected(() =>
        {
            this.connected.set(true);

            // anything missed while away
            this.loadConversations().subscribe();

            const open = this.openId();

            if (open)
            {
                this.loadMessages(open).subscribe();
            }
        });

        hub.onreconnecting(() => this.connected.set(false));

        hub.onclose(() => this.connected.set(false));

        this.hub = hub;

        try
        {
            await hub.start();

            this.connected.set(true);
        }
        catch
        {
            // the API is down : the automatic reconnect does not
            // cover the first start, so try again in a while
            this.connected.set(false);

            this.hub = null;

            window.setTimeout(() => void this.start(), 15000);
        }
    }

    async stop():
        Promise<void>
    {
        const hub = this.hub;

        this.hub = null;

        this.conversations.set([]);
        this.messages.set({});
        this.openId.set(null);
        this.connected.set(false);

        if (hub && hub.state !== HubConnectionState.Disconnected)
        {
            await hub.stop();
        }
    }


    //===========================================================
    // REST
    //===========================================================

    loadUsers():
        Observable<ChatUser[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/users`)
            .pipe(
                map(rows => (rows ?? []).map(x => this.toUser(x))),
                tap(rows =>
                {
                    this.users.set(rows);

                    this.online.set(new Set(rows.filter(x => x.online).map(x => x.userId)));
                }));
    }

    loadConversations():
        Observable<ChatConversation[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/conversations`)
            .pipe(
                map(rows => (rows ?? []).map(x => this.toConversation(x))),
                tap(rows =>
                {
                    this.conversations.set(rows);

                    // who is online, as the server saw it
                    this.online.update(set =>
                    {
                        const next = new Set(set);

                        rows.forEach(c => c.members.forEach(m => m.online ? next.add(m.userId) : next.delete(m.userId)));

                        return next;
                    });
                }));
    }

    // Newest page of a conversation (replaces what was loaded)
    loadMessages
    (
        id:string
    ):
        Observable<ChatMessage[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/conversations/${id}/messages`, { params:{ take:50 } })
            .pipe(
                map(rows => (rows ?? []).map(x => this.toMessage(x))),
                tap(rows =>
                {
                    this.messages.update(all => ({ ...all, [id]:rows }));

                    this.hasOlder.update(all => ({ ...all, [id]:rows.length === 50 }));
                }));
    }

    loadOlder
    (
        id:string
    ):
        Observable<ChatMessage[]>
    {
        const first =
            this.messages()[id]?.[0];

        return this.http
            .get<any[]>(`${this.apiUrl}/conversations/${id}/messages`, { params:{ take:50, beforeId:first?.id ?? 0 } })
            .pipe(
                map(rows => (rows ?? []).map(x => this.toMessage(x))),
                tap(rows =>
                {
                    this.messages.update(all => ({ ...all, [id]:[...rows, ...(all[id] ?? [])] }));

                    this.hasOlder.update(all => ({ ...all, [id]:rows.length === 50 }));
                }));
    }

    openDirect
    (
        userId:number
    ):
        Observable<ChatConversation>
    {
        return this.http
            .post<any>(`${this.apiUrl}/direct`, { userId })
            .pipe(
                map(x => this.toConversation(x)),
                tap(x => this.upsert(x)));
    }

    createGroup
    (
        title:string,
        memberIds:number[]
    ):
        Observable<ChatConversation>
    {
        return this.http
            .post<any>(`${this.apiUrl}/groups`, { title, memberIds })
            .pipe(
                map(x => this.toConversation(x)),
                tap(x => this.upsert(x)));
    }

    updateGroup
    (
        id:string,
        title:string,
        memberIds:number[]
    ):
        Observable<ChatConversation>
    {
        return this.http
            .put<any>(`${this.apiUrl}/groups/${id}`, { title, memberIds })
            .pipe(
                map(x => this.toConversation(x)),
                tap(x => this.upsert(x)));
    }

    leaveGroup
    (
        id:string
    ):
        Observable<unknown>
    {
        return this.http
            .post(`${this.apiUrl}/groups/${id}/leave`, {})
            .pipe(tap(() => this.loadConversations().subscribe()));
    }

    send
    (
        id:string,
        text:string,
        imageData:string
    ):
        Observable<ChatMessage>
    {
        return this.http
            .post<any>(`${this.apiUrl}/conversations/${id}/messages`, { text, imageData })
            .pipe(
                map(x => this.toMessage(x)),
                // the hub sends it too; whichever comes first adds it
                tap(x => this.onMessage(id, x)));
    }

    deleteMessage
    (
        id:string,
        messageId:number
    ):
        Observable<unknown>
    {
        return this.http
            .delete(`${this.apiUrl}/messages/${messageId}`)
            .pipe(tap(() => this.onDeleted(id, messageId)));
    }

    // Everything up to the newest loaded message is read
    markRead
    (
        id:string
    ):
        void
    {
        const list =
            this.messages()[id] ?? [];

        const last =
            list.length ? list[list.length - 1].id : 0;

        const conversation =
            this.conversations().find(x => x.id === id);

        if (!conversation || !last || (last <= conversation.myLastRead && conversation.unread === 0))
        {
            return;
        }

        this.patch(id, { unread:0, myLastRead:Math.max(conversation.myLastRead, last) });

        this.http
            .post(`${this.apiUrl}/conversations/${id}/read`, { lastMessageId:last })
            .subscribe({ error:() => {} });
    }

    // Tell the others "typing..." (at most every 3 s)
    private lastTypingSent =
        0;

    sendTyping
    (
        id:string
    ):
        void
    {
        const now =
            Date.now();

        if (!this.hub || this.hub.state !== HubConnectionState.Connected || now - this.lastTypingSent < 3000)
        {
            return;
        }

        this.lastTypingSent = now;

        this.hub.invoke('Typing', id).catch(() => {});
    }

    imageUrl
    (
        path:string
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

        return environment.apiUrl.replace(/\/api\/?$/i, '') + path;
    }


    //===========================================================
    // Live events
    //===========================================================

    private onMessage
    (
        id:string,
        message:ChatMessage
    ):
        void
    {
        const list =
            this.messages()[id];

        // only into a loaded conversation, once
        if (list && !list.some(x => x.id === message.id))
        {
            this.messages.update(all => ({ ...all, [id]:[...list, message] }));
        }

        const mine =
            message.senderId === this.myId;

        const conversation =
            this.conversations().find(x => x.id === id);

        if (!conversation)
        {
            // a new direct chat / group : fetch the list again
            this.loadConversations().subscribe();

            return;
        }

        const isNew =
            !conversation.lastMessage || message.id > conversation.lastMessage.id;

        this.patch(id,
        {
            lastMessage:isNew ? message : conversation.lastMessage,
            lastMessageDate:isNew ? message.createdDate : conversation.lastMessageDate,
            unread:mine || !isNew ? conversation.unread : conversation.unread + 1,
            myLastRead:mine ? Math.max(conversation.myLastRead, message.id) : conversation.myLastRead
        });

        this.sortConversations();

        // the sender stopped typing
        this.typing.update(all => ({ ...all, [id]:(all[id] ?? []).filter(x => x !== message.senderName) }));

        // open on screen : read at once
        if (!mine && this.openId() === id && document.visibilityState === 'visible')
        {
            this.markRead(id);
        }
    }

    private onDeleted
    (
        id:string,
        messageId:number
    ):
        void
    {
        this.messages.update(all =>
        {
            const list = all[id];

            return list
                ? { ...all, [id]:list.map(x => x.id === messageId ? { ...x, isDeleted:true, body:'', imagePath:'' } : x) }
                : all;
        });

        const conversation =
            this.conversations().find(x => x.id === id);

        if (conversation?.lastMessage?.id === messageId)
        {
            this.patch(id, { lastMessage:{ ...conversation.lastMessage, isDeleted:true, body:'', imagePath:'' } });
        }
    }

    private onRead
    (
        id:string,
        userId:number,
        lastRead:number
    ):
        void
    {
        const conversation =
            this.conversations().find(x => x.id === id);

        if (!conversation)
        {
            return;
        }

        if (userId === this.myId)
        {
            // read on another tab / PC
            this.patch(id, { myLastRead:Math.max(conversation.myLastRead, lastRead), unread:0 });
        }
        else if (conversation.kind === 'Direct')
        {
            this.patch(id, { otherLastRead:Math.max(conversation.otherLastRead, lastRead) });
        }
    }

    private onTyping
    (
        id:string,
        name:string
    ):
        void
    {
        if (!name)
        {
            return;
        }

        this.typing.update(all => ({ ...all, [id]:Array.from(new Set([...(all[id] ?? []), name])) }));

        const key =
            `${id}|${name}`;

        window.clearTimeout(this.typingTimers.get(key));

        this.typingTimers.set(key, window.setTimeout(
            () => this.typing.update(all => ({ ...all, [id]:(all[id] ?? []).filter(x => x !== name) })),
            4000));
    }

    private onPresence
    (
        userId:number,
        online:boolean
    ):
        void
    {
        this.online.update(set =>
        {
            const next = new Set(set);

            if (online) { next.add(userId); } else { next.delete(userId); }

            return next;
        });
    }


    //===========================================================
    // Helpers
    //===========================================================

    private upsert
    (
        conversation:ChatConversation
    ):
        void
    {
        this.conversations.update(list =>
        {
            const others =
                list.filter(x => x.id !== conversation.id);

            return [conversation, ...others];
        });

        this.sortConversations();
    }

    private patch
    (
        id:string,
        change:Partial<ChatConversation>
    ):
        void
    {
        this.conversations.update(list => list.map(x => x.id === id ? { ...x, ...change } : x));
    }

    private sortConversations():
        void
    {
        this.conversations.update(list =>
            [...list].sort((a, b) => (b.lastMessageDate ?? '').localeCompare(a.lastMessageDate ?? '')));
    }

    private pick
    (
        x:any,
        name:string
    ):
        any
    {
        return x?.[name] ?? x?.[name.charAt(0).toUpperCase() + name.slice(1)];
    }

    private toUser
    (
        x:any
    ):
        ChatUser
    {
        return {
            userId:Number(this.pick(x, 'userId') ?? 0),
            name:String(this.pick(x, 'name') ?? ''),
            photoPath:String(this.pick(x, 'photoPath') ?? ''),
            online:!!this.pick(x, 'online')
        };
    }

    private toMessage
    (
        x:any
    ):
        ChatMessage
    {
        return {
            id:Number(this.pick(x, 'id') ?? 0),
            senderId:Number(this.pick(x, 'senderId') ?? 0),
            senderName:String(this.pick(x, 'senderName') ?? ''),
            body:String(this.pick(x, 'body') ?? ''),
            imagePath:String(this.pick(x, 'imagePath') ?? ''),
            createdDate:String(this.pick(x, 'createdDate') ?? ''),
            isDeleted:!!this.pick(x, 'isDeleted')
        };
    }

    private toConversation
    (
        x:any
    ):
        ChatConversation
    {
        const last =
            this.pick(x, 'lastMessage');

        return {
            id:String(this.pick(x, 'id') ?? ''),
            kind:this.pick(x, 'kind') === 'Group' ? 'Group' : 'Direct',
            title:String(this.pick(x, 'title') ?? ''),
            photoPath:String(this.pick(x, 'photoPath') ?? ''),
            otherUserId:Number(this.pick(x, 'otherUserId') ?? 0),
            isOwner:!!this.pick(x, 'isOwner'),
            isMember:this.pick(x, 'isMember') !== false,
            members:((this.pick(x, 'members') ?? []) as any[]).map(m => this.toUser(m)),
            lastMessage:last ? this.toMessage(last) : null,
            unread:Number(this.pick(x, 'unread') ?? 0),
            myLastRead:Number(this.pick(x, 'myLastRead') ?? 0),
            otherLastRead:Number(this.pick(x, 'otherLastRead') ?? 0),
            lastMessageDate:this.pick(x, 'lastMessageDate') ?? null
        };
    }
}
