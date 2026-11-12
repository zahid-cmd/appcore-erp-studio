//===============================================================
// Team Chat : conversations and messages (2026-11-10)
// --------------------------------------------------------------
// api/platform/chat - every signed-in active user of this company
// (this database). A conversation is read only by its members;
// there is no developer / admin view of chats (developers only get
// Feedback). Live delivery : ChatHub (/hubs/chat).
//
//   GET    users                         colleagues (+ online)
//   GET    conversations                 mine, newest first, unread
//   GET    unread                        total unread messages
//   POST   direct                        { userId } : open / make
//   POST   groups                        { title, memberIds }
//   PUT    groups/{id}                   { title, memberIds } owner
//   POST   groups/{id}/leave
//   GET    conversations/{id}/messages   ?beforeId=&take=
//   POST   conversations/{id}/messages   { text, imageData }
//   POST   conversations/{id}/read       { lastMessageId }
//   DELETE messages/{messageId}          own message
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.CurrentUser;
using AppCore.Application.Platform.Tenancy;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Platform.Chat;
using AppCore.Infrastructure.Persistence;
using AppCore.Api.Platform.Tenancy;

namespace AppCore.Api.Platform.Chat;


public class ChatUserDto
{
    public long UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string PhotoPath { get; set; } = string.Empty;

    public bool Online { get; set; }
}

public class ChatMessageDto
{
    public long Id { get; set; }

    public long SenderId { get; set; }

