from rest_framework.throttling import UserRateThrottle


class AIRateThrottle(UserRateThrottle):
    """Tight per-user throttle for OpenAI-backed endpoints.

    Rate comes from DEFAULT_THROTTLE_RATES['ai']. Applied to the endpoints
    that make generation/embedding calls so one account can't exhaust the
    OpenAI budget.
    """

    scope = "ai"
