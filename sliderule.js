// make:
//   ../node-v0.10.19-linux-x64/bin/node sliderule.js
// serve:
//   python -m SimpleHTTPServer 8000

function mmToPoints(mm) {
  return (mm / 25.4) * 72;
}
function pointsToMm(point) {
  return (point / 72) * 25.4;
}

function drawHalfTick(doc, xPos, yPos, width10, height, existing, depth,
                      drawPosts) {
  var iter = 5;
  var num = existing + iter / Math.pow(10, depth);
  var extra = (depth != 0 && iter == 5) ? (height / 2) : 0;
  var pos = width10 * Math.log(num) / Math.log(10);

  doc.lineWidth((1 / 300) * 72);  // One line on a 600 DPI printer

  doc.moveTo(xPos + pos, yPos);
  doc.lineTo(xPos + pos, yPos - (height + extra));
  doc.stroke();
}

function getLabel(depth, mult, add, i) {
  var label = Math.pow(0.1, depth);
  label *= i * mult;
  label += add;
  var strlabel = label + '';
  if (strlabel.indexOf('.') == -1) {
    return strlabel;
  }
  if (strlabel.indexOf('000') != -1) {
    // trim rounding errors
    strlabel = strlabel.substring(0, strlabel.length - 2);  
  }
  if (strlabel.indexOf('0') == 0) {
    // strip leading 0
    strlabel = strlabel.substring(1, strlabel.length);
  }
  for (var i = 1; i < strlabel.length; i++) {
    if (strlabel[i] == '0' &&
        strlabel[i - 1] >= '0' && strlabel[i - 1] <= '9') {
      strlabel = strlabel.substring(0, i);
      break;
    }
  }
  return strlabel;
}

function drawRule(doc, originX, xPos, yPos, width10, height, existing, depth,
                  drawPosts, mult, add) {
  for (var i = 0; i <= 10; i++) {
    var draw = drawPosts || (i >= 1 && i <= 9);
    var num = existing + i / Math.pow(10, depth);
    var extra = (depth != 0 && i == 5) ? (height / 2) : 0;
    var nextNum = existing + (i + 1) / Math.pow(10, depth);
    var pos = width10 * Math.log(num) / Math.log(10);
    var nextPos = width10 * Math.log(nextNum) / Math.log(10);
    if (draw && num > 0) {
      doc.lineWidth((1 / 300) * 72);  // One line on a 600 DPI printer

      doc.moveTo(xPos + pos, yPos);
      doc.lineTo(xPos + pos, yPos - (height + extra));
      doc.stroke();
    }
    var halfLimit = 3.2;
    if (i > 0 && i < 10 && (nextPos - pos) > halfLimit &&
        (xPos + pos) >= originX && depth <= 1) {
      var numHeight = yPos - height - (depth > 0 ? height / 2 : 0);
      doc.fontSize(8 - depth * 3);
      var label = getLabel(depth, mult, add, i);
      //var label = (depth == 0 ? "" : ".") + Array(depth).join("0") + i;
      var xshift = label[0] != '.' ? 0 : -.7;
      doc.text(label, xPos + pos + xshift, numHeight);
    }
    if ((nextPos - pos) > 9.7 && !(depth == 0 && i == 0) && i <= 9) {
      drawRule(doc, originX, xPos, yPos, width10, height / 2, num, depth + 1,
               false, mult, mult > 1 ? mult : 0);
    }
    if ((nextPos - pos) > halfLimit && !(depth == 0 && i == 0) && i <= 9) {
      drawHalfTick(doc, xPos, yPos, width10, height / 2, num, depth + 1, false);
    }
  }
}

function drawDottedLine(doc, left, top, width, height, radius, space) {
  doc.lineWidth(0);
  var slope = height / width;
  var theta = Math.atan(slope);
  var xStep = Math.cos(theta) * space;
  var yStep = Math.sin(theta) * space;
  
  var xPos = 0;
  var yPos = 0;
  while (yPos < height) {
    doc.circle(left + xPos, top + yPos, radius).fill();
    xPos += xStep;
    yPos += yStep;
  }
}

