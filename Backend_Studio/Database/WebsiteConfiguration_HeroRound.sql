/*===============================================================
  Website Configuration : round image in the hero's circle
  ONE statement (pgAdmin-friendly). Safe to run again.
    HeroRoundOn        show it (off = the hero as before)
    HeroRoundPath      square photo (e.g. 1200 x 1200); empty = off
    HeroRoundStrength  how visible : 1 subtle .. 5 strong
===============================================================*/

ALTER TABLE public."WebsiteConfigurations"
    ADD COLUMN IF NOT EXISTS "HeroRoundOn"       boolean                NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "HeroRoundPath"     character varying(300) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "HeroRoundStrength" integer                NOT NULL DEFAULT 2;
