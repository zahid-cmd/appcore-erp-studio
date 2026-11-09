//===============================================================
// Team Chat (2026-11-10)
//
// Chat between the active users of this company (this database):
// direct (1-to-1) and group conversations. Only the members of a
// conversation can read it; developers get no access (they only
// see Feedback). Tables : Database/Chat_Setup.sql.
//===============================================================

namespace AppCore.Domain.Platform.Chat;

public class ChatConversation
{
    public long ChatConversationId { get; set; }

    public Guid PublicId { get; set; } = Guid.NewGuid();

    // Direct / Group
    public string Kind { get; set; } = "Direct";

    // Group name ('' for a direct chat)
    public string Title { get; set; } = string.Empty;

    // "D:<smaller user id>:<bigger user id>" : one direct chat per
    // pair (null for a group)
    public string? DirectKey { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? LastMessageDate { get; set; }

    public bool IsDeleted { get; set; }
}


public class ChatMember
{
    public long ChatMemberId { get; set; }

    public long ChatConversationId { get; set; }

    public long UserProfileId { get; set; }

    // Group owner : renames, adds and removes members
    public bool IsOwner { get; set; }

    // Messages after this one are unread for the member
    public long LastReadMessageId { get; set; }

    public DateTime JoinedDate { get; set; }

    // Left / removed from a group (null = in it)
    public DateTime? LeftDate { get; set; }
}


public class ChatMessage
{
    public long ChatMessageId { get; set; }

    public long ChatConversationId { get; set; }

    public long SenderId { get; set; }

    // English text (the database is Windows-1252)
    public string Body { get; set; } = string.Empty;

    // /uploads/chat/xxx.jpg ('' = no picture)
    public string ImagePath { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public bool IsDeleted { get; set; }
}
