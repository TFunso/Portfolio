"""Bonus tracker spreadsheet (works in Excel and Google Sheets via File > Import)."""
import os
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import DataBarRule
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build", "Stewardship-Reset-Trackers.xlsx")

VINE, SAGE, SAGE_BG, GOLD = "2F4A3A", "A9BBA3", "EEF2EC", "B8925A"
H = Font(name="Arial", bold=True, color="FFFFFF", size=10)
T = Font(name="Georgia", bold=True, color=VINE, size=18)
B = Font(name="Arial", size=10)
BB = Font(name="Arial", size=10, bold=True, color=VINE)
HF = PatternFill("solid", fgColor=VINE)
SF = PatternFill("solid", fgColor=SAGE_BG)
IN = PatternFill("solid", fgColor="FFFDF5")
thin = Side(style="thin", color="C9D3C6")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
MONEY = '"$"#,##0.00'

wb = Workbook()


def title(ws, text, sub):
    ws["A1"] = text
    ws["A1"].font = T
    ws["A2"] = sub
    ws["A2"].font = Font(name="Arial", italic=True, color="5F6D64", size=10)
    ws.sheet_view.showGridLines = False


def header(ws, row, labels, widths=None):
    for i, l in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=l)
        c.font, c.fill, c.border = H, HF, BOX
        c.alignment = Alignment(vertical="center")
    if widths:
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[chr(64 + i)].width = w


def cell(ws, ref, value=None, fmt=None, inp=False, bold=False):
    c = ws[ref]
    if value is not None:
        c.value = value
    c.border = BOX
    c.font = BB if bold else B
    if fmt:
        c.number_format = fmt
    if inp:
        c.fill = IN
    return c


# ---------------- Start Here
ws = wb.active
ws.title = "Start Here"
title(ws, "30-Day Stewardship Reset · Trackers", "Companion to your workbook. Type in the cream cells; everything else calculates.")
ws.column_dimensions["A"].width = 100
tips = [
    "1. Monthly Budget: enter your income, then plan every dollar until 'Left to assign' is $0.",
    "2. Debt Payoff: list each debt, put your extra payment on the first one, and see months to payoff.",
    "3. Emergency Fund: log each deposit and watch the bar fill toward $1,000.",
    "4. Money Found: record what you found or freed each day of the reset.",
    "",
    "Google Sheets: open sheets.google.com > File > Import > Upload this file.",
    "Excel / Numbers: open the file directly.",
    "",
    "For educational purposes only; not financial advice. © TheAbidingYear. Personal use only.",
]
for i, t in enumerate(tips, start=4):
    ws.cell(row=i, column=1, value=t).font = B

# ---------------- Monthly Budget
ws = wb.create_sheet("Monthly Budget")
title(ws, "Monthly Budget", "Give every dollar a job before the month begins.")
cell(ws, "A4", "Month", bold=True); cell(ws, "B4", "", inp=True)
cell(ws, "A5", "Total income", bold=True); cell(ws, "B5", 0, MONEY, inp=True)
header(ws, 7, ["Category", "Item", "Planned", "Actual", "Difference"], [26, 30, 14, 14, 14])
cats = [("Giving", ["Tithe / church", "Other giving"]), ("Saving", ["Emergency fund", "Sinking funds"]),
        ("Housing", ["Rent / mortgage", "Electric", "Water / gas", "Internet", "Phone"]),
        ("Food", ["Groceries", "Dining out"]), ("Transportation", ["Gas", "Car payment", "Car insurance"]),
        ("Insurance & medical", ["Health insurance", "Medical / pharmacy"]),
        ("Debt", ["Credit card 1", "Credit card 2", "Other debt"]),
        ("Personal & family", ["Clothing", "Kids & school", "Personal care", "Subscriptions", "Fun money"])]
r = 8
first = r
for cat, items in cats:
    for it in items:
        cell(ws, f"A{r}", cat).fill = SF
        cell(ws, f"B{r}", it, inp=True)
        cell(ws, f"C{r}", 0, MONEY, inp=True)
        cell(ws, f"D{r}", 0, MONEY, inp=True)
        cell(ws, f"E{r}", f"=C{r}-D{r}", MONEY)
        r += 1
last = r - 1
cell(ws, f"B{r}", "TOTAL", bold=True)
cell(ws, f"C{r}", f"=SUM(C{first}:C{last})", MONEY, bold=True)
cell(ws, f"D{r}", f"=SUM(D{first}:D{last})", MONEY, bold=True)
cell(ws, f"E{r}", f"=C{r}-D{r}", MONEY, bold=True)
cell(ws, "D4", "Left to assign", bold=True)
cell(ws, "E4", f"=B5-C{r}", MONEY, bold=True).fill = SF
cell(ws, "D5", "Spent so far", bold=True)
cell(ws, "E5", f"=D{r}", MONEY, bold=True)

