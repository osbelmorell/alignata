---
title: "How to download Etsy orders as a CSV, with personalization"
dek: "Where Etsy keeps what each buyer asked you to write: the Order Items file."
datePublished: 2026-10-03
draft: false
tool: engrave-merge
ref: guide-etsy-export
---

If you sell personalized items, every name, date and message your buyers typed is in a file you can download from Etsy. It's just not where you'd expect. This guide shows which Etsy CSV to download, and where in it the personalization sits.

### Step 1: Download the Order Items CSV
Etsy's steps, from [Etsy Help](https://help.etsy.com/hc/en-us/articles/360000343328-How-to-Download-a-Spreadsheet-of-Your-Sold-Transactions):

1. Sign in to Etsy.com and go to Shop Manager.
2. Select Settings, then Options.
3. Go to the Download Data tab.
4. Under Orders, set the CSV Type to Order Items.
5. Pick the month and year. To get a whole year, leave the month blank.
6. Select Download CSV.

Etsy describes this as a Shop Manager task on the website, so use a computer, not the phone app. The file name looks like `EtsySoldOrderItems2026-9.csv`.

### Order Items, not Orders
Etsy offers more than one order file, and they aren't the same:

- **Orders** has one row per order. An order with 2 items is still one row, and it doesn't hold the personalization.
- **Order Items** has one row per item sold, with the item name, quantity, SKU and the buyer's choices. This is the one you want.

### Where the personalization is
Open the file and find the column called Variations. Everything the buyer picked or typed for that item sits in that one cell, as label and value pairs:

`Size:8 x 10 inches, framed,Style:Style 6,Personalization:Mom and Dad`

The text after "Personalization:" is what the buyer asked you to engrave or print. A few things make it harder to read than it looks:

- The buyer's text can contain commas and colons, so you can't simply split the cell at every comma.
- If the buyer wrote several lines, the line breaks are kept inside the cell.
- Some symbols show up coded, like `&#39;` in place of an apostrophe.
- If the buyer didn't add text, you may see "Personalization: Not requested on this item." in place of a name.

### Don't re-save it in Excel
Opening the file in Excel and saving it again can garble accented letters, like the ë in Zoë. If letters look wrong, download the file from Etsy again and use that copy as it is.

### Getting the text out, cleanly
You can copy each personalization by hand, or split the column with spreadsheet formulas. Both work for a handful of orders, and both are easy to get wrong on a busy day.

Engrave Merge does this step for you. Drop in the Order Items file and it:

- pulls the personalization out of Variations into its own column, with one column for each line;
- makes one row for each item, so a quantity of 3 becomes 3 rows;
- flags items that need checking, like blank personalization, duplicate lines or an unusual quantity;
- gives you a merge file that LightBurn's Variable Text can read, plus a printable cut sheet.

Your file is read on your device and isn't uploaded. To set up LightBurn, follow [LightBurn Variable Text from an Etsy order CSV](/guides/lightburn-variable-text-etsy-csv).

[Download a sample Order Items file](/fixtures/engrave-merge/sample.csv)
