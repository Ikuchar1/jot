using Jot.Api.Dtos;
using Jot.Api.Orchestrators;
using Microsoft.AspNetCore.Mvc;

namespace Jot.Api.Controllers;

[ApiController]
[Route("api/todos")]
public class TodosController(TodoOrchestrator todos) : ControllerBase
{
    // Route names become OpenAPI operation IDs, which orval turns into hook names (useListTodos, useAddTodo)
    [HttpGet(Name = "ListTodos")]
    public Task<List<TodoDto>> ListTodos(CancellationToken ct) => todos.ListAsync(ct);

    [HttpPost(Name = "AddTodo")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<ActionResult<TodoDto>> AddTodo(AddTodoRequest request, CancellationToken ct)
    {
        var todo = await todos.AddAsync(request, ct);
        // No get-one-todo endpoint yet, so there's no URL for a Location header
        return Created((string?)null, todo);
    }

    // Checking or un-checking a todo. A PUT, so sending it again (a retry) changes nothing more.
    [HttpPut("{id:guid}/done", Name = "SetTodoDone")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public Task<TodoDto> SetTodoDone(Guid id, SetTodoDoneRequest request, CancellationToken ct) =>
        todos.SetDoneAsync(id, request.Done, ct);

    // Deleting an already-deleted todo is still a 204, so a retry is safe
    [HttpDelete("{id:guid}", Name = "DeleteTodo")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteTodo(Guid id, CancellationToken ct)
    {
        await todos.DeleteAsync(id, ct);
        return NoContent();
    }
}
