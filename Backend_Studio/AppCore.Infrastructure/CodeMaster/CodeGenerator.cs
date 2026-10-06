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


        return $"MACT-{sequenceNo:D4}";
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
    //===============================================================


    public static string GenerateAccountClassCode(
        int sequenceNo,
        string classType)

    {
        if (sequenceNo < 1)

        {
            throw new ArgumentException(
                "Invalid account class sequence number.");

        }


        string prefix =

            string.Equals(
                classType?.Trim(),
                "Inventory Class",
                StringComparison.OrdinalIgnoreCase)

                    ?

                        "INV"

                    :

                        "ACC";


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
    
}