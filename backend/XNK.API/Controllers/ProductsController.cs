using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Core.Interfaces;

namespace XNK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public ProductsController(IUnitOfWork uow) => _uow = uow;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? group,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null, [FromQuery] bool sortDesc = true)
    {
        var result = await _uow.Products.GetPagedAsync(search, group, page, pageSize, sortBy, sortDesc);
        var dto = new PagedResultDto<ProductDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<ProductDto>>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var product = await _uow.Products.GetWithSpecificationAsync(id);
        if (product == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy sản phẩm"));
        return Ok(ApiResponse<ProductDto>.Ok(MapToDto(product)));
    }

    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetHistory(Guid id)
    {
        var history = await _uow.Products.GetHistoryAsync(id);
        if (history == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy sản phẩm"));
        return Ok(ApiResponse<ProductHistoryDto>.Ok(history));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        if (await _uow.Products.SkuExistsAsync(dto.SKU))
            return BadRequest(ApiResponse<object>.Error("Mã SKU đã tồn tại"));

        var product = new Product
        {
            SKU = dto.SKU, Name = dto.Name, NameEn = dto.NameEn, NameVi = dto.NameVi,
            ProductGroup = dto.ProductGroup, Description = dto.Description, Unit = dto.Unit,
            Composition = dto.Composition, Manufacturer = dto.Manufacturer,
            CountryOfOrigin = dto.CountryOfOrigin, HSCode = dto.HSCode, Notes = dto.Notes,
            CreatedBy = User.Identity?.Name
        };

        if (dto.Specification != null)
        {
            product.Specification = new ProductSpecification
            {
                YarnType = dto.Specification.YarnType, Composition = dto.Specification.Composition,
                DenierCount = dto.Specification.DenierCount, FilamentCount = dto.Specification.FilamentCount,
                TwistDirection = dto.Specification.TwistDirection, TPM = dto.Specification.TPM,
                Color = dto.Specification.Color, SDorTBR = dto.Specification.SDorTBR,
                PackagingType = dto.Specification.PackagingType, WeightPerUnit = dto.Specification.WeightPerUnit,
                QualityStandard = dto.Specification.QualityStandard, Certifications = dto.Specification.Certifications
            };
        }

        await _uow.Products.AddAsync(product);
        await _uow.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, ApiResponse<ProductDto>.Ok(MapToDto(product), "Tạo sản phẩm thành công"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateProductDto dto)
    {
        var product = await _uow.Products.GetWithSpecificationAsync(id);
        if (product == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy sản phẩm"));

        if (await _uow.Products.SkuExistsAsync(dto.SKU, id))
            return BadRequest(ApiResponse<object>.Error("Mã SKU đã tồn tại"));

        product.SKU = dto.SKU; product.Name = dto.Name; product.NameEn = dto.NameEn;
        product.NameVi = dto.NameVi; product.ProductGroup = dto.ProductGroup;
        product.Description = dto.Description; product.Unit = dto.Unit;
        product.Composition = dto.Composition; product.Manufacturer = dto.Manufacturer;
        product.CountryOfOrigin = dto.CountryOfOrigin; product.HSCode = dto.HSCode;
        product.Notes = dto.Notes; product.UpdatedBy = User.Identity?.Name;

        if (dto.Specification != null)
        {
            if (product.Specification == null)
                product.Specification = new ProductSpecification { ProductId = product.Id };
            
            product.Specification.YarnType = dto.Specification.YarnType;
            product.Specification.Composition = dto.Specification.Composition;
            product.Specification.DenierCount = dto.Specification.DenierCount;
            product.Specification.FilamentCount = dto.Specification.FilamentCount;
            product.Specification.TwistDirection = dto.Specification.TwistDirection;
            product.Specification.TPM = dto.Specification.TPM;
            product.Specification.Color = dto.Specification.Color;
            product.Specification.SDorTBR = dto.Specification.SDorTBR;
            product.Specification.PackagingType = dto.Specification.PackagingType;
            product.Specification.WeightPerUnit = dto.Specification.WeightPerUnit;
            product.Specification.QualityStandard = dto.Specification.QualityStandard;
            product.Specification.Certifications = dto.Specification.Certifications;
        }

        await _uow.Products.UpdateAsync(product);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<ProductDto>.Ok(MapToDto(product), "Cập nhật sản phẩm thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _uow.Products.DeleteAsync(id);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(null!, "Xóa sản phẩm thành công"));
    }

    private static ProductDto MapToDto(Product p) => new()
    {
        Id = p.Id, SKU = p.SKU, Name = p.Name, NameEn = p.NameEn, NameVi = p.NameVi,
        ProductGroup = p.ProductGroup, Description = p.Description, Unit = p.Unit,
        Composition = p.Composition, Manufacturer = p.Manufacturer,
        CountryOfOrigin = p.CountryOfOrigin, HSCode = p.HSCode, Notes = p.Notes,
        CreatedAt = p.CreatedAt,
        Specification = p.Specification == null ? null : new ProductSpecDto
        {
            YarnType = p.Specification.YarnType, Composition = p.Specification.Composition,
            DenierCount = p.Specification.DenierCount, FilamentCount = p.Specification.FilamentCount,
            TwistDirection = p.Specification.TwistDirection, TPM = p.Specification.TPM,
            Color = p.Specification.Color, SDorTBR = p.Specification.SDorTBR,
            PackagingType = p.Specification.PackagingType, WeightPerUnit = p.Specification.WeightPerUnit,
            QualityStandard = p.Specification.QualityStandard, Certifications = p.Specification.Certifications
        }
    };
}
