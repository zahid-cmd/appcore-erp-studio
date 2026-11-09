//===============================================================
// Chat Panel (2026-11-10)
// --------------------------------------------------------------
// The "Chat" side of the topbar Messages pop-up : conversations
// on the left, the open conversation on the right (one column on
// a narrow screen). Direct chats and groups between the active
// users of this company; text and pictures. Live by ChatService.
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
    computed,
    effect,
    inject,
    signal
}
from '@angular/core';

import
{
    ChatConversation,
    ChatMessage,
    ChatService,
    ChatUser
}
from '../../../../core/chat/chat.service';


type ChatView =
    'list' | 'newChat' | 'newGroup' | 'editGroup';


@Component(
{
    selector:'app-chat-panel',

    standalone:true,

    templateUrl:'./chat-panel.html',

    styleUrl:'./chat-panel.css'
})
export class ChatPanelComponent implements OnInit
{
    readonly chat =
        inject(ChatService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    // Zoneless : draw after an answer from the server
    private redraw():
        void
    {
        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch
        {
            // closed meanwhile
        }
    }

    @ViewChild('scroller')
    scroller?:
        ElementRef<HTMLElement>;

    // Left side : the list, or picking people for a new chat / group
    readonly view =
        signal<ChatView>('list');

    readonly search =
        signal('');

    // The conversation open on the right
    readonly openId =
        this.chat.openId;

    readonly open =
        computed(() => this.chat.conversations().find(x => x.id === this.openId()) ?? null);

    readonly openMessages =
        computed(() => this.chat.messages()[this.openId() ?? ''] ?? []);

    readonly typingText =
        computed(() =>
        {
            const names = this.chat.typing()[this.openId() ?? ''] ?? [];

            return names.length === 0
                ? ''
                : names.length === 1
                    ? `${names[0]} is typing...`
                    : `${names.length} people are typing...`;
        });

    readonly filteredConversations =
        computed(() =>
        {
            const q = this.search().trim().toLowerCase();

            return this.chat.conversations()
                .filter(x => !q || x.title.toLowerCase().includes(q));
        });

    readonly filteredUsers =
        computed(() =>
        {
            const q = this.search().trim().toLowerCase();

            const online = this.chat.online();

            return this.chat.users()
                .filter(x => !q || x.name.toLowerCase().includes(q))
                .map(x => ({ ...x, online:online.has(x.userId) }))
                .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
        });

    // Composer
    text =
        '';

    image =
        '';

    sending =
        false;

    error =
        '';

    loadingMessages =
        false;

    // New / edit group
    groupTitle =
        '';

    readonly groupMembers =
        signal<Set<number>>(new Set());

    saving =
        false;

    constructor()
    {
        // new messages in the open conversation : keep the view at
        // the bottom when it was already there
        effect(() =>
        {
            const count = this.openMessages().length;

            if (count > 0)
            {
                this.scrollDownSoon();
            }
        });
    }

    ngOnInit():
        void
    {
        void this.chat.start();

        this.chat.loadConversations().subscribe({ error:() => {} });

        this.chat.loadUsers().subscribe({ error:() => {} });

        const id = this.openId();

        if (id)
        {
            this.openConversation(id);
        }
    }


    //===========================================================
    // Conversations
    //===========================================================

    openConversation
    (
        id:string
    ):
        void
    {
        this.chat.openId.set(id);

        this.view.set('list');

        this.error = '';

        this.text = '';

        this.image = '';

        this.loadingMessages = !this.chat.messages()[id];

        this.chat.loadMessages(id).subscribe(
        {
            next:() =>
            {
                this.loadingMessages = false;

                this.chat.markRead(id);

                this.redraw();

                this.scrollDownSoon(true);
            },
            error:() =>
            {
                this.loadingMessages = false;

                this.error = 'The messages could not be loaded.';

                this.redraw();
            }
        });
    }

    back():
        void
    {
        this.chat.openId.set(null);

        this.view.set('list');
    }

    loadOlder():
        void
    {
        const id = this.openId();

        const box = this.scroller?.nativeElement;

        if (!id || !box)
        {
            return;
        }

        const before = box.scrollHeight;

        this.chat.loadOlder(id).subscribe(() =>
        {
            // keep the same message under the eye
            requestAnimationFrame(() => box.scrollTop = box.scrollHeight - before);
        });
    }

    startNewChat():
        void
    {
        this.search.set('');

        this.view.set('newChat');

        this.chat.loadUsers().subscribe({ error:() => {} });
    }

    chatWith
    (
        user:ChatUser
    ):
        void
    {
        this.chat.openDirect(user.userId).subscribe(
        {
            next:x =>
            {
                this.search.set('');

                this.openConversation(x.id);
            },
            error:e => { this.error = this.errorText(e, 'The chat could not be opened.'); this.redraw(); }
        });
    }

    startNewGroup():
        void
    {
        this.search.set('');

        this.groupTitle = '';

        this.groupMembers.set(new Set());

        this.view.set('newGroup');

        this.chat.loadUsers().subscribe({ error:() => {} });
    }

    editGroup():
        void
    {
        const c = this.open();

        if (!c)
        {
            return;
        }

        this.search.set('');

        this.groupTitle = c.title;

        this.groupMembers.set(new Set(c.members.map(x => x.userId).filter(x => x !== this.chat.myId)));

        this.view.set('editGroup');

        this.chat.loadUsers().subscribe({ error:() => {} });
    }

    toggleMember
    (
        userId:number
    ):
        void
    {
        this.groupMembers.update(set =>
        {
            const next = new Set(set);

            if (next.has(userId)) { next.delete(userId); } else { next.add(userId); }

            return next;
        });
    }

    saveGroup():
        void
    {
        const title = this.groupTitle.trim();

        const members = Array.from(this.groupMembers());

        if (title.length < 2)
        {
            this.error = 'Give the group a name.';

            return;
        }

        if (members.length === 0)
        {
            this.error = 'Add at least one member.';

            return;
        }

        this.saving = true;

        this.error = '';

        const editing = this.view() === 'editGroup' ? this.open() : null;

        const request =
            editing
                ? this.chat.updateGroup(editing.id, title, members)
                : this.chat.createGroup(title, members);

        request.subscribe(
        {
            next:x =>
            {
                this.saving = false;

                this.openConversation(x.id);
            },
            error:e =>
            {
                this.saving = false;

                this.error = this.errorText(e, 'The group could not be saved.');

                this.redraw();
            }
        });
    }

    leaveGroup():
        void
    {
        const c = this.open();

        if (!c || !confirmLeave(c.title))
        {
            return;
        }

        this.chat.leaveGroup(c.id).subscribe(
        {
            next:() => this.back(),
            error:e => { this.error = this.errorText(e, 'Could not leave the group.'); this.redraw(); }
        });
    }


    //===========================================================
    // Composer
    //===========================================================

    onKey
    (
        event:KeyboardEvent
    ):
        void
    {
        // Enter sends; Shift + Enter = new line
        if (event.key === 'Enter' && !event.shiftKey)
        {
            event.preventDefault();

            this.send();

            return;
        }

        const id = this.openId();

        if (id)
        {
            this.chat.sendTyping(id);
        }
    }

    send():
        void
    {
        const id = this.openId();

        const text = this.text.trim();

        if (!id || this.sending || (!text && !this.image))
        {
            return;
        }

        if (!this.isEnglish(text))
        {
            this.error = 'Use English letters only (no Bangla, emoji or special symbols).';

            return;
        }

        this.sending = true;

        this.error = '';

        this.chat.send(id, text, this.image).subscribe(
        {
            next:() =>
            {
                this.sending = false;

                this.text = '';

                this.image = '';

                this.redraw();

                this.scrollDownSoon(true);
            },
            error:e =>
            {
                this.sending = false;

                this.error = this.errorText(e, 'The message was not sent.');

                this.redraw();
            }
        });
    }

    deleteMessage
    (
        message:ChatMessage
    ):
        void
    {
        const id = this.openId();

        if (!id || !window.confirm('Delete this message for everyone?'))
        {
            return;
        }

        this.chat.deleteMessage(id, message.id).subscribe({ error:() => { this.error = 'The message could not be deleted.'; this.redraw(); } });
    }

    onPaste
    (
        event:ClipboardEvent
    ):
        void
    {
        const file =
            Array.from(event.clipboardData?.items ?? [])
                .find(x => x.type.startsWith('image/'))
                ?.getAsFile();

        if (file)
        {
            event.preventDefault();

            this.readImage(file);
        }
    }

    onFile
    (
        event:Event
    ):
        void
    {
        const input = event.target as HTMLInputElement;

        const file = input.files?.[0];

        if (file)
        {
            this.readImage(file);
        }

        input.value = '';
    }

    // max 1600 px wide, JPEG : small enough to send quickly
    private readImage
    (
        file:File
    ):
        void
    {
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type))
        {
            this.error = 'Send a JPG, PNG or WEBP picture.';

            return;
        }

