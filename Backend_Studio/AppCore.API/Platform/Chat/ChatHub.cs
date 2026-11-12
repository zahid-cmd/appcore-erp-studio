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
using AppCore.Application.Platform.Tenancy;
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

    // Tenancy : user ids repeat across companies, so every group
    // carries the company ("MOTOZONE:u:5"); Mode Off : "u:5"
    public static string UserGroup(string? company, long userId)
    {
        return string.IsNullOrEmpty(company)
            ? $"u:{userId}"
            : $"{company}:u:{userId}";
    }

    private static string CompanyGroup(string company)
    {
        return $"{company}:all";
    }

    // The connection's own web request went through the tenant
    // middleware : its ITenantContext knows the company. The hub's
    // own scope does not, so the database and the company come
    // from that request.
    private ITenantContext? RequestTenant =>
        Context.GetHttpContext()?.RequestServices.GetService<ITenantContext>();

    private string? Company => RequestTenant?.Tenant?.TenantCode;

    private AppDbContext? Db =>
        RequestTenant is { Enabled: true } t
            ? (t.Tenant is null ? null : Context.GetHttpContext()!.RequestServices.GetRequiredService<AppDbContext>())
            : _context;

    // presence goes to the company only (Mode Off : everybody)
    private IClientProxy PresenceTarget(string? company) =>
        string.IsNullOrEmpty(company) ? Clients.All : Clients.Group(CompanyGroup(company));

    public override async Task OnConnectedAsync()
    {
        long userId =
            Context.User.GetUserId();

        string? company = Company;

        if (userId > 0)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(company, userId));

            if (!string.IsNullOrEmpty(company))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, CompanyGroup(company));
            }

            if (_presence.Connect(company, userId))
            {
                await PresenceTarget(company).SendAsync("chatPresence", new { userId, online = true });
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        long userId =
            Context.User.GetUserId();

        string? company = Company;

        if (userId > 0 && _presence.Disconnect(company, userId))
        {
            await PresenceTarget(company).SendAsync("chatPresence", new { userId, online = false });
        }

        await base.OnDisconnectedAsync(exception);
    }

    // The user is typing in a conversation : the other members see it
    public async Task Typing(Guid conversationId)
    {
        long userId =
            Context.User.GetUserId();

        AppDbContext? db = Db;

        if (userId <= 0 || db is null)
        {
            return;
        }

        string? company = Company;

        long? id =
            await db.Set<ChatConversation>()
                .AsNoTracking()
                .Where(x => x.PublicId == conversationId && !x.IsDeleted)
                .Select(x => (long?)x.ChatConversationId)
                .FirstOrDefaultAsync();

        if (id is null)
        {
            return;
        }

        List<long> members =
            await db.Set<ChatMember>()
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
            await Clients.Group(UserGroup(company, member))
                .SendAsync("chatTyping", new { conversationId, userId, name });
        }
    }
}


//===============================================================
// Who is online (connections per user, this API process)
//===============================================================

public class ChatPresence
{
    // key "COMPANY|userId" (Mode Off : "|userId")
    private readonly ConcurrentDictionary<string, int> _connections =
        new();

    private static string Key(string? company, long userId) =>
        $"{company}|{userId}";

    // true = the user just came online
    public bool Connect(string? company, long userId)
    {
        return _connections.AddOrUpdate(Key(company, userId), 1, (_, n) => n + 1) == 1;
    }

    // true = the user just went offline
    public bool Disconnect(string? company, long userId)
    {
        string key = Key(company, userId);

        int left =
            _connections.AddOrUpdate(key, 0, (_, n) => Math.Max(0, n - 1));

        if (left == 0)
        {
            _connections.TryRemove(new KeyValuePair<string, int>(key, 0));

            return true;
        }

        return false;
    }

    public bool IsOnline(string? company, long userId)
    {
        return _connections.TryGetValue(Key(company, userId), out int n) && n > 0;
    }
}
