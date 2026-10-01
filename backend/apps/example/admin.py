from django.contrib import admin

from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ["title", "is_archived", "created_at"]
    list_filter = ["is_archived"]
    search_fields = ["title"]
