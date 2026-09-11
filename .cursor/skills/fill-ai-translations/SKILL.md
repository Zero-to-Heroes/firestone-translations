---
name: fill-ai-translations
description: Fills missing Firestone locale strings and re-translates keys whose English source changed. Writes firestone-ai files only. Use when the user asks to fill AI translations, refresh auto-translations, or update firestone-ai.
---

# Fill AI translations

On-request only. Do not run this because `upload.sh` was invoked.

## Workflow

1. Run `npx ts-node scripts/missing-ai-keys.ts --json` (add a locale argument to limit scope).
2. Process **one locale at a time**. Skip `enUS`.
3. For that locale, translate every `missing` and `stale` key from current `firestone/enUS.json`.
4. Write a flat JSON map `{ "dot.path": "translated text" }` and apply it:

```bash
npx ts-node scripts/apply-ai-keys.ts <locale> ./tmp-<locale>-ai.json --prune
```

5. Re-run the gap script for that locale and confirm `missing=0` and `stale=0` before starting the next locale.
6. Do not run `upload.sh` unless the user asked to publish.

## Translation rules

- Crowdin / `firestone/{locale}.json` always wins. Never copy AI text into those files.
- Only keys with no non-empty human value belong in `firestone-ai/{locale}.json`.
- Preserve `{{placeholders}}` and `«TERM:…»` tags exactly. Do not translate inside them.
- Match the tone of existing human strings in that locale when they exist.
- Skip `unused-do-not-translate`.
- When English changed (`stale`), rewrite the AI string for the **new** English, then `apply-ai-keys` updates `_en-source`.

## Files

| Path | Shape | Role |
|------|--------|------|
| `firestone-ai/{locale}.json` | Nested, AI keys only | Fallback strings |
| `firestone-ai/_en-source/{locale}.json` | Flat `dot.path → enUS text` | Detect stale English |

`--prune` drops AI keys that now have a human translation or were removed from `enUS`.
