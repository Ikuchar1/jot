using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "list_id",
                table: "todos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("0199e1c0-0000-7000-8000-000000000001"));

            migrationBuilder.CreateTable(
                name: "todo_lists",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    is_inbox = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_todo_lists", x => x.id);
                });

            migrationBuilder.InsertData(
                table: "todo_lists",
                columns: new[] { "id", "created_at", "is_inbox", "name" },
                values: new object[] { new Guid("0199e1c0-0000-7000-8000-000000000001"), new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), true, "Inbox" });

            migrationBuilder.CreateIndex(
                name: "ix_todos_list_id",
                table: "todos",
                column: "list_id");

            migrationBuilder.CreateIndex(
                name: "ix_todo_lists_is_inbox",
                table: "todo_lists",
                column: "is_inbox",
                unique: true,
                filter: "is_inbox");

            migrationBuilder.AddForeignKey(
                name: "fk_todos_todo_lists_list_id",
                table: "todos",
                column: "list_id",
                principalTable: "todo_lists",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_todos_todo_lists_list_id",
                table: "todos");

            migrationBuilder.DropTable(
                name: "todo_lists");

            migrationBuilder.DropIndex(
                name: "ix_todos_list_id",
                table: "todos");

            migrationBuilder.DropColumn(
                name: "list_id",
                table: "todos");
        }
    }
}
