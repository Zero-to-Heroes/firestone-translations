#!/bin/bash
git commit -am "update source strings" && \
    npx ts-node upload-translations.ts && \
    aws s3 cp ./firestone/ s3://static.firestoneapp.com/data/i18n/ --recursive --acl public-read && \
    aws s3 cp ./firestone/ s3://static.zerotoheroes.com/hearthstone/data/i18n/ --recursive --acl public-read && \
    git stash
# TODO: clear cloudflare cache https://static.firestoneapp.com/data/i18n