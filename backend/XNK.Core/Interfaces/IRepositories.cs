using XNK.Core.DTOs;
using XNK.Core.Entities;

namespace XNK.Core.Interfaces;

public interface IGenericRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(Guid id); // soft delete
    Task<int> CountAsync();
}

public interface IProductRepository : IGenericRepository<Product>
{
    Task<PagedResultDto<Product>> GetPagedAsync(string? search, string? group, int page, int pageSize, string? sortBy, bool sortDesc);
    Task<Product?> GetBySkuAsync(string sku);
    Task<Product?> GetWithSpecificationAsync(Guid id);
    Task<bool> SkuExistsAsync(string sku, Guid? excludeId = null);
    Task<ProductHistoryDto?> GetHistoryAsync(Guid id);
}

public interface ISupplierRepository : IGenericRepository<Supplier>
{
    Task<PagedResultDto<Supplier>> GetPagedAsync(string? search, string? country, int page, int pageSize);
    Task<SupplierHistoryDto?> GetHistoryAsync(Guid id);
}

public interface ICustomerRepository : IGenericRepository<Customer>
{
    Task<PagedResultDto<Customer>> GetPagedAsync(string? search, string? country, int page, int pageSize);
}

public interface IShipmentRepository : IGenericRepository<Shipment>
{
    Task<PagedResultDto<Shipment>> GetPagedAsync(string? search, string? type, string? status, int page, int pageSize, string? sortBy, bool sortDesc);
    Task<Shipment?> GetWithDetailsAsync(Guid id);
    Task<bool> CodeExistsAsync(string code, Guid? excludeId = null);
}

public interface IInvoiceRepository : IGenericRepository<Invoice>
{
    Task<PagedResultDto<Invoice>> GetPagedAsync(string? search, Guid? shipmentId, int page, int pageSize);
    Task<Invoice?> GetWithItemsAsync(Guid id);
    Task<bool> NumberExistsAsync(string number, XNK.Core.Enums.InvoiceType type, Guid? excludeId = null);
}

public interface IPackingListRepository : IGenericRepository<PackingList>
{
    Task<PagedResultDto<PackingList>> GetPagedAsync(string? search, Guid? shipmentId, int page, int pageSize);
    Task<PackingList?> GetWithItemsAsync(Guid id);
}

public interface IDocumentRepository : IGenericRepository<Document>
{
    Task<PagedResultDto<Document>> GetPagedAsync(string? search, string? category, Guid? shipmentId, string? entityType, Guid? entityId, int page, int pageSize);
    Task<IEnumerable<Document>> GetByEntityAsync(string entityType, Guid entityId);
}

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log);
    Task<PagedResultDto<AuditLog>> GetPagedAsync(string? userId, string? module, DateTime? from, DateTime? to, int page, int pageSize);
}

public interface IUnitOfWork : IDisposable
{
    IProductRepository Products { get; }
    ISupplierRepository Suppliers { get; }
    ICustomerRepository Customers { get; }
    IShipmentRepository Shipments { get; }
    IInvoiceRepository Invoices { get; }
    IPackingListRepository PackingLists { get; }
    IDocumentRepository Documents { get; }
    IAuditLogRepository AuditLogs { get; }
    Task<int> SaveChangesAsync();
}
