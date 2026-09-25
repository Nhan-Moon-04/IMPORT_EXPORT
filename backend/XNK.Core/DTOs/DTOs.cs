using System.ComponentModel.DataAnnotations;

namespace XNK.Core.DTOs;

// ==================== AUTH ====================
public class LoginDto
{
    [Required]
    public string Username { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class RegisterDto
{
    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;
    [Required, MaxLength(50)]
    public string Username { get; set; } = string.Empty;
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Department { get; set; }
    public string? Position { get; set; }
}

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserDto User { get; set; } = null!;
}

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

// ==================== USER ====================
public class UserDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Department { get; set; }
    public string? Position { get; set; }
    public bool IsActive { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public DateTime? LastLoginAt { get; set; }
}

// ==================== PRODUCT ====================
public class ProductDto
{
    public Guid Id { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? NameVi { get; set; }
    public string? ProductGroup { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public string? Composition { get; set; }
    public string? Manufacturer { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? HSCode { get; set; }
    public string? Notes { get; set; }
    public ProductSpecDto? Specification { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateProductDto
{
    [Required, MaxLength(50)]
    public string SKU { get; set; } = string.Empty;
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? NameVi { get; set; }
    public string? ProductGroup { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public string? Composition { get; set; }
    public string? Manufacturer { get; set; }
    public string? CountryOfOrigin { get; set; }
    public string? HSCode { get; set; }
    public string? Notes { get; set; }
    public ProductSpecDto? Specification { get; set; }
}

public class ProductSpecDto
{
    public string? YarnType { get; set; }
    public string? Composition { get; set; }
    public string? DenierCount { get; set; }
    public int? FilamentCount { get; set; }
    public string? TwistDirection { get; set; }
    public string? TPM { get; set; }
    public string? Color { get; set; }
    public string? SDorTBR { get; set; }
    public string? PackagingType { get; set; }
    public decimal? WeightPerUnit { get; set; }
    public string? QualityStandard { get; set; }
    public string? Certifications { get; set; }
}

// ==================== SUPPLIER ====================
public class SupplierDto
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? TradeName { get; set; }
    public string? Address { get; set; }
    public string? Country { get; set; }
    public string? TaxCode { get; set; }
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PaymentTerms { get; set; }
    public string? DeliveryTerm { get; set; }
    public string? Notes { get; set; }
    public int ShipmentCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateSupplierDto
{
    [Required, MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;
    public string? TradeName { get; set; }
    public string? Address { get; set; }
    public string? Country { get; set; }
    public string? TaxCode { get; set; }
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PaymentTerms { get; set; }
    public string? DeliveryTerm { get; set; }
    public string? Notes { get; set; }
}

public class SupplierHistoryDto
{
    public Guid SupplierId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Country { get; set; }
    public int TotalShipments { get; set; }
    public decimal TotalValue { get; set; }
    public decimal TotalQuantity { get; set; }
    public DateTime? LatestShipmentDate { get; set; }
    public List<SupplierHistoryItemDto> History { get; set; } = new();
}

public class SupplierHistoryItemDto
{
    public Guid ShipmentId { get; set; }
    public string ShipmentCode { get; set; } = string.Empty;
    public DateTime? Date { get; set; }
    public string? InvoiceNumber { get; set; }
    public decimal Quantity { get; set; }
    public decimal TotalValue { get; set; }
    public string Status { get; set; } = string.Empty;
}

// ==================== CUSTOMER ====================
public class CustomerDto
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Country { get; set; }
    public string? TaxCode { get; set; }
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PaymentTerms { get; set; }
    public string? DeliveryTerm { get; set; }
    public string? Notes { get; set; }
    public int ShipmentCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCustomerDto
{
    [Required, MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Country { get; set; }
    public string? TaxCode { get; set; }
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? PaymentTerms { get; set; }
    public string? DeliveryTerm { get; set; }
    public string? Notes { get; set; }
}

// ==================== SHIPMENT ====================
public class ShipmentDto
{
    public Guid Id { get; set; }
    public string ShipmentCode { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime? ExpectedDate { get; set; }
    public string? PortOfLoading { get; set; }
    public string? PortOfDischarge { get; set; }
    public string? DeliveryTerm { get; set; }
    public decimal? TotalQuantity { get; set; }
    public decimal? TotalGrossWeight { get; set; }
    public decimal? TotalValue { get; set; }
    public string? Currency { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? SupplierName { get; set; }
    public string? CustomerName { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? CustomerId { get; set; }
    public int ItemCount { get; set; }
    public int InvoiceCount { get; set; }
    public int DocumentCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ShipmentItemDto> Items { get; set; } = new();
    public List<BookingDto> Bookings { get; set; } = new();
    public List<ContainerDto> Containers { get; set; } = new();
    public List<CustomsDeclarationDto> CustomsDeclarations { get; set; } = new();
}

public class BookingDto
{
    public Guid Id { get; set; }
    public string BookingNumber { get; set; } = string.Empty;
    public DateTime? ETD { get; set; }
    public DateTime? ETA { get; set; }
    public string? ShippingLine { get; set; }
    public string? Vessel { get; set; }
    public string? Voyage { get; set; }
    public string? Notes { get; set; }
}

public class ContainerDto
{
    public Guid Id { get; set; }
    public string ContainerNumber { get; set; } = string.Empty;
    public string? SealNumber { get; set; }
    public string? ContainerType { get; set; }
    public decimal? PayloadWeight { get; set; }
    public decimal? TareWeight { get; set; }
    public string? Notes { get; set; }
}

public class CustomsDeclarationDto
{
    public Guid Id { get; set; }
    public string DeclarationNumber { get; set; } = string.Empty;
    public DateTime? DeclarationDate { get; set; }
    public string? DeclarationType { get; set; }
    public string? CustomsBranch { get; set; }
    public int? Status { get; set; }
    public string? Notes { get; set; }
}

public class ShipmentItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? SKU { get; set; }
    public string? Unit { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? TotalValue { get; set; }
    public decimal? GrossWeight { get; set; }
    public decimal? NetWeight { get; set; }
    public string? Notes { get; set; }
}

public class CreateShipmentItemDto
{
    public Guid ProductId { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? GrossWeight { get; set; }
    public decimal? NetWeight { get; set; }
    public string? Notes { get; set; }
}

public class UpsertShipmentItemsDto
{
    public List<CreateShipmentItemDto> Items { get; set; } = new();
}

public class CreateShipmentDto
{
    [Required, MaxLength(50)]
    public string ShipmentCode { get; set; } = string.Empty;
    [Required]
    public string Type { get; set; } = "Import";
    public DateTime? ExpectedDate { get; set; }
    public string? PortOfLoading { get; set; }
    public string? PortOfDischarge { get; set; }
    public string? DeliveryTerm { get; set; }
    public decimal? TotalQuantity { get; set; }
    public decimal? TotalGrossWeight { get; set; }
    public decimal? TotalValue { get; set; }
    public string? Currency { get; set; }
    public string? Notes { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? CustomerId { get; set; }
}

public class UpdateShipmentStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

// ==================== INVOICE ====================
public class InvoiceDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? PaymentTerms { get; set; }
    public string? Currency { get; set; }
    public decimal? SubTotal { get; set; }
    public decimal? Discount { get; set; }
    public decimal? OtherCharges { get; set; }
    public decimal? TotalValue { get; set; }
    public string? Notes { get; set; }
    public Guid ShipmentId { get; set; }
    public string? ShipmentCode { get; set; }
    public string? PartnerName { get; set; }
    public string? ShipmentType { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateInvoiceDto
{
    [Required, MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public string Type { get; set; } = "CommercialInvoice";
    public string? PaymentTerms { get; set; }
    public string? Currency { get; set; }
    public decimal? Discount { get; set; }
    public decimal? OtherCharges { get; set; }
    public string? Notes { get; set; }
    [Required]
    public Guid ShipmentId { get; set; }
    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}

public class InvoiceItemDto
{
    public Guid Id { get; set; }
    public string? ProductName { get; set; }
    public string? ProductCode { get; set; }
    public string? Description { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? Amount { get; set; }
    public string? HSCode { get; set; }
    public string? CountryOfOrigin { get; set; }
    public Guid? ProductId { get; set; }
}

public class CreateInvoiceItemDto
{
    public string? ProductName { get; set; }
    public string? ProductCode { get; set; }
    public string? Description { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? HSCode { get; set; }
    public string? CountryOfOrigin { get; set; }
    public Guid? ProductId { get; set; }
}

// ==================== PACKING LIST ====================
public class PackingListDto
{
    public Guid Id { get; set; }
    public string PackingListNumber { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int? TotalPackages { get; set; }
    public decimal? TotalGrossWeight { get; set; }
    public decimal? TotalNetWeight { get; set; }
    public int? TotalPallets { get; set; }
    public string? PackagingType { get; set; }
    public string? PackagingMaterial { get; set; }
    public string? Notes { get; set; }
    public Guid ShipmentId { get; set; }
    public string? ShipmentCode { get; set; }
    public Guid? InvoiceId { get; set; }
    public string? InvoiceNumber { get; set; }
    public List<PackingListItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreatePackingListDto
{
    [Required, MaxLength(50)]
    public string PackingListNumber { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int? TotalPackages { get; set; }
    public decimal? TotalGrossWeight { get; set; }
    public decimal? TotalNetWeight { get; set; }
    public int? TotalPallets { get; set; }
    public string? PackagingType { get; set; }
    public string? PackagingMaterial { get; set; }
    public string? Notes { get; set; }
    [Required]
    public Guid ShipmentId { get; set; }
    public Guid? InvoiceId { get; set; }
    public List<CreatePackingListItemDto> Items { get; set; } = new();
}

public class PackingListItemDto
{
    public Guid Id { get; set; }
    public string? ProductName { get; set; }
    public string? ProductCode { get; set; }
    public int? NumberOfUnits { get; set; }
    public decimal? WeightPerUnit { get; set; }
    public decimal? TotalWeight { get; set; }
    public int? NumberOfPackages { get; set; }
    public string? LotNumber { get; set; }
    public string? ContainerNumber { get; set; }
    public Guid? ProductId { get; set; }
}

public class CreatePackingListItemDto
{
    public string? ProductName { get; set; }
    public string? ProductCode { get; set; }
    public int? NumberOfUnits { get; set; }
    public decimal? WeightPerUnit { get; set; }
    public decimal? TotalWeight { get; set; }
    public int? NumberOfPackages { get; set; }
    public string? LotNumber { get; set; }
    public string? ContainerNumber { get; set; }
    public Guid? ProductId { get; set; }
}

// ==================== DOCUMENT ====================
public class DocumentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? OriginalFileName { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Version { get; set; }
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public Guid? ShipmentId { get; set; }
    public string? ShipmentCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

// ==================== DASHBOARD ====================
public class DashboardDto
{
    public int TotalImportShipments { get; set; }
    public int TotalExportShipments { get; set; }
    public decimal TotalImportValue { get; set; }
    public decimal TotalExportValue { get; set; }
    public int TotalProducts { get; set; }
    public int TotalSuppliers { get; set; }
    public int TotalCustomers { get; set; }
    public int PendingShipments { get; set; }
    public int MissingDocuments { get; set; }
    public List<MonthlyValueDto> MonthlyImportValues { get; set; } = new();
    public List<MonthlyValueDto> MonthlyExportValues { get; set; } = new();
    public List<RecentShipmentDto> RecentShipments { get; set; } = new();
}

public class MonthlyValueDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Value { get; set; }
    public int Count { get; set; }
}

public class RecentShipmentDto
{
    public Guid Id { get; set; }
    public string ShipmentCode { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PartnerName { get; set; }
    public decimal? TotalValue { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ==================== COMMON ====================
public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public class SearchQueryDto
{
    public string? Keyword { get; set; }
    public string? EntityType { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; } = true;
}

public class SearchResultDto
{
    public string EntityType { get; set; } = string.Empty;
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? SubTitle { get; set; }
    public string? Description { get; set; }
    public DateTime? Date { get; set; }
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null)
        => new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Error(string message)
        => new() { Success = false, Message = message };
}

// ==================== PRODUCT HISTORY ====================
public class ProductHistoryDto
{
    public Guid ProductId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public int TotalImports { get; set; }
    public int TotalExports { get; set; }
    public decimal TotalImportQuantity { get; set; }
    public decimal TotalExportQuantity { get; set; }
    public decimal? LatestImportPrice { get; set; }
    public decimal? AverageImportPrice { get; set; }
    public List<ProductHistoryItemDto> History { get; set; } = new();
}

public class ProductHistoryItemDto
{
    public Guid ShipmentId { get; set; }
    public string ShipmentCode { get; set; } = string.Empty;
    public string ShipmentType { get; set; } = string.Empty; // Import / Export
    public DateTime? Date { get; set; }
    public string? PartnerName { get; set; }
    public string? PartnerCountry { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? InvoiceDate { get; set; }
    public decimal Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public string? Status { get; set; }
}

// ==================== ORDERS ====================
public class PurchaseOrderDto
{
    public Guid Id { get; set; }
    public string PONumber { get; set; } = string.Empty;
    public DateTime PODate { get; set; }
    public decimal? TotalValue { get; set; }
    public string? Currency { get; set; }
    public string? DeliveryTerm { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? OrderedQuantity { get; set; }
    public decimal? DeliveredQuantity { get; set; }
    public string? Notes { get; set; }
    public Guid SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class SalesOrderDto
{
    public Guid Id { get; set; }
    public string SONumber { get; set; } = string.Empty;
    public DateTime SODate { get; set; }
    public decimal? TotalValue { get; set; }
    public string? Currency { get; set; }
    public string? DeliveryTerm { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? OrderedQuantity { get; set; }
    public decimal? DeliveredQuantity { get; set; }
    public string? Notes { get; set; }
    public Guid CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class OrderItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? SKU { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? TotalValue { get; set; }
}

public class CreatePurchaseOrderDto
{
    [Required, MaxLength(50)]
    public string PONumber { get; set; } = string.Empty;
    public DateTime PODate { get; set; } = DateTime.UtcNow;
    public string? Currency { get; set; } = "USD";
    public string? DeliveryTerm { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string? Notes { get; set; }
    [Required]
    public Guid SupplierId { get; set; }
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreateSalesOrderDto
{
    [Required, MaxLength(50)]
    public string SONumber { get; set; } = string.Empty;
    public DateTime SODate { get; set; } = DateTime.UtcNow;
    public string? Currency { get; set; } = "USD";
    public string? DeliveryTerm { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string? Notes { get; set; }
    [Required]
    public Guid CustomerId { get; set; }
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreateOrderItemDto
{
    [Required]
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

