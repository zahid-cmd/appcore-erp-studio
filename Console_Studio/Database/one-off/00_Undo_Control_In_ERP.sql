/*===============================================================
  UNDO : 02_Control_Schema.sql was run by mistake in the ERP
  database "AppCoreERP_Studio". This removes ONLY the Console
  tables it created there.

  Run in pgAdmin on "AppCoreERP_Studio" (the tab title must start
  with AppCoreERP_Studio/), the whole file (F5).

  Safety : a table is dropped only when its columns are exactly
  the Console version. An ERP table with the same name (for example
  an ERP "Customers" table) has other columns and is kept.
  Nothing else in the ERP is touched.
===============================================================*/

DO $$
DECLARE
    t       record;
    actual  text;
BEGIN
    FOR t IN
        SELECT *
        FROM (VALUES
            -- children first, parents last
            (1,  'StaffSessions',       'CreatedDate,ExpiresDate,IpAddress,RefreshHash,RevokedDate,StaffSessionId,StaffUserId,UserAgent'),
            (2,  'StaffUsers',          'CreatedDate,Email,FailedLogins,FullName,LastLoginDate,LockedUntil,LoginId,ModifiedDate,MustChangePassword,PasswordHash,Phone,PublicId,StaffRoleId,StaffUserId,Status,TwoFactorSecret'),
            (3,  'StaffRoles',          'Description,RoleCode,RoleName,StaffRoleId'),
            (4,  'AuditLog',            'Action,AuditLogId,CreatedDate,Details,EntityId,EntityName,IpAddress,StaffUserId,TenantId'),
            (5,  'TenantStatusHistory', 'ChangedBy,ChangedDate,FromStatus,Reason,TenantId,TenantStatusHistoryId,ToStatus'),
            (6,  'TenantModules',       'IsEnabled,ModifiedBy,ModifiedDate,ProductModuleId,TenantId,TenantModuleId'),
            (7,  'TenantDomains',       'CreatedDate,DomainType,HostName,IsPrimary,TenantDomainId,TenantId'),
            (8,  'Tenants',             'AppVersion,CreatedBy,CreatedDate,Currency,CustomerId,DatabaseName,DatabaseServerId,DisplayName,ModifiedBy,ModifiedDate,ProductId,PublicId,Remarks,SchemaVersion,Status,TenantCode,TenantId,TimeZone,TrialEndsOn'),
            (9,  'CustomerContacts',    'ContactName,CustomerContactId,CustomerId,Designation,Email,IsPrimary,Phone'),
            (10, 'Customers',           'Address,BinNo,Country,CreatedBy,CreatedDate,CustomerCode,CustomerId,DisplayName,Email,LegalName,ModifiedBy,ModifiedDate,Phone,PublicId,Remarks,Status,TinNo'),
            (11, 'DatabaseServers',     'CreatedDate,CredentialKey,DatabaseServerId,Host,Port,ServerCode,ServerName,Status'),
            (12, 'ProductReleases',     'CreatedDate,Notes,ProductId,ProductReleaseId,ReleaseDate,Version'),
            (13, 'ProductTemplates',    'CreatedDate,DatabaseName,IsCurrent,ProductId,ProductTemplateId,SchemaVersion,TemplateName'),
            (14, 'ProductModules',      'DisplayOrder,IsCore,ModuleCode,ModuleName,ProductId,ProductModuleId'),
            (15, 'Products',            'CreatedDate,Description,DisplayOrder,Industry,ModifiedDate,ProductCode,ProductId,ProductName,PublicId,Status')
        ) AS x(seq, name, cols)
        ORDER BY seq
    LOOP
        SELECT string_agg(column_name::text, ',' ORDER BY column_name::text)
        INTO actual
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = t.name;

        IF actual IS NULL THEN
            RAISE NOTICE '%: not there, nothing to do', t.name;
        ELSIF actual = t.cols THEN
            EXECUTE format('DROP TABLE public.%I', t.name);
            RAISE NOTICE '%: Console table REMOVED', t.name;
        ELSE
            RAISE NOTICE '%: ERP table (other columns), KEPT', t.name;
        END IF;
    END LOOP;
END $$;

-- Check : should show 0 Console tables left
SELECT count(*)::text AS "Console tables left in the ERP"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
        (table_name = 'Products'   AND column_name = 'Industry')
     OR (table_name = 'Tenants'    AND column_name = 'TenantCode')
     OR (table_name = 'StaffUsers' AND column_name = 'LoginId')
     OR (table_name = 'Customers'  AND column_name = 'LegalName' )
  );
