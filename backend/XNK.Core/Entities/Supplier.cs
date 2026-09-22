using System.ComponentModel.DataAnnotations;
using XNK.Core.Enums;

namespace XNK.Core.Entities;

public class Supplier : BaseEntity
{
    [Required, MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? TradeName { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(50)]
    public string? TaxCode { get; set; }

    [MaxLength(100)]
    public string? ContactPerson { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(200)]
    public string? PaymentTerms { get; set; }

    public DeliveryTerm? DeliveryTerm { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}

public class Customer : BaseEntity
{
    [Required, MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(50)]
    public string? TaxCode { get; set; }

    [MaxLength(100)]
    public string? ContactPerson { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(200)]
    public string? PaymentTerms { get; set; }

    public DeliveryTerm? DeliveryTerm { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
    public ICollection<SalesOrder> SalesOrders { get; set; } = new List<SalesOrder>();
}

public class Partner : BaseEntity
{
    [Required, MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    public PartnerType Type { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(100)]
    public string? ContactPerson { get; set; }

    [MaxLength(100)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
