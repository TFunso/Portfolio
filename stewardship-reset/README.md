# 30-Day Stewardship Reset (TheAbidingYear)

Faith-filled money workbook for Etsy, plus everything needed to list and advertise it.

## Deliverables
- `build/30-Day-Stewardship-Reset.pdf`: the 50-page workbook (US Letter, hyperlinked for GoodNotes)
- `build/Stewardship-Reset-Trackers.xlsx`: bonus spreadsheet (budget, debt payoff, emergency fund, money found)
- `build/pages/`: every page as a PNG (for mockups and ads)
- `listing-images/`: 10 Etsy listing images, 3000×2250, upload in numbered order (see LISTING.md)
- `ads/`: 4 ad sizes (1080×1080, 1080×1350, 1080×1920, Pinterest 1000×1500)
- `LISTING.md`: Etsy title, tags, description, price, FAQ
- `ADS.md`: ad copy for 3 angles, Pinterest text, 3 short video scripts

## Rebuild after editing
```
python3 src/build_workbook.py   # content in src/content.py, styles in src/workbook.css
node src/render.js              # PDF + page PNGs (needs Playwright)
python3 src/build_sheet.py      # spreadsheet (needs openpyxl)
node src/render_scenes.js       # listing images + ads from src/scenes.html
```
Scripture: King James Version (public domain in the US).
