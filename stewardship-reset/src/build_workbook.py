"""Builds the 30-Day Stewardship Reset workbook as one HTML file (Letter pages).

Run:  python3 src/build_workbook.py   -> build/workbook.html
Then: node src/render.js              -> PDF + per-page PNGs
"""
import html
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from content import DAYS, SCRIPTS, WEEKS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build", "workbook.html")

BRAND = "TheAbidingYear"
PRODUCT = "30-Day Stewardship Reset"

e = html.escape

# ------------------------------------------------------------------ helpers

def lines(n, cls="ln"):
    return "".join(f'<div class="{cls}"></div>' for _ in range(n))


def prompts(items):
    out = []
    for label, n in items:
        out.append(f'<div class="prompt"><div class="pl">{e(label)}</div>{lines(n)}</div>')
    return '<div class="prompts">' + "".join(out) + "</div>"


def table(cols, widths, rows, prefill=None, cls=""):
    head = "".join(f'<th style="width:{w}%">{e(c)}</th>' for c, w in zip(cols, widths))
    body = []
    for i in range(rows):
        first = ""
        if prefill and i < len(prefill):
            first = e(prefill[i])
        is_total = first == "TOTAL"
        cells = [f'<td class="{"tot" if is_total else ""}">{first}</td>']
        cells += ["<td></td>" for _ in cols[1:]]
        body.append(f'<tr class="{"totrow" if is_total else ""}">' + "".join(cells) + "</tr>")
    return f'<table class="wt {cls}"><thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table>'


def twocol(labels, n):
    l, r = labels
    return (f'<div class="twocol"><div><div class="colh">{e(l)}</div>{lines(n)}</div>'
            f'<div><div class="colh">{e(r)}</div>{lines(n)}</div></div>'
            f'<div class="prompt" style="margin-top:14px"><div class="pl">The one want I\'m pausing, and what I\'ll do instead</div>{lines(2)}</div>')


def stat(label, prefix="$", wide=False):
    return f'<div class="stat{" wide" if wide else ""}"><div class="sl">{e(label)}</div><div class="sv">{prefix}</div></div>'


def stats(items, cols=3):
    return f'<div class="stats c{cols}">' + "".join(items) + "</div>"


LEAF_SVG = """<svg class="vine" viewBox="0 0 120 40" aria-hidden="true">
<path d="M4 30 C 30 26, 50 14, 116 10" fill="none" stroke="currentColor" stroke-width="1.6"/>
<ellipse cx="26" cy="21" rx="9" ry="4" transform="rotate(-35 26 21)" fill="currentColor" opacity=".85"/>
<ellipse cx="34" cy="30" rx="9" ry="4" transform="rotate(25 34 30)" fill="currentColor" opacity=".55"/>
<ellipse cx="58" cy="12" rx="9" ry="4" transform="rotate(-30 58 12)" fill="currentColor" opacity=".85"/>
<ellipse cx="66" cy="22" rx="9" ry="4" transform="rotate(25 66 22)" fill="currentColor" opacity=".55"/>
<ellipse cx="90" cy="6" rx="8" ry="3.6" transform="rotate(-20 90 6)" fill="currentColor" opacity=".85"/>
<ellipse cx="98" cy="15" rx="8" ry="3.6" transform="rotate(25 98 15)" fill="currentColor" opacity=".55"/>
<circle cx="112" cy="16" r="2.6" fill="var(--gold)"/><circle cx="117" cy="19" r="2.2" fill="var(--gold)"/><circle cx="111" cy="22" r="2" fill="var(--gold)"/>
</svg>"""


