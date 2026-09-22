using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Core.Enums;
using XNK.Infrastructure.Data;

namespace XNK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db)
    {
        _db = db;
    }

    // ==================== PURCHASE ORDERS ====================

    [HttpGet("purchase")]
    public async Task<IActionResult> GetPurchaseOrders([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.PurchaseOrders.Include(po => po.Supplier).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(po => po.PONumber.Contains(search) || po.Supplier.CompanyName.Contains(search));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(po => po.PODate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(po => new PurchaseOrderDto
            {
                Id = po.Id,
                PONumber = po.PONumber,
                PODate = po.PODate,
                TotalValue = po.TotalValue,
                Currency = po.Currency,
                DeliveryTerm = po.DeliveryTerm.ToString(),
                ExpectedDeliveryDate = po.ExpectedDeliveryDate,
                Status = po.Status.ToString(),
                OrderedQuantity = po.OrderedQuantity,
                DeliveredQuantity = po.DeliveredQuantity,
                Notes = po.Notes,
                SupplierId = po.SupplierId,
                SupplierName = po.Supplier.CompanyName,
                CreatedAt = po.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<PagedResultDto<PurchaseOrderDto>>.Ok(new PagedResultDto<PurchaseOrderDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        }));
    }

    [HttpGet("purchase/{id}")]
    public async Task<IActionResult> GetPurchaseOrderById(Guid id)
    {
        var po = await _db.PurchaseOrders
            .Include(p => p.Supplier)
            .Include(p => p.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (po == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy đơn mua hàng (PO)"));

        var dto = new PurchaseOrderDto
        {
            Id = po.Id,
            PONumber = po.PONumber,
            PODate = po.PODate,
            TotalValue = po.TotalValue,
            Currency = po.Currency,
            DeliveryTerm = po.DeliveryTerm?.ToString(),
            ExpectedDeliveryDate = po.ExpectedDeliveryDate,
            Status = po.Status.ToString(),
            OrderedQuantity = po.OrderedQuantity,
            DeliveredQuantity = po.DeliveredQuantity,
            Notes = po.Notes,
            SupplierId = po.SupplierId,
            SupplierName = po.Supplier?.CompanyName,
            CreatedAt = po.CreatedAt,
            Items = po.Items.Select(i => new OrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.Product?.Name,
                SKU = i.Product?.SKU,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalValue = i.TotalValue
            }).ToList()
        };

        return Ok(ApiResponse<PurchaseOrderDto>.Ok(dto));
    }

    [HttpPost("purchase")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderDto dto)
    {
        if (await _db.PurchaseOrders.AnyAsync(po => po.PONumber == dto.PONumber))
            return BadRequest(ApiResponse<object>.Error("Số PO đã tồn tại"));

        var po = new PurchaseOrder
        {
            PONumber = dto.PONumber,
            PODate = dto.PODate,
            Currency = dto.Currency,
            DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt) ? dt : null,
            ExpectedDeliveryDate = dto.ExpectedDeliveryDate,
            Notes = dto.Notes,
            SupplierId = dto.SupplierId,
            Status = OrderStatus.Draft,
            CreatedBy = User.Identity?.Name
        };

        decimal totalValue = 0;
        decimal totalQty = 0;

        foreach (var item in dto.Items)
        {
            var itemTotal = item.Quantity * item.UnitPrice;
            totalValue += itemTotal;
            totalQty += item.Quantity;

            po.Items.Add(new PurchaseOrderItem
            {
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                TotalValue = itemTotal
            });
        }

        po.TotalValue = totalValue;
        po.OrderedQuantity = totalQty;

        await _db.PurchaseOrders.AddAsync(po);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPurchaseOrderById), new { id = po.Id }, ApiResponse<PurchaseOrderDto>.Ok(new PurchaseOrderDto
        {
            Id = po.Id,
            PONumber = po.PONumber,
            PODate = po.PODate,
            TotalValue = po.TotalValue,
            Currency = po.Currency,
            Status = po.Status.ToString(),
            SupplierId = po.SupplierId,
            CreatedAt = po.CreatedAt
        }, "Tạo đơn mua hàng thành công"));
    }

    [HttpDelete("purchase/{id}")]
    public async Task<IActionResult> DeletePurchaseOrder(Guid id)
    {
        var po = await _db.PurchaseOrders.FindAsync(id);
        if (po == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy đơn mua hàng"));

        po.IsDeleted = true;
        po.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(null!, "Xóa đơn mua hàng thành công"));
    }

    // ==================== SALES ORDERS ====================

    [HttpGet("sales")]
    public async Task<IActionResult> GetSalesOrders([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.SalesOrders.Include(so => so.Customer).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(so => so.SONumber.Contains(search) || so.Customer.CompanyName.Contains(search));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(so => so.SODate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(so => new SalesOrderDto
            {
                Id = so.Id,
                SONumber = so.SONumber,
                SODate = so.SODate,
                TotalValue = so.TotalValue,
                Currency = so.Currency,
                DeliveryTerm = so.DeliveryTerm.ToString(),
                ExpectedDeliveryDate = so.ExpectedDeliveryDate,
                Status = so.Status.ToString(),
                OrderedQuantity = so.OrderedQuantity,
                DeliveredQuantity = so.DeliveredQuantity,
                Notes = so.Notes,
                CustomerId = so.CustomerId,
                CustomerName = so.Customer.CompanyName,
                CreatedAt = so.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<PagedResultDto<SalesOrderDto>>.Ok(new PagedResultDto<SalesOrderDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        }));
    }

    [HttpGet("sales/{id}")]
    public async Task<IActionResult> GetSalesOrderById(Guid id)
    {
        var so = await _db.SalesOrders
            .Include(s => s.Customer)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (so == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy đơn bán hàng (SO)"));

        var dto = new SalesOrderDto
        {
            Id = so.Id,
            SONumber = so.SONumber,
            SODate = so.SODate,
            TotalValue = so.TotalValue,
            Currency = so.Currency,
            DeliveryTerm = so.DeliveryTerm?.ToString(),
            ExpectedDeliveryDate = so.ExpectedDeliveryDate,
            Status = so.Status.ToString(),
            OrderedQuantity = so.OrderedQuantity,
            DeliveredQuantity = so.DeliveredQuantity,
            Notes = so.Notes,
            CustomerId = so.CustomerId,
            CustomerName = so.Customer?.CompanyName,
            CreatedAt = so.CreatedAt,
            Items = so.Items.Select(i => new OrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.Product?.Name,
                SKU = i.Product?.SKU,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalValue = i.TotalValue
            }).ToList()
        };

        return Ok(ApiResponse<SalesOrderDto>.Ok(dto));
    }

    [HttpPost("sales")]
    public async Task<IActionResult> CreateSalesOrder([FromBody] CreateSalesOrderDto dto)
    {
        if (await _db.SalesOrders.AnyAsync(so => so.SONumber == dto.SONumber))
            return BadRequest(ApiResponse<object>.Error("Số SO đã tồn tại"));

        var so = new SalesOrder
        {
            SONumber = dto.SONumber,
            SODate = dto.SODate,
            Currency = dto.Currency,
            DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt) ? dt : null,
            ExpectedDeliveryDate = dto.ExpectedDeliveryDate,
            Notes = dto.Notes,
            CustomerId = dto.CustomerId,
            Status = OrderStatus.Draft,
            CreatedBy = User.Identity?.Name
        };

        decimal totalValue = 0;
        decimal totalQty = 0;

        foreach (var item in dto.Items)
        {
            var itemTotal = item.Quantity * item.UnitPrice;
            totalValue += itemTotal;
            totalQty += item.Quantity;

            so.Items.Add(new SalesOrderItem
            {
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                TotalValue = itemTotal
            });
        }

        so.TotalValue = totalValue;
        so.OrderedQuantity = totalQty;

        await _db.SalesOrders.AddAsync(so);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSalesOrderById), new { id = so.Id }, ApiResponse<SalesOrderDto>.Ok(new SalesOrderDto
        {
            Id = so.Id,
            SONumber = so.SONumber,
            SODate = so.SODate,
            TotalValue = so.TotalValue,
            Currency = so.Currency,
            Status = so.Status.ToString(),
            CustomerId = so.CustomerId,
            CreatedAt = so.CreatedAt
        }, "Tạo đơn bán hàng thành công"));
    }

    [HttpDelete("sales/{id}")]
    public async Task<IActionResult> DeleteSalesOrder(Guid id)
    {
        var so = await _db.SalesOrders.FindAsync(id);
        if (so == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy đơn bán hàng"));

        so.IsDeleted = true;
        so.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(null!, "Xóa đơn bán hàng thành công"));
    }
}
