using XNK.Core.DTOs;

namespace XNK.Core.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> RefreshTokenAsync(string refreshToken);
    Task RevokeTokenAsync(string userId);
}

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync();
}

public interface ISearchService
{
    Task<List<SearchResultDto>> SearchAsync(SearchQueryDto query);
}

public interface IFileService
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string category);
    Task<(Stream Stream, string ContentType, string FileName)> GetFileAsync(string filePath);
    Task DeleteFileAsync(string filePath);
    string GetContentType(string fileName);
}
