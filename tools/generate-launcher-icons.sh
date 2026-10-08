#!/usr/bin/env bash
set -euo pipefail

# Resource conversion only: keep the supplied artwork intact, resize proportionally,
# and add padding so every part of it stays inside Android's launcher safe area.
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artwork="$repo_dir/artwork/my_vehicle_service_launcher.png"
resources="$repo_dir/app/src/main/res"

command -v magick >/dev/null || { echo "ImageMagick 7 is required." >&2; exit 1; }
[[ -f "$artwork" ]] || { echo "Launcher artwork is missing." >&2; exit 1; }

# Android uses a 108 dp adaptive layer and a central 66 dp safe circle.
# A 46 dp square fits entirely inside that circle, including its corners.
# Legacy artwork uses a 32 dp square inside the 48 dp icon for the same reason.
for spec in mdpi:48:32:108:46 hdpi:72:48:162:69 xhdpi:96:64:216:92 xxhdpi:144:96:324:138 xxxhdpi:192:128:432:184; do
    IFS=: read -r density legacy_size legacy_art adaptive_size adaptive_art <<< "$spec"
    target="$resources/mipmap-$density"
    mkdir -p "$target"

    magick "$artwork" -filter Lanczos -resize "${legacy_art}x${legacy_art}" \
        -background white -gravity center -extent "${legacy_size}x${legacy_size}" \
        -strip "PNG24:$target/ic_launcher.png"

    # Only the padding is masked. The original image lies within the round mask.
    center=$(awk "BEGIN { print ($legacy_size-1)/2 }")
    edge=$(awk "BEGIN { print $legacy_size-0.5 }")
    magick "$target/ic_launcher.png" \
        \( -size "${legacy_size}x${legacy_size}" xc:none -fill white \
           -draw "circle $center,$center $center,$edge" \) \
        -alpha off -compose CopyOpacity -composite -strip \
        "PNG32:$target/ic_launcher_round.png"

    magick "$artwork" -filter Lanczos -resize "${adaptive_art}x${adaptive_art}" \
        -background none -gravity center -extent "${adaptive_size}x${adaptive_size}" \
        -strip "PNG32:$target/ic_launcher_foreground.png"
done
