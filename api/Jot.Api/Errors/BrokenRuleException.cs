namespace Jot.Api.Errors;

// Thrown by an orchestrator when a request breaks one of its rules. Rules live in the orchestrators, not in request
// validation, so MCP tools calling an orchestrator directly get the same checks. The message is shown to the caller.
public class BrokenRuleException(string message) : Exception(message);
