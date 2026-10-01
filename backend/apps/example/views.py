from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import selectors, services
from .serializers import NoteCreateSerializer, NoteSerializer


class NoteViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = NoteSerializer

    def get_queryset(self):
        return selectors.note_list(include_archived=self.action != "list")

    @extend_schema(request=NoteCreateSerializer, responses={201: NoteSerializer})
    def create(self, request):
        serializer = NoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = services.note_create(**serializer.validated_data)
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses={200: NoteSerializer})
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        note = services.note_archive(note=self.get_object())
        return Response(NoteSerializer(note).data)
