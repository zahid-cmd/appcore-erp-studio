/*===============================================================
  Website Configuration : hero photo (showroom picture in the hero)
  ONE statement (pgAdmin-friendly). Safe to run again.
    HeroPhotoPath    the photo (16:9, e.g. 1600 x 900); empty = off
    HeroWelcome      first slide : photo + welcome text
    HeroBackground   photo behind the bike slides
    HeroStrength     how visible the background is : 1 subtle .. 5 strong
    HeroTitle/Text   welcome slide wording (empty = company name / tagline)
    HeroShowAddress  address + Get directions on the welcome slide
===============================================================*/

ALTER TABLE public."WebsiteConfigurations"
    ADD COLUMN IF NOT EXISTS "HeroPhotoPath"   character varying(300) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "HeroWelcome"     boolean                NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "HeroBackground"  boolean                NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "HeroStrength"    integer                NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS "HeroTitle"       character varying(150) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "HeroText"        character varying(300) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "HeroShowAddress" boolean                NOT NULL DEFAULT true;
