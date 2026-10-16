// PAGE-CLONED : Bank Setup -> Card Setup
//===============================================================
// Card Setup
//===============================================================

export interface CardSetup
{
    CardSetupId: number;

    CardCode: string;

    CardName: string;

    Remarks: string;

    Status: boolean;

    ShortName: string;

    IssuingBank: string;

}


//===============================================================
// Create Card Setup
//===============================================================

export interface CreateCardSetup
{
    CardCode: string;

    CardName: string;

    Remarks: string;

    Status: boolean;

    ShortName: string;

    IssuingBank: string;

}


//===============================================================
// Update Card Setup
//===============================================================

export interface UpdateCardSetup
{
    CardSetupId: number;

    CardCode: string;

    CardName: string;

    Remarks: string;

    Status: boolean;

    ShortName: string;

    IssuingBank: string;

}
