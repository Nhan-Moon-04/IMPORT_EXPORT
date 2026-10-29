using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Infrastructure.Data;

namespace XNK.API.Controllers;

[ApiController]
[Authorize]
public class PricingController : ControllerBase
{
    private readonly AppDbContext _db;

    public PricingController(AppDbContext db) => _db = db;

    // ─────────────────────────────────────────────────────────────────────────
    // PURCHASE PRICES (Giá Mua Vào)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>GET /api/purchase-prices — list current active purchase prices</summary>
    [HttpGet("api/purchase-prices")]
    public async Task<IActionResult> GetPurchasePrices([FromQuery] Guid? productId)
    {
        var query = _db.ProductPurchasePrices
            .Include(p => p.Product)
            .Where(p => p.IsActive && !p.IsDeleted);

        if (productId.HasValue)
            query = query.Where(p => p.ProductId == productId.Value);

        var items = await query
            .OrderBy(p => p.Product.SKU)
            .ThenByDescending(p => p.EffectiveDate)
            .ToListAsync();

        return Ok(ApiResponse<List<ProductPurchasePriceDto>>.Ok(items.Select(MapPurchase).ToList()));
    }

    /// <summary>GET /api/purchase-prices/{id} — single purchase price with full history</summary>
    [HttpGet("api/purchase-prices/{id}")]
    public async Task<IActionResult> GetPurchasePrice(Guid id)
    {
        var item = await _db.ProductPurchasePrices
            .Include(p => p.Product)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (item == null)
            return NotFound(ApiResponse<object>.Error("Không tìm thấy bản ghi giá mua vào"));

        var dto = MapPurchase(item);

        // Load full history for this product
        var history = await _db.ProductPurchasePrices
            .Include(p => p.Product)
            .Where(p => p.ProductId == item.ProductId && !p.IsDeleted)
            .OrderByDescending(p => p.EffectiveDate)
            .ToListAsync();

        dto.History = history.Select(MapPurchase).ToList();

        return Ok(ApiResponse<ProductPurchasePriceDto>.Ok(dto));
    }

    /// <summary>POST /api/purchase-prices — create new purchase price entry</summary>
    [HttpPost("api/purchase-prices")]
    public async Task<IActionResult> CreatePurchasePrice([FromBody] CreateProductPurchasePriceDto dto)
    {
        // Verify product exists
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId && !p.IsDeleted);
        if (product == null)
            return BadRequest(ApiResponse<object>.Error("Sản phẩm không tồn tại"));

        // Deactivate all previous active prices for this product
        var prevPrices = await _db.ProductPurchasePrices
            .Where(p => p.ProductId == dto.ProductId && p.IsActive && !p.IsDeleted)
            .ToListAsync();

        foreach (var prev in prevPrices)
        {
            prev.IsActive = false;
            prev.UpdatedAt = DateTime.UtcNow;
            prev.UpdatedBy = User.Identity?.Name;
        }

        var entry = new ProductPurchasePrice
        {
            ProductId = dto.ProductId,
            Currency = dto.Currency,
            UnitPrice = dto.UnitPrice,
            Notes = dto.Notes,
            EffectiveDate = dto.EffectiveDate ?? DateTime.UtcNow,
            IsActive = true,
            CreatedBy = User.Identity?.Name
        };

        _db.ProductPurchasePrices.Add(entry);
        await _db.SaveChangesAsync();

