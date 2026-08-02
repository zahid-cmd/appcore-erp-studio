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

    public static string GenerateDepartmentCode(int sequenceNo)
    {
        if (sequenceNo < 1)
            throw new ArgumentException("Invalid sequence number.");

        return $"DPT-{sequenceNo:D4}";
    }

    //===============================================================
    // Designation Code
    //===============================================================

    public static string GenerateDesignationCode(int sequenceNo)
    {
        if (sequenceNo < 1)
            throw new ArgumentException("Invalid sequence number.");

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
                "Invalid sequence number.");
        }

        return $"PRF-{sequenceNo:D2}";
    }
}