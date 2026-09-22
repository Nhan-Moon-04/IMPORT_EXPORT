using System.ComponentModel.DataAnnotations;
using XNK.Core.Enums;

namespace XNK.Core.Entities;

public class PurchaseOrder : BaseEntity
{
    [Required, MaxLength(50)]
    public string PONumber { get; set; } = string.Empty;

    public DateTime PODate { get; set; }

    public decimal? TotalValue { get; set; }

    [MaxLength(10)]
    public string? Currency { get; set; }

    public DeliveryTerm? DeliveryTerm { get; set; }

    public DateTime? ExpectedDeliveryDate { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Draft;

    public decimal? OrderedQuantity { get; set; }

    public decimal? DeliveredQuantity { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}

public class PurchaseOrderItem : BaseEntity
{
    public decimal? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? TotalValue { get; set; }

    // Navigation
    public Guid PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
}

public class SalesOrder : BaseEntity
{
    [Required, MaxLength(50)]
    public string SONumber { get; set; } = string.Empty;

    public DateTime SODate { get; set; }

    public decimal? TotalValue { get; set; }

    [MaxLength(10)]
    public string? Currency { get; set; }

    public DeliveryTerm? DeliveryTerm { get; set; }

    public DateTime? ExpectedDeliveryDate { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Draft;

    public decimal? OrderedQuantity { get; set; }

    public decimal? DeliveredQuantity { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public ICollection<SalesOrderItem> Items { get; set; } = new List<SalesOrderItem>();
}

public class SalesOrderItem : BaseEntity
{
    public decimal? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public decimal? TotalValue { get; set; }

    // Navigation
    public Guid SalesOrderId { get; set; }
    public SalesOrder SalesOrder { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
}
