using Microsoft.AspNetCore.StaticFiles;
using XNK.Core.Interfaces;

namespace XNK.Infrastructure.Services;

public class FileService : IFileService
{
    private readonly string _uploadRoot;

    public FileService(string uploadRoot)
    {
        _uploadRoot = uploadRoot;
        if (!Directory.Exists(_uploadRoot))
            Directory.CreateDirectory(_uploadRoot);
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string category)
    {
        var categoryDir = Path.Combine(_uploadRoot, category);
        if (!Directory.Exists(categoryDir))
            Directory.CreateDirectory(categoryDir);

        var uniqueName = $"{Guid.NewGuid():N}_{fileName}";
        var filePath = Path.Combine(categoryDir, uniqueName);

        using var fs = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(fs);

        return Path.Combine(category, uniqueName).Replace("\\", "/");
    }

    public Task<(Stream Stream, string ContentType, string FileName)> GetFileAsync(string filePath)
    {
        var fullPath = Path.Combine(_uploadRoot, filePath.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (!File.Exists(fullPath))
            throw new FileNotFoundException("File không tồn tại.");

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);
        var contentType = GetContentType(fullPath);
        var fileName = Path.GetFileName(fullPath);

        return Task.FromResult<(Stream, string, string)>((stream, contentType, fileName));
    }

    public Task DeleteFileAsync(string filePath)
    {
        var fullPath = Path.Combine(_uploadRoot, filePath.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetContentType(string fileName)
    {
        var provider = new FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(fileName, out var contentType))
            contentType = "application/octet-stream";
        return contentType;
    }
}
