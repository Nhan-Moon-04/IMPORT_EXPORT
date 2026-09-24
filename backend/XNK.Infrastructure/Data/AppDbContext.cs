using Microsoft.EntityFrameworkCore;
using XNK.Core.Entities;

namespace XNK.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Auth & Users
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();

    // Products
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductSpecification> ProductSpecifications => Set<ProductSpecification>();

    // Partners
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Partner> Partners => Set<Partner>();

    // Orders
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();
    public DbSet<SalesOrderItem> SalesOrderItems => Set<SalesOrderItem>();

    // Shipments
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentItem> ShipmentItems => Set<ShipmentItem>();

    // Invoices
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();

    // Packing Lists
    public DbSet<PackingList> PackingLists => Set<PackingList>();
    public DbSet<PackingListItem> PackingListItems => Set<PackingListItem>();

    // Documents & Audit
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // Additional Tracking
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Container> Containers => Set<Container>();
    public DbSet<CustomsDeclaration> CustomsDeclarations => Set<CustomsDeclaration>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ========== Global query filter for soft delete ==========
        modelBuilder.Entity<Product>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Supplier>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Customer>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Shipment>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Invoice>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<PackingList>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Document>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Booking>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Container>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<CustomsDeclaration>().HasQueryFilter(e => !e.IsDeleted);

        // ========== User ==========
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasOne(e => e.Role)
                  .WithMany(r => r.Users)
                  .HasForeignKey(e => e.RoleId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ========== Permission ==========
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasOne(e => e.Role)
                  .WithMany(r => r.Permissions)
                  .HasForeignKey(e => e.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ========== Product ==========
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasIndex(e => e.SKU).IsUnique();
            entity.HasOne(e => e.Specification)
                  .WithOne(s => s.Product)
                  .HasForeignKey<ProductSpecification>(s => s.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ========== Shipment ==========
        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.HasIndex(e => e.ShipmentCode).IsUnique();
            entity.HasOne(e => e.Supplier)
                  .WithMany(s => s.Shipments)
                  .HasForeignKey(e => e.SupplierId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Customer)
                  .WithMany(c => c.Shipments)
                  .HasForeignKey(e => e.CustomerId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.Property(e => e.TotalValue).HasPrecision(18, 4);
            entity.Property(e => e.TotalQuantity).HasPrecision(18, 4);
            entity.Property(e => e.TotalGrossWeight).HasPrecision(18, 4);
        });

        // ========== ShipmentItem ==========
        modelBuilder.Entity<ShipmentItem>(entity =>
        {
            entity.HasOne(e => e.Shipment)
                  .WithMany(s => s.Items)
                  .HasForeignKey(e => e.ShipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Product)
                  .WithMany(p => p.ShipmentItems)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.TotalValue).HasPrecision(18, 4);
            entity.Property(e => e.GrossWeight).HasPrecision(18, 4);
            entity.Property(e => e.NetWeight).HasPrecision(18, 4);
        });

        // ========== PurchaseOrder ==========
        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasIndex(e => e.PONumber).IsUnique();
            entity.HasOne(e => e.Supplier)
                  .WithMany(s => s.PurchaseOrders)
                  .HasForeignKey(e => e.SupplierId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.TotalValue).HasPrecision(18, 4);
        });

        modelBuilder.Entity<PurchaseOrderItem>(entity =>
        {
            entity.HasOne(e => e.PurchaseOrder)
                  .WithMany(po => po.Items)
                  .HasForeignKey(e => e.PurchaseOrderId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.TotalValue).HasPrecision(18, 4);
        });

        // ========== SalesOrder ==========
        modelBuilder.Entity<SalesOrder>(entity =>
        {
            entity.HasIndex(e => e.SONumber).IsUnique();
            entity.HasOne(e => e.Customer)
                  .WithMany(c => c.SalesOrders)
                  .HasForeignKey(e => e.CustomerId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.TotalValue).HasPrecision(18, 4);
        });

        modelBuilder.Entity<SalesOrderItem>(entity =>
        {
            entity.HasOne(e => e.SalesOrder)
                  .WithMany(so => so.Items)
                  .HasForeignKey(e => e.SalesOrderId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.TotalValue).HasPrecision(18, 4);
        });

        // ========== Invoice ==========
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasIndex(e => new { e.InvoiceNumber, e.Type }).IsUnique();
            entity.HasOne(e => e.Shipment)
                  .WithMany(s => s.Invoices)
                  .HasForeignKey(e => e.ShipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.SubTotal).HasPrecision(18, 4);
            entity.Property(e => e.Discount).HasPrecision(18, 4);
            entity.Property(e => e.OtherCharges).HasPrecision(18, 4);
            entity.Property(e => e.TotalValue).HasPrecision(18, 4);
        });

        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.HasOne(e => e.Invoice)
                  .WithMany(i => i.Items)
                  .HasForeignKey(e => e.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Product)
                  .WithMany(p => p.InvoiceItems)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.Amount).HasPrecision(18, 4);
        });

        // ========== PackingList ==========
        modelBuilder.Entity<PackingList>(entity =>
        {
            entity.HasOne(e => e.Shipment)
                  .WithMany(s => s.PackingLists)
                  .HasForeignKey(e => e.ShipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Invoice)
                  .WithMany(i => i.PackingLists)
                  .HasForeignKey(e => e.InvoiceId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.Property(e => e.TotalGrossWeight).HasPrecision(18, 4);
            entity.Property(e => e.TotalNetWeight).HasPrecision(18, 4);
        });

        modelBuilder.Entity<PackingListItem>(entity =>
        {
            entity.HasOne(e => e.PackingList)
                  .WithMany(pl => pl.Items)
                  .HasForeignKey(e => e.PackingListId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.WeightPerUnit).HasPrecision(18, 4);
            entity.Property(e => e.TotalWeight).HasPrecision(18, 4);
        });

        // ========== Document ==========
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasOne(e => e.Shipment)
                  .WithMany(s => s.Documents)
                  .HasForeignKey(e => e.ShipmentId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
        });

        // ========== Booking ==========
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasIndex(e => e.BookingNumber).IsUnique();
            entity.HasOne(e => e.Shipment)
                  .WithMany(s => s.Bookings)
                  .HasForeignKey(e => e.ShipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ========== Container ==========
        modelBuilder.Entity<Container>(entity =>
        {
            entity.HasIndex(e => e.ContainerNumber).IsUnique();
            entity.HasOne(e => e.Shipment)
                  .WithMany(s => s.Containers)
                  .HasForeignKey(e => e.ShipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.PayloadWeight).HasPrecision(18, 4);
            entity.Property(e => e.TareWeight).HasPrecision(18, 4);
        });

        // ========== CustomsDeclaration ==========
        modelBuilder.Entity<CustomsDeclaration>(entity =>
        {
            entity.HasIndex(e => e.DeclarationNumber).IsUnique();
            entity.HasOne(e => e.Shipment)
                  .WithMany(s => s.CustomsDeclarations)
                  .HasForeignKey(e => e.ShipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ========== AuditLog ==========
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.UserId);
        });

        // ========== Seed Data ==========
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var adminRoleId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var staffRoleId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var viewerRoleId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var accountantRoleId = Guid.Parse("44444444-4444-4444-4444-444444444444");

        modelBuilder.Entity<Role>().HasData(
            new Role { Id = adminRoleId, Name = "Admin", Description = "Quản trị hệ thống", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Role { Id = staffRoleId, Name = "Staff", Description = "Nhân viên XNK", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Role { Id = viewerRoleId, Name = "Viewer", Description = "Chỉ xem dữ liệu", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Role { Id = accountantRoleId, Name = "Accountant", Description = "Kế toán", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );

        // Admin user: admin / Admin@123
        // BCrypt hash for "Admin@123"
        var adminUserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = adminUserId,
                FullName = "System Admin",
                Username = "admin",
                Email = "admin@xnk.local",
                PasswordHash = "$2a$11$K5qMbK1XzFfZ4YjKYfYQO.W8vL1VcWuR1NeXcW8lS3TA5V5hK5fOC", // Admin@123
                Department = "IT",
                Position = "Administrator",
                IsActive = true,
                RoleId = adminRoleId,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
