# Piper voice models (local, free)

WakuWaku loads ONNX files from this folder. They are **not** committed to git (large binaries).

## Download all app voices

From the project root with your venv active:

```bash
python scripts/download_piper_voices.py
```

Or:

```bash
npm run download:piper-voices
```

## Included languages (Piper)

| Language | Voice ID |
|----------|----------|
| English (US) | `en_US-hfc_female-medium` |
| Spanish | `es_ES-davefx-medium` |
| Chinese | `zh_CN-huayan-medium` |
| Vietnamese | `vi_VN-25hours_single-low` |

## Korean

There is **no** official `ko_KR` voice in [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices). When you pick a **Korean** entry in the voice menu, WakuWaku uses your **browser / device TTS** instead.

## Performance

- Models are **not** loaded at startup. The first TTS request for a language loads that ONNX file (~1–3 seconds).
- By default only **one** model stays in RAM at a time (`PIPER_MAX_LOADED_VOICES=1`). Switching voice unloads the previous model.
- `/voices/status` only checks that files exist (fast). The UI caches that response for 60 seconds.

## Disable Piper

Set `DISABLE_PIPER=1` in the environment (default on some hosts).
