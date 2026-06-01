# Piper voice models (local, free)

WakuWaku loads ONNX files from this folder. They are **not** committed to git (large binaries).

## Local only (recommended)

Production on Render uses **browser TTS** (`DISABLE_PIPER=1`) to avoid out-of-memory crashes.

## Download English Piper voice

```bash
npm run download:piper-voices
```

Removes unused models (Chinese, Vietnamese, old Spanish, etc.):

```bash
npm run cleanup:piper-voices
```

## Voice menu (local, Piper on)

| Type | Language |
|------|----------|
| Piper | English (US) — `en_US-hfc_female-medium` |
| Device | English (Windows/browser) |
| Device | Japanese |

## Performance

- First TTS request loads the English ONNX model (~1–3 seconds).
- `PIPER_MAX_LOADED_VOICES=1` keeps one model in RAM.
