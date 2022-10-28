# firestone-translations

You can help with the translations here: https://crowdin.com/project/firestone. You will need to create an account, then you can right away propose translations in any of the supported languages.

There is a #translations channel on the [Discord server](https://discord.gg/FhEHn8w) to discuss, well, anything related to the localization of the app.

This is a first time for me and is still very experimental, so please bear with me as we figure out how to do this stuff together :)

And of course, if you contribute to the translations, a BIG THANK YOU to you, as it's something that's impossible for me to do.

# TODO

Apart from translating the various pieces of text (see the Crowdin project for that), there are a few things left to do in the app itself:

-   IMPORTANT: some card highlight features in Mercenaries currently don't work in non-English. Namely, it doesn't recognize the "deal damage" cards
-   Translate the bounty names for Mercs
-   For now the framework I use doesn't offer a way to fallback to a similar language if the translation doesn't exist in your selected language. For instance, if you use the app in esMX and a key is missing, it will fallback to enUS even if the key exists in esES. See https://github.com/ngx-translate/core/issues/393
