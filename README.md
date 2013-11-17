SlideRuleTip
============

Tip calculator based on slide rule mechanism.
The goal of this project was to create an accurate tip calculator
that did not require using smart phone or pencil and paper.

Usage
-----

First, print out [this PDF](https://drive.google.com/file/d/0BxSD5KoZoFD4SXdoR0w5LTJJTkU/edit?usp=sharing)
to a card or label and put it in your wallet.

Slide rules do not use a decimal point in the calculations, so you'll need to keep
that in your head.

To calculate a tip, first find the price along the scales.

For a 15% tip, look down exactly one row.
For an 28% tip, follow the slanted lines down one row.
It may help to align the straight edge of a credit card along the slanted lines.

Example: Say the bill is $35.50.
With mental math, we know the tip will be around $3-$8 range.
($3 is 10% of rounding down to $30; $8 is 20% of rounding up to $40)
On the 4th row down (has a big 3 in front), we locate the small number 5 and
then go to the next tick mark, which denotes half. Going exactly down one row (15% calculation),
we see we're between 53 and 53.5. Putting the decimal point in the correct place,
and guessing a bit, we come up with $5.34 tip.

For 20%, we follow the slanted lines, and come to about $6.38.

Building
--------

Optional: Install Helvetica font. To do this, find the Helvetica.dfont file on a Mac,
and use the command-line tool fondu to extract the font files. Then, grab Helvetica.ttf.
The font is expected at `Helvetica.ttf` in the same directory as `sliderule.js`.

If you don't want to use Helvetica, just comment out the line that begins with
`doc.font` in sliderule.js.

If you want to modify the output PDF, you'll need to install node and the pdfkit node module.

Then, simply run: `node sliderule.js`. It will output sliderule.pdf.
