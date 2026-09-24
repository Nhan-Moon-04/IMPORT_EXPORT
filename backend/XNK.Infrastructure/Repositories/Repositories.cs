using Microsoft.EntityFrameworkCore;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Core.Interfaces;
using XNK.Infrastructure.Data;

namespace XNK.Infrastructure.Repositories;

public class ProductRepository : GenericRepository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<Product>> GetPagedAsync(string? search, string? group, int page, int pageSize, string? sortBy, bool sortDesc)
    {
        var query = _dbSet.Include(p => p.Specification).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || p.SKU.Contains(search) || 
                                     (p.NameEn != null && p.NameEn.Contains(search)) ||
                                     (p.HSCode != null && p.HSCode.Contains(search)));
        if (!string.IsNullOrWhiteSpace(group))
            query = query.Where(p => p.ProductGroup == group);

        var totalCount = await query.CountAsync();

        query = sortBy?.ToLower() switch
        {
            "name" => sortDesc ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
            "sku" => sortDesc ? query.OrderByDescending(p => p.SKU) : query.OrderBy(p => p.SKU),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResultDto<Product> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<Product?> GetBySkuAsync(string sku)
        => await _dbSet.FirstOrDefaultAsync(p => p.SKU == sku);

    public async Task<Product?> GetWithSpecificationAsync(Guid id)
        => await _dbSet.Include(p => p.Specification).FirstOrDefaultAsync(p => p.Id == id);

    public async Task<bool> SkuExistsAsync(string sku, Guid? excludeId = null)
    {
        var query = _dbSet.Where(p => p.SKU == sku);
        if (excludeId.HasValue) query = query.Where(p => p.Id != excludeId.Value);
        return await query.AnyAsync();
    }

    public async Task<ProductHistoryDto?> GetHistoryAsync(Guid id)
    {
        var product = await _dbSet.FirstOrDefaultAsync(p => p.Id == id);
        if (product == null) return null;

        var invoiceItems = await _context.InvoiceItems
            .Include(ii => ii.Invoice)
                .ThenInclude(i => i.Shipment)
                    .ThenInclude(s => s.Supplier)
            .Include(ii => ii.Invoice)
                .ThenInclude(i => i.Shipment)
                    .ThenInclude(s => s.Customer)
            .Where(ii => ii.ProductId == id)
            .OrderByDescending(ii => ii.Invoice.InvoiceDate)
            .ToListAsync();

        var historyItems = invoiceItems.Select(ii => new ProductHistoryItemDto
        {
            ShipmentId = ii.Invoice.ShipmentId,
            ShipmentCode = ii.Invoice.Shipment?.ShipmentCode ?? "",
            ShipmentType = ii.Invoice.Shipment?.Type.ToString() ?? "Import",
            Date = ii.Invoice.InvoiceDate,
            PartnerName = ii.Invoice.Shipment?.Supplier?.CompanyName ?? ii.Invoice.Shipment?.Customer?.CompanyName,
            PartnerCountry = ii.Invoice.Shipment?.Supplier?.Country ?? ii.Invoice.Shipment?.Customer?.Country,
            InvoiceNumber = ii.Invoice.InvoiceNumber,
            InvoiceDate = ii.Invoice.InvoiceDate,
            Quantity = ii.Quantity ?? 0,
            Unit = ii.Unit ?? product.Unit,
            UnitPrice = ii.UnitPrice ?? 0,
            TotalAmount = ii.Amount ?? 0,
            Currency = ii.Invoice.Currency ?? "USD",
            Status = ii.Invoice.Shipment?.Status.ToString()
        }).ToList();

        var importItems = historyItems.Where(h => h.ShipmentType == "Import").ToList();
        var exportItems = historyItems.Where(h => h.ShipmentType == "Export").ToList();

        return new ProductHistoryDto
        {
            ProductId = product.Id,
            SKU = product.SKU,
            ProductName = product.Name,
            Unit = product.Unit,
            TotalImports = importItems.Count,
            TotalExports = exportItems.Count,
            TotalImportQuantity = importItems.Sum(h => h.Quantity),
            TotalExportQuantity = exportItems.Sum(h => h.Quantity),
            LatestImportPrice = importItems.FirstOrDefault()?.UnitPrice,
            AverageImportPrice = importItems.Any() ? importItems.Average(h => h.UnitPrice) : null,
            History = historyItems
        };
    }
}

