import pytest
from rest_framework.test import APIClient

from .factories import NoteFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


def test_list_excludes_archived(api):
    NoteFactory(title="보임")
    NoteFactory(title="숨김", is_archived=True)
    res = api.get("/api/notes/")
    assert res.status_code == 200
    assert [n["title"] for n in res.json()["results"]] == ["보임"]


def test_create_validation_error_format(api):
    res = api.post("/api/notes/", {}, format="json")
    assert res.status_code == 400
    assert res.json()["code"] == "invalid_input"
    assert "title" in res.json()["fields"]


def test_archive_conflict_format(api):
    note = NoteFactory(is_archived=True)
    res = api.post(f"/api/notes/{note.id}/archive/")
    assert res.status_code == 409
    assert res.json()["code"] == "note_already_archived"
