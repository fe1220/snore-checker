from django.urls import reverse


def test_health(client):
    res = client.get(reverse("health"))
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