public class SupplierRepository : GenericRepository<Supplier>, ISupplierRepository
{
    public SupplierRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<Supplier>> GetPagedAsync(string? search, string? country, int page, int pageSize)
    {
        var query = _dbSet.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.CompanyName.Contains(search) || (s.TradeName != null && s.TradeName.Contains(search)) ||
                                     (s.ContactPerson != null && s.ContactPerson.Contains(search)));
        if (!string.IsNullOrWhiteSpace(country))
            query = query.Where(s => s.Country == country);

        var totalCount = await query.CountAsync();
        var items = await query.OrderByDescending(s => s.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResultDto<Supplier> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<SupplierHistoryDto?> GetHistoryAsync(Guid id)
    {
        var supplier = await _dbSet.FirstOrDefaultAsync(s => s.Id == id);
        if (supplier == null) return null;

        var shipments = await _context.Shipments
            .Include(s => s.Invoices)
            .Where(s => s.SupplierId == id)
            .OrderByDescending(s => s.ExpectedDate ?? s.CreatedAt)
            .ToListAsync();

        var historyItems = shipments.Select(s => new SupplierHistoryItemDto
        {
            ShipmentId = s.Id,
            ShipmentCode = s.ShipmentCode,
            Date = s.ExpectedDate ?? s.CreatedAt,
            InvoiceNumber = s.Invoices.FirstOrDefault()?.InvoiceNumber,
            Quantity = s.TotalQuantity ?? 0,
            TotalValue = s.TotalValue ?? 0,
            Status = s.Status.ToString()
        }).ToList();

        return new SupplierHistoryDto
        {
            SupplierId = supplier.Id,
            CompanyName = supplier.CompanyName,
            Country = supplier.Country,
            TotalShipments = shipments.Count,
            TotalValue = shipments.Sum(s => s.TotalValue ?? 0),
            TotalQuantity = shipments.Sum(s => s.TotalQuantity ?? 0),
            LatestShipmentDate = shipments.FirstOrDefault()?.ExpectedDate ?? shipments.FirstOrDefault()?.CreatedAt,
            History = historyItems
        };
    }
}

public class CustomerRepository : GenericRepository<Customer>, ICustomerRepository
{
    public CustomerRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<Customer>> GetPagedAsync(string? search, string? country, int page, int pageSize)
    {
        var query = _dbSet.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.CompanyName.Contains(search) || (c.ContactPerson != null && c.ContactPerson.Contains(search)));
        if (!string.IsNullOrWhiteSpace(country))
            query = query.Where(c => c.Country == country);

        var totalCount = await query.CountAsync();
        var items = await query.OrderByDescending(c => c.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResultDto<Customer> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }
}

public class ShipmentRepository : GenericRepository<Shipment>, IShipmentRepository
{
    public ShipmentRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<Shipment>> GetPagedAsync(string? search, string? type, string? status, int page, int pageSize, string? sortBy, bool sortDesc)
    {
        var query = _dbSet.Include(s => s.Supplier).Include(s => s.Customer).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.ShipmentCode.Contains(search) || 
                                     (s.Supplier != null && s.Supplier.CompanyName.Contains(search)) ||
                                     (s.Customer != null && s.Customer.CompanyName.Contains(search)));
        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<Core.Enums.ShipmentType>(type, true, out var shipType))
            query = query.Where(s => s.Type == shipType);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<Core.Enums.ShipmentStatus>(status, true, out var shipStatus))
            query = query.Where(s => s.Status == shipStatus);

        var totalCount = await query.CountAsync();

        query = sortBy?.ToLower() switch
        {
            "code" => sortDesc ? query.OrderByDescending(s => s.ShipmentCode) : query.OrderBy(s => s.ShipmentCode),
            "value" => sortDesc ? query.OrderByDescending(s => s.TotalValue) : query.OrderBy(s => s.TotalValue),
            "date" => sortDesc ? query.OrderByDescending(s => s.ExpectedDate) : query.OrderBy(s => s.ExpectedDate),
            _ => query.OrderByDescending(s => s.CreatedAt)
        };

        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResultDto<Shipment> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<Shipment?> GetWithDetailsAsync(Guid id)
        => await _dbSet
            .Include(s => s.Supplier)
            .Include(s => s.Customer)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .Include(s => s.Invoices).ThenInclude(i => i.Items)
            .Include(s => s.PackingLists).ThenInclude(pl => pl.Items)
            .Include(s => s.Documents)
            .Include(s => s.Bookings)
            .Include(s => s.Containers)
            .Include(s => s.CustomsDeclarations)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<bool> CodeExistsAsync(string code, Guid? excludeId = null)
    {
        var query = _dbSet.Where(s => s.ShipmentCode == code);
        if (excludeId.HasValue) query = query.Where(s => s.Id != excludeId.Value);
        return await query.AnyAsync();
    }
}

