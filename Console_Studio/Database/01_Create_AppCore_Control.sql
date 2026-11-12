/*===============================================================
  AppCore Console : step 1 / 2 - create the control database.

  Run in pgAdmin connected to the "postgres" database (NOT to the
  ERP database), the whole file (F5). Run once.
  UTF8 (a new database; the ERP's WIN1252 rule does not apply).
===============================================================*/

CREATE DATABASE "AppCore_Control"
    WITH ENCODING 'UTF8'
         LC_COLLATE 'C'
         LC_CTYPE 'C'
         TEMPLATE template0;
