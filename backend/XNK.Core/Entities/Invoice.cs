using System.ComponentModel.DataAnnotations;
using XNK.Core.Enums;

namespace XNK.Core.Entities;

public class Invoice : BaseEntity
{
    [Required, MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public DateTime InvoiceDate { get; set; }

    public InvoiceType Type { get; set; }

    [MaxLength(200)]
    public string? PaymentTerms { get; set; }

    [MaxLength(10)]
    public string? Currency { get; set; }

    public decimal? SubTotal { get; set; }

    public decimal? Discount { get; set; }

    public decimal? OtherCharges { get; set; }

    public decimal? TotalValue { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<PackingList> PackingLists { get; set; } = new List<PackingList>();
}

public class InvoiceItem : BaseEntity
{
    [MaxLength(200)]
    public string? ProductName { get; set; }

    [MaxLength(50)]
    public string? ProductCode { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public decimal? Quantity { get; set; }

    [MaxLength(20)]
    public string? Unit { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? Amount { get; set; }

    [MaxLength(20)]
    public string? HSCode { get; set; }

    [MaxLength(100)]
    public string? CountryOfOrigin { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
}