public class InvoiceRepository : GenericRepository<Invoice>, IInvoiceRepository
{
    public InvoiceRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<Invoice>> GetPagedAsync(string? search, Guid? shipmentId, int page, int pageSize)
    {
        var query = _dbSet.Include(i => i.Shipment).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(i => i.InvoiceNumber.Contains(search));
        if (shipmentId.HasValue)
            query = query.Where(i => i.ShipmentId == shipmentId.Value);

        var totalCount = await query.CountAsync();
        var items = await query.OrderByDescending(i => i.InvoiceDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResultDto<Invoice> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<Invoice?> GetWithItemsAsync(Guid id)
        => await _dbSet.Include(i => i.Items).ThenInclude(ii => ii.Product)
                       .Include(i => i.Shipment)
                       .FirstOrDefaultAsync(i => i.Id == id);

    public async Task<bool> NumberExistsAsync(string number, Guid? excludeId = null)
    {
        var query = _dbSet.Where(i => i.InvoiceNumber == number);
        if (excludeId.HasValue) query = query.Where(i => i.Id != excludeId.Value);
        return await query.AnyAsync();
    }
}

public class PackingListRepository : GenericRepository<PackingList>, IPackingListRepository
{
    public PackingListRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<PackingList>> GetPagedAsync(string? search, Guid? shipmentId, int page, int pageSize)
    {
        var query = _dbSet.Include(pl => pl.Shipment).Include(pl => pl.Invoice).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(pl => pl.PackingListNumber.Contains(search));
        if (shipmentId.HasValue)
            query = query.Where(pl => pl.ShipmentId == shipmentId.Value);

        var totalCount = await query.CountAsync();
        var items = await query.OrderByDescending(pl => pl.Date).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResultDto<PackingList> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<PackingList?> GetWithItemsAsync(Guid id)
        => await _dbSet.Include(pl => pl.Items).ThenInclude(pli => pli.Product)
                       .Include(pl => pl.Shipment)
                       .Include(pl => pl.Invoice)
                       .FirstOrDefaultAsync(pl => pl.Id == id);
}

public class DocumentRepository : GenericRepository<Document>, IDocumentRepository
{
    public DocumentRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<Document>> GetPagedAsync(string? search, string? category, Guid? shipmentId, string? entityType, Guid? entityId, int page, int pageSize)
    {
        var query = _dbSet.Include(d => d.Shipment).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(d => d.FileName.Contains(search) || (d.OriginalFileName != null && d.OriginalFileName.Contains(search)));
        if (!string.IsNullOrWhiteSpace(category) && Enum.TryParse<Core.Enums.DocumentCategory>(category, true, out var cat))
            query = query.Where(d => d.Category == cat);
        if (shipmentId.HasValue)
            query = query.Where(d => d.ShipmentId == shipmentId.Value);
        if (!string.IsNullOrWhiteSpace(entityType) && entityId.HasValue)
            query = query.Where(d => d.EntityType == entityType && d.EntityId == entityId.Value);

        var totalCount = await query.CountAsync();
        var items = await query.OrderByDescending(d => d.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResultDto<Document> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task<IEnumerable<Document>> GetByEntityAsync(string entityType, Guid entityId)
        => await _dbSet.Where(d => d.EntityType == entityType && d.EntityId == entityId).OrderByDescending(d => d.CreatedAt).ToListAsync();
}

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _context;
    public AuditLogRepository(AppDbContext context) { _context = context; }

    public async Task AddAsync(AuditLog log)
    {
        await _context.AuditLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }

    public async Task<PagedResultDto<AuditLog>> GetPagedAsync(string? userId, string? module, DateTime? from, DateTime? to, int page, int pageSize)
    {
        var query = _context.AuditLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(userId)) query = query.Where(a => a.UserId == userId);
        if (!string.IsNullOrWhiteSpace(module)) query = query.Where(a => a.Module == module);
        if (from.HasValue) query = query.Where(a => a.Timestamp >= from.Value);
        if (to.HasValue) query = query.Where(a => a.Timestamp <= to.Value);

        var totalCount = await query.CountAsync();
        var items = await query.OrderByDescending(a => a.Timestamp).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResultDto<AuditLog> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }
}
