# firestone-translations

You can help with the translations here: https://translate.zerotoheroes.com/projects/firestone/overwolf-app/. You will need to create an account, then you can right away propose translations in any of the supported languages.

There is a #translations channel on the [Discord server](https://discord.gg/FhEHn8w) to discuss, well, anything related to the localization of the app.

This is a first time for me and is still very experimental, so please bear with me as we figure out how to do this stuff together :)

And of course, if you contribute to the translations, a BIG THANK YOU to you, as it's something that's impossible for me to do.

## Official Hearthstone words (`«TERM:…»`)

When a string needs an official in-game word (Battlecry, Mage, Naxxramas, …), do not type that word in English. Put a tag in the **English** source (`firestone/enUS.json`) so each locale gets the Hearthstone client term.

```
{{value}} was the first «TERM:GLOBAL_KEYWORD_BATTLECRY» card played this turn
```

Two forms:

- `«TERM:GLOBAL_KEYWORD_BATTLECRY»` — official GameString / pack / mode id from `hs-terms/`
- `«TERM:global.mechanics.battlecry»` — another key in the same locale file (including constructed `global`)

You can mix tags with ngx-translate placeholders (`{{value}}`, `{{min}}`). Leave those as-is.

Tags stay in Crowdin. `upload.sh` replaces them when building `dist/i18n`. An unknown tag or a cycle fails the upload. Add new tags only in `enUS.json`; other languages come from Crowdin.

## AI-complete locale files (`{locale}-ai.json`)

`upload.sh` also publishes a second file per locale next to the Crowdin file, e.g. `https://static.firestoneapp.com/data/i18n/deDE-ai.json`.

Each key uses the human string from `firestone/{locale}.json` when it is present and non-empty, otherwise the string from `firestone-ai/{locale}.json`. `enUS-ai.json` is always identical to `enUS.json`.

`firestone-ai/` is filled **on request** (ask to fill AI translations / refresh auto-translations / update firestone-ai). A refresh also re-translates keys whose English source changed since the last AI fill. It does not run automatically on upload. `upload.sh` prints missing/stale counts and still publishes whatever AI files are already committed.

# TODO

Apart from translating the various pieces of text (see the Crowdin project for that), there are a few things left to do in the app itself:

-   IMPORTANT: some card highlight features in Mercenaries currently don't work in non-English. Namely, it doesn't recognize the "deal damage" cards
-   Translate the bounty names for Mercs
-   For now the framework I use doesn't offer a way to fallback to a similar language if the translation doesn't exist in your selected language. For instance, if you use the app in esMX and a key is missing, it will fallback to enUS even if the key exists in esES. See https://github.com/ngx-translate/core/issues/393
