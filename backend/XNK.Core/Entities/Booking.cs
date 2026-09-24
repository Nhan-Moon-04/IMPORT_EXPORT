using System.ComponentModel.DataAnnotations;

namespace XNK.Core.Entities;

public class Booking : BaseEntity
{
    [Required, MaxLength(50)]
    public string BookingNumber { get; set; } = string.Empty;
    public DateTime? ETD { get; set; }
    public DateTime? ETA { get; set; }
    [MaxLength(200)]
    public string? ShippingLine { get; set; }
    [MaxLength(200)]
    public string? Vessel { get; set; }
    [MaxLength(50)]
    public string? Voyage { get; set; }
    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;
}