SPECIAL = {
    "TWO_TABLES_INCOME_ACCOUNTS": lambda: (
        '<div class="sub">Monthly take-home income</div>'
        + table(["Income source", "Monthly take-home"], [64, 36], 5, ["", "", "", "", "TOTAL"])
        + '<div class="sub" style="margin-top:14px">Every account I have</div>'
        + table(["Account", "Type (checking, savings, card, loan)", "Balance today"], [36, 40, 24], 7)
    ),
    "REVIEW_W1": lambda: (
        stats([stat("Monthly take-home income (Day 2)"), stat("Monthly bills (Day 3)"),
               stat("Monthly spending (Day 4)"), stat("Income − bills − spending ="),
               stat("Subscriptions cancelled (Day 5)"), stat("Money found this week")])
        + prompts([("What I learned about our money this week", 3),
                   ("Worries I uncovered, turned into prayer requests", 4)])
    ),
    "CALL_LOG_SINGLE": lambda: (
        '<div class="form">'
        + "".join(f'<div class="fr"><span>{e(l)}</span><i></i></div>' for l in
                  ["Company & phone number", "Date & time called", "Representative's name",
                   "Old monthly price", "New monthly price", "Offer details & end date"])
        + "</div>"
        + stats([stat("Monthly savings"), stat("× 12 = yearly savings"), stat("Reminder to recheck on", prefix="")])
        + prompts([("How it went, and what I'd say differently next time", 3)])
    ),
    "MEAL_PLAN": lambda: (
        table(["Day", "Dinner", "Uses what I already have"], [16, 50, 34], 7,
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
        + '<div class="sub" style="margin-top:14px">Grocery list</div>'
        + '<div class="twocol tight"><div>' + lines(6, "ln chk") + "</div><div>" + lines(6, "ln chk") + "</div></div>"
        + stats([stat("Grocery budget"), stat("Actually spent"), stat("Saved vs. usual week")])
    ),
    "REVIEW_W2": lambda: (
        table(["Bill", "Old monthly", "New monthly", "Saved / month"], [40, 20, 20, 20], 7,
              ["Internet", "Phone", "Insurance", "Card interest (est.)", "Subscriptions", "Groceries", "TOTAL"])
        + stats([stat("Total saved per month"), stat("× 12 = saved per year", wide=True)], cols=2)
        + prompts([("Where this freed money will go (debt, emergency fund, giving)", 3)])
    ),
    "METHODS": lambda: (
        '<div class="methods">'
        '<div class="mcard"><div class="mh">○ Debt Snowball</div>'
        '<p>Pay minimums on everything. Put every extra dollar on the <b>smallest balance</b> first. '
        'When it\'s gone, roll that payment into the next smallest.</p>'
        '<p class="mfit">Best if you need quick wins to stay motivated.</p></div>'
        '<div class="mcard"><div class="mh">○ Debt Avalanche</div>'
        '<p>Pay minimums on everything. Put every extra dollar on the <b>highest interest rate</b> first. '
        'When it\'s gone, roll that payment into the next highest.</p>'
        '<p class="mfit">Best if you want to pay the least interest overall.</p></div></div>'
        '<div class="sub" style="margin-top:12px">My debts in payoff order</div>'
        + table(["#", "Debt", "Balance", "APR", "Minimum"], [8, 38, 20, 14, 20], 8,
                ["1", "2", "3", "4", "5", "6", "7", "8"])
    ),
    "PAY_CALENDAR": lambda: (
        '<div class="sub">Write each payment on its due date. Mark paydays with a ★</div>'
        '<div class="cal">' + "".join(f'<div class="cd"><span>{d}</span></div>' for d in range(1, 32))
        + '<div class="cd blank"></div>' * 4 + "</div>"
        + prompts([("Autopay is on for", 2)])
    ),
    "EXTRA_PAYMENT": lambda: (
        '<div class="calc">'
        '<div class="cr"><span>Money freed in Week 2 (per month)</span><b>$</b></div>'
        '<div class="cr"><span>− Amount going to emergency fund</span><b>$</b></div>'
        '<div class="cr total"><span>= My extra debt payment each month</span><b>$</b></div>'
        '<div class="cr"><span>Target debt (first on my list)</span><b></b></div>'
        '<div class="cr"><span>Its minimum + my extra = new payment</span><b>$</b></div></div>'
        '<div class="sub" style="margin-top:14px">Rollover plan: when one debt is paid, add its payment to the next</div>'
        + table(["Debt", "Minimum", "+ Rolled-over amount", "= New payment", "Paid off ✓"], [30, 16, 22, 18, 14], 5)
    ),
    "REVIEW_W3": lambda: (
        stats([stat("Total debt (Day 15)"), stat("Total monthly minimums"), stat("Extra payment per month"),
               stat("Target debt", prefix=""), stat("Estimated payoff month", prefix=""), stat("Paid this week")])
        + prompts([("One way God provided for me this week", 3),
                   ("What I'm learning about contentment", 3)])
    ),
    "BUDGET_PREVIEW": lambda: (
        '<div class="calc">'
        + "".join(f'<div class="cr"><span>{e(l)}</span><b>$</b></div>' for l in
                  ["Expected income next month", "Giving", "Saving & emergency fund", "Sinking funds (Day 23)",
                   "Housing, utilities, insurance", "Food & household", "Transportation", "Debt payments (min + extra)",
                   "Personal & family wants"])
        + '<div class="cr total"><span>Income − everything above =</span><b>$ 0</b></div></div>'
        + prompts([("Three changes from last month's spending", 2)])
    ),
    "GRATITUDE": lambda: (
        '<div class="sub">Ten things God has already provided</div>'
        '<div class="twocol tight"><div>' + "".join(f'<div class="ln num"><span>{i}</span></div>' for i in range(1, 6))
        + "</div><div>" + "".join(f'<div class="ln num"><span>{i}</span></div>' for i in range(6, 11)) + "</div></div>"
        + prompts([("My biggest comparison trigger", 2),
                   ("What I muted, unfollowed, or unsubscribed from", 2),
                   ("A prayer of thanks", 3)])
    ),
    "HARVEST": lambda: (
        table(["Measure", "Day 1", "Day 30", "Change"], [40, 20, 20, 20], 7,
              ["Monthly bills total", "Subscriptions per month", "Highest card APR", "Total debt",
               "Emergency savings", "Monthly giving", "Money freed per month"])
        + stats([stat("Total found or freed in 30 days", wide=True), stat("Days completed", prefix="/ 30")], cols=2)
        + prompts([("The biggest change, in numbers and in my heart", 3)])
    ),
}


def workspace(spec):
    kind = spec[0]
    if kind == "prompts":
        return prompts(spec[1])
    if kind == "table":
        cols, widths, rows = spec[1], spec[2], spec[3]
        pre = spec[4] if len(spec) > 4 else None
        return table(cols, widths, rows, pre)
    if kind == "twocol":
        return twocol(spec[1], spec[2])
    if kind == "html":
        return SPECIAL[spec[1]]()
    raise ValueError(kind)


# ------------------------------------------------------------------ pages
pages = []
page_no = [0]


def footer(show_contents=True):
    page_no[0] += 1
    link = '<a href="#contents">← Contents</a>' if show_contents else "<span></span>"
    return (f'<footer class="pfoot">{link}<span>{PRODUCT} · {BRAND}</span>'
            f'<span class="pn">{page_no[0]}</span></footer>')


def page(inner, pid=None, cls="", foot=True):
    pid_attr = f' id="{pid}"' if pid else ""
    f = footer() if foot else (page_no.__setitem__(0, page_no[0] + 1) or "")
    pages.append(f'<section class="page {cls}"{pid_attr}>{inner}{f}</section>')


# Cover
page(f"""
<div class="cover-in">
  <div class="brand">{BRAND}</div>
  <div class="cover-mid">
    {LEAF_SVG}
    <div class="ctag">A faith-filled money workbook</div>
    <h1 class="ctitle">30-Day<br>Stewardship<br>Reset</h1>
    <p class="csub">Free up room in your budget, lower your bills, face your debt, and find peace with money, one 15-minute step at a time.</p>
    <ul class="cfeat"><li>30 daily devotionals &amp; steps</li><li>Bill negotiation scripts</li><li>Debt payoff &amp; budget trackers</li><li>KJV scripture throughout</li></ul>
  </div>
  <div class="cverse">“He that abideth in me, and the same bringeth forth much fruit.” <span>John 15:5</span></div>
</div>""", pid="cover", cls="cover", foot=False)

# Welcome
page(f"""
<div class="eyebrow">Welcome</div>
<h2 class="ptitle">Before you begin</h2>
<div class="letter">
<p>Dear friend,</p>
<p>If money has felt heavy lately, you are not alone. Prices keep climbing, bills arrive faster than paychecks, and debt can feel like a weight you carry everywhere. Many of us were never taught how to handle money, and even fewer were taught to handle it with God.</p>
<p>This workbook is not a lecture and it is not a get-rich plan. It is thirty days of small, faithful steps. Each day takes about fifteen minutes: a short scripture, a few honest sentences, and one practical task. Some days you will write. Some days you will make a phone call. Every day you will move a little closer to peace.</p>
<p>You will see clearly where your money goes, lower the bills you can, make a real plan for your debt, start an emergency fund, and build a budget that honors God first. Along the way, you will keep a running total of the money you find and free up.</p>
<p>Go at your own pace. If you miss a day, simply pick up where you left off. Grace is built into this plan.</p>
<p class="sig">Abiding with you,<br><span>{BRAND}</span></p>
</div>
<blockquote class="verse big"><p>But my God shall supply all your need according to his riches in glory by Christ Jesus.</p><cite>Philippians 4:19 (KJV)</cite></blockquote>
""", pid="welcome")

# How to use
week_rows = "".join(
    f'<div class="wkrow"><div class="wkn">{WEEKS[w][0]}</div><div><b>{e(WEEKS[w][1])}</b><span>{desc}</span></div></div>'
    for w, desc in [(1, "Look honestly at income, bills, spending, and subscriptions."),
                    (2, "Make a few calls with our scripts to lower your monthly bills."),
                    (3, "List every debt, choose a payoff method, and find your extra payment."),
                    (4, "Start an emergency fund, plan for surprises, budget, and give.")])
page(f"""
<div class="eyebrow">How it works</div>
<h2 class="ptitle">How to use this workbook</h2>
<div class="howgrid">
  <div class="howc"><div class="hn">15</div><div><b>minutes a day</b><span>Read the verse and devotional, then do the step. That's it.</span></div></div>
  <div class="howc"><div class="hn">30</div><div><b>days, 4 weeks</b><span>Each week ends with a review day to rest and count progress.</span></div></div>
  <div class="howc"><div class="hn">$</div><div><b>Track what you find</b><span>Write money found or freed at the bottom of every day, then add it to the tracker.</span></div></div>
</div>
<div class="sub" style="margin-top:22px">The four weeks</div>
<div class="wklist">{week_rows}</div>
<div class="twocol" style="margin-top:22px">
  <div class="howbox"><b>Printing</b><span>Print at home on US Letter or A4 (choose “Fit to page”). Print the whole book or only the pages you need each week.</span></div>
  <div class="howbox"><b>On a tablet</b><span>Import the PDF into GoodNotes, Notability, or any PDF app. The contents page and the link at the bottom of every page are clickable.</span></div>
</div>
<div class="howbox" style="margin-top:14px"><b>You will need</b><span>Last month's bank and card statements, a phone for a few short calls, a pen, and an open heart.</span></div>
""", pid="how")

# Contents placeholder (filled after we know page numbers) -> we compute numbers deterministically
# Page numbering: cover=1 (no footer shown), welcome=2, how=3, contents=4, tracker=5, then weeks.
contents_index = len(pages)
pages.append(None)
page_no[0] += 1  # contents page number = 4 (footer added on fill)

toc = []  # (label, anchor, page)


def add_toc(label, anchor):
    toc.append((label, anchor, page_no[0] + 1))


# Money found tracker
add_toc("30-Day Money Found Tracker", "tracker")
page(f"""
<div class="eyebrow">Your running total</div>
<h2 class="ptitle">30-Day Money Found Tracker</h2>
<p class="lead">Each day, write the money you found, saved, or freed up. Count one-time savings once, and monthly savings as the monthly amount.</p>
<div class="tracker">{''.join(f'<div class="tb"><span>Day {d}</span><b>$</b></div>' for d in range(1, 31))}</div>
{stats([stat('My 30-day goal'), stat('Total found'), stat('Goal reached? ✓', prefix='')])}
""", pid="tracker")


def week_divider(w):
    days = [d for d in DAYS if d["week"] == w]
    start = DAYS.index(days[0]) + 1
    items = "".join(f'<li><span>Day {start + i}</span>{e(d["title"])}</li>' for i, d in enumerate(days))
    intro = {
        1: "This week is about looking honestly at where you are. No judgment, only clarity.",
        2: "This week you will lower the bills you can, with ready-made scripts for every call.",
        3: "This week you bring your debt into the light and make a plan you can follow.",
        4: "This week you build margin: an emergency fund, a real budget, and a giving plan.",
    }[w]
    add_toc(f"{WEEKS[w][0]}: {WEEKS[w][1]}", f"week-{w}")
    page(f"""
<div class="divider-in">
  <div class="dwk">{WEEKS[w][0]}</div>
  <h2 class="dtitle">{e(WEEKS[w][1])}</h2>
  {LEAF_SVG}
  <p class="dintro">{intro}</p>
  <ol class="dlist">{items}</ol>
  <div class="prompt dgoal"><div class="pl">My intention for this week</div>{lines(3)}</div>
</div>""", pid=f"week-{w}", cls="divider")


for i, d in enumerate(DAYS, start=1):
    if i in (1, 8, 15, 22):
        week_divider(d["week"])
    wk = WEEKS[d["week"]]
    steps = "".join(f"<li>{e(s)}</li>" for s in d["steps"])
    review = '<span class="rv">Review day</span>' if d.get("review") else ""
    page(f"""
<header class="ph"><div class="wk">{wk[0]} · {e(wk[1])}{review}</div><div class="dn"><span>Day</span>{i:02d}</div></header>
<h2 class="ttl">{e(d['title'])}</h2>
<blockquote class="verse"><p>{e(d['verse'])}</p><cite>{e(d['ref'])} (KJV)</cite></blockquote>
<p class="devo">{e(d['devo'])}</p>
<div class="steps"><div class="sh">Today's 15-minute step</div><ol>{steps}</ol></div>
<div class="work">{workspace(d['work'])}<div class="fill"></div></div>
<div class="dayfoot">
  <div class="df money"><span>Money found or freed today</span><b>$</b></div>
  <div class="df pray"><span>One-line prayer</span><i></i></div>
  <div class="df done"><span>Done</span><em></em></div>
</div>""", pid=f"day-{i}", cls="day")


# ---- Tools section
add_toc("Bill Negotiation Scripts", "scripts")


def script_block(s):
    letter, name, rows = s
    body = "".join(f'<div class="srow"><span>{e(k)}</span><p>{e(v)}</p></div>' for k, v in rows)
    return f'<div class="script"><div class="shd"><b>{letter}</b>{e(name)}</div>{body}</div>'


page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Bill Negotiation Scripts</h2>
<p class="lead">Read the script once, fill in the blanks, then pray and dial. Be calm, kind, and specific. It's fine to say, “Let me think about it,” and call back.</p>
{''.join(script_block(s) for s in SCRIPTS[:3])}
""", pid="scripts", cls="tool")
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Scripts, continued</h2>
{''.join(script_block(s) for s in SCRIPTS[3:])}
<div class="howbox" style="margin-top:6px"><b>Good to know</b><span>Call during weekday mornings when wait times are shorter. Ask for the retention or loyalty department. Write down every name, date, and promised price.</span></div>
""", cls="tool")

