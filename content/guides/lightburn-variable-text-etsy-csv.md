---
title: "LightBurn Variable Text from an Etsy order CSV"
dek: "Engrave every buyer's name from one file, instead of typing each order into LightBurn."
datePublished: 2026-10-03
draft: false
tool: engrave-merge
---

LightBurn can already read a CSV file and swap each row's text into your design. It calls this Variable Text, and it's built in (see [LightBurn's Variable Text guide](https://docs.lightburnsoftware.com/latest/Reference/VariableText/)). The catch is Etsy's order file. It isn't laid out the way LightBurn needs, so this guide covers both halves: getting the right file out of Etsy, and pointing LightBurn at it.

### What you need
- LightBurn on your computer.
- Your Etsy "Order Items" file. [How to download Etsy orders as a CSV](/guides/etsy-download-orders-csv-personalization) shows where to find it.
- A design with one text box where the buyer's text goes.

### Why the Etsy file doesn't work as is
LightBurn reads one column per thing you want to engrave. Etsy puts everything the buyer chose into one cell, called Variations, like this:

`Size:8 x 10 inches, framed,Style:Style 6,Personalization:Mom and Dad`

If you point LightBurn at that column, it engraves the whole line, size and all. You need the personalization in a column of its own, one row for each item you'll make.

### Step 1: Turn the Etsy file into a merge file
Open Engrave Merge, drop in your Order Items file, and tap Make merge file. Your file is read on your device and isn't uploaded.

You get a CSV with one row for each item to make. An order for 3 signs becomes 3 rows. The columns are always in the same place, so your LightBurn design keeps working batch after batch:

- `%11` is the whole personalization on one line.
- `%12`, `%13` and so on hold line 1, line 2 and the rest, if the buyer wrote several lines.
- `%2` is the buyer's first name, and `%7` is the first option they picked, like a wood type.

Orders that need checking, like a blank personalization or a duplicate line, are left out of the merge file and listed with the reason. More on that below.

### Step 2: Set up the text box in LightBurn
1. Add a text box and type `%11`. For one line per text box, type `%12`, then `%13` in the next box, and so on.
2. In the Text Options toolbar, set the text mode to Merge/CSV.

LightBurn numbers columns from 0, so `%0` is the first column, `%1` the second, and so on.

### Step 3: Load the file
1. Go to Window, then Variable Text. LightBurn opens it as a tab behind the Cuts / Layers window.
2. Click Browse and pick your merge file.

### Step 4: Tell LightBurn which rows to run
LightBurn counts rows from 0, and row 0 in our file is the header.

1. Set Start to 1.
2. Set End to the last Merge row number on your cut sheet.
3. Press Reset. LightBurn's guide says to reset whenever Start isn't 0, or the rows won't line up on the first run.

### Step 5: One item per run, or several per bed
- **One item per run:** set Advance By to 1 and turn on Auto-Advance. Each time you press Start, LightBurn moves to the next row.
- **Several items per bed:** give each copy its own Offset (0, 1, 2, 3), then set Advance By to how many fit, like 4. LightBurn's Grid Array tool can set the offsets for you as it lays out the copies.

### Step 6: Check before you burn
- Hold the Test button to see the text that will engrave. If you laid out copies with a Virtual Array, check the Preview window instead, because Test doesn't show the final text there.
- Set Max Width in the Shape Properties window so long names shrink to fit instead of running off the piece.
- If accented letters look wrong, the file isn't UTF-8. Our merge file is always UTF-8. If you edited it in another program, save it as UTF-8 again.

### What Engrave Merge adds
LightBurn does the engraving. Engrave Merge does the prep:

- It pulls the personalization out of Etsy's Variations cell into clean columns.
- It makes one row for each item, so a quantity of 3 gives you 3 rows.
- It flags orders that need checking before you burn, like blank personalization, duplicate lines or an unusual quantity, and keeps them out of the merge file for now.
- It prints a cut sheet with each item's Merge row number, which matches LightBurn's Current value, so you can tick items off as you go.

[Download a sample Order Items file](/fixtures/engrave-merge/sample.csv)
