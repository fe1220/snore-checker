from django.db import transaction

from apps.core.exceptions import ConflictError

from .models import Note


@transaction.atomic
def note_create(*, title: str, body: str = "") -> Note:
    return Note.objects.create(title=title, body=body)


@transaction.atomic
def note_archive(*, note: Note) -> Note:
    if note.is_archived:
        raise ConflictError("note_already_archived", "이미 보관된 메모예요.")
    note.is_archived = True
    note.save(update_fields=["is_archived", "updated_at"])
    return note
