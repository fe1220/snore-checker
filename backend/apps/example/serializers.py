from rest_framework import serializers

from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "title", "body", "is_archived", "created_at", "updated_at"]
        read_only_fields = ["is_archived", "created_at", "updated_at"]


class NoteCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=100)
    body = serializers.CharField(required=False, allow_blank=True, default="")
