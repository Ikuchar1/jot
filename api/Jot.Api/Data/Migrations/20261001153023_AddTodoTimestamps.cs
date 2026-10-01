using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "completed_at",
                table: "todos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "todos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "completed_at",
                table: "todos");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "todos");
        }
    }
}
