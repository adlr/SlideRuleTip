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

function drawHalfTick(doc, xPos, yPos, width10, height, existing, depth, drawPosts) {
  var iter = 5;
    var num = existing + iter / Math.pow(10, depth);
    var extra = (depth != 0 && iter == 5) ? (height / 2) : 0;
    var pos = width10 * Math.log(num) / Math.log(10);

      doc.lineWidth((1 / 300) * 72);  // One line on a 600 DPI printer

      doc.moveTo(xPos + pos, yPos);
      doc.lineTo(xPos + pos, yPos - (height + extra));
      doc.stroke();

}
function drawRule(doc, originX, xPos, yPos, width10, height, existing, depth, drawPosts) {
  //console.log('drawRule: ' + depth);
  for (var i = 0; i <= 10; i++) {
    var draw = drawPosts || (i >= 1 && i <= 9);
    var num = existing + i / Math.pow(10, depth);
    var extra = (depth != 0 && i == 5) ? (height / 2) : 0;
    var nextNum = existing + (i + 1) / Math.pow(10, depth);
    var pos = width10 * Math.log(num) / Math.log(10);
    var nextPos = width10 * Math.log(nextNum) / Math.log(10);
    //console.log(depth + ' ' + i + ' ' + (nextPos - pos));
    if (draw && num > 0) {
      doc.lineWidth((1 / 300) * 72);  // One line on a 600 DPI printer

      doc.moveTo(xPos + pos, yPos);
      doc.lineTo(xPos + pos, yPos - (height + extra));
      doc.stroke();
    }
    var halfLimit = 3.2;
    if (i > 0 && i < 10 && (nextPos - pos) > halfLimit && (xPos + pos) >= originX) {
      var numHeight = yPos - height - (depth > 0 ? height / 2 : 0);
      doc.fontSize(8 - depth * 3);
      doc.text(i, xPos + pos, numHeight);
    }
    //if (depth < 1 && i >= (depth == 0 ? 1 : 0) && i <= 9 &&
    //    (depth == 0 || (depth == 1 && existing == 1))) {
    if ((nextPos - pos) > 11.5 && !(depth == 0 && i == 0) && i <= 9) {
      drawRule(doc, originX, xPos, yPos, width10, height / 2, num, depth + 1, false);
    }
    if ((nextPos - pos) > halfLimit && !(depth == 0 && i == 0) && i <= 9) {
      drawHalfTick(doc, xPos, yPos, width10, height / 2, num, depth + 1, false);
    }
  }
}

function drawTipRuler(doc, xPos, yPos, slideLength, height) {
  var pos15Out = slideLength * Math.log(1.5) / Math.log(10);
  var pos20Out = slideLength * Math.log(2) / Math.log(10);

  var lineWithLabel = function(pos, label) {
    doc.moveTo(xPos + pos, yPos);
    doc.lineTo(xPos + pos, yPos + height);
    doc.stroke();
    doc.fontSize(5);
    doc.text(label, xPos + pos, yPos + height);
  }
  lineWithLabel(0, 'Price');
  for (var i = 15; i <= 20; i++) {
    var pos = slideLength * Math.log(i / 10) / Math.log(10);
    lineWithLabel(pos - slideLength / 4, i + '%');
    //lineWithLabel(pos - slideLength, i + '%');
  }
}

function drawCMRuler(doc, originX, originY, height) {
  for (var i = 0; i <= 10; i++) {
    doc.moveTo(originX + mmToPoints(i * 10), originY);
    doc.lineTo(originX + mmToPoints(i * 10), originY + height);
    doc.stroke();
    doc.text(i, originX + mmToPoints(i * 10), originY);
  }
}

var limit = 10;

function drawDottedLine(doc, left, top, width, height, radius, space) {
  if (limit-- > 0)
    console.log("d " + (left) + ',' + (top) + ',' + width + ',' + height + ', s ' + space);
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
  var lineSpacingHoriz = lineSpacingPoints / Math.sin(Math.atan(Math.abs(slope)));
  //console.log('space:' + lineSpacingHoriz);
  //console.log('point:' + lineSpacingPoints);
  doc.lineWidth(lineWidth);
  //doc.dash(0.5, { space : 0.5 });

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
      drawDottedLine(doc, pos, top, height / slope, height, design.radius, design.space);
    }
    pos += lineSpacingHoriz;
  }

  doc.restore();
}

