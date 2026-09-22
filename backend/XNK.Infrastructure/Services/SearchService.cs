using Microsoft.EntityFrameworkCore;
using XNK.Core.DTOs;
using XNK.Core.Interfaces;
using XNK.Infrastructure.Data;

namespace XNK.Infrastructure.Services;

public class SearchService : ISearchService
{
    private readonly AppDbContext _db;

    public SearchService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<SearchResultDto>> SearchAsync(SearchQueryDto query)
    {
        var results = new List<SearchResultDto>();
        var keyword = query.Keyword?.Trim().ToLower() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(keyword)) return results;

        var entityType = query.EntityType?.Trim().ToLower();

        // 1. Products
        if (string.IsNullOrEmpty(entityType) || entityType == "all" || entityType == "product" || entityType == "products")
        {
            var products = await _db.Products
                .Where(p => p.SKU.ToLower().Contains(keyword) ||
                            p.Name.ToLower().Contains(keyword) ||
                            (p.NameEn != null && p.NameEn.ToLower().Contains(keyword)) ||
                            (p.NameVi != null && p.NameVi.ToLower().Contains(keyword)) ||
                            (p.ProductGroup != null && p.ProductGroup.ToLower().Contains(keyword)) ||
                            (p.HSCode != null && p.HSCode.ToLower().Contains(keyword)))
                .Take(15)
                .Select(p => new SearchResultDto
                {
                    EntityType = "Product",
                    Id = p.Id,
                    Title = $"{p.SKU} - {p.Name}",
                    SubTitle = p.ProductGroup ?? p.HSCode,
                    Description = p.Description ?? p.Composition,
                    Date = p.CreatedAt
                })
                .ToListAsync();
            results.AddRange(products);
        }

        // 2. Shipments
        if (string.IsNullOrEmpty(entityType) || entityType == "all" || entityType == "shipment" || entityType == "shipments")
        {
            var shipments = await _db.Shipments
                .Include(s => s.Supplier)
                .Include(s => s.Customer)
                .Where(s => s.ShipmentCode.ToLower().Contains(keyword) ||
                            (s.PortOfLoading != null && s.PortOfLoading.ToLower().Contains(keyword)) ||
                            (s.PortOfDischarge != null && s.PortOfDischarge.ToLower().Contains(keyword)) ||
                            (s.Supplier != null && s.Supplier.CompanyName.ToLower().Contains(keyword)) ||
                            (s.Customer != null && s.Customer.CompanyName.ToLower().Contains(keyword)))
                .Take(15)
                .Select(s => new SearchResultDto
                {
                    EntityType = "Shipment",
                    Id = s.Id,
                    Title = s.ShipmentCode,
                    SubTitle = $"{s.Type} | {s.Status} | {s.TotalValue} {s.Currency}",
                    Description = $"{s.PortOfLoading} -> {s.PortOfDischarge} ({(s.Supplier != null ? s.Supplier.CompanyName : s.Customer != null ? s.Customer.CompanyName : "")})",
                    Date = s.ExpectedDate ?? s.CreatedAt
                })
                .ToListAsync();
            results.AddRange(shipments);
        }

        // 3. Suppliers
        if (string.IsNullOrEmpty(entityType) || entityType == "all" || entityType == "supplier" || entityType == "suppliers")
        {
            var suppliers = await _db.Suppliers
                .Where(s => s.CompanyName.ToLower().Contains(keyword) ||
                            (s.TradeName != null && s.TradeName.ToLower().Contains(keyword)) ||
                            (s.TaxCode != null && s.TaxCode.ToLower().Contains(keyword)) ||
                            (s.Country != null && s.Country.ToLower().Contains(keyword)) ||
                            (s.ContactPerson != null && s.ContactPerson.ToLower().Contains(keyword)))
                .Take(15)
                .Select(s => new SearchResultDto
                {
                    EntityType = "Supplier",
                    Id = s.Id,
                    Title = s.CompanyName,
                    SubTitle = $"{s.Country} | MST: {s.TaxCode}",
                    Description = $"Liên hệ: {s.ContactPerson} - {s.Phone ?? s.Email}",
                    Date = s.CreatedAt
                })
                .ToListAsync();
            results.AddRange(suppliers);
        }

        // 4. Customers
        if (string.IsNullOrEmpty(entityType) || entityType == "all" || entityType == "customer" || entityType == "customers")
        {
            var customers = await _db.Customers
                .Where(c => c.CompanyName.ToLower().Contains(keyword) ||
                            (c.TaxCode != null && c.TaxCode.ToLower().Contains(keyword)) ||
                            (c.Country != null && c.Country.ToLower().Contains(keyword)) ||
                            (c.ContactPerson != null && c.ContactPerson.ToLower().Contains(keyword)))
                .Take(15)
                .Select(c => new SearchResultDto
                {
                    EntityType = "Customer",
                    Id = c.Id,
                    Title = c.CompanyName,
                    SubTitle = $"{c.Country} | MST: {c.TaxCode}",
                    Description = $"Liên hệ: {c.ContactPerson} - {c.Phone ?? c.Email}",
                    Date = c.CreatedAt
                })
                .ToListAsync();
            results.AddRange(customers);
        }

        // 5. Invoices
        if (string.IsNullOrEmpty(entityType) || entityType == "all" || entityType == "invoice" || entityType == "invoices")
        {
            var invoices = await _db.Invoices
                .Include(i => i.Shipment)
                .Where(i => i.InvoiceNumber.ToLower().Contains(keyword))
                .Take(15)
                .Select(i => new SearchResultDto
                {
                    EntityType = "Invoice",
                    Id = i.Id,
                    Title = $"Invoice #{i.InvoiceNumber}",
                    SubTitle = $"{i.Type} | {i.TotalValue} {i.Currency}",
                    Description = $"Lô hàng: {i.Shipment.ShipmentCode} - Ngày: {i.InvoiceDate:yyyy-MM-dd}",
                    Date = i.InvoiceDate
                })
                .ToListAsync();
            results.AddRange(invoices);
        }

        return results.OrderByDescending(r => r.Date).ToList();
    }
}
