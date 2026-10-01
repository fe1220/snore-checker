# Backend (Django + DRF)

```bash
source .venv/bin/activate
python manage.py runserver        # http://localhost:8000/api/health/
python manage.py makemigrations && python manage.py migrate
pytest -q && ruff check .
```

- API 문서: http://localhost:8000/api/docs/
- 새 앱: `django-admin startapp <name> apps/<name>` 후 apps.py `name = "apps.<name>"`, settings INSTALLED_APPS 추가
- DB: 기본 SQLite, `.env`의 `DATABASE_URL`로 Postgres 전환
