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
public class DocumentsController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    private readonly IFileService _fileService;

    public DocumentsController(IUnitOfWork uow, IFileService fileService)
    {
        _uow = uow;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? category,
        [FromQuery] Guid? shipmentId, [FromQuery] string? entityType, [FromQuery] Guid? entityId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _uow.Documents.GetPagedAsync(search, category, shipmentId, entityType, entityId, page, pageSize);
        var dto = new PagedResultDto<DocumentDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount, Page = result.Page, PageSize = result.PageSize
        };
        return Ok(ApiResponse<PagedResultDto<DocumentDto>>.Ok(dto));
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] DocumentUploadRequest request)
    {
        var file = request.File;
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Error("Vui lòng chọn file"));

        if (file.Length > 50 * 1024 * 1024) // 50MB
            return BadRequest(ApiResponse<object>.Error("File không được vượt quá 50MB"));

        var cat = Enum.TryParse<DocumentCategory>(request.Category, true, out var dc) ? dc : DocumentCategory.Other;
        var filePath = await _fileService.SaveFileAsync(file.OpenReadStream(), file.FileName, cat.ToString());

        var doc = new Document
        {
            FileName = Path.GetFileName(filePath),
            OriginalFileName = file.FileName,
            FilePath = filePath,
            FileType = Path.GetExtension(file.FileName).TrimStart('.').ToLower(),
            FileSize = file.Length,
            Category = cat,
            Description = request.Description,
            ShipmentId = request.ShipmentId,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            CreatedBy = User.Identity?.Name
        };

        await _uow.Documents.AddAsync(doc);
        await _uow.SaveChangesAsync();
        return Ok(ApiResponse<DocumentDto>.Ok(MapToDto(doc), "Upload file thành công"));
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var doc = await _uow.Documents.GetByIdAsync(id);
        if (doc == null) return NotFound(ApiResponse<object>.Error("Không tìm thấy file"));

        var (stream, contentType, fileName) = await _fileService.GetFileAsync(doc.FilePath);
        return File(stream, contentType, doc.OriginalFileName ?? fileName);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var doc = await _uow.Documents.GetByIdAsync(id);
        if (doc != null)
        {
            await _fileService.DeleteFileAsync(doc.FilePath);
            await _uow.Documents.DeleteAsync(id);
            await _uow.SaveChangesAsync();
        }
        return Ok(ApiResponse<object>.Ok(null!, "Xóa file thành công"));
    }

    private static DocumentDto MapToDto(Document d) => new()
    {
        Id = d.Id, FileName = d.FileName, OriginalFileName = d.OriginalFileName,
        FileType = d.FileType, FileSize = d.FileSize, Category = d.Category.ToString(),
        Description = d.Description, Version = d.Version, EntityType = d.EntityType,
        EntityId = d.EntityId, ShipmentId = d.ShipmentId,
        ShipmentCode = d.Shipment?.ShipmentCode, CreatedAt = d.CreatedAt, CreatedBy = d.CreatedBy
    };
}

public class DocumentUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public string? Category { get; set; }
    public string? Description { get; set; }
    public Guid? ShipmentId { get; set; }
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
}
