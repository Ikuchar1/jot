using Jot.Api.Data;

namespace Jot.Api.Dtos;

public record TodoDto(Guid Id, string Title, bool Done)
{
    public static TodoDto From(Todo todo) => new(todo.Id, todo.Title, todo.CompletedAt != null);
}
