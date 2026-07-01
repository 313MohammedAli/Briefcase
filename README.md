# Briefcase

AI-powered app that stores a user's career experience bank and generates tailored,
ATS-optimized cover letters and resumes with a fit score for specific job postings.

## Stack

- **Frontend:** Next.js (React, TypeScript, App Router, Tailwind CSS) + Clerk for auth
- **Backend:** Django + Django REST Framework
- **Database:** PostgreSQL + `pgvector`
- **AI:** OpenAI API (`gpt-4.1` generation, `text-embedding-3-small` embeddings)
- **Export:** WeasyPrint (PDF) + python-docx (DOCX)
- **Deployment:** Vercel (frontend) + Railway (backend + Postgres)

See the Notion project space for the SRS, Design Document, and Development Plan.

## Local development

### Postgres + pgvector

```bash
docker compose up -d db
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in secrets
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in Clerk + API URL
npm run dev
```

Frontend runs at http://localhost:3000, backend API at http://localhost:8000.