add_toc("Call & Savings Log", "calllog")
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Call &amp; Savings Log</h2>
{table(['Date', 'Company', 'Spoke with', 'Old price', 'New price', 'Saved / mo'], [12, 22, 18, 16, 16, 16], 27)}
{stats([stat('Total saved per month'), stat('× 12 = per year')], cols=2)}
""", pid="calllog", cls="tool")

add_toc("Debt Freedom Tracker", "debt")
debt_blocks = "".join(
    f'<div class="dblock"><div class="dbh"><span>Debt {n}: ____________________</span><span>Start balance $________</span></div>'
    f'<div class="dboxes">{"".join(f"<i><span>{p}%</span></i>" for p in range(5, 101, 5))}</div></div>'
    for n in range(1, 5))
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Debt Freedom Tracker</h2>
<p class="lead">Each box is 5% of the starting balance. Color one in every time you pay off another 5%. Watch the vine grow.</p>
{debt_blocks}
{stats([stat('Total debt on Day 15'), stat('Total paid off'), stat('Debt-free target date', prefix='')])}
""", pid="debt", cls="tool")

add_toc("Emergency Fund Tracker", "fund")
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">$1,000 Emergency Fund</h2>
<p class="lead">Every circle is $10. Color one in each time you save another $10. One hundred circles and your starter fund is complete.</p>
<div class="coins">{''.join(f'<i><span>{n * 10}</span></i>' for n in range(1, 101))}</div>
<blockquote class="verse"><p>Go to the ant, thou sluggard; consider her ways, and be wise.</p><cite>Proverbs 6:6 (KJV)</cite></blockquote>
""", pid="fund", cls="tool")

add_toc("Monthly Zero-Based Budget", "budget")
cats = [("Giving", 2), ("Saving & emergency fund", 2), ("Sinking funds", 2), ("Housing & utilities", 4),
        ("Food & household", 2), ("Transportation", 3), ("Insurance & medical", 2), ("Debt payments", 3),
        ("Personal & family", 3)]
budget_rows = []
for c, n in cats:
    budget_rows.append(f'<tr class="cat"><td colspan="3">{e(c)}</td></tr>')
    budget_rows += ['<tr><td></td><td></td><td></td></tr>'] * n
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Monthly Budget</h2>
<div class="budtop">
  <div class="fr"><span>Month</span><i></i></div>
  <div class="fr"><span>Total income</span><i></i></div>
</div>
<table class="wt bud"><thead><tr><th style="width:50%">Item</th><th style="width:25%">Planned</th><th style="width:25%">Actual</th></tr></thead>
<tbody>{''.join(budget_rows)}</tbody></table>
<div class="calc" style="margin-top:10px"><div class="cr total"><span>Income − total planned =</span><b>$ 0</b></div></div>
""", pid="budget", cls="tool")

