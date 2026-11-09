# Build prompt: Dividend Planner (NGX + NYSE)

Copy everything below the line into Claude Code, Claude.ai or another AI coding assistant.

---

You are building **Dividend Planner**, a free, mobile-friendly website that helps an everyday investor build a dividend portfolio that pays them every month, so dividends can eventually replace a salary. It covers the Nigerian Exchange (NGX, prices in ₦) and the New York Stock Exchange (NYSE, prices in $). Build it exactly as specified below.

## 1. Technical constraints

- A **static site** only: plain HTML, CSS and vanilla JavaScript. No backend, no build step, no framework, no login.
- Each page is one self-contained `.html` file. Stock data lives in JSON files that the pages `fetch()`.
- Save the user's own data (budget, holdings, settings) in the browser with `localStorage`, under one versioned key such as `divplan.v1`. Wrap every read and write in try/catch. Offer **Export** (download a JSON backup), **Import** (load that file) and **Start over** buttons.
- Render the research reports with the `marked` Markdown library, saved inside the project (for example `vendor/marked.min.js`) so the site doesn't depend on a CDN.
- It must work at 390px phone width with no sideways scrolling, and in both light and dark mode (`prefers-color-scheme`). Wide tables scroll inside their own container.
- Deploy to any static host. Vercel works with "Framework: Other", no build command, and the project folder as the root directory.
- Every page shows a footer: "Personal research, not financial advice. Check the company notice and a live price before you trade."

## 2. Data honesty rules (most important)

- **Never invent a figure.** Every dividend amount, date and price must come from a company notice, an exchange filing, an investor-relations page or a reputable financial news source. Record the source and the date you checked it.
- If a figure can't be confirmed, write "Data not available". Don't guess.
- When a future date is projected from last year's pattern, set `"estimated": true` and show an **expected** badge in the interface.
- Every price carries a `priceDate`. Tell the user prices are a snapshot and let them type in today's price from their broker app.

## 3. Pages

Put a top navigation bar on every page: **My Plan** (most prominent) · NGX calendar · NYSE calendar · Research.

### 3a. Research hub (`index.html`)

- A list of stock research reports (Markdown files in `reports/`, named `YYYY-MM-DD-company.md`), registered in a `REPORTS` array with id, title, date and verdict.
- A search box that filters the list by company name or ticker as you type.
- Clicking a report renders it on the page. Before parsing, replace `~` with `&#126;` so "~10%" doesn't turn into strikethrough.
- Each report follows this framework:
  - **Steps:** business quality, financial health, management, valuation (fair value), growth, risks, expected return over 1, 3 and 5 years, and portfolio allocation.
  - **Scoring:** a total out of 100: Business 25, Financial 20, Management 10, Valuation 20, Growth 15, Risk 10.
  - **Verdict:** Strong Buy, Buy, Hold, Watchlist or Avoid.
  - **Rules:**
    - no Buy if the downside is larger than the upside;
    - no Strong Buy if the expected yearly return is under 8%;
    - penalise debt, share dilution and country or currency risk;
    - if the annual report, quarterly report or earnings release can't be reached, say "Insufficient reliable data" and cap confidence at 50%.

### 3b. NGX dividend calendar (`dividend-calendar.html` + `dividend-data.json`)

- **Coverage:** about 30 viable NGX dividend payers across banking, telecoms, oil and gas, cement and industrials, consumer goods, agriculture, healthcare, tech, insurance, real estate (REITs) and infrastructure funds. The aim is that **every month from January to December has at least one payment**. NGX companies rarely pay in January, so include funds that qualify in late January and pay in February, such as Chapel Hill Denham NIDF and the Chapel Hill Denham/Coronation infrastructure funds.
- **Starter list to research** (keep only those still paying):
  - Banking: GTCO, Zenith, Stanbic IBTC, UBA
  - Telecoms: MTN Nigeria, Airtel Africa
  - Oil and gas: Seplat, Aradel
  - Cement and industrials: Dangote Cement, Julius Berger
  - Consumer goods: BUA Foods, Unilever, PZ, Guinness, Vitafoam, Honeywell Flour
  - Agriculture: Okomu, Presco
  - Healthcare: Fidson
  - Tech and payments: CWG, eTranzact, VFD
  - Exchange: NGX Group
  - Insurance and finance: Custodian, Africa Prudential
  - Real estate: UPDC REIT, MOFI REIT
  - Infrastructure funds: NIDF, CNIF
  - Hotels: Transcorp Hotels