function drawSlants(doc, left, top, width, height, slope, design) {
  doc.save();
  doc.rect(left, top, width, height).clip();
  if (design.type == 'SOLID') {
    doc.strokeColor(design.color);
  }
  if (design.type == 'DOTS') {
    doc.fillColor(design.color);
  }

  var lineWidth = (1 / 600) * 72;
  var lineWidthPoints = lineWidth / 72;
  var lineSpacingPoints = 72 * 16 * lineWidthPoints * design.spacing;
  var lineSpacingHoriz = lineSpacingPoints /
      Math.sin(Math.atan(Math.abs(slope)));
  doc.lineWidth(lineWidth);

  var pos = left;
  if (slope > 0) {
    pos -= height / slope;
  }
  var endPos = left + width;
  if (slope < 0) {
    endPos += height / -slope;
  }
  while (pos < endPos) {
    if (design.type == 'SOLID') {
      doc.moveTo(pos, top);
      doc.lineTo(pos + height / slope, top + height);
      doc.stroke();
    } else if (design.type == 'DOTS') {
      drawDottedLine(doc, pos, top, height / slope, height, design.radius,
                     design.space);
    }
    pos += lineSpacingHoriz;
  }

  doc.restore();
}

function drawAllSlantsAt(doc, xPos, yPos, height, length, width, shift,
                         design) {
  var slantOffset = length * Math.log(2.0) / Math.log(10) - shift;
  yPos += height * 2;

  slantOffset = length * Math.log(design.amt) / Math.log(10) - shift;

  doc.save();
  var hBorder = 0;
  var vBorder = 0;
  var bot = yPos + height * 7 + vBorder;
  doc.polygon([xPos - hBorder, yPos],
	      [xPos + width + hBorder, yPos],
	      [xPos + width + hBorder, bot],
	      [xPos - hBorder, bot],
	      [xPos - hBorder, yPos]).clip();
  drawSlants(doc, xPos - hBorder, yPos, width + 2 * hBorder, bot - yPos,
             height / slantOffset, design);

  doc.restore();
}

/*
 originX, originY, idealLength in points
 */
function drawAll(originX, originY, idealLength, slantDesigns) {
  // length of a full rule (from 1 to 10), based on the idea that the first
  // rule stops at 1.8
  var length = idealLength * Math.log(10) / Math.log(1.8);

  // How much to shift each rule back on new lines
  var shift = length * Math.log(1.5) / Math.log(10)
  
  var yPos = originY;

  var kRows = 7;
  
  // height of each row
  var height = mmToPoints(46) / kRows;
  
  yPos -= height;
  for (design in slantDesigns) {
    drawAllSlantsAt(doc, originX, yPos, height, length, idealLength, shift,
                    slantDesigns[design]);
  }
  yPos += height * 3;
  
  // clip between 1 and 2 of top row
  
  for (var i = 0; i < kRows; i++) {
    doc.save();
    doc.rect(originX, yPos - height, idealLength, height * kRows).clip();
    for (var j = 0; j <= 1; j++) {
      drawRule(doc, originX, originX - i * shift + j * length, yPos,
               length, height, 0, 0, true, 1, 0);
      doc.moveTo(originX - i * shift + j * length, yPos);
      doc.lineTo(originX - i * shift + j * length + length, yPos);
      doc.stroke();
    }
    doc.restore();
    if (i > 0) {
      var num = (Math.pow(1.5, i) | 0) % 10;
      doc.fontSize(8);
      doc.text(num, originX - 5, originY + height * (i + 1));
    }
    yPos += height;
  }
  
  yPos -= height;
  yPos += height * 2;
  
  yPos += height;
}

var PDFDocument = require('pdfkit');
var doc = new PDFDocument();
doc.font('Helvetica.ttf');

drawAll(mmToPoints(10), mmToPoints(10), mmToPoints(80),
        [
          {type: 'SOLID', color: [100, 0, 0,   0], amt: (1 / 1.09) * 1.5,
           spacing: 2},
          {type: 'SOLID', color: [100, 0, 100,   0], amt: 1.8,
           spacing: 1}
        ]
       );

doc.write('sliderule.pdf');
