using System.ComponentModel.DataAnnotations;
using XNK.Core.Enums;

namespace XNK.Core.Entities;

public class Document : BaseEntity
{
    [Required, MaxLength(200)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? OriginalFileName { get; set; }

    [Required, MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? FileType { get; set; } // pdf, xlsx, docx, jpg...

    public long? FileSize { get; set; } // bytes

    public DocumentCategory Category { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public int Version { get; set; } = 1;

    // Polymorphic link - can attach to Shipment, Invoice, Product, etc.
    [MaxLength(50)]
    public string? EntityType { get; set; } // "Shipment", "Invoice", "Product"...

    public Guid? EntityId { get; set; }

    // Direct navigation for Shipment (most common)
    public Guid? ShipmentId { get; set; }
    public Shipment? Shipment { get; set; }
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string? UserId { get; set; }

    [MaxLength(100)]
    public string? UserName { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public AuditAction Action { get; set; }

    [MaxLength(100)]
    public string? Module { get; set; }

    [MaxLength(200)]
    public string? EntityType { get; set; }

    public Guid? EntityId { get; set; }

    public string? OldValues { get; set; } // JSON

    public string? NewValues { get; set; } // JSON

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }
}
