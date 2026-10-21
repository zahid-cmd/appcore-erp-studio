//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ClientSettings;


//===============================================================
// Customer Profiles
//
// One customer : Inbound (bought a bike from us) or Outside (takes
// services only). Owns one receivable General Ledger under
// SUB-002-002-005 Trade Receivables, named by the Display Name and
// created / renamed / (de)activated / deleted / restored with it.
// An Outside customer converted to Inbound gets a CIB code; the old
// COS code stays in PreviousCode and the ledger is kept.
//===============================================================

public class CustomerProfiles
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long CustomerId
    {
        get;
        set;
    }


    //===========================================================
    // Customer Information
    //===========================================================

    // Inbound (our bike customers) / Outside (service only)
    public string CustomerType
    {
        get;
        set;
    } = "Inbound";


    // CIB-000001 (Inbound) / COS-000001 (Outside), central CodeGenerator
    public string CustomerCode
    {
        get;
        set;
    } = string.Empty;


    // The COS code of an Outside customer converted to Inbound, else ''
    public string PreviousCode
    {
        get;
        set;
    } = string.Empty;


    // Typed, single spaces
    public string CustomerName
    {
        get;
        set;
    } = string.Empty;


    // "<Customer Name> - <Phone 1>" : shown everywhere, the ledger's name
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    // Inbound only
    public string FatherName
    {
        get;
        set;
    } = string.Empty;


    // Inbound only
    public string MotherName
    {
        get;
        set;
    } = string.Empty;


    // Inbound only, optional
    public DateOnly? DateOfBirth
    {
        get;
        set;
    }


    // /uploads/customer-photos/... ('' when none)
    public string PhotoPath
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Contact
    //===========================================================

    // 11 digits starting 01, digits only; unique among live customers
    public string Phone1
    {
        get;
        set;
    } = string.Empty;


    // Optional, same format, not unique
    public string Phone2
    {
        get;
        set;
    } = string.Empty;


    // Optional
    public string Email
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Identity & Address
    //===========================================================

    // Inbound : required, 10 / 13 / 17 digits, unique among live Inbound customers
    public string NidNo
    {
        get;
        set;
    } = string.Empty;


    // Inbound only, optional
    public string DrivingLicenseNo
    {
        get;
        set;
    } = string.Empty;


    // Inbound : required; Outside : optional
    public string PresentAddress
    {
        get;
        set;
    } = string.Empty;


    // Inbound only
    public string PermanentAddress
    {
        get;
        set;
    } = string.Empty;


    // Inbound only (bike registration)
    public string RegistrationAddress
    {
        get;
        set;
    } = string.Empty;


    // Optional, a Location (General Settings)
    public long? LocationId
    {
        get;
        set;
    }


    //===========================================================
    // Accounts
    //===========================================================

    // GLR-ccc-ggg-sss-nnnnn under SUB-002-002-005 Trade Receivables
    public string ReceivableLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Always equal to the Display Name
    public string ReceivableLedgerName
    {
        get;
        set;
    } = string.Empty;


    // 0 = cash only
    public decimal CreditLimit
    {
        get;
        set;
    }


    //===========================================================
    // Remarks & Status
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    public bool IsActive
    {
        get;
        set;
    } = true;


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    } = false;


    public long? DeletedBy
    {
        get;
        set;
    }


    public DateTime? DeletedDate
    {
        get;
        set;
    }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }


    public long? ModifiedBy
    {
        get;
        set;
    }


    public DateTime? ModifiedDate
    {
        get;
        set;
    }
}