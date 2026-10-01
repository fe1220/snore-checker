from django.db.models import QuerySet

from .models import Note


def note_list(*, include_archived: bool = False) -> QuerySet[Note]:
    qs = Note.objects.all()
    if not include_archived:
        qs = qs.filter(is_archived=False)
    return qs