- **JSON shape for each stock:**
  ```json
  { "id": "gtco", "ticker": "GTCO", "name": "Guaranty Trust Holding Co.", "sector": "Banking",
    "price": 0, "priceDate": "YYYY-MM-DD", "irregular": false, "view": "Buy", "report": "reports/...md",
    "payments": [ { "label": "Final", "amount": 0, "qual": "YYYY-MM-DD", "pay": "YYYY-MM-DD", "estimated": false, "note": "" } ] }
  ```
  Also add an `excluded` list (stocks left out and why) and a `sources` list.
- **Key terms:**
  - **Qualification (cut-off) date:** you must be on the register on this date to get the dividend.
  - **Buy-by date:** 3 business days before the qualification date, to allow for settlement. Keep this number in one setting so it's easy to change if the rule changes.
- **Interface:**
  - a 12-month grid that switches between a **payment-month** view and a **cut-off-month** view;
  - sector filter chips;
  - an "upcoming cut-offs" list;
  - a planner to tick stocks, with an **11-month coverage** preset, showing which months are covered;
  - a calculator: "how much do I need invested to earn ₦X a month".
- **Also show:** how often each stock pays (once, twice or four times a year), and its yield worked out from price and annual dividend.

### 3c. NYSE dividend calendar (`us-dividend-calendar.html` + `us-dividend-data.json`)

- **Coverage:** about 22 quality payers, from cheap to blue chip. Include monthly payers (Realty Income O, Main Street MAIN, Agree ADC, EPR, PennantPark PFLT, flagged high risk) and quarterly payers spread across the three cycles (Jan/Apr/Jul/Oct, Feb/May/Aug/Nov, Mar/Jun/Sep/Dec): JPM, MO, PM, MDT, STAG, PG, ABBV, VZ, T, KMI, JNJ, XOM, CVX, PFE, IBM, F, KO.
- **JSON fields:** `freq`, `amount`, `annual`, `payMonths`, `latest: [{ex, pay, amount}]`, `price`, `priceNote`, `tier` (under $10, $10–50, $50–100, $100+), plus optional `view` and `report`.
- **Buy-by date:** 1 business day before the **ex-dividend date** (T+1 settlement).
- **Interface:**
  - tier and sector chips, a monthly income band and an upcoming ex-dates list;
  - a dollar planner with a **Top 5** preset ($2,000 each) and a **12-month ladder** preset;
  - a note that the US withholds 30% of dividends paid to Nigerian residents (no tax treaty);
  - fractional shares are allowed, so a high price is no barrier.
- **Penny stocks:** genuine penny stocks rarely pay dependable dividends, so start at about $5 and flag anything risky.

### 3d. My Plan (`plan.html`): the main page

This page turns the data into actions. It reads both JSON files and has an **NGX ₦ / NYSE $** switch. Each market keeps its own settings and holdings.

**Defaults** (all editable):

| Setting | NGX | NYSE |
|---|---|---|
| Invest amount | ₦50,000 a month on day 1 | $100 a week on Monday |
| Monthly income target | ₦500,000 | $3,000 |
| Dividend tax | 10% (Nigeria) | 0% for US residents (30% for Nigerians) |
| Yield | 8% | 4% |
| Yearly growth | 5% | 5% |
| Shares | whole shares only | fractional shares allowed |
| Days to settle (buy-by) | 3 | 1 |

**Sections, in this order:**

1. **This week's / this month's move** (top of the page)
   - Using the budget, name the best 1–2 stocks to buy now: split 60/40 if the budget is at least ₦40,000 or $200, otherwise put it all in one stock.
   - Show the amount for each stock and roughly how many shares that buys at the stored price.
   - Under each pick, list the reasons in plain language.
   - Then show "Next in line" (the next 3 stocks) and a collapsible "Not suggested right now" list with the reason for each.
   - **Scoring, for each stock in the user's plan list:**
     - **Upcoming buy-by date:** +40 points if within 7 days, +30 if within 21, +15 if later. Halve these points if the buy-by date falls before the user's next invest day, and say so: "buy early only if you have spare cash".
     - **Empty months:** +10 for each month it pays in which the user has no dividend income yet (maximum 30).
     - **Underweight:** points if the user holds less than an even share of their plan (target is 1 ÷ number of stocks in the plan; up to 30).
     - **Research verdict:** a bonus from our research, e.g. Buy +10, Top 5 pick +5.
     - **"Add more" price:** +10 if the price is below the level our research gives for adding more.
     - **Yield:** plus the yield as a percentage (maximum 8).
     - **Skip entirely:** stocks flagged high risk, or priced above their "buy only below" level. Examples: BUA Foods only below ₦550, CWG only below ₦15, JNJ only below $230.
