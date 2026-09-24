using System.ComponentModel.DataAnnotations;

namespace XNK.Core.Entities;

public class CustomsDeclaration : BaseEntity
{
    [Required, MaxLength(50)]
    public string DeclarationNumber { get; set; } = string.Empty;
    public DateTime? DeclarationDate { get; set; }
    [MaxLength(50)]
    public string? DeclarationType { get; set; } // E31, A11, etc.
    [MaxLength(200)]
    public string? CustomsBranch { get; set; }
    public int? Status { get; set; } // 1: Passed, 2: Pending, etc.

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;
}
