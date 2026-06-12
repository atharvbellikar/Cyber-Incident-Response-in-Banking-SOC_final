class ResponseLayerError(Exception):
    """Base exception for Response Layer."""
    pass

class PlaybookValidationError(ResponseLayerError):
    """Raised when a generated playbook fails safety validation."""
    pass

class ActionExecutionError(ResponseLayerError):
    """Raised when an action execution fails."""
    pass

class RollbackError(ResponseLayerError):
    """Raised when a rollback fails."""
    pass
