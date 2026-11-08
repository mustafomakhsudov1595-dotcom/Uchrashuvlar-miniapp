#!/usr/bin/env bash
# Eski trust-travel.uz (WordPress) dagi rasmlarni images/ papkasiga yuklaydi.
# Internet ochiq kompyuteringizda ishga tushiring:  bash download-images.sh
set -u
cd "$(dirname "$0")"; mkdir -p images
B="https://trust-travel.uz/wp-content/uploads/2020/02"
for f in travel36.jpg 2dee10c7f96587b313e267f51858e439.jpg img_3734.jpg gorodishc5.jpg 155084_original.jpg \
         ghglcflvogshiaqx.jpg kuhnya-uzbekistana.jpg tuyurty09.png day-3-uzbekistan-bukhara-miriarab-st.jpg 0_4_img_7385-min.jpg; do
  [ -s "images/$f" ] && { echo "bor: $f"; continue; }
  curl -fsSL --retry 2 -o "images/$f" "$B/$f" && echo "yuklandi: $f" || { echo "XATO: $f"; rm -f "images/$f"; }
done
echo "Mehmonxona rasmini images/hotel.jpg nomi bilan qo'ying (1000x1250, 4:5)."
