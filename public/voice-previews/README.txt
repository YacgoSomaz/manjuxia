Bundled preset voice preview audio files live here.

Generate files with:
  python scripts/generate_voice_preview_assets.py

or, using a running logged-in app backend:
  python scripts/generate_voice_preview_assets.py --backend-url http://127.0.0.1:8000

Files are named from the internal voice_id and served by the backend as:
  /public/voice-previews/<safe_voice_id>.mp3
