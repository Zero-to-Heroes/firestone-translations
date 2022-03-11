#!/bin/bash
git commit -am "update source strings" && \
    ts-node upload-translations.ts && \
    aws s3 cp ./firestone/ s3://static.firestoneapp.com/data/i18n/ --recursive --acl public-read && \
    git stash