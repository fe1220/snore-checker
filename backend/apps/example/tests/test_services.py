import pytest

from apps.core.exceptions import ConflictError
from apps.example import services

from .factories import NoteFactory

pytestmark = pytest.mark.django_db


def test_note_archive():
    note = services.note_archive(note=NoteFactory())
    assert note.is_archived


def test_note_archive_twice_raises():
    with pytest.raises(ConflictError):
        services.note_archive(note=NoteFactory(is_archived=True))
