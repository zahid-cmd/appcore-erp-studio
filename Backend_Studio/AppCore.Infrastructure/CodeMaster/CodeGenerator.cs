//===============================================================
// Namespace
//===============================================================


namespace AppCore.Infrastructure.CodeMaster;


//===============================================================
// Code Generator
//===============================================================


public static class CodeGenerator

{
    //===============================================================
    // NAVIGATION MANAGEMENT
    //===============================================================


    //===============================================================
    // Module Code
    //===============================================================


    public static string GenerateModuleCode(
        int moduleSequenceNo)

    {
        if (moduleSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid module sequence number.");

        }


        return $"MOD-{moduleSequenceNo:D3}";
    }


    //===============================================================
    // Menu Code
    //===============================================================


    public static string GenerateMenuCode(
        int moduleSequenceNo,

        int menuSequenceNo)

    {
        if (moduleSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid module sequence number.");

        }


        if (menuSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid menu sequence number.");

        }


        return $"MNU-{moduleSequenceNo:D3}-{menuSequenceNo:D3}";
    }


    //===============================================================
    // Submenu Code
    //===============================================================


    public static string GenerateSubmenuCode(
        int moduleSequenceNo,

        int menuSequenceNo,

        int submenuSequenceNo)

    {
        if (moduleSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid module sequence number.");

        }


        if (menuSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid menu sequence number.");

        }


        if (submenuSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid submenu sequence number.");

        }


        return $"SUB-{moduleSequenceNo:D3}-{menuSequenceNo:D3}-{submenuSequenceNo:D3}";
    }


    //===============================================================
    // Special Activity Code
    //===============================================================


