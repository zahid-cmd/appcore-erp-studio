/*===============================================================
  Website Configuration : moving strip speed
  ONE statement (pgAdmin-friendly). Safe to run again.
  1 = slowest … 10 = fastest; 5 = the speed used so far.
===============================================================*/

ALTER TABLE public."WebsiteConfigurations"
    ADD COLUMN IF NOT EXISTS "StripSpeed" integer NOT NULL DEFAULT 5;
