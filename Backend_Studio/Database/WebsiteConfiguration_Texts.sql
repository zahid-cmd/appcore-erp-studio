/*===============================================================
  Website Configuration : Texts & Offer columns
  ONE statement (pgAdmin-friendly). Safe to run again.
  CurrencySymbol empty = the website shows the Taka sign. The
  database is WIN1252, which cannot store that sign itself.
  Run AFTER WebsiteConfiguration_Tables.sql.
===============================================================*/

ALTER TABLE public."WebsiteConfigurations"
    ADD COLUMN IF NOT EXISTS "CurrencySymbol" character varying(5)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "OfferTitle"     character varying(150) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "OfferText"      character varying(300) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "OfferEndsOn"    date NULL;