        const reader = new FileReader();

        reader.onload = () =>
        {
            const picture = new Image();

            picture.onload = () =>
            {
                const scale = Math.min(1, 1600 / picture.width);

                const canvas = document.createElement('canvas');

                canvas.width = Math.round(picture.width * scale);

                canvas.height = Math.round(picture.height * scale);

                canvas.getContext('2d')?.drawImage(picture, 0, 0, canvas.width, canvas.height);

                this.image = canvas.toDataURL('image/jpeg', 0.82);

                this.error = '';

                this.redraw();
            };

            picture.src = String(reader.result ?? '');
        };

        reader.readAsDataURL(file);
    }


    //===========================================================
    // Display helpers
    //===========================================================

    isMine
    (
        message:ChatMessage
    ):
        boolean
    {
        return message.senderId === this.chat.myId;
    }

    isOnline
    (
        userId:number
    ):
        boolean
    {
        return this.chat.online().has(userId);
    }

    initials
    (
        name:string
    ):
        string
    {
        return name
            .split(/\s+/)
            .filter(x => !!x && /[A-Za-z0-9]/.test(x[0]))
            .slice(0, 2)
            .map(x => x[0].toUpperCase())
            .join('') || '?';
    }

    // A new day starts with this message (a date line above it)
    newDay
    (
        index:number
    ):
        boolean
    {
        const list = this.openMessages();

        return index === 0
            || new Date(list[index].createdDate).toDateString() !== new Date(list[index - 1].createdDate).toDateString();
    }

    // Group : the sender's name over the first of their run
    showSender
    (
        index:number
    ):
        boolean
    {
        const list = this.openMessages();

        const message = list[index];

        return this.open()?.kind === 'Group'
            && !this.isMine(message)
            && (index === 0 || list[index - 1].senderId !== message.senderId || this.newDay(index));
    }

    // Direct : "Seen" under my last message the other has read
    seen
    (
        message:ChatMessage
    ):
        boolean
    {
        const c = this.open();

        if (!c || c.kind !== 'Direct' || !this.isMine(message) || c.otherLastRead < message.id)
        {
            return false;
        }

        const mine = this.openMessages().filter(x => this.isMine(x) && x.id <= c.otherLastRead);

        return mine.length > 0 && mine[mine.length - 1].id === message.id;
    }

    dayText
    (
        value:string
    ):
        string
    {
        const date = new Date(value);

        const today = new Date();

        const yesterday = new Date(today.getTime() - 86400000);

        if (date.toDateString() === today.toDateString())
        {
            return 'Today';
        }

        if (date.toDateString() === yesterday.toDateString())
        {
            return 'Yesterday';
        }

        return date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    }

    timeText
    (
        value:string
    ):
        string
    {
        return new Date(value).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    }

    // Conversation list : time today, else the date
    whenText
    (
        value:string | null
    ):
        string
    {
        if (!value)
        {
            return '';
        }

        const date = new Date(value);

        return date.toDateString() === new Date().toDateString()
            ? this.timeText(value)
            : date.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
    }

    preview
    (
        c:ChatConversation
    ):
        string
    {
        const m = c.lastMessage;

        if (!m)
        {
            return c.kind === 'Group' ? `${c.members.length} members` : 'Say hello';
        }

        const who =
            this.isMine(m) ? 'You: ' : (c.kind === 'Group' ? `${m.senderName.split(' ')[0]}: ` : '');

        return who + (m.isDeleted ? 'Message deleted' : (m.body || 'Picture'));
    }

    memberText
    (
        c:ChatConversation
    ):
        string
    {
        if (c.kind === 'Direct')
        {
            return this.isOnline(c.otherUserId) ? 'Online' : 'Offline';
        }

        const online = c.members.filter(x => this.isOnline(x.userId)).length;

        return `${c.members.length} members${online ? ` · ${online} online` : ''}`;
    }

    imageUrl
    (
        path:string
    ):
        string
    {
        return this.chat.imageUrl(path);
    }

    private scrollDownSoon
    (
        force = false
    ):
        void
    {
        const box = this.scroller?.nativeElement;

        const nearBottom = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 140;

        if (!force && !nearBottom)
        {
            return;
        }

        requestAnimationFrame(() =>
        {
            const el = this.scroller?.nativeElement;

            if (el)
            {
                el.scrollTop = el.scrollHeight;
            }
        });
    }

    private isEnglish
    (
        text:string
    ):
        boolean
    {
        return /^[\t\n\r\x20-\x7E -ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]*$/.test(text);
    }

    private errorText
    (
        e:any,
        fallback:string
    ):
        string
    {
        return e?.error?.message || e?.error?.Message || fallback;
    }
}


function confirmLeave
(
    title:string
):
    boolean
{
    return window.confirm(`Leave the group "${title}"? You will not get its new messages.`);
}
