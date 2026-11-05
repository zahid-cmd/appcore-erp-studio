/* ============================================================
   Motor Bike Receiving
============================================================ */

export interface MotorBikeReceiving
{
    id:
        number;

    code:
        string;

    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Create Motor Bike Receiving
============================================================ */

export interface CreateMotorBikeReceiving
{
    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Update Motor Bike Receiving
============================================================ */

export interface UpdateMotorBikeReceiving
{
    id:
        number;

    name:
        string;

    sampleSearchDropdownId:
        number | null;

    sampleField:
        string;

    status:
        string;

    remarks:
        string;
}



/* ============================================================
   Motor Bike Receiving Defaults
============================================================ */

export interface MotorBikeReceivingDefaults
{
    code:
        string;
}