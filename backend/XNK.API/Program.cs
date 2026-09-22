using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using XNK.Core.Interfaces;
using XNK.Infrastructure.Data;
using XNK.Infrastructure.Repositories;
using XNK.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// ========== Database ==========
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ========== Repositories ==========
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// ========== Services ==========
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddSingleton<IFileService>(sp =>
{
    var uploadPath = builder.Configuration["FileStorage:UploadPath"]
        ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
    return new FileService(uploadPath);
});

// ========== JWT Authentication ==========
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ========== CORS ==========
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:4200",
            "http://localhost:4201"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// ========== Controllers ==========
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ========== Swagger ==========
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "XNK API",
        Version = "v1",
        Description = "Hệ thống Quản lý Xuất Nhập Khẩu"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Nhập JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ========== Middleware Pipeline ==========
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "XNK API v1");
    c.RoutePrefix = "swagger";
});

var frontendPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "../../frontend"));
if (Directory.Exists(frontendPath))
{
    var fileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath);
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = fileProvider
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider
    });
}
else
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

if (Directory.Exists(frontendPath))
{
    var fileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath);
    app.MapFallbackToFile("{*path:regex(^(?!api|swagger).*$)}", "index.html", new StaticFileOptions { FileProvider = fileProvider });
}
else
{
    app.MapFallbackToFile("{*path:regex(^(?!api|swagger).*$)}", "index.html");
}

// ========== Auto-migrate & Seed on startup ==========
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DbInitializer.SeedAsync(db);
}

app.Run();
