using XNK.Core.Interfaces;
using XNK.Infrastructure.Data;

namespace XNK.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IProductRepository? _products;
    private ISupplierRepository? _suppliers;
    private ICustomerRepository? _customers;
    private IShipmentRepository? _shipments;
    private IInvoiceRepository? _invoices;
    private IPackingListRepository? _packingLists;
    private IDocumentRepository? _documents;
    private IAuditLogRepository? _auditLogs;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IProductRepository Products => _products ??= new ProductRepository(_context);
    public ISupplierRepository Suppliers => _suppliers ??= new SupplierRepository(_context);
    public ICustomerRepository Customers => _customers ??= new CustomerRepository(_context);
    public IShipmentRepository Shipments => _shipments ??= new ShipmentRepository(_context);
    public IInvoiceRepository Invoices => _invoices ??= new InvoiceRepository(_context);
    public IPackingListRepository PackingLists => _packingLists ??= new PackingListRepository(_context);
    public IDocumentRepository Documents => _documents ??= new DocumentRepository(_context);
    public IAuditLogRepository AuditLogs => _auditLogs ??= new AuditLogRepository(_context);

    public async Task<int> SaveChangesAsync()
        => await _context.SaveChangesAsync();

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
