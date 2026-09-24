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
public class SuppliersController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    public SuppliersController(IUnitOfWork uow) => _uow = uow;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? country,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _uow.Suppliers.GetPagedAsync(search, country, page, pageSize);
        var dto = new PagedResultDto<SupplierDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount, Page = result.Page, PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<SupplierDto>>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var entity = await _uow.Suppliers.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy nhà cung cấp"));
        return Ok(ApiResponse<SupplierDto>.Ok(MapToDto(entity)));
    }

    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetHistory(Guid id)
    {
        var history = await _uow.Suppliers.GetHistoryAsync(id);
        if (history == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy nhà cung cấp"));
        return Ok(ApiResponse<SupplierHistoryDto>.Ok(history));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSupplierDto dto)
    {
        var entity = new Supplier
        {
            CompanyName = dto.CompanyName, TradeName = dto.TradeName, Address = dto.Address,
            Country = dto.Country, TaxCode = dto.TaxCode, ContactPerson = dto.ContactPerson,
            Email = dto.Email, Phone = dto.Phone, PaymentTerms = dto.PaymentTerms,
            DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt) ? dt : null,
            Notes = dto.Notes, CreatedBy = User.Identity?.Name
        };
        await _uow.Suppliers.AddAsync(entity);
        await _uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ApiResponse<SupplierDto>.Ok(MapToDto(entity), "Tạo nhà cung cấp thành công"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateSupplierDto dto)
    {
        var entity = await _uow.Suppliers.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy nhà cung cấp"));

        entity.CompanyName = dto.CompanyName; entity.TradeName = dto.TradeName; entity.Address = dto.Address;
        entity.Country = dto.Country; entity.TaxCode = dto.TaxCode; entity.ContactPerson = dto.ContactPerson;
        entity.Email = dto.Email; entity.Phone = dto.Phone; entity.PaymentTerms = dto.PaymentTerms;
        entity.DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt2) ? dt2 : null;
        entity.Notes = dto.Notes; entity.UpdatedBy = User.Identity?.Name;

        await _uow.Suppliers.UpdateAsync(entity);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<SupplierDto>.Ok(MapToDto(entity), "Cập nhật nhà cung cấp thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _uow.Suppliers.DeleteAsync(id);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa nhà cung cấp thành công"));
    }

    private static SupplierDto MapToDto(Supplier s) => new()
    {
        Id = s.Id, CompanyName = s.CompanyName, TradeName = s.TradeName, Address = s.Address,
        Country = s.Country, TaxCode = s.TaxCode, ContactPerson = s.ContactPerson,
        Email = s.Email, Phone = s.Phone, PaymentTerms = s.PaymentTerms,
        DeliveryTerm = s.DeliveryTerm?.ToString(), Notes = s.Notes,
        ShipmentCount = s.Shipments?.Count ?? 0, CreatedAt = s.CreatedAt
    };
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    public CustomersController(IUnitOfWork uow) => _uow = uow;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? country,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _uow.Customers.GetPagedAsync(search, country, page, pageSize);
        var dto = new PagedResultDto<CustomerDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount, Page = result.Page, PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<CustomerDto>>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var entity = await _uow.Customers.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy khách hàng"));
        return Ok(ApiResponse<CustomerDto>.Ok(MapToDto(entity)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerDto dto)
    {
        var entity = new Customer
        {
            CompanyName = dto.CompanyName, Address = dto.Address, Country = dto.Country,
            TaxCode = dto.TaxCode, ContactPerson = dto.ContactPerson, Email = dto.Email,
            Phone = dto.Phone, PaymentTerms = dto.PaymentTerms,
            DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt) ? dt : null,
            Notes = dto.Notes, CreatedBy = User.Identity?.Name
        };
        await _uow.Customers.AddAsync(entity);
        await _uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ApiResponse<CustomerDto>.Ok(MapToDto(entity), "Tạo khách hàng thành công"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateCustomerDto dto)
    {
        var entity = await _uow.Customers.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy khách hàng"));

        entity.CompanyName = dto.CompanyName; entity.Address = dto.Address; entity.Country = dto.Country;
        entity.TaxCode = dto.TaxCode; entity.ContactPerson = dto.ContactPerson; entity.Email = dto.Email;
        entity.Phone = dto.Phone; entity.PaymentTerms = dto.PaymentTerms;
        entity.DeliveryTerm = Enum.TryParse<DeliveryTerm>(dto.DeliveryTerm, true, out var dt2) ? dt2 : null;
        entity.Notes = dto.Notes; entity.UpdatedBy = User.Identity?.Name;

        await _uow.Customers.UpdateAsync(entity);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<CustomerDto>.Ok(MapToDto(entity), "Cập nhật khách hàng thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _uow.Customers.DeleteAsync(id);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa khách hàng thành công"));
    }

    private static CustomerDto MapToDto(Customer c) => new()
    {
        Id = c.Id, CompanyName = c.CompanyName, Address = c.Address, Country = c.Country,
        TaxCode = c.TaxCode, ContactPerson = c.ContactPerson, Email = c.Email, Phone = c.Phone,
        PaymentTerms = c.PaymentTerms, DeliveryTerm = c.DeliveryTerm?.ToString(),
        Notes = c.Notes, ShipmentCount = c.Shipments?.Count ?? 0, CreatedAt = c.CreatedAt
    };
}
