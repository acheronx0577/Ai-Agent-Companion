# WakuWaku AI Companion

Flask chat companion with Google sign-in, Gemini, Piper TTS, and a responsive mint-dark UI.

## Setup

1. Create a virtual environment and install dependencies:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy environment template and fill in your values:

```bash
copy .env.example .env
```

Required in `.env`: `GEMINI_API_KEY`, `FLASK_SECRET_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.

Optional local key files (`gemini_key.txt`, `project_id.txt`) are supported by setup scripts but are **gitignored** — do not commit them.

3. Run the app:

```bash
python app.py
```

Open http://127.0.0.1:5000

## Tests

```bash
npm install
npm run test:a11y
```

## Design

See [DESIGN.md](DESIGN.md) for the Night Desk UI system.
