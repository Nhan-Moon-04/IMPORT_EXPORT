using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Core.Enums;
using XNK.Core.Interfaces;
using XNK.Infrastructure.Data;

namespace XNK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShipmentsController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly AppDbContext _context;
    public ShipmentsController(IUnitOfWork uow, AppDbContext context)
    {
        _uow = uow;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? type,
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null, [FromQuery] bool sortDesc = true)
    {
        var result = await _uow.Shipments.GetPagedAsync(search, type, status, page, pageSize, sortBy, sortDesc);
        var dto = new PagedResultDto<ShipmentDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount, Page = result.Page, PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<ShipmentDto>>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var entity = await _uow.Shipments.GetWithDetailsAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy lô hàng"));
        return Ok(ApiResponse<ShipmentDto>.Ok(MapToDto(entity)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateShipmentDto dto)
    {
        if (await _uow.Shipments.CodeExistsAsync(dto.ShipmentCode))
            return BadRequest(ApiResponse<object>.Error("Mã lô hàng đã tồn tại"));

        var entity = new Shipment
        {
            ShipmentCode = dto.ShipmentCode,
            Type = Enum.TryParse<ShipmentType>(dto.Type, true, out var st) ? st : ShipmentType.Import,
            ExpectedDate = dto.ExpectedDate, PortOfLoading = dto.PortOfLoading,
            PortOfDischarge = dto.PortOfDischarge,
            DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt) ? dt : null,
            TotalQuantity = dto.TotalQuantity, TotalGrossWeight = dto.TotalGrossWeight,
            TotalValue = dto.TotalValue, Currency = dto.Currency, Notes = dto.Notes,
            SupplierId = dto.SupplierId, CustomerId = dto.CustomerId,
            Status = ShipmentStatus.Draft, CreatedBy = User.Identity?.Name
        };

        await _uow.Shipments.AddAsync(entity);
        await _uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ApiResponse<ShipmentDto>.Ok(MapToDto(entity), "Tạo lô hàng thành công"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateShipmentDto dto)
    {
        var entity = await _uow.Shipments.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy lô hàng"));

        if (await _uow.Shipments.CodeExistsAsync(dto.ShipmentCode, id))
            return BadRequest(ApiResponse<object>.Error("Mã lô hàng đã tồn tại"));

        entity.ShipmentCode = dto.ShipmentCode;
        entity.Type = Enum.TryParse<ShipmentType>(dto.Type, true, out var st2) ? st2 : entity.Type;
        entity.ExpectedDate = dto.ExpectedDate; entity.PortOfLoading = dto.PortOfLoading;
        entity.PortOfDischarge = dto.PortOfDischarge;
        entity.DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt2) ? dt2 : null;
        entity.TotalQuantity = dto.TotalQuantity; entity.TotalGrossWeight = dto.TotalGrossWeight;
        entity.TotalValue = dto.TotalValue; entity.Currency = dto.Currency; entity.Notes = dto.Notes;
        entity.SupplierId = dto.SupplierId; entity.CustomerId = dto.CustomerId;
        entity.UpdatedBy = User.Identity?.Name;

        await _uow.Shipments.UpdateAsync(entity);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<ShipmentDto>.Ok(MapToDto(entity), "Cập nhật lô hàng thành công"));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateShipmentStatusDto dto)
    {
        var entity = await _uow.Shipments.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy lô hàng"));

        if (Enum.TryParse<ShipmentStatus>(dto.Status, true, out var newStatus))
        {
            entity.Status = newStatus;
            entity.UpdatedBy = User.Identity?.Name;
            await _uow.Shipments.UpdateAsync(entity);
            await _uow.SaveChangesAsync();
            return Ok(ApiResponse<ShipmentDto>.Ok(MapToDto(entity), "Cập nhật trạng thái thành công"));
        }
        return BadRequest(ApiResponse<object>.Error("Trạng thái không hợp lệ"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _uow.Shipments.DeleteAsync(id);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa lô hàng thành công"));
    }

    [HttpGet("{id}/items")]
    public async Task<IActionResult> GetItems(Guid id)
    {
        var entity = await _uow.Shipments.GetWithDetailsAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy lô hàng"));
        var items = entity.Items.Select(MapItemToDto).ToList();
        return Ok(ApiResponse<List<ShipmentItemDto>>.Ok(items));
    }

    [HttpPost("{id}/items")]
    public async Task<IActionResult> UpsertItems(Guid id, [FromBody] UpsertShipmentItemsDto dto)
    {
        var entity = await _uow.Shipments.GetWithDetailsAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy lô hàng"));

        // Remove old items
        _context.Set<ShipmentItem>().RemoveRange(entity.Items);

        // Add new items
        foreach (var itemDto in dto.Items)
        {
            var item = new ShipmentItem
            {
                ShipmentId = id,
                ProductId = itemDto.ProductId,
                Quantity = itemDto.Quantity,
                UnitPrice = itemDto.UnitPrice,
                TotalValue = (itemDto.Quantity ?? 0) * (itemDto.UnitPrice ?? 0),
                GrossWeight = itemDto.GrossWeight,
                NetWeight = itemDto.NetWeight,
                Notes = itemDto.Notes,
                CreatedBy = User.Identity?.Name
            };
            await _context.Set<ShipmentItem>().AddAsync(item);
        }

        await _uow.SaveChangesAsync();
        var updated = await _uow.Shipments.GetWithDetailsAsync(id);
        return Ok(ApiResponse<ShipmentDto>.Ok(MapToDto(updated!), "Cập nhật danh sách sản phẩm thành công"));
    }

    private static ShipmentDto MapToDto(Shipment s) => new()
    {
        Id = s.Id, ShipmentCode = s.ShipmentCode, Type = s.Type.ToString(),
        ExpectedDate = s.ExpectedDate, PortOfLoading = s.PortOfLoading,
        PortOfDischarge = s.PortOfDischarge, DeliveryTerm = s.DeliveryTerm?.ToString(),
        TotalQuantity = s.TotalQuantity, TotalGrossWeight = s.TotalGrossWeight,
        TotalValue = s.TotalValue, Currency = s.Currency, Status = s.Status.ToString(),
        Notes = s.Notes, SupplierName = s.Supplier?.CompanyName, CustomerName = s.Customer?.CompanyName,
        SupplierId = s.SupplierId, CustomerId = s.CustomerId,
        ItemCount = s.Items?.Count ?? 0, InvoiceCount = s.Invoices?.Count ?? 0,
        DocumentCount = s.Documents?.Count ?? 0, CreatedAt = s.CreatedAt,
        Items = s.Items?.Select(MapItemToDto).ToList() ?? new(),
        Bookings = s.Bookings?.Select(b => new BookingDto
        {
            Id = b.Id, BookingNumber = b.BookingNumber, ETD = b.ETD, ETA = b.ETA,
            ShippingLine = b.ShippingLine, Vessel = b.Vessel, Voyage = b.Voyage, Notes = b.Notes
        }).ToList() ?? new(),
        Containers = s.Containers?.Select(c => new ContainerDto
        {
            Id = c.Id, ContainerNumber = c.ContainerNumber, SealNumber = c.SealNumber,
            ContainerType = c.ContainerType, PayloadWeight = c.PayloadWeight,
            TareWeight = c.TareWeight, Notes = c.Notes
        }).ToList() ?? new(),
        CustomsDeclarations = s.CustomsDeclarations?.Select(c => new CustomsDeclarationDto
        {
            Id = c.Id, DeclarationNumber = c.DeclarationNumber, DeclarationDate = c.DeclarationDate,
            DeclarationType = c.DeclarationType, CustomsBranch = c.CustomsBranch,
            Status = c.Status, Notes = c.Notes
        }).ToList() ?? new()
    };

    private static ShipmentItemDto MapItemToDto(ShipmentItem i) => new()
    {
        Id = i.Id,
        ProductId = i.ProductId,
        ProductName = i.Product?.Name,
        SKU = i.Product?.SKU,
        Unit = i.Product?.Unit,
        Quantity = i.Quantity,
        UnitPrice = i.UnitPrice,
        TotalValue = i.TotalValue,
        GrossWeight = i.GrossWeight,
        NetWeight = i.NetWeight,
        Notes = i.Notes
    };
}
