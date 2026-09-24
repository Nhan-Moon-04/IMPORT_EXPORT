using System.ComponentModel.DataAnnotations;
using XNK.Core.Enums;

namespace XNK.Core.Entities;

public class Shipment : BaseEntity
{
    [Required, MaxLength(50)]
    public string ShipmentCode { get; set; } = string.Empty;

    public ShipmentType Type { get; set; }

    public DateTime? ExpectedDate { get; set; }

    [MaxLength(100)]
    public string? PortOfLoading { get; set; }

    [MaxLength(100)]
    public string? PortOfDischarge { get; set; }

    public DeliveryTerm? DeliveryTerm { get; set; }

    public decimal? TotalQuantity { get; set; }

    public decimal? TotalGrossWeight { get; set; }

    public decimal? TotalValue { get; set; }

    [MaxLength(10)]
    public string? Currency { get; set; } // USD, VND, CNY...

    public ShipmentStatus Status { get; set; } = ShipmentStatus.Draft;

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public ICollection<ShipmentItem> Items { get; set; } = new List<ShipmentItem>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<PackingList> PackingLists { get; set; } = new List<PackingList>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Container> Containers { get; set; } = new List<Container>();
    public ICollection<CustomsDeclaration> CustomsDeclarations { get; set; } = new List<CustomsDeclaration>();
}

public class ShipmentItem : BaseEntity
{
    public decimal? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? TotalValue { get; set; }

    public decimal? GrossWeight { get; set; }

    public decimal? NetWeight { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
}
