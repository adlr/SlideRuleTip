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
    var halfLimit = 3.85;
    if (i > 0 && i < 10 && (nextPos - pos) > halfLimit &&
        (xPos + pos) >= originX && depth <= 1) {
      var numHeight = yPos - height - (depth > 0 ? height / 2 : 0);
      doc.fontSize(8 - depth * 3);
      var label = getLabel(depth, mult, add, i);
      //var label = (depth == 0 ? "" : ".") + Array(depth).join("0") + i;
      var xshift = label[0] != '.' ? 0 : -.7;
      doc.text(label, xPos + pos + xshift, numHeight);
    }
    if ((nextPos - pos) > 11 && !(depth == 0 && i == 0) && i <= 9) {
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

function addVectors(first, second) {
  return [first[0] + second[0], first[1] + second[1]];
}

function negateVector(vect) {
  return [-vect[0], -vect[1]];
}

function drawZigZagSlants(doc, left, top, width, height, slopes, design) {
  var angles = slopes.map(Math.atan);
  var diff = angles[1] - angles[0];
  var length = [ design.spacing[1] / Math.sin(diff),
                 design.spacing[0] / Math.sin(diff) ];
  var vectors = [ [Math.cos(angles[0]) * length[0],
                   Math.sin(angles[0]) * length[0]],
                  [Math.cos(angles[1]) * length[1],
                   Math.sin(angles[1]) * length[1]],
                ];
  if (vectors[0][1] <= 0) {
    console.log('vector with negative y!');
  }

  var lineWidth = (1 / 600) * 72;
  var lineWidthPoints = lineWidth / 72;
  var lineSpacingPoints = 72 * 16 * lineWidthPoints * design.spacing[0];
  var lineSpacingHoriz = lineSpacingPoints /
      Math.sin(Math.atan(Math.abs(slopes[0])));
  doc.lineWidth(lineWidth);


  for (var iter = 0; iter < 2; iter++) {
    console.log('iter=' + iter);
    var startPoint = [left, top];
    if (slopes[0] > 0)
      startPoint[0] -= height / slopes[iter];
    var endPos = left + width;
    if (slopes[0] < 0)
      endPos += height / -slope;

    if (iter == 1) {
      //startPoint = addVectors(startPoint, negateVector(vectors[0]));
    }

    while (startPoint[0] < endPos) {
      console.log(startPoint[0]);
      var endPoint = addVectors(startPoint, vectors[0]);
      while (endPoint[1] < top + height) {
        endPoint = addVectors(endPoint, vectors[0]);
      }

      doc.moveTo(startPoint[0], startPoint[1]);
      doc.strokeColor(design.color);
      doc.dash(length[0]);
      doc.lineTo(endPoint[0], endPoint[1]);
      doc.stroke();

      // compute next startPoint
      if (iter == 0) {
        startPoint = addVectors(startPoint, vectors[0]);
        var delta = vectors[1][0] > 0 ? vectors[1] : negateVector(vectors[1]);
        startPoint = addVectors(startPoint, delta);
      } else {
        startPoint = addVectors(startPoint, negateVector(vectors[0]));
        startPoint = addVectors(startPoint, vectors[1]);
      }
      while (startPoint[1] < top) {
        // Add double to include spacing
        startPoint = addVectors(startPoint, vectors[0]);
        startPoint = addVectors(startPoint, vectors[0]);
      }
      while (startPoint[1] > top) {
        startPoint = addVectors(startPoint, negateVector(vectors[0]));
        startPoint = addVectors(startPoint, negateVector(vectors[0]));
      }
    }

    angles = [angles[1], angles[0]];
    vectors = [vectors[1], vectors[0]];
    length = [length[1], length[0]];
    slopes = [slopes[1], slopes[0]];
  }
}

function drawSlants(doc, left, top, width, height, slopes, design) {
  if (design.type == 'ZIGZAG') {
    doc.save();
    doc.rect(left, top, width, height).clip();
    drawZigZagSlants(doc, left, top, width, height, slopes, design);
    doc.restore();
    return;
  }
  doc.save();
  doc.rect(left, top, width, height).clip();
  if (design.type == 'SOLID') {
    doc.strokeColor(design.color);
  }
  if (design.type == 'DOTS') {
    doc.fillColor(design.color);
  }

  var slope = slopes[0];
  var lineWidth = (1 / 600) * 72;
  var lineWidthPoints = lineWidth / 72;
  var lineSpacingPoints = 72 * 16 * lineWidthPoints * design.spacing[0];
  var lineSpacingHoriz = lineSpacingPoints /
      Math.sin(Math.atan(Math.abs(slope)));
  doc.lineWidth(lineWidth);

  // ticks
  var ROWS = 7;

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
      var xStart = pos;
      var yStart = top;
      var xEnd = pos + height / slope;
      var yEnd = top + height
      doc.moveTo(xStart, yStart);
      doc.lineTo(xEnd, yEnd);
      doc.stroke();
      if ('tics' in design) {
        for (var row = 0; row < ROWS; row++) {
          var xTick = xStart + (row + 0.5) * (xEnd - xStart) / ROWS + mmToPoints(0.5);
          var yTick = yStart + (row + 0.5) * (yEnd - yStart) / ROWS;
          doc.moveTo(xTick, yTick);
          doc.lineTo(xTick + mmToPoints(1.5), yTick);
          doc.stroke();
        }
      }
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
  yPos += height * 2;

  var slantOffset = design.amts.map(function(amt) {
    return length * Math.log(amt) / Math.log(10) - shift;
  });

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
             slantOffset.map(function(x) { return height / x; }), design);

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

// color test
// doc.moveTo(mmToPoints(10), mmToPoints(13));
// doc.lineTo(mmToPoints(100), mmToPoints(13));
// doc.strokeColor([100, 0, 0, 0]);
// doc.lineWidth(72/600);
// doc.stroke();

// doc.moveTo(mmToPoints(10), mmToPoints(14));
// doc.lineTo(mmToPoints(100), mmToPoints(14));
// doc.strokeColor([100, 0, 100, 0]);
// doc.lineWidth(72/600);
// doc.stroke();

// doc.moveTo(mmToPoints(10), mmToPoints(15));
// doc.lineTo(mmToPoints(100), mmToPoints(15));
// doc.strokeColor([0, 0, 100, 0]);
// doc.lineWidth(72/600);
// doc.stroke();

// doc.moveTo(mmToPoints(10), mmToPoints(113));
// doc.lineTo(mmToPoints(100), mmToPoints(113));
// doc.strokeColor([100, 0, 0, 0]);
// doc.lineWidth(2);
// doc.stroke();

// doc.moveTo(mmToPoints(10), mmToPoints(114));
// doc.lineTo(mmToPoints(100), mmToPoints(114));
// doc.strokeColor([100, 0, 100, 0]);
// doc.lineWidth(2);
// doc.stroke();

// doc.moveTo(mmToPoints(10), mmToPoints(115));
// doc.lineTo(mmToPoints(100), mmToPoints(115));
// doc.strokeColor([0, 0, 100, 0]);
// doc.lineWidth(2);
// doc.stroke();

doc.strokeColor([0, 0, 0, 100]);

drawAll(mmToPoints(10), mmToPoints(10), mmToPoints(80),
        [
          // {type: 'SOLID', color: [100, 0, 100,   0], amts: [(1.0925) * 1.5],
          //  spacing: [3]},
          {type: 'SOLID', color: [100, 0, 100,   0], amts: [1.8],
           spacing: [1], tics: 1.0925 * 1.5}
          // {type: 'ZIGZAG', color: [0, 0, 0,   100], amts: [1.8, (1 / 1.0925) * 1.5],
          //  spacing: [3, 3]},
        ]
       );


doc.write('sliderule.pdf');
