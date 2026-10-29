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

    [MaxLength(1000)]
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

/// <summary>
/// Giá mua vào - Lịch sử giá nhập của từng sản phẩm
/// </summary>
public class ProductPurchasePrice : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    [MaxLength(20)]
    public string Currency { get; set; } = "USD"; // USD or VND

    public decimal UnitPrice { get; set; }

    public bool IsActive { get; set; } = true; // current effective price

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime EffectiveDate { get; set; } = DateTime.UtcNow;

    // Who made this price entry
    [MaxLength(100)]
    public new string? CreatedBy { get; set; }
}

/// <summary>
/// Giá bán ra - ánh xạ từ sản phẩm mua vào sang sản phẩm xuất khẩu kèm giá bán
/// </summary>
public class ProductSalePrice : BaseEntity
{
    // Input (mua vào)
    public Guid PurchasePriceId { get; set; }
    public ProductPurchasePrice PurchasePrice { get; set; } = null!;

    // Output product info (bán ra / xuất khẩu)
    [MaxLength(100)]
    public string OutputSku { get; set; } = string.Empty; // e.g. VN905

    [MaxLength(300)]
    public string? OutputProductName { get; set; }

    // Khách hàng & Thị trường xuất bán
    public Guid? CustomerId { get; set; }

    [MaxLength(200)]
    public string? CustomerName { get; set; }

    [MaxLength(50)]
    public string? CustomerType { get; set; } // ParentCompany, ForeignBuyer, Domestic

    [MaxLength(100)]
    public string? DestinationCountry { get; set; } // Thị trường / Nước đến

    [MaxLength(20)]
    public string Currency { get; set; } = "USD";

    public decimal UnitPrice { get; set; }

    // Tỷ giá quy đổi tham chiếu (khi mua VND bán USD hoặc mua USD bán VND)
    public decimal? ExchangeRate { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime EffectiveDate { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public new string? CreatedBy { get; set; }
}
