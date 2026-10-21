//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Bangladesh Geography (fixed list)
//
// The 8 divisions and their 64 districts, in display order.
// Fixed by law, so they are not a setup page; Locations stores
// them by name and the server checks the pair against this list.
//===============================================================

public static class BangladeshGeography
{
    public static readonly IReadOnlyList<(string Division, string[] Districts)> Divisions =
        new List<(string, string[])>
        {
            ("Barishal",   new[] { "Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur" }),
            ("Chattogram", new[] { "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati" }),
            ("Dhaka",      new[] { "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail" }),
            ("Khulna",     new[] { "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira" }),
            ("Mymensingh", new[] { "Jamalpur", "Mymensingh", "Netrokona", "Sherpur" }),
            ("Rajshahi",   new[] { "Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj" }),
            ("Rangpur",    new[] { "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon" }),
            ("Sylhet",     new[] { "Habiganj", "Moulvibazar", "Sunamganj", "Sylhet" })
        };


    //===========================================================
    // Canonical division name ("dhaka" -> "Dhaka"), or null
    //===========================================================

    public static string? FindDivision
    (
        string? division
    )
    {
        string value =
            (division ?? string.Empty).Trim();

        return Divisions
            .Select(x => x.Division)
            .FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase)
            );
    }


    //===========================================================
    // Canonical district name inside the division, or null
    //===========================================================

    public static string? FindDistrict
    (
        string? division,
        string? district
    )
    {
        string? canonicalDivision =
            FindDivision(division);

        if
        (
            canonicalDivision == null
        )
        {
            return null;
        }

        string value =
            (district ?? string.Empty).Trim();

        return Divisions
            .First(x => x.Division == canonicalDivision)
            .Districts
            .FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase)
            );
    }
}