    public static string GenerateSpecialActivityCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid special activity sequence number.");

        }


        return $"SACT-{sequenceNo:D4}";
    }


    //===============================================================
    // Master Activity Code
    //===============================================================


    public static string GenerateMasterActivityCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid master activity sequence number.");

        }


        return $"ACT-{sequenceNo:D4}";
    }


    //===============================================================
    // HUMAN RESOURCE SETUP
    //===============================================================


    //===============================================================
    // Department Code
    //===============================================================


    public static string GenerateDepartmentCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid department sequence number.");

        }


        return $"DPT-{sequenceNo:D3}";
    }


    //===============================================================
    // Designation Code
    //===============================================================


    public static string GenerateDesignationCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid designation sequence number.");

        }


        return $"DSG-{sequenceNo:D3}";
    }


    //===============================================================
    // SECURITY & PERMISSION
    //===============================================================


    //===============================================================
    // Role Profile Code
    //===============================================================


    public static string GenerateRoleProfileCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid role profile sequence number.");

        }


        return $"RP-{sequenceNo:D3}";
    }


    //===============================================================
    // User Profile Code
    //===============================================================


    public static string GenerateUserProfileCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid user profile sequence number.");

        }


        return $"UP-{sequenceNo:D3}";
    }


    //===============================================================
    // COMPONENT MANAGEMENT
    //===============================================================


    //===============================================================
    // Control Components Code
    //===============================================================


    public static string GenerateControlComponentsCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid control components sequence number.");

        }


        return $"CC-{sequenceNo:D3}";
    }


    //===============================================================
    // CODE MANAGEMENT
    //===============================================================


    //===============================================================
    // Source Control Code
    //===============================================================


    public static string GenerateSourceControlCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid source control sequence number.");

        }


        return $"SC-{sequenceNo:D3}";
    }


    //===============================================================
    // GENERAL SETTINGS
    //===============================================================


    //===============================================================
    // Company Code
    //===============================================================


    public static string GenerateCompanyCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid company sequence number.");

        }


        return $"CMP-{sequenceNo:D2}";
    }


    //===============================================================
    // Wing Code
    //===============================================================


    public static string GenerateWingCode(
        int companySequenceNo,

        int wingSequenceNo)

    {
        if (companySequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid company sequence number.");

        }


        if (wingSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid wing sequence number.");

        }


        return $"WNG-{companySequenceNo:D2}-{wingSequenceNo:D2}";
    }


    //===============================================================
    // Branch Code
    //===============================================================


    public static string GenerateBranchCode(
        int companySequenceNo,

        int wingSequenceNo,

        int branchSequenceNo)

    {
        if (companySequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid company sequence number.");

        }


        if (wingSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid wing sequence number.");

        }


        if (branchSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid branch sequence number.");

        }


        return $"BRN-{companySequenceNo:D2}-{wingSequenceNo:D2}-{branchSequenceNo:D2}";
    }


    //===============================================================
    // Warehouse Code
    //===============================================================


    public static string GenerateWarehouseCode(
        int companySequenceNo,

        int wingSequenceNo,

        int branchSequenceNo,

        int warehouseSequenceNo)

    {
        if (companySequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid company sequence number.");

        }


        if (wingSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid wing sequence number.");

        }


        if (branchSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid branch sequence number.");

        }


        if (warehouseSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid warehouse sequence number.");

        }


        return $"WH-{companySequenceNo:D2}-{wingSequenceNo:D2}-{branchSequenceNo:D2}-{warehouseSequenceNo:D2}";
    }

    //===============================================================
    // GENERAL SETTINGS : Location Code   LOC-0001
    //
    // Paste into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block, e.g. right before the
    // SERVICE SETTINGS section. The name differs from the ones Code
    // Synchronization generates, so it never clashes with them.
    //===============================================================

    public static string GenerateLocationCode(
        int sequenceNo)
    {
        if (sequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid location sequence number.");
        }

        return $"LOC-{sequenceNo:D4}";
    }

    //===============================================================
    // CLIENT SETTINGS : Customer Codes
    //
    //   Inbound customer   CIB-000001
    //   Outside customer   COS-000001
    //
    // Paste into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block, e.g. after the
    // GENERAL SETTINGS section. The names differ from the ones Code
    // Synchronization generates, so they never clash with them.
    //===============================================================

    public static string GenerateInboundCustomerCode(
        int sequenceNo)
    {
        return CustomerCode(
            "CIB",
            sequenceNo);
    }


    public static string GenerateOutsideCustomerCode(
        int sequenceNo)
    {
        return CustomerCode(
            "COS",
            sequenceNo);
    }


    private static string CustomerCode(
        string prefix,
        int sequenceNo)
    {
        if (sequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid customer sequence number.");
        }

        return $"{prefix}-{sequenceNo:D6}";
    }
    
    //===============================================================
    // CLIENT SETTINGS : Supplier Code   SUP-000001
    //
    // Paste into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block, next to the customer
    // code methods (it uses their CustomerCode helper).
    //===============================================================

    public static string GenerateSupplierCode(
        int sequenceNo)
    {
        return CustomerCode(
            "SUP",
            sequenceNo);
    }
    
    //===============================================================
    // MEMBERSHIP MANAGEMENT : Membership Card Code   MCD-001
    //
    // Paste into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block, e.g. after the SERVICE
    // SETTINGS section. The repository finds the highest number
    // used (deleted cards included) and passes highest + 1.
    //===============================================================

    public static string GenerateMembershipCardCode(
        int sequenceNo)
    {
        if (sequenceNo < 1 || sequenceNo > 999)
        {
            throw new ArgumentException(
                "Membership card sequence number must be from 1 to 999.");
        }

        return $"MCD-{sequenceNo:D3}";
    }
    
    //===============================================================
    // MEMBERSHIP MANAGEMENT : Membership Policy Code   MSP-001
    //
    // Paste into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block, next to
    // GenerateMembershipCardCode.
    //===============================================================

    public static string GenerateMembershipPolicyCode(
        int sequenceNo)
    {
        if (sequenceNo < 1 || sequenceNo > 999)
        {
            throw new ArgumentException(
                "Membership policy sequence number must be from 1 to 999.");
        }

        return $"MSP-{sequenceNo:D3}";
    }

    //===============================================================
    // APPLICATION CONFIGURATION
    //===============================================================


    //===============================================================
    // Login Pages Code
    //===============================================================


    public static string GenerateLoginPagesCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid login pages sequence number.");

        }


        return $"LP-{sequenceNo:D3}";
    }


    //===============================================================
    // Dashboards Code
    //===============================================================


    public static string GenerateDashboardsCode(
        int sequenceNo)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid dashboards sequence number.");

        }


        return $"DSB-{sequenceNo:D3}";
    }


    //===============================================================
    // ACCOUNT SETTINGS
    //===============================================================


    //===============================================================
    // Account Class Code
    //
    // <ClassPrefix>-<nnn>   e.g. CLS-001, INV-001, WIP-002, COGS-003
    // The prefix is typed on the Account Class form (2–5 letters);
    // nothing is hard-coded here.
    //===============================================================


    public static string GenerateAccountClassCode(
        string classPrefix,
        int sequenceNo)

    {
        string prefix =
            (classPrefix ?? string.Empty)
                .Trim()
                .ToUpperInvariant();


        if (prefix.Length < 2 || prefix.Length > 5 || !prefix.All(c => c >= 'A' && c <= 'Z'))

        {
            throw new ArgumentException(
                "Invalid account class prefix.");

        }


        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account class sequence number.");

        }


        return $"{prefix}-{sequenceNo:D3}";
    }

    //===============================================================
    // Account Group Code
    //===============================================================

    public static string GenerateAccountGroupCode(
        int classSequenceNo,
        int groupSequenceNo)

    {
        if (classSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account class sequence number.");

        }


        if (groupSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account group sequence number.");

        }


        return $"GRP-{classSequenceNo:D3}-{groupSequenceNo:D3}";
    }

    //===============================================================
    // Account Sub Group Code
    //===============================================================

    public static string GenerateAccountSubGroupCode(
        int classSequenceNo,
        int groupSequenceNo,
        int subGroupSequenceNo)

    {
        if (classSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account class sequence number.");

        }


        if (groupSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account group sequence number.");

        }


        if (subGroupSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account sub group sequence number.");

        }


        return $"SUB-{classSequenceNo:D3}-{groupSequenceNo:D3}-{subGroupSequenceNo:D3}";
    }

    //===============================================================
    // General Ledger Code
    //===============================================================

    public static string GenerateGeneralLedgerCode(
        int classSequenceNo,
        int groupSequenceNo,
        int subGroupSequenceNo,
        int ledgerSequenceNo)

    {
        if (classSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account class sequence number.");

        }


        if (groupSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account group sequence number.");

        }


        if (subGroupSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account sub group sequence number.");

        }


        if (ledgerSequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid general ledger sequence number.");

        }


        return $"GLR-{classSequenceNo:D3}-{groupSequenceNo:D3}-{subGroupSequenceNo:D3}-{ledgerSequenceNo:D5}";
    }

    //===============================================================
    // PRODUCT SETTINGS
    //===============================================================
    //===============================================================
    // Product Category Code
    //===============================================================

    public static string GenerateProductCategoryCode(
        int inventoryClassSequenceNo,
        int categorySequenceNo)
    {
        if (inventoryClassSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid inventory class sequence number.");
        }

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product category sequence number.");
        }

        return $"CAT-{inventoryClassSequenceNo:D3}-{categorySequenceNo:D3}";
    }

    //===============================================================
    // Product Sub Category Code
    //===============================================================

    public static string GenerateProductSubCategoryCode(
        int inventoryClassSequenceNo,
        int categorySequenceNo,
        int subCategorySequenceNo)
    {
        if (inventoryClassSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid inventory class sequence number.");
        }

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product sub category sequence number.");
        }

        return $"SCG-{inventoryClassSequenceNo:D3}-{categorySequenceNo:D3}-{subCategorySequenceNo:D5}";
    }

    //===============================================================
    // Inventory Sub Category Code
    //===============================================================

    public static string GenerateInventorySubCategoryCode(
        int inventoryClassSequenceNo,
        int categorySequenceNo,
        int subCategorySequenceNo)
    {
        if (inventoryClassSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid inventory class sequence number.");
        }

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product sub category sequence number.");
        }

        return $"INV-{inventoryClassSequenceNo:D3}-{categorySequenceNo:D3}-{subCategorySequenceNo:D5}";
    }

    //===============================================================
    // WIP Sub Category Code
    //===============================================================

    public static string GenerateWipSubCategoryCode(
        int inventoryClassSequenceNo,
        int categorySequenceNo,
        int subCategorySequenceNo)
    {
        if (inventoryClassSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid inventory class sequence number.");
        }

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product sub category sequence number.");
        }

        return $"WIP-{inventoryClassSequenceNo:D3}-{categorySequenceNo:D3}-{subCategorySequenceNo:D5}";
    }

    //===============================================================
    // COGS Sub Category Code
    //===============================================================

    public static string GenerateCogsSubCategoryCode(
        int inventoryClassSequenceNo,
        int categorySequenceNo,
        int subCategorySequenceNo)
    {
        if (inventoryClassSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid inventory class sequence number.");
        }

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product sub category sequence number.");
        }

        return $"COGS-{inventoryClassSequenceNo:D3}-{categorySequenceNo:D3}-{subCategorySequenceNo:D5}";
    }

    //===============================================================
    // Motor Bikes Code   (MTB-class-category-subcategory-0001)
    //===============================================================

    public static string GenerateMotorBikesCode(
        int inventoryClassSequenceNo,
        int categorySequenceNo,
        int subCategorySequenceNo,
        int motorBikeSequenceNo)
    {
        if (inventoryClassSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid inventory class sequence number.");
        }

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product sub category sequence number.");
        }

        if (motorBikeSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid motor bike sequence number.");
        }

        return $"MTB-{inventoryClassSequenceNo:D3}-{categorySequenceNo:D3}-{subCategorySequenceNo:D3}-{motorBikeSequenceNo:D4}";
    }

    //===============================================================
    // Inventory Ledger Code
    //===============================================================

    public static string GenerateInventoryLedgerCode(
        int categorySequenceNo,
        int subCategorySequenceNo,
        int ledgerSequenceNo)
    {
        return GenerateProductLedgerCode(
            1,
            categorySequenceNo,
            subCategorySequenceNo,
            ledgerSequenceNo);
    }

    //===============================================================
    // WIP Ledger Code
    //===============================================================

    public static string GenerateWipLedgerCode(
        int categorySequenceNo,
        int subCategorySequenceNo,
        int ledgerSequenceNo)
    {
        return GenerateProductLedgerCode(
            2,
            categorySequenceNo,
            subCategorySequenceNo,
            ledgerSequenceNo);
    }

    //===============================================================
    // COGS Ledger Code
    //===============================================================

    public static string GenerateCogsLedgerCode(
        int categorySequenceNo,
        int subCategorySequenceNo,
        int ledgerSequenceNo)
    {
        return GenerateProductLedgerCode(
            3,
            categorySequenceNo,
            subCategorySequenceNo,
            ledgerSequenceNo);
    }

    //===============================================================
    // Product Ledger Code (shared)
    //===============================================================

    private static string GenerateProductLedgerCode(
        int inventoryClassSequenceNo,
        int categorySequenceNo,
        int subCategorySequenceNo,
        int ledgerSequenceNo)
    {
        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid product sub category sequence number.");
        }

        if (ledgerSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid ledger sequence number.");
        }

        return GenerateGeneralLedgerCode(
            inventoryClassSequenceNo,
            categorySequenceNo,
            subCategorySequenceNo,
            ledgerSequenceNo);
    }


    //===============================================================
    // Cash Account Code (MANUAL)
    //
    // CSH-ccc-ggg-sss-nnnnn   e.g. CSH-002-002-002-00001
    //
    // Kept outside the AUTO blocks on purpose: Code Synchronization
    // rewrites AUTO blocks (GenerateCashAccountsCode below goes back
    // to CAS- every time it runs), so the Cash Accounts repository
    // calls this method instead.
    //===============================================================

    public static string GenerateCashAccountCode(
        int classSequenceNo,
        int groupSequenceNo,
        int subGroupSequenceNo,
        int sequenceNo)
    {
        if (classSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid account class sequence number.");
        }

        if (groupSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid account group sequence number.");
        }

        if (subGroupSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid account sub group sequence number.");
        }

        if (sequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid cash account sequence number.");
        }

        return $"CSH-{classSequenceNo:D3}-{groupSequenceNo:D3}-{subGroupSequenceNo:D3}-{sequenceNo:D5}";
    }


    // AUTO-BEGIN : GenerateCashAccountsCode
    public static string GenerateCashAccountsCode(
        int accountClassSequenceNo,
        int accountGroupSequenceNo,
        int accountSubGroupsSequenceNo,
        int sequenceNo)
    {
        if (accountClassSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountClass sequence number.");
        }

        if (accountGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountGroup sequence number.");
        }

        if (accountSubGroupsSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountSubGroups sequence number.");
        }

        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"CAS-{accountClassSequenceNo:D3}-{accountGroupSequenceNo:D3}-{accountSubGroupsSequenceNo:D3}-{sequenceNo:D5}";
    }
    // AUTO-END : GenerateCashAccountsCode


    // AUTO-BEGIN : GenerateBankSetupCode
    public static string GenerateBankSetupCode(
        int sequenceNo)
    {
        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"BAN-{sequenceNo:D3}";
    }
    // AUTO-END : GenerateBankSetupCode


    //===============================================================
    // Bank Account Code (MANUAL)
    //
    // BNK-ccc-ggg-sss-nnnnn   e.g. BNK-002-002-002-00001
    //
    // Kept outside the AUTO blocks on purpose: Code Synchronization
    // rewrites AUTO blocks (GenerateBankAccountsCode below stays
    // BAN-), so the Bank Accounts repository calls this method.
    //===============================================================

    public static string GenerateBankAccountCode(
        int classSequenceNo,
        int groupSequenceNo,
        int subGroupSequenceNo,
        int sequenceNo)
    {
        if (classSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid account class sequence number.");
        }

        if (groupSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid account group sequence number.");
        }

        if (subGroupSequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid account sub group sequence number.");
        }

        if (sequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid bank account sequence number.");
        }

        return $"BNK-{classSequenceNo:D3}-{groupSequenceNo:D3}-{subGroupSequenceNo:D3}-{sequenceNo:D5}";
    }


    // AUTO-BEGIN : GenerateBankAccountsCode
    public static string GenerateBankAccountsCode(
        int accountClassSequenceNo,
        int accountGroupSequenceNo,
        int accountSubGroupSequenceNo,
        int sequenceNo)
    {
        if (accountClassSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountClass sequence number.");
        }

        if (accountGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountGroup sequence number.");
        }

        if (accountSubGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountSubGroup sequence number.");
        }

        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"BAN-{accountClassSequenceNo:D3}-{accountGroupSequenceNo:D3}-{accountSubGroupSequenceNo:D3}-{sequenceNo:D5}";
    }
    // AUTO-END : GenerateBankAccountsCode


    // AUTO-BEGIN : GenerateMFSAccountsCode
    public static string GenerateMFSAccountsCode(
        int accountClassSequenceNo,
        int accountGroupSequenceNo,
        int accountSubGroupSequenceNo,
        int sequenceNo)
    {
        if (accountClassSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountClass sequence number.");
        }

        if (accountGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountGroup sequence number.");
        }

        if (accountSubGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountSubGroup sequence number.");
        }

        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"MFS-{accountClassSequenceNo:D3}-{accountGroupSequenceNo:D3}-{accountSubGroupSequenceNo:D3}-{sequenceNo:D5}";
    }

    // AUTO-END : GenerateMFSAccountsCode

    //===============================================================
    // ACCOUNT SETTINGS : EMI Account Code   EMI-002-002-005-00001
    //
    // Paste into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block, e.g. right after the
    // GeneratePOSAccountsCode block. The repository finds the
    // highest number used (deleted rows included) and passes
    // highest + 1.
    //===============================================================

    public static string GenerateEmiAccountsCode(
        int accountClassSequenceNo,
        int accountGroupSequenceNo,
        int accountSubGroupSequenceNo,
        int sequenceNo)
    {
        if (accountClassSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountClass sequence number.");
        }

        if (accountGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountGroup sequence number.");
        }

        if (accountSubGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountSubGroup sequence number.");
        }

        if (sequenceNo < 1 || sequenceNo > 99999)
        {
            throw new ArgumentException("EMI account sequence number must be from 1 to 99999.");
        }

        return $"EMI-{accountClassSequenceNo:D3}-{accountGroupSequenceNo:D3}-{accountSubGroupSequenceNo:D3}-{sequenceNo:D5}";
    }

    // AUTO-BEGIN : GenerateCardSetupCode
    public static string GenerateCardSetupCode(
        int sequenceNo)
    {
        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"CRD-{sequenceNo:D3}";
    }
    // AUTO-END : GenerateCardSetupCode


    // AUTO-BEGIN : GeneratePOSAccountsCode
    public static string GeneratePOSAccountsCode(
        int accountClassSequenceNo,
        int accountGroupSequenceNo,
        int accountSubGroupSequenceNo,
        int sequenceNo)
    {
        if (accountClassSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountClass sequence number.");
        }

        if (accountGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountGroup sequence number.");
        }

        if (accountSubGroupSequenceNo < 1)
        {
            throw new ArgumentException("Invalid accountSubGroup sequence number.");
        }

        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"POS-{accountClassSequenceNo:D3}-{accountGroupSequenceNo:D3}-{accountSubGroupSequenceNo:D3}-{sequenceNo:D5}";
    }
    // AUTO-END : GeneratePOSAccountsCode


    // AUTO-BEGIN : GenerateColorManagementCode
    public static string GenerateColorManagementCode(
        int sequenceNo)
    {
        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"CLR-{sequenceNo:D3}";
    }
    // AUTO-END : GenerateColorManagementCode


    // AUTO-BEGIN : GenerateBrandManagementCode
    public static string GenerateBrandManagementCode(
        int sequenceNo)
    {
        if (sequenceNo < 1)
        {
            throw new ArgumentException("Invalid sequence number.");
        }

        return $"BRAND-{sequenceNo:D3}";
    }

    // AUTO-END : GenerateBrandManagementCode
    
    //===============================================================
    // SERVICE SETTINGS
    //
    // Paste this whole section into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block - e.g. right after the
    // PRODUCT SETTINGS section. The names differ from the ones Code
    // Synchronization generates, so they never clash with them.
    //===============================================================


    //===============================================================
    // Service Policy Code   SVP-001
    //===============================================================

    public static string GeneratePolicyCode(
        int sequenceNo)
    {
        if (sequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid service policy sequence number.");
        }

        return $"SVP-{sequenceNo:D3}";
    }


    //===============================================================
    // Service Category Code   BRS-001 (Brand Services)
    //                         DRS-001 (Differential Services)
    //===============================================================

    public static string GenerateServiceCategoryCode(
        string categoryPrefix,
        int categorySequenceNo)
    {
        string prefix =
            ServicePrefix(
                categoryPrefix);

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid service category sequence number.");
        }

        return $"{prefix}-{categorySequenceNo:D3}";
    }


    //===============================================================
    // Service Sub Category Code   BRS-001-002
    //===============================================================

    public static string GenerateServiceSubCategoryCode(
        string categoryPrefix,
        int categorySequenceNo,
        int subCategorySequenceNo)
    {
        string prefix =
            ServicePrefix(
                categoryPrefix);

        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid service category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid service sub category sequence number.");
        }

        return $"{prefix}-{categorySequenceNo:D3}-{subCategorySequenceNo:D3}";
    }


    //===============================================================
    // Scheduled Service Code   MSS-001-002-00001
    // (category no - sub category no - running no)
    //===============================================================

    public static string GenerateScheduledServiceItemCode(
        int categorySequenceNo,
        int subCategorySequenceNo,
        int sequenceNo)
    {
        return ServiceItemCode(
            "MSS",
            categorySequenceNo,
            subCategorySequenceNo,
            sequenceNo);
    }


    //===============================================================
    // Labor Chart Code   BLC-001-001-00001
    // (category no - sub category no - running no)
    //===============================================================

    public static string GenerateLaborChartItemCode(
        int categorySequenceNo,
        int subCategorySequenceNo,
        int sequenceNo)
    {
        return ServiceItemCode(
            "BLC",
            categorySequenceNo,
            subCategorySequenceNo,
            sequenceNo);
    }


    //===============================================================
    // Service Settings helpers
    //===============================================================

    private static string ServicePrefix(
        string prefixValue)
    {
        string prefix =
            (prefixValue ?? string.Empty)
                .Trim()
                .ToUpperInvariant();

        if (prefix.Length < 2 || prefix.Length > 5 || !prefix.All(c => c >= 'A' && c <= 'Z'))
        {
            throw new ArgumentException(
                "Invalid service code prefix.");
        }

        return prefix;
    }


    private static string ServiceItemCode(
        string itemPrefix,
        int categorySequenceNo,
        int subCategorySequenceNo,
        int sequenceNo)
    {
        if (categorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid service category sequence number.");
        }

        if (subCategorySequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid service sub category sequence number.");
        }

        if (sequenceNo < 1)
        {
            throw new ArgumentException(
                "Invalid service item sequence number.");
        }

        return $"{itemPrefix}-{categorySequenceNo:D3}-{subCategorySequenceNo:D3}-{sequenceNo:D5}";
    }

    //===============================================================
    // Customized Services Code   OCS-001-001-00001
    // (category no - sub category no - running no)
    //
    // Paste into CodeGenerator.cs, inside the SERVICE SETTINGS
    // section added for Labor Chart (next to
    // GenerateLaborChartItemCode). It uses the ServiceItemCode
    // helper of that section.
    //===============================================================

    public static string GenerateCustomizedServiceItemCode(
        int categorySequenceNo,
        int subCategorySequenceNo,
        int sequenceNo)
    {
        return ServiceItemCode(
            "OCS",
            categorySequenceNo,
            subCategorySequenceNo,
            sequenceNo);
    }

    //===============================================================
    // Membership Services Code   MSC-002-001-00001
    // (category no - sub category no - running no)
    //
    // Paste into CodeGenerator.cs, inside the SERVICE SETTINGS
    // section added for Labor Chart (next to
    // GenerateCustomizedServiceItemCode). It uses the ServiceItemCode
    // helper of that section.
    //===============================================================

    public static string GenerateMembershipServiceItemCode(
        int categorySequenceNo,
        int subCategorySequenceNo,
        int sequenceNo)
    {
        return ServiceItemCode(
            "MSC",
            categorySequenceNo,
            subCategorySequenceNo,
            sequenceNo);
    }

    //===============================================================
    // MEMBERSHIP MANAGEMENT : Membership No   MEM-000001
    //
    // Paste into CodeGenerator.cs (namespace
    // AppCore.Infrastructure.CodeMaster), OUTSIDE any
    // "// AUTO-BEGIN ... // AUTO-END" block, next to the customer
    // code methods (it uses their CustomerCode helper : 6 digits).
    //===============================================================

    public static string GenerateMembershipNo(
        int sequenceNo)
    {
        return CustomerCode(
            "MEM",
            sequenceNo);
    }

    //===============================================================
    // ACCOUNTS & FINANCE : Voucher Number
    //   RV-010101-2627-10-00001
    //   <prefix>-<branch digits>-<FY>-<calendar month>-<seq5>
    //
    // GenerateVoucherNoPrefix : "RV-010101-2627-10-"
    // GenerateVoucherNo       : prefix + 5-digit sequence
    // ParseVoucherSequence    : sequence back out of a number (used
    //                           by the voucher repositories to
    //                           preview the next number)
    //===============================================================

    public static string GenerateVoucherNoPrefix(
        string prefix,
        string branchDigits,
        string financialYearCode,
        int periodMonth)
    {
        if (string.IsNullOrWhiteSpace(prefix))
        {
            throw new ArgumentException("Voucher prefix is required.");
        }

        if (string.IsNullOrWhiteSpace(branchDigits))
        {
            throw new ArgumentException("Branch digits are required.");
        }

        if (string.IsNullOrWhiteSpace(financialYearCode))
        {
            throw new ArgumentException("Financial year code is required.");
        }

        if (periodMonth < 1 || periodMonth > 12)
        {
            throw new ArgumentException("Voucher month must be from 1 to 12.");
        }

        // e.g. "RV-010101-2627-10-"
        return $"{prefix.Trim().ToUpperInvariant()}-{branchDigits.Trim()}-{financialYearCode.Trim()}-{periodMonth:D2}-";
    }

    public static string GenerateVoucherNo(
        string prefix,
        string branchDigits,
        string financialYearCode,
        int periodMonth,
        int sequenceNo)
    {
        if (sequenceNo < 1 || sequenceNo > 99999)
        {
            throw new ArgumentException("Voucher sequence number must be from 1 to 99999.");
        }

        return GenerateVoucherNoPrefix(
                   prefix,
                   branchDigits,
                   financialYearCode,
                   periodMonth)
               + sequenceNo.ToString("D5");
    }

    // "RV-010101-2627-10-00012" → 12 (0 when it cannot be read)
    public static int ParseVoucherSequence(
        string? voucherNo)
    {
        if (string.IsNullOrWhiteSpace(voucherNo))
        {
            return 0;
        }

        string[] parts =
            voucherNo.Trim().Split('-');

        string last =
            parts[parts.Length - 1];

        return int.TryParse(last, out int sequence)
            ? sequence
            : 0;
    }
}