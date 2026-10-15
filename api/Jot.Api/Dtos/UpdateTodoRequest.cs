namespace Jot.Api.Dtos;

// Everything the editor can change. Later slices add their fields here (due date, priority).
// No ListId puts the todo in the Inbox, like AddTodoRequest.
public record UpdateTodoRequest(string Title, string? Notes, Guid? ListId = null);