    public string SenderName { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public string ImagePath { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public bool IsDeleted { get; set; }
}

public class ChatConversationDto
{
    public Guid Id { get; set; }

    // Direct / Group
    public string Kind { get; set; } = "Direct";

    // Group name, or the other user's name for a direct chat
    public string Title { get; set; } = string.Empty;

    public string PhotoPath { get; set; } = string.Empty;

    // Direct : the other user (0 for a group)
    public long OtherUserId { get; set; }

    public bool IsOwner { get; set; }

    // false = I left / was removed (read only, no new messages)
    public bool IsMember { get; set; } = true;

    public List<ChatUserDto> Members { get; set; } = new();

    public ChatMessageDto? LastMessage { get; set; }

    public int Unread { get; set; }

    public long MyLastRead { get; set; }

    // Direct : the other user's last read message ("Seen")
    public long OtherLastRead { get; set; }

    public DateTime? LastMessageDate { get; set; }
}

public class OpenDirectDto
{
    public long UserId { get; set; }
}

public class SaveGroupDto
{
    public string Title { get; set; } = string.Empty;

    public List<long> MemberIds { get; set; } = new();
}

public class SendChatMessageDto
{
    public string Text { get; set; } = string.Empty;

    // data URL of a picture ('' = none)
    public string ImageData { get; set; } = string.Empty;
}

public class ReadChatDto
{
    public long LastMessageId { get; set; }
}


[ApiController]
[Route("api/platform/chat")]
public class ChatController : ControllerBase
{
    private const int MaxPhotoBytes = 3 * 1024 * 1024;

    private const int MaxBody = 2000;

    private readonly AppDbContext _context;

    private readonly ICurrentUserService _currentUser;

    private readonly IWebHostEnvironment _environment;

    private readonly IHubContext<ChatHub> _hub;

    private readonly ChatPresence _presence;

    // Tenancy : user ids repeat across companies, so groups and
    // "who is online" are kept per company
    private readonly ITenantContext _tenant;

    public ChatController
    (
        AppDbContext context,
        ICurrentUserService currentUser,
        IWebHostEnvironment environment,
        IHubContext<ChatHub> hub,
        ChatPresence presence,
        ITenantContext tenant
    )
    {
        _tenant = tenant;
        _context = context;
        _currentUser = currentUser;
        _environment = environment;
        _hub = hub;
        _presence = presence;
    }

    private long Me => _currentUser.UserId;

    private string? Company => _tenant.Tenant?.TenantCode;


    //===========================================================
    // Colleagues : the active users of this company
    //===========================================================

    [HttpGet("users")]
    public async Task<IActionResult> Users()
    {
        List<ChatUserDto> users =
            (await ActiveUsers().ToListAsync())
                .Where(x => x.UserId != Me)
                .Select(x => { x.Online = _presence.IsOnline(Company, x.UserId); return x; })
                .OrderByDescending(x => x.Online)
                .ThenBy(x => x.Name)
                .ToList();

        return Ok(users);
    }


    //===========================================================
    // My conversations
    //===========================================================

    [HttpGet("conversations")]
    public async Task<IActionResult> Conversations()
    {
        List<long> ids =
            await _context.Set<ChatMember>()
                .AsNoTracking()
                .Where(x => x.UserProfileId == Me)
                .Select(x => x.ChatConversationId)
                .ToListAsync();

        List<ChatConversationDto> list =
            await BuildAsync(ids);

        return Ok(list
            .Where(x => x.Kind == "Group" || x.LastMessage != null || x.Unread > 0)
            .OrderByDescending(x => x.LastMessageDate ?? DateTime.MinValue));
    }

    [HttpGet("unread")]
    public async Task<IActionResult> Unread()
    {
        int unread =
            await (
                from m in _context.Set<ChatMember>().AsNoTracking()
                where m.UserProfileId == Me && m.LeftDate == null
                join c in _context.Set<ChatConversation>().AsNoTracking()
                    on m.ChatConversationId equals c.ChatConversationId
                where !c.IsDeleted
                from msg in _context.Set<ChatMessage>().AsNoTracking()
                where msg.ChatConversationId == m.ChatConversationId
                      && msg.ChatMessageId > m.LastReadMessageId
                      && msg.SenderId != Me
                      && !msg.IsDeleted
                select msg.ChatMessageId
            ).CountAsync();

        return Ok(new { unread });
    }


    //===========================================================
    // Open a direct chat (one per pair of users)
    //===========================================================

    [HttpPost("direct")]
    public async Task<IActionResult> OpenDirect([FromBody] OpenDirectDto dto)
    {
        long other =
            dto?.UserId ?? 0;

        if (other <= 0 || other == Me || !await IsActiveUserAsync(other))
        {
            return BadRequest(new { message = "Choose an active user to chat with." });
        }

        string key =
            $"D:{Math.Min(Me, other)}:{Math.Max(Me, other)}";

        ChatConversation? conversation =
            await _context.Set<ChatConversation>()
                .FirstOrDefaultAsync(x => x.DirectKey == key);

        if (conversation is null)
        {
            DateTime now =
                DateTime.UtcNow;

            conversation =
                new ChatConversation
                {
                    Kind = "Direct",
                    DirectKey = key,
                    CreatedBy = Me,
                    CreatedDate = now
                };

            _context.Set<ChatConversation>().Add(conversation);

            await _context.SaveChangesAsync();

            _context.Set<ChatMember>().AddRange(
                new ChatMember { ChatConversationId = conversation.ChatConversationId, UserProfileId = Me, JoinedDate = now },
                new ChatMember { ChatConversationId = conversation.ChatConversationId, UserProfileId = other, JoinedDate = now });

            await _context.SaveChangesAsync();
        }

        return Ok((await BuildAsync(new List<long> { conversation.ChatConversationId })).First());
    }


    //===========================================================
    // Groups
    //===========================================================

    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] SaveGroupDto dto)
    {
        string title =
            Clean(dto?.Title, 100);

        if (title.Length < 2)
        {
            return BadRequest(new { message = "Give the group a name." });
        }

        List<long> members =
            await ValidMembersAsync(dto!.MemberIds);

        if (members.Count == 0)
        {
            return BadRequest(new { message = "Add at least one member." });
        }

        DateTime now =
            DateTime.UtcNow;

        var conversation =
            new ChatConversation
            {
                Kind = "Group",
                Title = title,
                CreatedBy = Me,
                CreatedDate = now,
                LastMessageDate = now
            };

        _context.Set<ChatConversation>().Add(conversation);

        await _context.SaveChangesAsync();

        _context.Set<ChatMember>().Add(
            new ChatMember { ChatConversationId = conversation.ChatConversationId, UserProfileId = Me, IsOwner = true, JoinedDate = now });

        foreach (long member in members)
        {
            _context.Set<ChatMember>().Add(
                new ChatMember { ChatConversationId = conversation.ChatConversationId, UserProfileId = member, JoinedDate = now });
        }

        await _context.SaveChangesAsync();

        await PushConversationAsync(conversation.ChatConversationId, members.Append(Me));

        return Ok((await BuildAsync(new List<long> { conversation.ChatConversationId })).First());
    }

