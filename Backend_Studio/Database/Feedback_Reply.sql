-- ==============================================================
-- Feedback : reply to the user (2026-11-09)
--   ReplyToUser   what the developer answers; the sender sees it
--                 under "My feedback" and gets a bell item.
--                 (DeveloperNote stays private to developers.)
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

ALTER TABLE "Feedbacks"
    ADD COLUMN IF NOT EXISTS "ReplyToUser" varchar(2000) NOT NULL DEFAULT '';

COMMIT;

SELECT "FeedbackId", "Kind", "Status", "ReplyToUser" FROM "Feedbacks" ORDER BY "FeedbackId" DESC LIMIT 5;
