from rest_framework.generics import RetrieveUpdateAPIView

from .serializers import ProfileSerializer


class ProfileView(RetrieveUpdateAPIView):
    """Read the current user's profile and update the personal statement."""

    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user
