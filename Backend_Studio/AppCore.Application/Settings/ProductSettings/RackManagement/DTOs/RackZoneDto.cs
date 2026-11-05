//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Zone DTO (read)
//===============================================================

public class RackZoneDto
{
    public long RackZoneId { get; set; }


    //===========================================================
    // Location
    //===========================================================

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;


    //===========================================================
    // Zone
    //===========================================================

    // Z-01
    public string ZoneCode { get; set; } = string.Empty;

    public string ZoneName { get; set; } = string.Empty;

    // 1 = nearest the counter
    public int Priority { get; set; }

    // Live racks in the zone
    public int RackCount { get; set; }


    //===========================================================
    // Description / Status
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }


    //===========================================================
    // Soft Delete / Audit
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Create Rack Zone DTO (Zone Code and Branch set by the server)
//===============================================================

public class CreateRackZoneDto
{
    public long WarehouseId { get; set; }

    public string ZoneName { get; set; } = string.Empty;

    public int Priority { get; set; } = 1;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Update Rack Zone DTO (warehouse locked after saving; sent back
// only to be checked)
//===============================================================

public class UpdateRackZoneDto
    : CreateRackZoneDto
{
    public long RackZoneId { get; set; }
}


//===============================================================
// Rack Zone Defaults DTO ('' / 1 when no warehouse is chosen)
//===============================================================

public class RackZoneDefaultsDto
{
    // Z-02
    public string Code { get; set; } = string.Empty;

    // Highest priority of the warehouse's live zones + 1
    public int NextPriority { get; set; } = 1;
}
