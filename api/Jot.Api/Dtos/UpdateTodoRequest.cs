namespace Jot.Api.Dtos;

// Everything the editor can change. Later slices add their fields here (list, due date, priority).
public record UpdateTodoRequest(string Title, string? Notes);
