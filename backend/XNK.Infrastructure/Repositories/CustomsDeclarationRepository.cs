using Microsoft.EntityFrameworkCore;
using XNK.Core.DTOs;
using XNK.Core.Entities;
using XNK.Core.Interfaces;
using XNK.Infrastructure.Data;

namespace XNK.Infrastructure.Repositories;

public class CustomsDeclarationRepository : GenericRepository<CustomsDeclaration>, ICustomsDeclarationRepository
{
    public CustomsDeclarationRepository(AppDbContext context) : base(context) { }

    public async Task<PagedResultDto<CustomsDeclaration>> GetPagedAsync(string? search, Guid? shipmentId, int page, int pageSize)
    {
        var query = _dbSet.Include(x => x.Shipment).AsQueryable();

        if (shipmentId.HasValue)
        {
            query = query.Where(x => x.ShipmentId == shipmentId.Value);
        }

        if (!string.IsNullOrEmpty(search))
        {
            search = search.ToLower();
            query = query.Where(x => x.DeclarationNumber.ToLower().Contains(search) || 
                                     (x.Shipment.ShipmentCode != null && x.Shipment.ShipmentCode.ToLower().Contains(search)));
        }

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.CreatedAt)
                               .Skip((page - 1) * pageSize)
                               .Take(pageSize)
                               .ToListAsync();

        return new PagedResultDto<CustomsDeclaration>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<bool> DeclarationNumberExistsAsync(string number, Guid? excludeId = null)
    {
        var query = _dbSet.Where(x => x.DeclarationNumber == number);
        if (excludeId.HasValue)
        {
            query = query.Where(x => x.Id != excludeId.Value);
        }
        return await query.AnyAsync();
    }
}
