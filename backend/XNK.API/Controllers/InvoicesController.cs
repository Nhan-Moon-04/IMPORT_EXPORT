using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Core.Enums;
using XNK.Core.Interfaces;

namespace XNK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    public InvoicesController(IUnitOfWork uow) => _uow = uow;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] Guid? shipmentId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _uow.Invoices.GetPagedAsync(search, shipmentId, page, pageSize);
        var dto = new PagedResultDto<InvoiceDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount, Page = result.Page, PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<InvoiceDto>>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var entity = await _uow.Invoices.GetWithItemsAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy Invoice"));
        return Ok(ApiResponse<InvoiceDto>.Ok(MapToDto(entity)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceDto dto)
    {
        if (await _uow.Invoices.NumberExistsAsync(dto.InvoiceNumber))
            return BadRequest(ApiResponse<object>.Error("Số Invoice đã tồn tại"));

        var entity = new Invoice
        {
            InvoiceNumber = dto.InvoiceNumber, InvoiceDate = dto.InvoiceDate,
            Type = Enum.TryParse<InvoiceType>(dto.Type, true, out var it) ? it : InvoiceType.CommercialInvoice,
            PaymentTerms = dto.PaymentTerms, Currency = dto.Currency,
            Discount = dto.Discount, OtherCharges = dto.OtherCharges, Notes = dto.Notes,
            ShipmentId = dto.ShipmentId, CreatedBy = User.Identity?.Name
        };

        decimal subTotal = 0;
        foreach (var item in dto.Items)
        {
            var amount = (item.Quantity ?? 0) * (item.UnitPrice ?? 0);
            subTotal += amount;
            entity.Items.Add(new InvoiceItem
            {
                ProductName = item.ProductName, ProductCode = item.ProductCode,
                Description = item.Description, Quantity = item.Quantity, Unit = item.Unit,
                UnitPrice = item.UnitPrice, Amount = amount, HSCode = item.HSCode,
                CountryOfOrigin = item.CountryOfOrigin, ProductId = item.ProductId
            });
        }
        entity.SubTotal = subTotal;
        entity.TotalValue = subTotal - (dto.Discount ?? 0) + (dto.OtherCharges ?? 0);

        await _uow.Invoices.AddAsync(entity);
        await _uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ApiResponse<InvoiceDto>.Ok(MapToDto(entity), "Tạo Invoice thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _uow.Invoices.DeleteAsync(id);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa Invoice thành công"));
    }

    private static InvoiceDto MapToDto(Invoice i) => new()
    {
        Id = i.Id, InvoiceNumber = i.InvoiceNumber, InvoiceDate = i.InvoiceDate,
        Type = i.Type.ToString(), PaymentTerms = i.PaymentTerms, Currency = i.Currency,
        SubTotal = i.SubTotal, Discount = i.Discount, OtherCharges = i.OtherCharges,
        TotalValue = i.TotalValue, Notes = i.Notes, ShipmentId = i.ShipmentId,
        ShipmentCode = i.Shipment?.ShipmentCode, CreatedAt = i.CreatedAt,
        Items = i.Items?.Select(ii => new InvoiceItemDto
        {
            Id = ii.Id, ProductName = ii.ProductName, ProductCode = ii.ProductCode,
            Description = ii.Description, Quantity = ii.Quantity, Unit = ii.Unit,
            UnitPrice = ii.UnitPrice, Amount = ii.Amount, HSCode = ii.HSCode,
            CountryOfOrigin = ii.CountryOfOrigin, ProductId = ii.ProductId
        }).ToList() ?? new()
    };
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PackingListsController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    public PackingListsController(IUnitOfWork uow) => _uow = uow;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] Guid? shipmentId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _uow.PackingLists.GetPagedAsync(search, shipmentId, page, pageSize);
        var dto = new PagedResultDto<PackingListDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount, Page = result.Page, PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<PackingListDto>>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var entity = await _uow.PackingLists.GetWithItemsAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy Packing List"));
        return Ok(ApiResponse<PackingListDto>.Ok(MapToDto(entity)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePackingListDto dto)
    {
        var entity = new PackingList
        {
            PackingListNumber = dto.PackingListNumber, Date = dto.Date,
            TotalPackages = dto.TotalPackages, TotalGrossWeight = dto.TotalGrossWeight,
            TotalNetWeight = dto.TotalNetWeight, TotalPallets = dto.TotalPallets,
            PackagingType = dto.PackagingType, PackagingMaterial = dto.PackagingMaterial,
            Notes = dto.Notes, ShipmentId = dto.ShipmentId, InvoiceId = dto.InvoiceId,
            CreatedBy = User.Identity?.Name
        };

        foreach (var item in dto.Items)
        {
            entity.Items.Add(new PackingListItem
            {
                ProductName = item.ProductName, ProductCode = item.ProductCode,
                NumberOfUnits = item.NumberOfUnits, WeightPerUnit = item.WeightPerUnit,
                TotalWeight = item.TotalWeight, NumberOfPackages = item.NumberOfPackages,
                LotNumber = item.LotNumber, ContainerNumber = item.ContainerNumber,
                ProductId = item.ProductId
            });
        }

        await _uow.PackingLists.AddAsync(entity);
        await _uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ApiResponse<PackingListDto>.Ok(MapToDto(entity), "Tạo Packing List thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _uow.PackingLists.DeleteAsync(id);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa Packing List thành công"));
    }

    private static PackingListDto MapToDto(PackingList pl) => new()
    {
        Id = pl.Id, PackingListNumber = pl.PackingListNumber, Date = pl.Date,
        TotalPackages = pl.TotalPackages, TotalGrossWeight = pl.TotalGrossWeight,
        TotalNetWeight = pl.TotalNetWeight, TotalPallets = pl.TotalPallets,
        PackagingType = pl.PackagingType, PackagingMaterial = pl.PackagingMaterial,
        Notes = pl.Notes, ShipmentId = pl.ShipmentId, ShipmentCode = pl.Shipment?.ShipmentCode,
        InvoiceId = pl.InvoiceId, InvoiceNumber = pl.Invoice?.InvoiceNumber, CreatedAt = pl.CreatedAt,
        Items = pl.Items?.Select(pli => new PackingListItemDto
        {
            Id = pli.Id, ProductName = pli.ProductName, ProductCode = pli.ProductCode,
            NumberOfUnits = pli.NumberOfUnits, WeightPerUnit = pli.WeightPerUnit,
            TotalWeight = pli.TotalWeight, NumberOfPackages = pli.NumberOfPackages,
            LotNumber = pli.LotNumber, ContainerNumber = pli.ContainerNumber,
            ProductId = pli.ProductId
        }).ToList() ?? new()
    };
}
