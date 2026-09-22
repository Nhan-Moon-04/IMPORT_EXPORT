using System.ComponentModel.DataAnnotations;

namespace XNK.Core.Entities;

public class PackingList : BaseEntity
{
    [Required, MaxLength(50)]
    public string PackingListNumber { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public int? TotalPackages { get; set; }

    public decimal? TotalGrossWeight { get; set; }

    public decimal? TotalNetWeight { get; set; }

    public int? TotalPallets { get; set; }

    [MaxLength(200)]
    public string? PackagingType { get; set; }

    [MaxLength(200)]
    public string? PackagingMaterial { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid ShipmentId { get; set; }
    public Shipment Shipment { get; set; } = null!;

    public Guid? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public ICollection<PackingListItem> Items { get; set; } = new List<PackingListItem>();
}

public class PackingListItem : BaseEntity
{
    [MaxLength(200)]
    public string? ProductName { get; set; }

    [MaxLength(50)]
    public string? ProductCode { get; set; }

    public int? NumberOfUnits { get; set; } // cone/bobin/carton

    public decimal? WeightPerUnit { get; set; }

    public decimal? TotalWeight { get; set; }

    public int? NumberOfPackages { get; set; }

    [MaxLength(50)]
    public string? LotNumber { get; set; }

    [MaxLength(50)]
    public string? ContainerNumber { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // Navigation
    public Guid PackingListId { get; set; }
    public PackingList PackingList { get; set; } = null!;

    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
}