# ---------------- Debt Payoff
ws = wb.create_sheet("Debt Payoff")
title(ws, "Debt Payoff", "List debts in your payoff order (snowball or avalanche). Put your extra payment on #1.")
cell(ws, "A4", "Method", bold=True); cell(ws, "B4", "Snowball", inp=True)
dv = DataValidation(type="list", formula1='"Snowball,Avalanche"', allow_blank=False)
ws.add_data_validation(dv); dv.add("B4")
cell(ws, "A5", "Extra payment / month", bold=True); cell(ws, "B5", 0, MONEY, inp=True)
header(ws, 7, ["#", "Debt", "Balance", "APR %", "Minimum", "Paying / month", "Months to payoff", "Est. interest"],
       [6, 28, 14, 10, 14, 16, 17, 14])
for i in range(8):
    r = 8 + i
    cell(ws, f"A{r}", i + 1)
    cell(ws, f"B{r}", "", inp=True)
    cell(ws, f"C{r}", None, MONEY, inp=True)
    cell(ws, f"D{r}", None, "0.00", inp=True)
    cell(ws, f"E{r}", None, MONEY, inp=True)
    pay = f"=IF(C{r}=\"\",\"\",E{r}+IF(A{r}=1,$B$5,0))"
    cell(ws, f"F{r}", pay, MONEY)
    months = (f"=IF(OR(C{r}=\"\",F{r}=\"\",F{r}<=0),\"\",IFERROR(IF(D{r}=0,ROUNDUP(C{r}/F{r},0),"
              f"ROUNDUP(NPER(D{r}/1200,-F{r},C{r}),0)),\"Raise payment\"))")
    cell(ws, f"G{r}", months, "0")
    cell(ws, f"H{r}", f"=IF(ISNUMBER(G{r}),MAX(0,F{r}*IF(D{r}=0,C{r}/F{r},NPER(D{r}/1200,-F{r},C{r}))-C{r}),\"\")", MONEY)
cell(ws, "B16", "TOTAL", bold=True)
cell(ws, "C16", "=SUM(C8:C15)", MONEY, bold=True)
cell(ws, "E16", "=SUM(E8:E15)", MONEY, bold=True)
cell(ws, "F16", "=SUM(F8:F15)", MONEY, bold=True)
ws["A18"] = ("Months shown assume the payment stays the same. When a debt is paid off, add its payment "
             "to the next debt (the rollover) and update the 'Paying / month' for that debt.")
ws["A18"].font = Font(name="Arial", italic=True, size=9, color="5F6D64")

# ---------------- Emergency Fund
ws = wb.create_sheet("Emergency Fund")
title(ws, "Emergency Fund", "Starter goal: $1,000. Log every deposit.")
cell(ws, "A4", "Goal", bold=True); cell(ws, "B4", 1000, MONEY, inp=True)
cell(ws, "A5", "Saved", bold=True); cell(ws, "B5", "=SUM(C10:C60)", MONEY, bold=True)
cell(ws, "A6", "Progress", bold=True); cell(ws, "B6", "=IF(B4=0,0,MIN(1,B5/B4))", "0%", bold=True).fill = SF
cell(ws, "A7", "Still to go", bold=True); cell(ws, "B7", "=MAX(0,B4-B5)", MONEY, bold=True)
ws.conditional_formatting.add("B6", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=GOLD))
header(ws, 9, ["Date", "Note", "Deposit"], [18, 40, 14])
for r in range(10, 61):
    cell(ws, f"A{r}", None, "mm/dd/yyyy", inp=True)
    cell(ws, f"B{r}", "", inp=True)
    cell(ws, f"C{r}", None, MONEY, inp=True)

# ---------------- Money Found
ws = wb.create_sheet("Money Found")
title(ws, "30-Day Money Found", "What you found, saved, or freed each day.")
cell(ws, "A4", "My 30-day goal", bold=True); cell(ws, "B4", 300, MONEY, inp=True)
cell(ws, "A5", "Total found", bold=True); cell(ws, "B5", "=SUM(C9:C38)", MONEY, bold=True)
cell(ws, "A6", "Progress", bold=True); cell(ws, "B6", "=IF(B4=0,0,B5/B4)", "0%", bold=True).fill = SF
ws.conditional_formatting.add("B6", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=GOLD))
header(ws, 8, ["Day", "What I did", "Amount"], [18, 46, 14])
for d in range(1, 31):
    r = 8 + d
    cell(ws, f"A{r}", f"Day {d}")
    cell(ws, f"B{r}", "", inp=True)
    cell(ws, f"C{r}", None, MONEY, inp=True)

for s in wb.worksheets:
    s.freeze_panes = None
wb.save(OUT)
print("wrote", OUT)
