//===============================================================
// Terms & Conditions (Settings > General Settings, hand-written
// page)
//
// One set of numbered terms per operation (document type); one
// set per operation is the Default the documents print (A4).
// Each line has English and Bangla text (the database is UTF8);
// a page switch on each document will choose the language.
//===============================================================

export interface TermsOperation
{
    Code:
        string;

    Name:
        string;

    // Sales / Procurement
    Group:
        string;

    // The operation's current Default set ('' = none)
    DefaultSetCode:
        string;

    DefaultSetPublicId:
        string;

    // Title the next set gets (e.g. "Sales Invoice - MB 2")
    NextTitle:
        string;
}

export interface TermsConditionListItem
{
    PublicId:
        string;

    Code:
        string;

    Title:
        string;

    OperationCode:
        string;

    OperationName:
        string;

    LineCount:
        number;

    BanglaCount:
        number;

    IsDefault:
        boolean;

    IsActive:
        boolean;

    LinesText:
        string;
}

export interface TermsConditionLine
{
    TextEn:
        string;

    TextBn:
        string;
}

export interface TermsConditionSet
{
    TermsConditionSetId:
        number;

    PublicId:
        string;

    Code:
        string;

    Title:
        string;

    OperationCode:
        string;

    OperationName:
        string;

    IsDefault:
        boolean;

    Note:
        string;

    IsActive:
        boolean;

    Lines:
        TermsConditionLine[];
}

export interface TermsConditionDefaults
{
    NextCode:
        string;

    Operations:
        TermsOperation[];
}

export function emptyTermsLine():
    TermsConditionLine
{
    return { TextEn:'', TextBn:'' };
}