    [HttpPut("groups/{id:guid}")]
    public async Task<IActionResult> UpdateGroup(Guid id, [FromBody] SaveGroupDto dto)
    {
        ChatConversation? conversation =
            await _context.Set<ChatConversation>()
                .FirstOrDefaultAsync(x => x.PublicId == id && x.Kind == "Group" && !x.IsDeleted);

        if (conversation is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        List<ChatMember> rows =
            await _context.Set<ChatMember>()
                .Where(x => x.ChatConversationId == conversation.ChatConversationId)
                .ToListAsync();

        if (!rows.Any(x => x.UserProfileId == Me && x.IsOwner && x.LeftDate == null))
        {
            return StatusCode(403, new { message = "Only the group's owner can change it." });
        }

        string title =
            Clean(dto?.Title, 100);

        if (title.Length < 2)
        {
            return BadRequest(new { message = "Give the group a name." });
        }

        List<long> wanted =
            await ValidMembersAsync(dto!.MemberIds);

        DateTime now =
            DateTime.UtcNow;

        conversation.Title = title;

        // Everyone who was or is in it hears about the change
        HashSet<long> notify =
            rows.Where(x => x.LeftDate == null).Select(x => x.UserProfileId).ToHashSet();

        foreach (ChatMember row in rows.Where(x => x.UserProfileId != Me))
        {
            bool keep =
                wanted.Contains(row.UserProfileId);

            if (keep && row.LeftDate != null)
            {
                row.LeftDate = null;
                row.JoinedDate = now;
            }
            else if (!keep && row.LeftDate == null)
            {
                row.LeftDate = now;
            }
        }

        foreach (long member in wanted.Where(x => rows.All(r => r.UserProfileId != x)))
        {
            _context.Set<ChatMember>().Add(
                new ChatMember { ChatConversationId = conversation.ChatConversationId, UserProfileId = member, JoinedDate = now });
        }

        await _context.SaveChangesAsync();

        notify.UnionWith(wanted);

        await PushConversationAsync(conversation.ChatConversationId, notify);

        return Ok((await BuildAsync(new List<long> { conversation.ChatConversationId })).First());
    }

    [HttpPost("groups/{id:guid}/leave")]
    public async Task<IActionResult> LeaveGroup(Guid id)
    {
        ChatConversation? conversation =
            await _context.Set<ChatConversation>()
                .FirstOrDefaultAsync(x => x.PublicId == id && x.Kind == "Group" && !x.IsDeleted);

        if (conversation is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        List<ChatMember> rows =
            await _context.Set<ChatMember>()
                .Where(x => x.ChatConversationId == conversation.ChatConversationId && x.LeftDate == null)
                .ToListAsync();

        ChatMember? mine =
            rows.FirstOrDefault(x => x.UserProfileId == Me);

        if (mine is null)
        {
            return Ok();
        }

        mine.LeftDate = DateTime.UtcNow;

        // The owner leaves : the longest member takes over
        if (mine.IsOwner)
        {
            mine.IsOwner = false;

            ChatMember? next =
                rows.Where(x => x.UserProfileId != Me).OrderBy(x => x.JoinedDate).FirstOrDefault();

            if (next is not null)
            {
                next.IsOwner = true;
            }
        }

        await _context.SaveChangesAsync();

        await PushConversationAsync(conversation.ChatConversationId, rows.Select(x => x.UserProfileId));

        return Ok();
    }


    //===========================================================
    // Messages
    //===========================================================

    [HttpGet("conversations/{id:guid}/messages")]
    public async Task<IActionResult> Messages(Guid id, [FromQuery] long? beforeId, [FromQuery] int take = 50)
    {
        (ChatConversation? conversation, ChatMember? member) =
            await FindMineAsync(id);

        if (conversation is null || member is null)
        {
            return NotFound(new { message = "Conversation not found." });
        }

        take =
            Math.Clamp(take, 1, 100);

        IQueryable<ChatMessage> query =
            _context.Set<ChatMessage>()
                .AsNoTracking()
                .Where(x => x.ChatConversationId == conversation.ChatConversationId);

        // Removed from a group : what was said while in it
        if (member.LeftDate != null)
        {
            DateTime left =
                member.LeftDate.Value;

            query = query.Where(x => x.CreatedDate <= left);
        }

        if (beforeId is > 0)
        {
            query = query.Where(x => x.ChatMessageId < beforeId.Value);
        }

        List<ChatMessage> rows =
            await query
                .OrderByDescending(x => x.ChatMessageId)
                .Take(take)
                .ToListAsync();

        Dictionary<long, string> names =
            await NamesAsync(rows.Select(x => x.SenderId));

        return Ok(rows
            .OrderBy(x => x.ChatMessageId)
            .Select(x => ToDto(x, names)));
    }

    [HttpPost("conversations/{id:guid}/messages")]
    public async Task<IActionResult> Send(Guid id, [FromBody] SendChatMessageDto dto)
    {
        (ChatConversation? conversation, ChatMember? member) =
            await FindMineAsync(id);

        if (conversation is null || member is null || member.LeftDate != null)
        {
            return NotFound(new { message = "You are not in this conversation." });
        }

        string text =
            (dto?.Text ?? string.Empty).Trim();

        if (text.Length > MaxBody)
        {
            return BadRequest(new { message = $"The message is too long (max {MaxBody} letters)." });
        }

        if (!IsEnglish(text))
        {
            return BadRequest(new { message = "Use English letters only (no Bangla, emoji or special symbols)." });
        }

        string image =
            string.Empty;

        if (!string.IsNullOrWhiteSpace(dto!.ImageData))
        {
            (string? path, string? error) =
                await SaveImageAsync(dto.ImageData);

            if (error is not null)
            {
                return BadRequest(new { message = error });
            }

            image = path ?? string.Empty;
        }

        if (text.Length == 0 && image.Length == 0)
        {
            return BadRequest(new { message = "Write a message or add a picture." });
        }

        DateTime now =
            DateTime.UtcNow;

        var message =
            new ChatMessage
            {
                ChatConversationId = conversation.ChatConversationId,
                SenderId = Me,
                Body = text,
                ImagePath = image,
                CreatedDate = now
            };

        _context.Set<ChatMessage>().Add(message);

        conversation.LastMessageDate = now;

        await _context.SaveChangesAsync();

        // The sender has read their own message
        member.LastReadMessageId = message.ChatMessageId;

        await _context.SaveChangesAsync();

        ChatMessageDto result =
            ToDto(message, new Dictionary<long, string> { [Me] = _currentUser.PerformedByName });

        List<long> members =
            await MemberIdsAsync(conversation.ChatConversationId);

        // A direct chat shows up for the other user with its first
        // message; everybody gets the message itself
        foreach (long userId in members)
        {
            await _hub.Clients.Group(ChatHub.UserGroup(Company, userId))
                .SendAsync("chatMessage", new { conversationId = conversation.PublicId, message = result });
        }

        return Ok(result);
    }

    [HttpPost("conversations/{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, [FromBody] ReadChatDto dto)
    {
        (ChatConversation? conversation, ChatMember? member) =
            await FindMineAsync(id);

        if (conversation is null || member is null)
        {
            return NotFound(new { message = "Conversation not found." });
        }

        long last =
            dto?.LastMessageId ?? 0;

        if (last <= member.LastReadMessageId)
        {
            return Ok();
        }

        member.LastReadMessageId = last;

        await _context.SaveChangesAsync();

        foreach (long userId in await MemberIdsAsync(conversation.ChatConversationId))
        {
            await _hub.Clients.Group(ChatHub.UserGroup(Company, userId))
                .SendAsync("chatRead", new { conversationId = conversation.PublicId, userId = Me, lastReadMessageId = last });
        }

        return Ok();
    }

    [HttpDelete("messages/{messageId:long}")]
    public async Task<IActionResult> DeleteMessage(long messageId)
    {
        ChatMessage? message =
            await _context.Set<ChatMessage>()
                .FirstOrDefaultAsync(x => x.ChatMessageId == messageId && x.SenderId == Me && !x.IsDeleted);

        if (message is null)
        {
            return NotFound(new { message = "Message not found." });
        }

        message.IsDeleted = true;
        message.Body = string.Empty;
        message.ImagePath = string.Empty;

        await _context.SaveChangesAsync();

        Guid conversationId =
            await _context.Set<ChatConversation>()
                .Where(x => x.ChatConversationId == message.ChatConversationId)
                .Select(x => x.PublicId)
                .FirstAsync();

        foreach (long userId in await MemberIdsAsync(message.ChatConversationId))
        {
            await _hub.Clients.Group(ChatHub.UserGroup(Company, userId))
                .SendAsync("chatMessageDeleted", new { conversationId, messageId });
        }

        return Ok();
    }


    //===========================================================
    // Helpers
    //===========================================================

    private IQueryable<ChatUserDto> ActiveUsers()
    {
        return _context.Set<UserProfile>()
            .AsNoTracking()
            .Where(x => x.IsActive && !x.IsDeleted)
            .Select(x => new ChatUserDto
            {
                UserId = x.UserProfileId,
                Name = x.FullName != "" ? x.FullName : (x.DisplayName != "" ? x.DisplayName : x.UserName),
                PhotoPath = x.UserPhotoPath ?? ""
            });
    }

    private async Task<bool> IsActiveUserAsync(long userId)
    {
        return await _context.Set<UserProfile>()
            .AnyAsync(x => x.UserProfileId == userId && x.IsActive && !x.IsDeleted);
    }

    private async Task<List<long>> ValidMembersAsync(IEnumerable<long>? ids)
    {
        List<long> wanted =
            (ids ?? Enumerable.Empty<long>()).Where(x => x > 0 && x != Me).Distinct().ToList();

        return await _context.Set<UserProfile>()
            .AsNoTracking()
            .Where(x => wanted.Contains(x.UserProfileId) && x.IsActive && !x.IsDeleted)
            .Select(x => x.UserProfileId)
            .ToListAsync();
    }

    private async Task<Dictionary<long, string>> NamesAsync(IEnumerable<long> ids)
    {
        List<long> list =
            ids.Distinct().ToList();

        return await _context.Set<UserProfile>()
            .AsNoTracking()
            .Where(x => list.Contains(x.UserProfileId))
            .ToDictionaryAsync(
                x => x.UserProfileId,
                x => x.FullName != "" ? x.FullName : (x.DisplayName != "" ? x.DisplayName : x.UserName));
    }

    private async Task<(ChatConversation?, ChatMember?)> FindMineAsync(Guid id)
    {
        ChatConversation? conversation =
            await _context.Set<ChatConversation>()
                .FirstOrDefaultAsync(x => x.PublicId == id && !x.IsDeleted);

        if (conversation is null)
        {
            return (null, null);
        }

        ChatMember? member =
            await _context.Set<ChatMember>()
                .FirstOrDefaultAsync(x => x.ChatConversationId == conversation.ChatConversationId && x.UserProfileId == Me);

        return (conversation, member);
    }

    private async Task<List<long>> MemberIdsAsync(long conversationId)
    {
        return await _context.Set<ChatMember>()
            .AsNoTracking()
            .Where(x => x.ChatConversationId == conversationId && x.LeftDate == null)
            .Select(x => x.UserProfileId)
            .ToListAsync();
    }

    // Each user gets the conversation as they see it
    private async Task PushConversationAsync(long conversationId, IEnumerable<long> userIds)
    {
        foreach (long userId in userIds.Distinct())
        {
            ChatConversationDto? dto =
                (await BuildAsync(new List<long> { conversationId }, userId)).FirstOrDefault();

            if (dto is not null)
            {
                await _hub.Clients.Group(ChatHub.UserGroup(Company, userId))
                    .SendAsync("chatConversation", new { conversation = dto });
            }
        }
    }

    private async Task<List<ChatConversationDto>> BuildAsync(List<long> ids, long? forUser = null)
    {
        long me =
            forUser ?? Me;

        if (ids.Count == 0)
        {
            return new List<ChatConversationDto>();
        }

        List<ChatConversation> conversations =
            await _context.Set<ChatConversation>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ChatConversationId) && !x.IsDeleted)
                .ToListAsync();

        List<ChatMember> members =
            await _context.Set<ChatMember>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ChatConversationId))
                .ToListAsync();

        List<long> memberIds =
            members.Select(m => m.UserProfileId).Distinct().ToList();

        Dictionary<long, ChatUserDto> users =
            (await _context.Set<UserProfile>()
                .AsNoTracking()
                .Where(x => memberIds.Contains(x.UserProfileId))
                .Select(x => new ChatUserDto
                {
                    UserId = x.UserProfileId,
                    Name = x.FullName != "" ? x.FullName : (x.DisplayName != "" ? x.DisplayName : x.UserName),
                    PhotoPath = x.UserPhotoPath ?? ""
                })
                .ToListAsync())
            .ToDictionary(x => x.UserId);

        // Last message and unread per conversation
        var lastIds =
            await _context.Set<ChatMessage>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ChatConversationId))
                .GroupBy(x => x.ChatConversationId)
                .Select(g => new { ConversationId = g.Key, LastId = g.Max(x => x.ChatMessageId) })
                .ToListAsync();

        List<long> lastMessageIds =
            lastIds.Select(x => x.LastId).ToList();

        List<ChatMessage> lastMessages =
            await _context.Set<ChatMessage>()
                .AsNoTracking()
                .Where(x => lastMessageIds.Contains(x.ChatMessageId))
                .ToListAsync();

        Dictionary<long, string> names =
            users.ToDictionary(x => x.Key, x => x.Value.Name);

        var result =
            new List<ChatConversationDto>();

        foreach (ChatConversation c in conversations)
        {
            List<ChatMember> rows =
                members.Where(x => x.ChatConversationId == c.ChatConversationId).ToList();

            ChatMember? mine =
                rows.FirstOrDefault(x => x.UserProfileId == me);

            if (mine is null)
            {
                continue;
            }

            List<ChatMember> current =
                rows.Where(x => x.LeftDate == null).ToList();

            ChatMember? other =
                c.Kind == "Direct" ? rows.FirstOrDefault(x => x.UserProfileId != me) : null;

            ChatMessage? last =
                lastMessages.FirstOrDefault(x => x.ChatConversationId == c.ChatConversationId);

            if (last != null && mine.LeftDate != null && last.CreatedDate > mine.LeftDate)
            {
                last = null;
            }

            int unread =
                mine.LeftDate != null
                    ? 0
                    : await _context.Set<ChatMessage>()
                        .AsNoTracking()
                        .CountAsync(x => x.ChatConversationId == c.ChatConversationId
                                         && x.ChatMessageId > mine.LastReadMessageId
                                         && x.SenderId != me
                                         && !x.IsDeleted);

            ChatUserDto? otherUser =
                other != null && users.TryGetValue(other.UserProfileId, out ChatUserDto? u) ? u : null;

            result.Add(new ChatConversationDto
            {
                Id = c.PublicId,
                Kind = c.Kind,
                Title = c.Kind == "Direct" ? otherUser?.Name ?? "User" : c.Title,
                PhotoPath = c.Kind == "Direct" ? otherUser?.PhotoPath ?? "" : "",
                OtherUserId = other?.UserProfileId ?? 0,
                IsOwner = mine.IsOwner && mine.LeftDate == null,
                IsMember = mine.LeftDate == null,
                Members = current
                    .Select(x => users.TryGetValue(x.UserProfileId, out ChatUserDto? m)
                        ? new ChatUserDto { UserId = m.UserId, Name = m.Name, PhotoPath = m.PhotoPath, Online = _presence.IsOnline(Company, m.UserId) }
                        : new ChatUserDto { UserId = x.UserProfileId, Name = "User" })
                    .ToList(),
                LastMessage = last is null ? null : ToDto(last, names),
                Unread = unread,
                MyLastRead = mine.LastReadMessageId,
                OtherLastRead = other?.LastReadMessageId ?? 0,
                LastMessageDate = last?.CreatedDate ?? c.LastMessageDate ?? c.CreatedDate
            });
        }

        return result;
    }

    private static ChatMessageDto ToDto(ChatMessage x, Dictionary<long, string> names)
    {
        return new ChatMessageDto
        {
            Id = x.ChatMessageId,
            SenderId = x.SenderId,
            SenderName = names.TryGetValue(x.SenderId, out string? name) ? name : "User",
            Body = x.IsDeleted ? string.Empty : x.Body,
            ImagePath = x.IsDeleted ? string.Empty : x.ImagePath,
            CreatedDate = x.CreatedDate,
            IsDeleted = x.IsDeleted
        };
    }

    // Windows-1252 can hold it (same rule as AppDbContext)
    private static bool IsEnglish(string text)
    {
        const string extra = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

        return text.All(c =>
            c == '\t' || c == '\n' || c == '\r'
            || (c >= ' ' && c <= '~')
            || (c >= '\u00A0' && c <= '\u00FF')
            || extra.Contains(c));
    }

    private static string Clean(string? value, int max)
    {
        string text =
            new string((value ?? string.Empty)
                .Where(c => (c >= ' ' && c <= '~') || (c >= '\u00A0' && c <= '\u00FF'))
                .ToArray())
            .Trim();

        return text.Length > max ? text[..max] : text;
    }

    // wwwroot/uploads/chat (copied to every PC by the Uploads
    // Mirror); JPG / PNG / WEBP by the file's own bytes
    private async Task<(string? Path, string? Error)> SaveImageAsync(string data)
    {
        string base64 =
            data.Trim();

        int comma =
            base64.IndexOf(',');

        if (base64.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma > 0)
        {
            base64 = base64[(comma + 1)..];
        }

        if (base64.Length > (MaxPhotoBytes / 3 * 4) + 8)
        {
            return (null, "The picture is too large (max 3 MB).");
        }

        byte[] bytes;

        try
        {
            bytes = Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            return (null, "The picture could not be read. Add it again.");
        }

        string? extension =
            bytes.Length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF
                ? ".jpg"
                : bytes.Length > 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                    ? ".png"
                    : bytes.Length > 12
                      && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                      && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50
                        ? ".webp"
                        : null;

        if (extension is null)
        {
            return (null, "Only JPG, PNG and WEBP pictures can be sent.");
        }

        string webRoot =
            TenantWebRoot.Of(HttpContext, _environment)
            ?? Path.Combine(_environment.ContentRootPath, "wwwroot");

        string folder =
            Path.Combine(webRoot, "uploads", "chat");

        Directory.CreateDirectory(folder);

        string fileName =
            $"{Guid.NewGuid():N}{extension}";

        await System.IO.File.WriteAllBytesAsync(Path.Combine(folder, fileName), bytes);

        return ($"/uploads/chat/{fileName}", null);
    }
}
