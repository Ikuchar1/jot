namespace Jot.Api.Dtos;

// Id is optional (the default is what drops it from OpenAPI's "required" list): the UI sends one, so an
// optimistic add already has its real ID; MCP and Siri callers don't
public record AddTodoRequest(string Title, Guid? Id = null);
