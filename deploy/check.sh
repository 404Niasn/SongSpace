#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

sha256sum --check --quiet SHA256SUMS
curl --fail --silent --show-error --max-time 15 http://127.0.0.1:8000/api/v1/health
echo
curl --fail --silent --show-error --max-time 15 http://127.0.0.1:8000/api/v1/health/ready
echo

if [[ $# -gt 0 ]]; then
    site_url="${1%/}"
    curl --fail --silent --show-error --max-time 15 "$site_url/login" | grep -q '<div id="app">'
    curl --fail --silent --show-error --max-time 15 "$site_url/catalog/qqmusic-hot-100.json" > /dev/null
    curl --fail --silent --show-error --max-time 15 "$site_url/catalog/map-music.json" > /dev/null
    curl --fail --silent --show-error --max-time 15 "$site_url/api/v1/health/ready"
    echo
    status="$(curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}' "$site_url/api/v1/game/save")"
    [[ "$status" == 401 ]] || { echo "Expected unauthenticated save status 401, got $status"; exit 1; }
    for world in forest sea jiangnan; do
        status="$(curl --silent --show-error --max-time 15 --range 0-1023 --output /dev/null --write-out '%{http_code}' "$site_url/audio/maps/$world.mp3")"
        [[ "$status" == 206 ]] || { echo "Expected audio range status 206, got $status"; exit 1; }
    done
fi
echo 'PASS: release integrity and requested service checks'
