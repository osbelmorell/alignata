#!/usr/bin/env python3
"""Regenerates the SYNTHETIC Etsy 'Sold Order Items' fixtures in this folder.

Every name, address, ID and order below is FAKE (Fakename / Nowhereville / 00000 /
IDs in the 1000000xxx, 2000000xxx, 3000000xxx ranges). No real buyer data.
Header = the 33-column EtsySoldOrderItems header, verified against public code
(see ../SPEC.md section 11). Fixtures are written with the same header quoting
style seen in a public export (multi-word headers quoted).
"""
import csv, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
HEADER = ["Sale Date", "Item Name", "Buyer", "Quantity", "Price", "Coupon Code",
          "Coupon Details", "Discount Amount", "Shipping Discount", "Order Shipping",
          "Order Sales Tax", "Item Total", "Currency", "Transaction ID", "Listing ID",
          "Date Paid", "Date Shipped", "Ship Name", "Ship Address1", "Ship Address2",
          "Ship City", "Ship State", "Ship Zipcode", "Ship Country", "Order ID",
          "Variations", "Order Type", "Listings Type", "Payment Type",
          "InPerson Discount", "InPerson Location", "VAT Paid by Buyer", "SKU"]
HEADER_LINE = ",".join(f'"{h}"' if " " in h else h for h in HEADER)

BUYERS = {
    "testy": ("Testy Fakename (fake_user_01)", "Testy Fakename"),
    "ima": ("Ima Placeholder (fake_user_02)", "Ima Placeholder"),
    "sample": ("Sample Buyerson (fake_user_03)", "Sample Buyerson"),
    "faux": ("Faux Customer (fake_user_51)", "Faux Customer"),
    "dummy": ("Dummy McTest (fake_user_52)", "Dummy McTest"),
    "zoe": ("Zoë Notreal (fake_user_57)", "Zoë Notreal"),
    "gift": ("", "Giftee Recipientson"),  # blank Buyer -> fall back to Ship Name
}

def row(order, txn, listing, item, sku, variations, buyer="testy", qty="1",
        price="25.00", shipped="", sale="09/28/26", paid="09/28/2026"):
    b, ship = BUYERS[buyer]
    try:
        total = f"{float(price) * int(qty):.2f}"
    except ValueError:
        total = price
    vals = {
        "Sale Date": sale, "Item Name": item, "Buyer": b, "Quantity": qty, "Price": price,
        "Coupon Code": "", "Coupon Details": "", "Discount Amount": "0",
        "Shipping Discount": "0", "Order Shipping": "0", "Order Sales Tax": "0",
        "Item Total": total, "Currency": "USD", "Transaction ID": txn, "Listing ID": listing,
        "Date Paid": paid, "Date Shipped": shipped, "Ship Name": ship,
        "Ship Address1": "123 Fake Street", "Ship Address2": "Apt 0",
        "Ship City": "Nowhereville", "Ship State": "ZZ", "Ship Zipcode": "00000",
        "Ship Country": "United States", "Order ID": order, "Variations": variations,
        "Order Type": "online", "Listings Type": "listing", "Payment Type": "online_cc",
        "InPerson Discount": "", "InPerson Location": "", "VAT Paid by Buyer": "0", "SKU": sku,
    }
    return [vals[h] for h in HEADER]

BOARD = ("3000000001", "Personalized Cutting Board - Custom Engraved Family Name", "EM-TEST-BOARD")
KEY = ("3000000002", "Custom Engraved Keychain", "EM-TEST-KEY")
GLASS = ("3000000003", "Engraved Wine Glass", "EM-TEST-GLASS")
SIGN = ("3000000004", "Custom Family Sign", "EM-TEST-SIGN")
ORN = ("3000000005", "Engraved Wooden Ornament", "EM-TEST-ORN")
COAST = ("3000000006", "Blank Coaster Set", "EM-TEST-COASTER")
GIFTBOARD = ("3000000007", "Engraved Cutting Board Gift", "EM-TEST-GIFT")
PLAQUE = ("3000000008", "Engraved Birth Announcement Plaque", "EM-TEST-PLAQUE")
TRAY = ("3000000009", "Plain Wooden Serving Tray", "EM-TEST-TRAY")

def L(x):  # listing tuple -> kwargs
    return dict(listing=x[0], item=x[1], sku=x[2])

