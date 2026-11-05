/*===============================================================
  Website Configuration : Google Maps link
  ONE statement (pgAdmin-friendly). Safe to run again.
  "MapLink" holds the link pasted from Google Maps; the pin
  read from it is kept in "MapQuery" (lat,lng or place name).
===============================================================*/

ALTER TABLE public."WebsiteConfigurations"
    ADD COLUMN IF NOT EXISTS "MapLink" character varying(1000) NOT NULL DEFAULT '';
