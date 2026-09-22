using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XNK.Core.DTOs;
using XNK.Core.Interfaces;

namespace XNK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;

    public SearchController(ISearchService searchService)
    {
        _searchService = searchService;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? keyword, [FromQuery] string? entityType)
    {
        var query = new SearchQueryDto
        {
            Keyword = keyword,
            EntityType = entityType
        };
        var results = await _searchService.SearchAsync(query);
        return Ok(ApiResponse<List<SearchResultDto>>.Ok(results));
    }
}