FIXTURES = {
    # 1. simple: one personalization per item, 2 listings
    "fx01_simple.csv": [
        row("1000000101", "2000000101", variations="Size:12 x 9 inches,Wood type:Walnut,Personalization:The Fakenames - Est. 2026", buyer="testy", price="45.00", **L(BOARD)),
        row("1000000102", "2000000102", variations="Style:Round,Personalization:Ima", buyer="ima", price="12.00", **L(KEY)),
        row("1000000103", "2000000103", variations="Size:15 x 11 inches,Wood type:Maple,Personalization:Happy Home", buyer="sample", price="55.00", **L(BOARD)),
    ],
    # 2. quantity > 1 (expand to N rows), multi-item order, blank Buyer -> Ship Name
    "fx02_quantity.csv": [
        row("1000000201", "2000000201", variations="Glass type:Stemless,Personalization:Bridesmaid Ima", buyer="ima", qty="3", price="18.00", **L(GLASS)),
        row("1000000202", "2000000202", variations="Glass type:Wine,Personalization:Mr.", buyer="testy", qty="2", price="18.00", **L(GLASS)),
        row("1000000202", "2000000203", variations="Glass type:Wine,Personalization:Mrs.", buyer="testy", qty="1", price="18.00", **L(GLASS)),
        row("1000000203", "2000000204", variations="Style:Square,Personalization:Ace", buyer="gift", qty="1", price="12.00", **L(KEY)),
    ],
    # 3. multi-line, numbered, commas/colons inside values, HTML entities
    "fx03_multiline_commas.csv": [
        row("1000000301", "2000000301", variations="Size:8 x 10 inches, framed,Style:Style 6,Personalization:1. Mom\n2. Dad, love you\n3. Sam: always &amp; forever", buyer="testy", price="39.00", **L(SIGN)),
        row("1000000302", "2000000302", variations="Size:5 x 7 inches,Style:Style 2,Personalization:1. Nana 2. Papa, est. 1970 3. Kids: Ann, Bo", buyer="ima", price="29.00", **L(SIGN)),
        row("1000000303", "2000000303", variations="Personalization:Ima &amp; Testy&#39;s Kitchen\nJune 1, 2026", buyer="sample", price="49.00", **L(GIFTBOARD)),
        row("1000000304", "2000000304", variations="Size:8 x 10 inches, framed,Style:Style 6,Personalization:Emma&#39;s first Valentine&#39;s Day - font b", buyer="faux", price="39.00", **L(SIGN)),
        row("1000000305", "2000000305", variations="Style:Round,Personalization:Ace,Color:Blue please", buyer="dummy", price="12.00", **L(KEY)),
    ],
    # 4. mixed shipped / unshipped
    "fx04_mixed_shipped.csv": [
        row("1000000401", "2000000401", variations="Size:12 x 9 inches,Wood type:Walnut,Personalization:Old Order One", buyer="testy", shipped="09/26/2026", sale="09/20/26", paid="09/20/2026", **L(BOARD)),
        row("1000000402", "2000000402", variations="Style:Round,Personalization:Shipped Already", buyer="ima", shipped="09/27/2026", sale="09/21/26", paid="09/21/2026", **L(KEY)),
        row("1000000403", "2000000403", variations="Size:12 x 9 inches,Wood type:Cherry,Personalization:New Order Three", buyer="sample", **L(BOARD)),
        row("1000000404", "2000000404", variations="Style:Square,Personalization:Bo", buyer="faux", **L(KEY)),
    ],
    # 5. exceptions: emoji, placeholder blank, missing personalization, overlong,
    #    plain listing (no text expected), unparseable, duplicate row, bad quantity,
    #    non-ASCII letter (for the font check case)
    "fx05_exceptions.csv": [
        row("1000000501", "2000000501", variations="Style:Star,Personalization:Grandpa \u2764\ufe0f", buyer="faux", **L(ORN)),
        row("1000000502", "2000000502", variations="Style:Bell,Personalization:Not requested on this item.", buyer="dummy", **L(ORN)),
        row("1000000503", "2000000503", variations="Style:Star", buyer="sample", **L(ORN)),
        row("1000000504", "2000000504", variations="Style:Bell,Personalization:Merry Christmas to the whole Fakename family from all of us", buyer="testy", **L(ORN)),
        row("1000000505", "2000000505", variations="Color:Natural", buyer="sample", qty="2", price="20.00", **L(COAST)),
        row("1000000506", "2000000506", variations="free text the buyer typed with no label", buyer="ima", **L(ORN)),
        row("1000000507", "2000000507", variations="Style:Star,Personalization:Zoë", buyer="zoe", **L(ORN)),
        row("1000000507", "2000000507", variations="Style:Star,Personalization:Zoë", buyer="zoe", **L(ORN)),
        row("1000000508", "2000000508", variations="Color:Gray", buyer="dummy", qty="0", price="20.00", **L(COAST)),
    ],
    # 6. GUESS ONLY: Etsy's 2026 multi-field personalization CSV shape is UNVERIFIED.
    #    Shape A: "Personalization 1:..,Personalization 2:.."  Shape B: seller-named
    #    fields ("Baby name:..")  Shape C: one box with typed sub-labels.
    "fx06_multifield_GUESS.csv": [
        row("1000000601", "2000000601", variations="Color:Natural,Personalization 1:Emma Fakename,Personalization 2:03.14.2026,Personalization 3:7 lb 2 oz, 20 in", buyer="testy", price="42.00", **L(PLAQUE)),
        row("1000000602", "2000000602", variations="Color:Walnut,Baby name:Ima Fakename,Birth date:01.02.2026,Weight:6 lb 15 oz", buyer="ima", price="42.00", **L(PLAQUE)),
        row("1000000603", "2000000603", variations="Color:Natural,Personalization:Name: Emma\nDate: 03.14.2026", buyer="sample", price="42.00", **L(PLAQUE)),
    ],
    # 8. ALL SHIPPED: every row has Date Shipped (the only field the shipped filter reads,
    #    SPEC 5.2). 4 distinct Order IDs (not a small file). Default settings -> 0 ready,
    #    0 need a look (everything hidden). Include shipped -> 6 clean ready rows
    #    (one Quantity 2, one two-item order).
    "fx08-all-shipped.csv": [
        row("1000000801", "2000000801", variations="Size:12 x 9 inches,Wood type:Walnut,Personalization:The Shippedsons", buyer="testy", price="45.00", shipped="09/25/2026", sale="09/19/26", paid="09/19/2026", **L(BOARD)),
        row("1000000802", "2000000802", variations="Style:Round,Personalization:Ima", buyer="ima", qty="2", price="12.00", shipped="09/26/2026", sale="09/20/26", paid="09/20/2026", **L(KEY)),
        row("1000000803", "2000000803", variations="Glass type:Wine,Personalization:Mr.", buyer="sample", price="18.00", shipped="09/27/2026", sale="09/21/26", paid="09/21/2026", **L(GLASS)),
        row("1000000803", "2000000804", variations="Glass type:Wine,Personalization:Mrs.", buyer="sample", price="18.00", shipped="09/27/2026", sale="09/21/26", paid="09/21/2026", **L(GLASS)),
        row("1000000804", "2000000805", variations="Style:Star,Personalization:Bo", buyer="faux", price="15.00", shipped="09/28/2026", sale="09/22/26", paid="09/22/2026", **L(ORN)),
    ],
    # 9. NO ENGRAVING TEXT: unshipped, readable rows with no personalization label or text
    #    on listings that never have text (so no BLANK_TEXT). 3 distinct Order IDs.
    #    By the app's real rules (SPEC 5.4.1 / 5.7, same as the fx05 Blank Coaster Set)
    #    these are READY rows with blank text, NOT "need a look" and NOT zero.
    "fx09-no-engravable.csv": [
        row("1000000901", "2000000901", variations="Color:Natural", buyer="testy", qty="2", price="20.00", **L(COAST)),
        row("1000000902", "2000000902", variations="Color:Gray", buyer="ima", price="20.00", **L(COAST)),
        row("1000000903", "2000000903", variations="Size:Large,Finish:Oiled", buyer="dummy", price="35.00", **L(TRAY)),
        row("1000000903", "2000000904", variations="", buyer="dummy", price="35.00", **L(TRAY)),
    ],
}

