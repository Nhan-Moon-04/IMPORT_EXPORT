using System.ComponentModel.DataAnnotations;

namespace XNK.Core.Entities;

public class Container : BaseEntity
{
    [Required, MaxLength(50)]
    public string ContainerNumber { get; set; } = string.Empty;
    [MaxLength(50)]
    public string? SealNumber { get; set; }
    [MaxLength(50)]
    public string? ContainerType { get; set; } // 20DC, 40HC, etc.
    public decimal? PayloadWeight { get; set; }
    public decimal? TareWeight { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;
}
