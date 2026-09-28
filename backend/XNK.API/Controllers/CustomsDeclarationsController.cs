using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Core.Interfaces;

namespace XNK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomsDeclarationsController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public CustomsDeclarationsController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] Guid? shipmentId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _uow.CustomsDeclarations.GetPagedAsync(search, shipmentId, page, pageSize);
        var dto = new PagedResultDto<CustomsDeclarationDto>
        {
            Items = result.Items.Select(c => new CustomsDeclarationDto
            {
                Id = c.Id,
                DeclarationNumber = c.DeclarationNumber,
                DeclarationDate = c.DeclarationDate,
                DeclarationType = c.DeclarationType,
                CustomsBranch = c.CustomsBranch,
                Status = c.Status,
                Notes = c.Notes,
                ShipmentId = c.ShipmentId,
                ShipmentCode = c.Shipment?.ShipmentCode,
                CreatedAt = c.CreatedAt
            }).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<CustomsDeclarationDto>>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var entity = await _uow.CustomsDeclarations.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy tờ khai"));

        var dto = new CustomsDeclarationDto
        {
            Id = entity.Id,
            DeclarationNumber = entity.DeclarationNumber,
            DeclarationDate = entity.DeclarationDate,
            DeclarationType = entity.DeclarationType,
            CustomsBranch = entity.CustomsBranch,
            Status = entity.Status,
            Notes = entity.Notes,
            ShipmentId = entity.ShipmentId,
            CreatedAt = entity.CreatedAt
        };
        return Ok(ApiResponse<CustomsDeclarationDto>.Ok(dto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomsDeclarationDto dto)
    {
        if (await _uow.CustomsDeclarations.DeclarationNumberExistsAsync(dto.DeclarationNumber))
            return BadRequest(ApiResponse<object>.Error("Số tờ khai đã tồn tại"));

        var entity = new CustomsDeclaration
        {
            DeclarationNumber = dto.DeclarationNumber,
            DeclarationDate = dto.DeclarationDate,
            DeclarationType = dto.DeclarationType,
            CustomsBranch = dto.CustomsBranch,
            Status = dto.Status,
            Notes = dto.Notes,
            ShipmentId = dto.ShipmentId,
            CreatedBy = User.Identity?.Name
        };

        await _uow.CustomsDeclarations.AddAsync(entity);
        await _uow.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ApiResponse<CustomsDeclarationDto>.Ok(new CustomsDeclarationDto { Id = entity.Id }, "Tạo tờ khai thành công"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateCustomsDeclarationDto dto)
    {
        var entity = await _uow.CustomsDeclarations.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy tờ khai"));

        if (await _uow.CustomsDeclarations.DeclarationNumberExistsAsync(dto.DeclarationNumber, id))
            return BadRequest(ApiResponse<object>.Error("Số tờ khai đã tồn tại"));

        entity.DeclarationNumber = dto.DeclarationNumber;
        entity.DeclarationDate = dto.DeclarationDate;
        entity.DeclarationType = dto.DeclarationType;
        entity.CustomsBranch = dto.CustomsBranch;
        entity.Status = dto.Status;
        entity.Notes = dto.Notes;
        entity.ShipmentId = dto.ShipmentId;
        entity.UpdatedBy = User.Identity?.Name;

        await _uow.CustomsDeclarations.UpdateAsync(entity);
        await _uow.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(null, "Cập nhật tờ khai thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _uow.CustomsDeclarations.GetByIdAsync(id);
        if (entity == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy tờ khai"));

        await _uow.CustomsDeclarations.DeleteAsync(id);
        await _uow.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(null, "Xóa tờ khai thành công"));
    }
}
