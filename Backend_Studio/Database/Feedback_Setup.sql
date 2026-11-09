-- ==============================================================
-- Feedback (2026-11-09)
-- --------------------------------------------------------------
-- The topbar "Feedback" button : any signed-in user sends a Bug /
-- Idea / Question / Praise with an optional screenshot. Only
-- developers (users with the Developer role) see it : in their
-- bell and in the Feedback inbox (/developer/feedback).
--
--   Kind          Bug / Idea / Question / Praise
--   Status        New / In progress / Done
--   PageUrl ...   added by the app (page, branch, version)
--
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "Feedbacks"
(
    "FeedbackId"      bigserial     PRIMARY KEY,
    "PublicId"        uuid          NOT NULL DEFAULT gen_random_uuid(),
    "Kind"            varchar(20)   NOT NULL DEFAULT 'Bug',
    "Message"         varchar(2000) NOT NULL DEFAULT '',
    "ScreenshotPath"  varchar(400)  NOT NULL DEFAULT '',
    "PageUrl"         varchar(400)  NOT NULL DEFAULT '',
    "PageTitle"       varchar(200)  NOT NULL DEFAULT '',
    "BranchName"      varchar(200)  NOT NULL DEFAULT '',
    "AppVersion"      varchar(40)   NOT NULL DEFAULT '',
    "UserProfileId"   bigint        NOT NULL DEFAULT 0,
    "UserName"        varchar(200)  NOT NULL DEFAULT '',
    "Status"          varchar(20)   NOT NULL DEFAULT 'New',
    "DeveloperNote"   varchar(2000) NOT NULL DEFAULT '',
    "HandledByName"   varchar(200)  NOT NULL DEFAULT '',
    "IsDeleted"       boolean       NOT NULL DEFAULT false,
    "CreatedDate"     timestamp with time zone NOT NULL DEFAULT now(),
    "ModifiedDate"    timestamp with time zone NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_Feedbacks_PublicId" ON "Feedbacks" ("PublicId");
CREATE INDEX IF NOT EXISTS "IX_Feedbacks_Status_Created" ON "Feedbacks" ("Status", "CreatedDate" DESC);

COMMIT;

-- Check
SELECT count(*) AS feedbacks FROM "Feedbacks";
