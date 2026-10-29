using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XNK.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSalePriceCustomerAndCurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CustomerId",
                table: "ProductSalePrices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "ProductSalePrices",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerType",
                table: "ProductSalePrices",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DestinationCountry",
                table: "ProductSalePrices",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ExchangeRate",
                table: "ProductSalePrices",
                type: "numeric(18,4)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "ProductSalePrices");

            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "ProductSalePrices");

            migrationBuilder.DropColumn(
                name: "CustomerType",
                table: "ProductSalePrices");

            migrationBuilder.DropColumn(
                name: "DestinationCountry",
                table: "ProductSalePrices");

            migrationBuilder.DropColumn(
                name: "ExchangeRate",
                table: "ProductSalePrices");
        }
    }
}
