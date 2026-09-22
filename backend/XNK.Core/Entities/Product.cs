using System.ComponentModel.DataAnnotations;

namespace XNK.Core.Entities;

public class Product : BaseEntity
{
    [Required, MaxLength(50)]
    public string SKU { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? NameEn { get; set; }

    [MaxLength(200)]
    public string? NameVi { get; set; }

    [MaxLength(100)]
    public string? ProductGroup { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(20)]
    public string? Unit { get; set; } // kg, cone, carton, roll...

    [MaxLength(200)]
    public string? Composition { get; set; } // Thành phần nguyên liệu

    [MaxLength(200)]
    public string? Manufacturer { get; set; }

    [MaxLength(100)]
    public string? CountryOfOrigin { get; set; }

    [MaxLength(20)]
    public string? HSCode { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public ProductSpecification? Specification { get; set; }
    public ICollection<ShipmentItem> ShipmentItems { get; set; } = new List<ShipmentItem>();
    public ICollection<InvoiceItem> InvoiceItems { get; set; } = new List<InvoiceItem>();
}

/// <summary>
/// Extended specs for yarn products (sản phẩm sợi)
/// </summary>
public class ProductSpecification : BaseEntity
{
    [MaxLength(50)]
    public string? YarnType { get; set; } // FDY, DTY, POY, PHTY...

    [MaxLength(100)]
    public string? Composition { get; set; } // Polyester, Recycled Polyester...

    [MaxLength(50)]
    public string? DenierCount { get; set; }

    public int? FilamentCount { get; set; }

    [MaxLength(20)]
    public string? TwistDirection { get; set; } // S, Z

    [MaxLength(20)]
    public string? TPM { get; set; }

    [MaxLength(50)]
    public string? Color { get; set; }

    [MaxLength(50)]
    public string? SDorTBR { get; set; }

    [MaxLength(100)]
    public string? PackagingType { get; set; }

    public decimal? WeightPerUnit { get; set; } // Weight per cone/bobin

    [MaxLength(100)]
    public string? QualityStandard { get; set; }

    [MaxLength(200)]
    public string? Certifications { get; set; }

    // Navigation
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
}