2. **Next 30 days**
   - **Events:** buy-by dates for plan stocks and owned stocks, payment dates for owned stocks (with ≈ ₦ received after tax), and the user's invest days.
   - **Invest-day rows:** "Invest your ₦50,000. See what to buy ↑", where the link jumps to the move card.
   - **Each row:** a **+ Google** button that opens a pre-filled Google Calendar event (`https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=YYYYMMDD/YYYYMMDD&details=…`). The details include the full web address of the plan page.
   - **Two buttons at the top:**
     - **Add all to Google Calendar:** downloads the .ics file, opens `https://calendar.google.com/calendar/r/settings/export` and shows a 2-step import guide. Google only imports on a computer.
     - **iPhone / Outlook (.ics):** builds a full year of events as an .ics file:
       - all-day events, CRLF line endings, escaped text;
       - an alarm at 9am on the day;
       - a second alarm 2 days earlier for buy-by dates.
3. **Your numbers**
   - Fields: amount, how often (week/month), which day, monthly income target, and dividend tax %.
   - A note on the tax rule for each market.
4. **What I own**
   - Add holdings (stock + number of shares). Price can be edited per row.
   - Tiles: portfolio value, dividends a year, average a month, % of goal reached, and months covered out of 12.
   - A Jan–Dec strip showing income each month.
5. **When can dividends replace my salary?**
   - Inputs: starting value (defaults to the portfolio value), yield, yearly growth, reinvest yes/no.
   - **Month-by-month simulation for up to 40 years:**
     - `dividend = value × yield ÷ 12 × (1 − tax)`;
     - `value = value × (1 + growth)^(1/12) + monthly contribution + dividend` (leave out the dividend if not reinvesting);
     - monthly income = `value × yield × (1 − tax) ÷ 12`.
   - **Results:** the year and month the target is reached, and the portfolio needed: `target × 12 ÷ (yield × (1 − tax))`.
   - **Chart** (SVG, no library): titled "Your monthly dividend income, year by year". It shows:
     - a key (green line = projected income, dashed line = target);
     - a one-sentence guide on reading it;
     - round axis values with short labels (₦200k, ₦1.2m);
     - a "goal reached ≈ yr N" marker;
     - dots that show exact figures on hover or tap.
   - A table version underneath.
6. **What will my money grow to?**
   - Inputs: amount and frequency (day, week, month, quarter, year), an optional extra year, and the monthly income needed to retire.
   - **Converting to a monthly amount:** day × 365/12, week × 52/12, quarter ÷ 3, year ÷ 12.
   - **A card for each of 1, 2, 3, 4, 5, 10, 15, 20, 25 and 30 years** (plus the extra year). Each card shows:
     - money put in, what it could be worth, and what it pays per month;
     - a % badge;
     - a verdict: **Retirement-ready** if the dividends cover the target, otherwise **Not mature yet: X% of your target. To be ready in N years, invest about ₦Y every [frequency].**
   - **Working out ₦Y:** the result grows in a straight line with the contribution, so calculate it as `(portfolio needed − result with ₦0 added) ÷ result with ₦1 a month added`.
   - **Summary line:** "you become retirement-ready in about N years", using the exact month.
   - **Footnote:** daily or weekly money is pooled monthly, broker fees make daily buying impractical, and these are estimates.
7. **Stocks in my plan:** a checklist of every stock, with research badges and the months each pays. The starting list:
   - NGX: GTCO, Zenith, MTN, Seplat, NIDF, Stanbic, Airtel, Dangote Cement, CNIF, Vitafoam, Julius Berger.
   - NYSE: O, MAIN, ABBV, MDT, CVX, PG, KO, PFE.
8. **Backup:** Export, Import and Start over. Start over asks for confirmation on the page itself (don't rely on `confirm()`).

**Projecting dates:** if a stock has no announced date yet, assume NGX companies repeat last year's dates one year later. For US stocks, step forward 1 month (monthly payers) or 3 months (quarterly payers) from the latest declared date. Mark every projected date **expected**.

## 4. Done when

- No JavaScript errors on any page, at 1200px and 390px wide, in light and dark mode.
- With empty holdings, My Plan's move card names specific stocks, amounts and share counts. After adding holdings, the picks change.
- The .ics file opens in Google Calendar, Apple Calendar and Outlook, and the alarms fire. The **+ Google** links open a correctly filled event.
- Holdings and settings survive a page reload, and Export → Start over → Import brings them back.
- Switching NGX ↔ NYSE keeps each market's data separate.
- Every figure in the JSON files has a source and date. Projected dates show **expected**.
- A README explains how to update the JSON files when companies announce new dividends.