        // Reload with navigation
        await _db.Entry(entry).Reference(e => e.Product).LoadAsync();
        return Ok(ApiResponse<ProductPurchasePriceDto>.Ok(MapPurchase(entry), "Tạo giá mua vào thành công"));
    }

    /// <summary>DELETE /api/purchase-prices/{id}</summary>
    [HttpDelete("api/purchase-prices/{id}")]
    public async Task<IActionResult> DeletePurchasePrice(Guid id)
    {
        var item = await _db.ProductPurchasePrices.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (item == null)
            return NotFound(ApiResponse<object>.Error("Không tìm thấy bản ghi"));

        item.IsDeleted = true;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = User.Identity?.Name;

        // If this was the active price, find and activate the most recent previous price
        if (item.IsActive)
        {
            item.IsActive = false;
            var prev = await _db.ProductPurchasePrices
                .Where(p => p.ProductId == item.ProductId && !p.IsDeleted && p.Id != id)
                .OrderByDescending(p => p.EffectiveDate)
                .FirstOrDefaultAsync();
            if (prev != null)
            {
                prev.IsActive = true;
                prev.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa giá mua vào thành công"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SALE PRICES (Giá Bán Ra)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>GET /api/sale-prices — list all current active sale prices</summary>
    [HttpGet("api/sale-prices")]
    public async Task<IActionResult> GetSalePrices([FromQuery] Guid? purchasePriceId)
    {
        var query = _db.ProductSalePrices
            .Include(s => s.PurchasePrice)
                .ThenInclude(pp => pp.Product)
            .Where(s => s.IsActive && !s.IsDeleted && s.PurchasePrice.IsActive);

        if (purchasePriceId.HasValue)
            query = query.Where(s => s.PurchasePriceId == purchasePriceId.Value);

        var items = await query
            .OrderBy(s => s.PurchasePrice.Product.SKU)
            .ThenBy(s => s.OutputSku)
            .ThenByDescending(s => s.EffectiveDate)
            .ToListAsync();

        return Ok(ApiResponse<List<ProductSalePriceDto>>.Ok(items.Select(MapSale).ToList()));
    }

    /// <summary>GET /api/sale-prices/{id} — single sale price with history</summary>
    [HttpGet("api/sale-prices/{id}")]
    public async Task<IActionResult> GetSalePrice(Guid id)
    {
        var item = await _db.ProductSalePrices
            .Include(s => s.PurchasePrice)
                .ThenInclude(pp => pp.Product)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (item == null)
            return NotFound(ApiResponse<object>.Error("Không tìm thấy bản ghi giá bán ra"));

        var dto = MapSale(item);

        // Load history for the same Raw Product + OutputSku (and Customer if specified)
        var rawProductId = item.PurchasePrice.ProductId;
        var historyQuery = _db.ProductSalePrices
            .Include(s => s.PurchasePrice)
                .ThenInclude(pp => pp.Product)
            .Where(s => s.PurchasePrice.ProductId == rawProductId
                     && s.OutputSku == item.OutputSku
                     && !s.IsDeleted);

        if (!string.IsNullOrEmpty(item.CustomerName))
            historyQuery = historyQuery.Where(s => s.CustomerName == item.CustomerName);

        var history = await historyQuery
            .OrderByDescending(s => s.EffectiveDate)
            .ToListAsync();

        dto.History = history.Select(MapSale).ToList();

        return Ok(ApiResponse<ProductSalePriceDto>.Ok(dto));
    }

    /// <summary>POST /api/sale-prices — create new sale price entry</summary>
    [HttpPost("api/sale-prices")]
    public async Task<IActionResult> CreateSalePrice([FromBody] CreateProductSalePriceDto dto)
    {
        // Verify purchase price exists
        var purchasePrice = await _db.ProductPurchasePrices
            .Include(p => p.Product)
            .FirstOrDefaultAsync(p => p.Id == dto.PurchasePriceId && !p.IsDeleted);

        if (purchasePrice == null)
            return BadRequest(ApiResponse<object>.Error("Giá mua vào không tồn tại"));

        // Deactivate previous active sale prices for same PurchasePriceId + OutputSku + Customer
        var prevSales = await _db.ProductSalePrices
            .Where(s => s.PurchasePriceId == dto.PurchasePriceId
                     && s.OutputSku == dto.OutputSku
                     && (s.CustomerName == dto.CustomerName || (s.CustomerId.HasValue && s.CustomerId == dto.CustomerId))
                     && s.IsActive
                     && !s.IsDeleted)
            .ToListAsync();

        foreach (var prev in prevSales)
        {
            prev.IsActive = false;
            prev.UpdatedAt = DateTime.UtcNow;
            prev.UpdatedBy = User.Identity?.Name;
        }

        var entry = new ProductSalePrice
        {
            PurchasePriceId = dto.PurchasePriceId,
            OutputSku = dto.OutputSku,
            OutputProductName = dto.OutputProductName,
            CustomerId = dto.CustomerId,
            CustomerName = dto.CustomerName,
            CustomerType = dto.CustomerType,
            DestinationCountry = dto.DestinationCountry,
            Currency = dto.Currency,
            UnitPrice = dto.UnitPrice,
            ExchangeRate = dto.ExchangeRate,
            Notes = dto.Notes,
            EffectiveDate = dto.EffectiveDate ?? DateTime.UtcNow,
            IsActive = true,
            CreatedBy = User.Identity?.Name
        };

        _db.ProductSalePrices.Add(entry);
        await _db.SaveChangesAsync();

        // Reload navigation
        await _db.Entry(entry).Reference(e => e.PurchasePrice).LoadAsync();
        await _db.Entry(entry.PurchasePrice).Reference(e => e.Product).LoadAsync();

        return Ok(ApiResponse<ProductSalePriceDto>.Ok(MapSale(entry), "Tạo giá bán ra thành công"));
    }

    /// <summary>DELETE /api/sale-prices/{id}</summary>
    [HttpDelete("api/sale-prices/{id}")]
    public async Task<IActionResult> DeleteSalePrice(Guid id)
    {
        var item = await _db.ProductSalePrices.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (item == null)
            return NotFound(ApiResponse<object>.Error("Không tìm thấy bản ghi"));

        item.IsDeleted = true;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = User.Identity?.Name;

        if (item.IsActive)
        {
            item.IsActive = false;
            var prev = await _db.ProductSalePrices
                .Where(s => s.PurchasePriceId == item.PurchasePriceId
                         && s.OutputSku == item.OutputSku
                         && !s.IsDeleted
                         && s.Id != id)
                .OrderByDescending(s => s.EffectiveDate)
                .FirstOrDefaultAsync();
            if (prev != null)
            {
                prev.IsActive = true;
                prev.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa giá bán ra thành công"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mappers
    // ─────────────────────────────────────────────────────────────────────────

    private static ProductPurchasePriceDto MapPurchase(ProductPurchasePrice p) => new()
    {
        Id = p.Id,
        ProductId = p.ProductId,
        ProductSku = p.Product?.SKU ?? string.Empty,
        ProductName = p.Product?.Name ?? string.Empty,
        CountryOfOrigin = p.Product?.CountryOfOrigin ?? string.Empty,
        Currency = p.Currency,
        UnitPrice = p.UnitPrice,
        IsActive = p.IsActive,
        Notes = p.Notes,
        EffectiveDate = p.EffectiveDate,
        CreatedBy = p.CreatedBy,
        CreatedAt = p.CreatedAt
    };

    private static ProductSalePriceDto MapSale(ProductSalePrice s) => new()
    {
        Id = s.Id,
        PurchasePriceId = s.PurchasePriceId,
        InputProductSku = s.PurchasePrice?.Product?.SKU ?? string.Empty,
        InputProductName = s.PurchasePrice?.Product?.Name ?? string.Empty,
        InputCountryOfOrigin = s.PurchasePrice?.Product?.CountryOfOrigin ?? string.Empty,
        InputCurrency = s.PurchasePrice?.Currency ?? "USD",
        InputUnitPrice = s.PurchasePrice?.UnitPrice ?? 0,
        OutputSku = s.OutputSku,
        OutputProductName = s.OutputProductName,
        CustomerId = s.CustomerId,
        CustomerName = s.CustomerName ?? string.Empty,
        CustomerType = s.CustomerType ?? string.Empty,
        DestinationCountry = s.DestinationCountry ?? string.Empty,
        Currency = s.Currency,
        UnitPrice = s.UnitPrice,
        ExchangeRate = s.ExchangeRate,
        IsActive = s.IsActive,
        Notes = s.Notes,
        EffectiveDate = s.EffectiveDate,
        CreatedBy = s.CreatedBy,
        CreatedAt = s.CreatedAt
    };
}