add_toc("Sinking Funds Tracker", "sinking")
months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Sinking Funds Tracker</h2>
<p class="lead">Write each fund and its monthly amount. Each month, check it off when you set the money aside.</p>
<table class="wt sink"><thead><tr><th style="width:24%">Fund</th><th style="width:10%">$/mo</th>{''.join(f'<th>{m}</th>' for m in months)}</tr></thead>
<tbody>{''.join('<tr>' + '<td></td>' * 14 + '</tr>' for _ in range(19))}</tbody></table>
""", pid="sinking", cls="tool")

add_toc("Spending Log", "spending")
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Spending Log</h2>
{table(['Date', 'What I bought', 'Category', 'Amount', 'Need / Want'], [12, 40, 18, 15, 15], 32)}
""", pid="spending", cls="tool")

add_toc("Prayer & Provision Journal", "prayer")
page(f"""
<div class="eyebrow">Tools</div>
<h2 class="ptitle">Prayer &amp; Provision Journal</h2>
<p class="lead">Write what you are asking God for. When He answers, write how. This page becomes a record of His faithfulness.</p>
{table(['Date', 'I am praying for', 'How God answered', 'Date'], [12, 38, 38, 12], 23)}
""", pid="prayer", cls="tool")

add_toc("Certificate of Completion", "certificate")
page(f"""
<div class="cert">
  {LEAF_SVG}
  <div class="eyebrow">Certificate of Completion</div>
  <h2 class="ctitle2">Good &amp; Faithful</h2>
  <p>This certifies that</p>
  <div class="certline"></div>
  <p>completed the <b>30-Day Stewardship Reset</b>, and found or freed</p>
  <div class="certamt">$ ____________</div>
  <p class="cv">“Well done, thou good and faithful servant.”<br><span>Matthew 25:21</span></p>
  <div class="certsig"><div><i></i><span>Date</span></div><div><i></i><span>Signature</span></div></div>
</div>""", pid="certificate", cls="certpage")

