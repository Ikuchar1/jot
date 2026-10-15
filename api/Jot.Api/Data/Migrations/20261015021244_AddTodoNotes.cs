using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTodoNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "todos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "notes",
                table: "todos");
        }
    }
}
