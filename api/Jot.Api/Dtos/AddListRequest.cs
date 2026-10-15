namespace Jot.Api.Dtos;

// Id is optional, like AddTodoRequest's: the UI sends one so it can open the new List's page straight away
public record AddListRequest(string Name, Guid? Id = null);
