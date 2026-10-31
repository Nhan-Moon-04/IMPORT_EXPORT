using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XNK.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierToPurchasePrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SupplierId",
                table: "ProductPurchasePrices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierName",
                table: "ProductPurchasePrices",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductPurchasePrices_SupplierId",
                table: "ProductPurchasePrices",
                column: "SupplierId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductPurchasePrices_Suppliers_SupplierId",
                table: "ProductPurchasePrices",
                column: "SupplierId",
                principalTable: "Suppliers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductPurchasePrices_Suppliers_SupplierId",
                table: "ProductPurchasePrices");

            migrationBuilder.DropIndex(
                name: "IX_ProductPurchasePrices_SupplierId",
                table: "ProductPurchasePrices");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "ProductPurchasePrices");

            migrationBuilder.DropColumn(
                name: "SupplierName",
                table: "ProductPurchasePrices");
        }
    }
}
