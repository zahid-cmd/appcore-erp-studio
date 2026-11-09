-- ==============================================================
-- Team Chat (2026-11-10)
-- --------------------------------------------------------------
-- Chat between the active users of this company (this database):
-- direct (1-to-1) and group conversations, text and pictures.
-- Developers have NO access to chats (they only get Feedback).
--
--   ChatConversations  Kind Direct / Group; DirectKey makes one
--                      direct chat per pair of users
--   ChatMembers        who is in it; LastReadMessageId = unread
--   ChatMessages       Body (English text) and / or ImagePath
--
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "ChatConversations"
(
    "ChatConversationId"  bigserial     PRIMARY KEY,
    "PublicId"            uuid          NOT NULL DEFAULT gen_random_uuid(),
    "Kind"                varchar(10)   NOT NULL DEFAULT 'Direct',
    "Title"               varchar(100)  NOT NULL DEFAULT '',
    "DirectKey"           varchar(50)   NULL,
    "CreatedBy"           bigint        NOT NULL DEFAULT 0,
    "CreatedDate"         timestamp with time zone NOT NULL DEFAULT now(),
    "LastMessageDate"     timestamp with time zone NULL,
    "IsDeleted"           boolean       NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_ChatConversations_PublicId" ON "ChatConversations" ("PublicId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_ChatConversations_DirectKey" ON "ChatConversations" ("DirectKey") WHERE "DirectKey" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ChatMembers"
(
    "ChatMemberId"        bigserial     PRIMARY KEY,
    "ChatConversationId"  bigint        NOT NULL REFERENCES "ChatConversations" ("ChatConversationId"),
    "UserProfileId"       bigint        NOT NULL,
    "IsOwner"             boolean       NOT NULL DEFAULT false,
    "LastReadMessageId"   bigint        NOT NULL DEFAULT 0,
    "JoinedDate"          timestamp with time zone NOT NULL DEFAULT now(),
    "LeftDate"            timestamp with time zone NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_ChatMembers_Conversation_User" ON "ChatMembers" ("ChatConversationId", "UserProfileId");
CREATE INDEX IF NOT EXISTS "IX_ChatMembers_User" ON "ChatMembers" ("UserProfileId");

CREATE TABLE IF NOT EXISTS "ChatMessages"
(
    "ChatMessageId"       bigserial     PRIMARY KEY,
    "ChatConversationId"  bigint        NOT NULL REFERENCES "ChatConversations" ("ChatConversationId"),
    "SenderId"            bigint        NOT NULL,
    "Body"                varchar(2000) NOT NULL DEFAULT '',
    "ImagePath"           varchar(400)  NOT NULL DEFAULT '',
    "CreatedDate"         timestamp with time zone NOT NULL DEFAULT now(),
    "IsDeleted"           boolean       NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "IX_ChatMessages_Conversation_Id" ON "ChatMessages" ("ChatConversationId", "ChatMessageId" DESC);

COMMIT;

-- Check
SELECT
    (SELECT count(*) FROM "ChatConversations") AS conversations,
    (SELECT count(*) FROM "ChatMembers")       AS members,
    (SELECT count(*) FROM "ChatMessages")      AS messages;
