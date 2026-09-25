using Microsoft.EntityFrameworkCore;
using XNK.Core.Entities;
using XNK.Core.Enums;

namespace XNK.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context)
    {
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "admin");
        if (adminUser != null)
        {
            adminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
            await context.SaveChangesAsync();
        }

        if (await context.Products.AnyAsync()) return; // Already seeded

        // 1. Suppliers
        var supplierLcw = new Supplier
        {
            Id = Guid.NewGuid(),
            CompanyName = "LONG CHENG WU TEXTILE CO., LTD",
            TradeName = "LCW Textile",
            Address = "No. 128, Gongye 2nd Rd., Douliu City, Yunlin County 640, Taiwan",
            Country = "Taiwan",
            TaxCode = "TW89234102",
            ContactPerson = "Mr. Chen Wu",
            Email = "sales@longchengwu.com.tw",
            Phone = "+886 5 551 8899",
            PaymentTerms = "T/T 30 days after B/L date",
            DeliveryTerm = DeliveryTerm.CIF,
            Notes = "Nhà cung cấp sợi filament và màng TPU chất lượng cao",
            CreatedAt = DateTime.UtcNow.AddMonths(-3)
        };

        var supplierFormosa = new Supplier
        {
            Id = Guid.NewGuid(),
            CompanyName = "FORMOSA TAFFETA CO., LTD",
            TradeName = "Formosa",
            Address = "359, Chung Shan Road, Touliu, Taiwan",
            Country = "Taiwan",
            TaxCode = "TW58291034",
            ContactPerson = "Ms. Lin Wang",
            Email = "lin@formosa.com.tw",
            Phone = "+886 5 532 4111",
            PaymentTerms = "L/C at sight",
            DeliveryTerm = DeliveryTerm.FOB,
            Notes = "Cung cấp sợi Polyester DTY chất lượng tiêu chuẩn quốc tế",
            CreatedAt = DateTime.UtcNow.AddMonths(-2)
        };

        await context.Suppliers.AddRangeAsync(supplierLcw, supplierFormosa);

        // 2. Customers
        var customerVintex = new Customer
        {
            Id = Guid.NewGuid(),
            CompanyName = "CÔNG TY TNHH DỆT MAY VIỆT NAM (VINTEX)",
            Address = "KCN Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh",
            Country = "Vietnam",
            TaxCode = "0312345678",
            ContactPerson = "Nguyễn Văn Hùng",
            Email = "hung.nv@vintex.vn",
            Phone = "028 3816 8888",
            PaymentTerms = "T/T 15 days",
            DeliveryTerm = DeliveryTerm.EXW,
            Notes = "Khách hàng mua sợi dệt vải may mặc xuất khẩu",
            CreatedAt = DateTime.UtcNow.AddMonths(-3)
        };

        var customerDongNai = new Customer
        {
            Id = Guid.NewGuid(),
            CompanyName = "CÔNG TY CỔ PHẦN MAY ĐỒNG NAI (DONAGAMEX)",
            Address = "Đường số 2, KCN Biên Hòa 1, TP. Biên Hòa, Đồng Nai",
            Country = "Vietnam",
            TaxCode = "3600234567",
            ContactPerson = "Trần Thị Mai",
            Email = "mai.tt@donagamex.com.vn",
            Phone = "0251 3836 123",
            PaymentTerms = "T/T 30 days",
            DeliveryTerm = DeliveryTerm.FOB,
            Notes = "Khách hàng may mặc xuất khẩu thị trường Mỹ và EU",
            CreatedAt = DateTime.UtcNow.AddMonths(-1)
        };

        await context.Customers.AddRangeAsync(customerVintex, customerDongNai);

        // 3. Products (Yarn)
        var productFdy = new Product
        {
            Id = Guid.NewGuid(),
            SKU = "YARN-FDY-10036-SD",
            Name = "Sợi Polyester FDY 100D/36F Semi Dull",
            NameEn = "Polyester Fully Drawn Yarn 100D/36F Semi Dull",
            NameVi = "Sợi Polyester FDY 100D/36F Bán mờ",
            ProductGroup = "Sợi dệt thoi / dệt kim",
            Description = "Sợi filament kéo dãn hoàn toàn dùng cho dệt vải thể thao, rèm cửa",
            Unit = "kg",
            Composition = "100% Polyester",
            Manufacturer = "LONG CHENG WU TEXTILE CO., LTD",
            CountryOfOrigin = "Taiwan",
            HSCode = "5402.47.00",
            Notes = "Tiêu chuẩn OEKO-TEX Standard 100",
            CreatedAt = DateTime.UtcNow.AddMonths(-3)
        };

        productFdy.Specification = new ProductSpecification
        {
            Id = Guid.NewGuid(),
            ProductId = productFdy.Id,
            YarnType = "FDY",
            Composition = "100% Polyester",
            DenierCount = "100D",
            FilamentCount = 36,
            TwistDirection = "S",
            TPM = "0",
            Color = "Raw White (Trắng mộc)",
            SDorTBR = "Semi Dull (SD)",
            PackagingType = "Carton (6 bobbins/carton)",
            WeightPerUnit = 5.25m,
            QualityStandard = "Grade AA",
            Certifications = "OEKO-TEX, GRS"
        };

        var productDty = new Product
        {
            Id = Guid.NewGuid(),
            SKU = "YARN-DTY-15048-BR",
            Name = "Sợi Polyester DTY 150D/48F Bright",
            NameEn = "Polyester Drawn Textured Yarn 150D/48F Bright",
            NameVi = "Sợi Polyester DTY 150D/48F Bóng",
            ProductGroup = "Sợi dệt kim",
            Description = "Sợi dập vân tạo độ xốp co giãn tốt cho vải thun, dệt kim tròn",
            Unit = "kg",
            Composition = "100% Polyester",
            Manufacturer = "FORMOSA TAFFETA CO., LTD",
            CountryOfOrigin = "Taiwan",
            HSCode = "5402.33.00",
            Notes = "Độ bóng cao, độ bền màu cấp 4",
            CreatedAt = DateTime.UtcNow.AddMonths(-2)
        };

        productDty.Specification = new ProductSpecification
        {
            Id = Guid.NewGuid(),
            ProductId = productDty.Id,
            YarnType = "DTY",
            Composition = "100% Polyester",
            DenierCount = "150D",
            FilamentCount = 48,
            TwistDirection = "Z",
            TPM = "120",
            Color = "Optic White",
            SDorTBR = "Bright (BR)",
            PackagingType = "Carton (6 cones/carton)",
            WeightPerUnit = 5.0m,
            QualityStandard = "Grade A",
            Certifications = "ISO 9001, OEKO-TEX"
        };

        var productPoy = new Product
        {
            Id = Guid.NewGuid(),
            SKU = "YARN-POY-25072-SD",
            Name = "Sợi Polyester POY 250D/72F",
            NameEn = "Polyester Partially Oriented Yarn 250D/72F",
            NameVi = "Sợi Polyester định hướng một phần 250D/72F",
            ProductGroup = "Sợi thô",
            Description = "Sợi nguyên liệu cho máy gia công dập vân DTY",
            Unit = "kg",
            Composition = "100% Polyester",
            Manufacturer = "LONG CHENG WU TEXTILE CO., LTD",
            CountryOfOrigin = "Taiwan",
            HSCode = "5402.46.00",
            CreatedAt = DateTime.UtcNow.AddMonths(-1)
        };

        await context.Products.AddRangeAsync(productFdy, productDty, productPoy);

        // 4. Shipment Import (Sample from 06-08-2026 data)
        var shipment1 = new Shipment
        {
            Id = Guid.NewGuid(),
            ShipmentCode = "SHP-20260806-LCW",
            Type = ShipmentType.Import,
            ExpectedDate = DateTime.UtcNow.AddDays(5),
            PortOfLoading = "Kaohsiung Port, Taiwan",
            PortOfDischarge = "Cat Lai Port, Ho Chi Minh City",
            DeliveryTerm = DeliveryTerm.CIF,
            TotalQuantity = 18500,
            TotalGrossWeight = 19800,
            TotalValue = 42550.00m,
            Currency = "USD",
            Status = ShipmentStatus.Paid30,
            Notes = "Lô hàng sợi FDY nhập từ Long Cheng Wu, tàu WAN HAI 273 V.S012",
            SupplierId = supplierLcw.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        };

        var shipment2 = new Shipment
        {
            Id = Guid.NewGuid(),
            ShipmentCode = "SHP-20260518-FMT",
            Type = ShipmentType.Import,
            ExpectedDate = DateTime.UtcNow.AddDays(-20),
            PortOfLoading = "Keelung Port, Taiwan",
            PortOfDischarge = "Cat Lai Port, Ho Chi Minh City",
            DeliveryTerm = DeliveryTerm.FOB,
            TotalQuantity = 15000,
            TotalGrossWeight = 16200,
            TotalValue = 35250.00m,
            Currency = "USD",
            Status = ShipmentStatus.Completed,
            Notes = "Lô hàng sợi DTY nhập từ Formosa đã thông quan",
            SupplierId = supplierFormosa.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-40)
        };

        var shipment3 = new Shipment
        {
            Id = Guid.NewGuid(),
            ShipmentCode = "SHP-20260901-VTX",
            Type = ShipmentType.Export,
            ExpectedDate = DateTime.UtcNow.AddDays(15),
            PortOfLoading = "Cat Lai Port, Ho Chi Minh City",
            PortOfDischarge = "Busan Port, South Korea",
            DeliveryTerm = DeliveryTerm.FOB,
            TotalQuantity = 10000,
            TotalGrossWeight = 10800,
            TotalValue = 28000.00m,
            Currency = "USD",
            Status = ShipmentStatus.Draft,
            Notes = "Lô hàng xuất khẩu vải dệt cho đối tác Hàn Quốc",
            CustomerId = customerVintex.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        await context.Shipments.AddRangeAsync(shipment1, shipment2, shipment3);

        // 5. Invoice & Packing List for Shipment 1
        var invoice1 = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "INV-LCW-26073",
            InvoiceDate = DateTime.UtcNow.AddDays(-8),
            Type = InvoiceType.CommercialInvoice,
            PaymentTerms = "T/T 30 days",
            Currency = "USD",
            SubTotal = 42550.00m,
            Discount = 0,
            OtherCharges = 0,
            TotalValue = 42550.00m,
            ShipmentId = shipment1.Id,
            Notes = "Invoice lô hàng sợi FDY 100D/36F",
            CreatedAt = DateTime.UtcNow.AddDays(-8)
        };

        invoice1.Items.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice1.Id,
            ProductId = productFdy.Id,
            ProductName = productFdy.Name,
            ProductCode = productFdy.SKU,
            Quantity = 18500,
            Unit = "kg",
            UnitPrice = 2.30m,
            Amount = 42550.00m,
            HSCode = "5402.47.00",
            CountryOfOrigin = "Taiwan"
        });

        var packingList1 = new PackingList
        {
            Id = Guid.NewGuid(),
            PackingListNumber = "PL-LCW-26073",
            Date = DateTime.UtcNow.AddDays(-8),
            TotalPackages = 588,
            TotalGrossWeight = 19800,
            TotalNetWeight = 18500,
            TotalPallets = 28,
            PackagingType = "Carton Boxes on Pallets",
            PackagingMaterial = "Corrugated Paper & Plastic Stretch Film",
            ShipmentId = shipment1.Id,
            InvoiceId = invoice1.Id,
            Notes = "1 container 40HQ (WHLU5829103)",
            CreatedAt = DateTime.UtcNow.AddDays(-8)
        };

        packingList1.Items.Add(new PackingListItem
        {
            Id = Guid.NewGuid(),
            PackingListId = packingList1.Id,
            ProductId = productFdy.Id,
            ProductName = productFdy.Name,
            ProductCode = productFdy.SKU,
            NumberOfUnits = 3528,
            WeightPerUnit = 5.25m,
            TotalWeight = 18522m,
            NumberOfPackages = 588,
            LotNumber = "LCW2026-08A",
            ContainerNumber = "WHLU5829103"
        });

        // Invoice for Shipment 2
        var invoice2 = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "INV-FMT-26051",
            InvoiceDate = DateTime.UtcNow.AddDays(-38),
            Type = InvoiceType.CommercialInvoice,
            PaymentTerms = "L/C at sight",
            Currency = "USD",
            SubTotal = 35250.00m,
            TotalValue = 35250.00m,
            ShipmentId = shipment2.Id,
            Notes = "Invoice lô hàng sợi DTY 150D/48F",
            CreatedAt = DateTime.UtcNow.AddDays(-38)
        };

        invoice2.Items.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice2.Id,
            ProductId = productDty.Id,
            ProductName = productDty.Name,
            ProductCode = productDty.SKU,
            Quantity = 15000,
            Unit = "kg",
            UnitPrice = 2.35m,
            Amount = 35250.00m,
            HSCode = "5402.33.00",
            CountryOfOrigin = "Taiwan"
        });

        await context.Invoices.AddRangeAsync(invoice1, invoice2);
        await context.PackingLists.AddAsync(packingList1);

        await context.SaveChangesAsync();
    }
}
