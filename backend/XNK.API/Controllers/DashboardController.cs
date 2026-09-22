using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XNK.Core.DTOs;
using XNK.Core.Enums;
using XNK.Core.Interfaces;

namespace XNK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public DashboardController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        var shipments = (await _uow.Shipments.GetAllAsync()).ToList();
        var now = DateTime.UtcNow;

        var dashboard = new DashboardDto
        {
            TotalImportShipments = shipments.Count(s => s.Type == ShipmentType.Import),
            TotalExportShipments = shipments.Count(s => s.Type == ShipmentType.Export),
            TotalImportValue = shipments.Where(s => s.Type == ShipmentType.Import).Sum(s => s.TotalValue ?? 0),
            TotalExportValue = shipments.Where(s => s.Type == ShipmentType.Export).Sum(s => s.TotalValue ?? 0),
            TotalProducts = await _uow.Products.CountAsync(),
            TotalSuppliers = await _uow.Suppliers.CountAsync(),
            TotalCustomers = await _uow.Customers.CountAsync(),
            PendingShipments = shipments.Count(s => s.Status != ShipmentStatus.Completed && s.Status != ShipmentStatus.Cancelled),
            MissingDocuments = 0,
            RecentShipments = shipments
                .OrderByDescending(s => s.CreatedAt)
                .Take(10)
                .Select(s => new RecentShipmentDto
                {
                    Id = s.Id,
                    ShipmentCode = s.ShipmentCode,
                    Type = s.Type.ToString(),
                    Status = s.Status.ToString(),
                    TotalValue = s.TotalValue,
                    PartnerName = s.Supplier?.CompanyName ?? s.Customer?.CompanyName,
                    CreatedAt = s.CreatedAt
                })
                .ToList(),
            MonthlyImportValues = shipments
                .Where(s => s.Type == ShipmentType.Import && s.CreatedAt.Year == now.Year)
                .GroupBy(s => s.CreatedAt.Month)
                .OrderBy(g => g.Key)
                .Select(g => new MonthlyValueDto
                {
                    Year = now.Year,
                    Month = g.Key,
                    Value = g.Sum(s => s.TotalValue ?? 0),
                    Count = g.Count()
                })
                .ToList(),
            MonthlyExportValues = shipments
                .Where(s => s.Type == ShipmentType.Export && s.CreatedAt.Year == now.Year)
                .GroupBy(s => s.CreatedAt.Month)
                .OrderBy(g => g.Key)
                .Select(g => new MonthlyValueDto
                {
                    Year = now.Year,
                    Month = g.Key,
                    Value = g.Sum(s => s.TotalValue ?? 0),
                    Count = g.Count()
                })
                .ToList()
        };

        return Ok(ApiResponse<DashboardDto>.Ok(dashboard));
    }
}