def write(name, rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    for r in rows:
        w.writerow(r)
    with open(os.path.join(HERE, name), "w", encoding="utf-8", newline="") as f:
        f.write(HEADER_LINE + "\r\n" + buf.getvalue())

# 7. WRONG FILE: the *Sold Orders* export (one row per order, no Variations column).
#    Header per public docs (Coupler.io field list); unverified against a live export.
ORDERS_HEADER = ["Sale Date", "Order ID", "Buyer User ID", "Full Name", "First Name", "Last Name",
                 "Number of Items", "Payment Method", "Date Shipped", "Street 1", "Street 2",
                 "Ship City", "Ship State", "Ship Zipcode", "Ship Country", "Currency", "Order Value",
                 "Coupon Code", "Coupon Details", "Discount Amount", "Shipping Discount", "Shipping",
                 "Sales Tax", "Order Total", "Status", "Card Processing Fees", "Order Net",
                 "Adjusted Order Total", "Adjusted Card Processing Fees", "Adjusted Net Order Amount",
                 "Buyer", "Order Type", "Payment Type", "InPerson Discount", "InPerson Location", "SKU"]
ORDERS_ROW = ["09/28/26", "1000000701", "fake_user_01", "Testy Fakename", "Testy", "Fakename", "1",
              "Other", "", "123 Fake Street", "Apt 0", "Nowhereville", "ZZ", "00000", "United States",
              "USD", "25.00", "", "", "0", "0", "0", "0", "25.00", "", "1.00", "24.00", "", "", "",
              "Testy Fakename (fake_user_01)", "online", "online_cc", "", "", ""]

if __name__ == "__main__":
    for n, rows in FIXTURES.items():
        write(n, rows)
        print("wrote", n, len(rows), "rows")
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\r\n").writerows([ORDERS_HEADER, ORDERS_ROW])
    with open(os.path.join(HERE, "fx07_wrong_file_SoldOrders.csv"), "w", encoding="utf-8", newline="") as f:
        f.write(buf.getvalue())
    print("wrote fx07_wrong_file_SoldOrders.csv 1 row")
