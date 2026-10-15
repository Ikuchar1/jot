using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoDeletedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "todos",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "todos");
        }
    }
}