function drawAllSlantsAt(doc, xPos, yPos, height, length, width, shift, design) {
  var slantOffset = length * Math.log(2.0) / Math.log(10) - shift;
  //drawSlants(doc, xPos - height, yPos, width + height * 2, height, height / slantOffset, design);
  yPos += height * 2;

  slantOffset = length * Math.log(design.amt) / Math.log(10) - shift;

  doc.save();
  //doc.rect(xPos - height, yPos, width + 2 * height, height * 7).clip();
  var hBorder = 0;
  var vBorder = 0;
  var bot = yPos + height * 7 + vBorder;
  doc.polygon([xPos - hBorder, yPos],
	      [xPos + width + hBorder, yPos],
	      [xPos + width + hBorder, bot],
	      [xPos - hBorder, bot],
	      [xPos - hBorder, yPos]/*,

	      [xPos, yPos + vBorder],

	      [xPos, bot - vBorder],
	      [xPos + width, bot - vBorder],
	      [xPos + width, yPos + vBorder],
	      [xPos, yPos + vBorder]*/).clip();
  drawSlants(doc, xPos - hBorder, yPos, width + 2 * hBorder, bot - yPos, height / slantOffset, design);
  //doc.rect(xPos - 1, yPos - 1, width + 2, bot - yPos + 2).lineWidth(0).fillColor('white').fillOpacity(0.5).fill();
  //slantOffset = length * Math.log(2.0) / Math.log(10) - shift;
  //drawSlants(doc, xPos - hBorder, yPos, width + 2 * hBorder, bot - yPos, height / slantOffset, design);

  doc.restore();
  //drawSlants(doc, xPos - hBorder, bot, width + hBorder * 2, height, height / slantOffset, design);
}

function drawAll(originX, originY, idealLength, slantDesigns) {
  var length = idealLength * Math.log(10) / Math.log(1.8);

  var shift = length * Math.log(1.5) / Math.log(10)
  
  var yPos = originY;
  var topRow2X = length * Math.log(1.5 * 1.8 / 1.5) / Math.log(10);
  //var topRow2X = length * Math.log(1.5 * 1.8) / Math.log(10);

  var kRows = 7;
  
  var slope = Math.tan(15 * Math.PI / 180);
  //var height = length * (Math.log(1.8/1.5) / Math.log(10)) * slope;
  var height = mmToPoints(40) / kRows;
  
  yPos -= height;
  for (design in slantDesigns) {
    drawAllSlantsAt(doc, originX, yPos, height, length, topRow2X, shift, slantDesigns[design]);
  }
  yPos += height * 3;
  
  // clip between 1 and 2 of top row
  
  for (var i = 0; i < kRows; i++) {
    doc.save();
    doc.rect(originX, yPos - height, topRow2X, height * kRows).clip();
    for (var j = -1; j <= 1; j++) {
      drawRule(doc, originX, originX - i * shift + j * length, yPos, length, height, 0, 0, true);
      doc.moveTo(originX - i * shift + j * length, yPos);
      doc.lineTo(originX - i * shift + j * length + length, yPos);
      doc.stroke();
    }
    doc.restore();
    if (i > 0) {
      var num = (Math.pow(1.5, i) | 0) % 10;
      doc.text(num, originX - 5, originY + height * (i + 1));
    }
    yPos += height;
  }
  //drawRule(doc, originX, originY, length, height, 0, 0, true);
  //drawTipRuler(doc, originX + mmToPoints(50), originY + mmToPoints(1) + height * 5, length, height);
  
  yPos -= height;
  //drawAllSlantsAt(doc, originX, yPos, height, length, topRow2X, shift);
  yPos += height * 2;
  
  //drawCMRuler(doc, originX, yPos, height);
  yPos += height;
}

var PDFDocument = require('pdfkit');
var doc = new PDFDocument();
doc.font('Helvetica.ttf');

drawAll(mmToPoints(80), mmToPoints( 20), mmToPoints(60),
        [
          {type: 'SOLID', color: [100, 0, 0,   0], amt: 0.9 * 1.5,
           spacing: 2},
          {type: 'SOLID', color: [100, 0, 100,   0], amt: 1.8,
           spacing: 1}
        ]
       );
// drawAll(mmToPoints(20), mmToPoints( 60), mmToPoints(200), {type: 'SOLID', color: [100, 0,   0,   0]});
// drawAll(mmToPoints(20), mmToPoints(100), mmToPoints(200), {type: 'SOLID', color: [  0, 0,   0, 100]});
for (var i = 0; i < 0; i++) {
  for (var j = 0; j < 2; j++) {
    if (i == 0 && j == 1)
      continue;
    drawAll(mmToPoints(20 + 80 * j), mmToPoints(20 + 40 * i), mmToPoints(200), {type: 'DOTS',  color: [100, 0, 100,   0], radius: 72 / ((i+1) * 300), space: 1 / (j+1) });
  }
}

doc.write('sliderule.pdf');
//console.log("total height: " + pointsToMm(height * kRows));
