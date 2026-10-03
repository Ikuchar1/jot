namespace Jot.Api.Errors;

// Thrown by an orchestrator when the thing a request names doesn't exist (a deleted todo, say). Like a broken rule,
// the message is shown to the caller.
public class NotFoundException(string message) : Exception(message);