page(f"""
<div class="eyebrow">Notes</div>
<h2 class="ptitle">Notes</h2>
{lines(22)}
<div class="disc"><b>Please note:</b> This workbook is for educational and devotional purposes only and is not financial, legal, or tax advice. Results vary; savings depend on your providers and situation. For complex debt or tax questions, speak with a qualified professional or a nonprofit credit counselor. Scripture quotations are from the King James Version (public domain). For personal use only; please do not resell or share the files. © {BRAND}.</div>
""", pid="notes")

# Fill contents page (page number 4)
toc_html = "".join(
    f'<a class="tocrow" href="#{a}"><span>{e(l)}</span><i></i><b>{p}</b></a>' for l, a, p in toc)
# Insert day links under each week
toc_html = toc_html
saved = page_no[0]
page_no[0] = 3
contents = f"""<section class="page" id="contents">
<div class="eyebrow">Contents</div>
<h2 class="ptitle">What's inside</h2>
<nav class="toc">{toc_html}</nav>
<div class="daylinks">{''.join(f'<a href="#day-{i}">{i}</a>' for i in range(1, 31))}</div>
<p class="lead small">Tap any line or day number to jump there in GoodNotes or your PDF app.</p>
{footer(show_contents=False)}</section>"""
page_no[0] = saved
pages[contents_index] = contents

CSS = open(os.path.join(os.path.dirname(__file__), "workbook.css"), encoding="utf-8").read()

doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{PRODUCT}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Nunito+Sans:wght@400;600;700;800&display=swap">
<style>{CSS}</style></head><body>{''.join(pages)}</body></html>"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write(doc)
print(f"wrote {OUT}: {len(pages)} pages")
