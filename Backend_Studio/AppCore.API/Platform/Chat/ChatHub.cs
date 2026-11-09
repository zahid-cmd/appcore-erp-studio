//===============================================================
// Team Chat : live connection (SignalR, 2026-11-10)
// --------------------------------------------------------------
// /hubs/chat (login required; the token comes in the query string
// as access_token, see Program.cs). Each user joins the group
// "u:<user id>" : the server sends a user everything for them
// there (new message, read, typing, presence, conversation).
//
// Server -> client events :
//   chatMessage         { conversationId, message }
//   chatMessageDeleted  { conversationId, messageId }
//   chatConversation    { conversation }   (new / changed / left)
//   chatRead            { conversationId, userId, lastReadMessageId }
//   chatTyping          { conversationId, userId, name }
//   chatPresence        { userId, online }
//===============================================================

using System.Collections.Concurrent;

using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

using AppCore.Api.Extensions;
using AppCore.Domain.Platform.Chat;
using AppCore.Infrastructure.Persistence;

namespace AppCore.Api.Platform.Chat;


public class ChatHub : Hub
{
    private readonly ChatPresence _presence;

    private readonly AppDbContext _context;

    public ChatHub
    (
        ChatPresence presence,
        AppDbContext context
    )
    {
        _presence = presence;
        _context = context;
    }

    public static string UserGroup(long userId)
    {
        return $"u:{userId}";
    }

    public override async Task OnConnectedAsync()
    {
        long userId =
            Context.User.GetUserId();

        if (userId > 0)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));

            if (_presence.Connect(userId))
            {
                await Clients.All.SendAsync("chatPresence", new { userId, online = true });
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        long userId =
            Context.User.GetUserId();

        if (userId > 0 && _presence.Disconnect(userId))
        {
            await Clients.All.SendAsync("chatPresence", new { userId, online = false });
        }

        await base.OnDisconnectedAsync(exception);
    }

    // The user is typing in a conversation : the other members see it
    public async Task Typing(Guid conversationId)
    {
        long userId =
            Context.User.GetUserId();

        if (userId <= 0)
        {
            return;
        }

        long? id =
            await _context.Set<ChatConversation>()
                .AsNoTracking()
                .Where(x => x.PublicId == conversationId && !x.IsDeleted)
                .Select(x => (long?)x.ChatConversationId)
                .FirstOrDefaultAsync();

        if (id is null)
        {
            return;
        }

        List<long> members =
            await _context.Set<ChatMember>()
                .AsNoTracking()
                .Where(x => x.ChatConversationId == id.Value && x.LeftDate == null)
                .Select(x => x.UserProfileId)
                .ToListAsync();

        if (!members.Contains(userId))
        {
            return;
        }

        string name =
            Context.User.GetPerformedByName();

        foreach (long member in members.Where(x => x != userId))
        {
            await Clients.Group(UserGroup(member))
                .SendAsync("chatTyping", new { conversationId, userId, name });
        }
    }
}


//===============================================================
// Who is online (connections per user, this API process)
//===============================================================

public class ChatPresence
{
    private readonly ConcurrentDictionary<long, int> _connections =
        new();

    // true = the user just came online
    public bool Connect(long userId)
    {
        return _connections.AddOrUpdate(userId, 1, (_, n) => n + 1) == 1;
    }

    // true = the user just went offline
    public bool Disconnect(long userId)
    {
        int left =
            _connections.AddOrUpdate(userId, 0, (_, n) => Math.Max(0, n - 1));

        if (left == 0)
        {
            _connections.TryRemove(new KeyValuePair<long, int>(userId, 0));

            return true;
        }

        return false;
    }

    public bool IsOnline(long userId)
    {
        return _connections.TryGetValue(userId, out int n) && n > 0;
    }
}
