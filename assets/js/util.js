ko.bindingHandlers.fileUpload = {
  init: function (element, valueAccessor) {
    $(element).on("change", function () {
      valueAccessor()(element.files[0]);
    });
  },
  update: function (element, valueAccessor) {
    if (ko.unwrap(valueAccessor()) === null) {
      $(element).wrap("<form>").closest("form").get(0).reset();
      $(element).unwrap();
    }
  },
};
function _convert(v, from, to) {
  return math.unit(parseFloat(v), from).toNumber(to);
}
function _computedUnit(rawObservable, unitObservable, outputUnit, decimals) {
  return ko.computed(() => {
    const val = _convert(rawObservable(), unitObservable(), outputUnit());
    return decimals === undefined ? val : val.toFixed(decimals);
  });
}
function _unitOservable(defaultVal, defaultUnitIn) {
  return {
    raw: ko.observable(defaultVal),
    units: ko.observable(defaultUnitIn),
    as: function (units) {
      return _computedUnit(this.raw, this.units, () => units);
    },
  };
}

function _mapRange(data, callback_fn) {
  var range = [];
  for (var i = 0; i < data.length; i++) {
    range.push(callback_fn(data[i], i));
  }
  return range;
}
function _map2dRange(data, callback_fn) {
  var range = [];
  for (var i = 0; i < data.length; i++) {
    var row = [];
    for (var j = 0; j < data[i].length; j++) {
      row.push(callback_fn(data[i][j], i, j));
    }
    range.push(row);
  }
  return range;
}
function _zeros(rows, cols) {
  var array = [];
  for (var i = 0; i < rows; i++) {
    var row = [];
    for (var j = 0; j < cols; j++) {
      row.push(0);
    }
    array.push(row);
  }
  return array;
}

function _fill(rows, cols, fill_fn) {
  var array = [];
  for (var i = 0; i < rows; i++) {
    var row = [];
    for (var j = 0; j < cols; j++) {
      row.push(fill_fn(i, j));
    }
    array.push(row);
  }
  return array;
}

function transpose(array) {
  return array[0].map((_, i) => array.map((r) => r[i]));
}

function readVal(source, addr, bytes) {
  var data = source.subarray(addr, addr + bytes);
  var val = 0;
  for (var k = 0; k < bytes; k++) val += data[k] << (8 * k);
  return val;
}
function readRow(source, addr, cols, bytes) {
  var row = [];
  for (var j = 0; j < cols * bytes; j += bytes)
    row.push(readVal(source, addr + j, bytes));
  return row;
}
function readRange(source, addr, rows, cols, bytes, colsFirst) {
  var _addr = colsFirst !== false
    ? ((i, j) => addr + (j * rows + i) * bytes) // Fill Cols First
    : ((i, j) => addr + (i * cols + j) * bytes); // Fill Rows First
  var data = _fill(rows, cols, () => null);
  for (var i = 0; i < rows; i++)
    for (var j = 0; j < cols; j++) {
      data[i][j] = readVal(source, _addr(i, j), bytes);
    }
  return data;
}
function evaluate(equation, value, index){
  return math.evaluate(equation.toLowerCase(), {
    x: value,
    i: index,
    e: math.e,
    pi: math.pi,
    phi: math.phi,
  });
}
function read2dMap(source, axes) {
  var xData = readRow(source, axes.x.address, axes.x.cols, axes.x.bytes).map((e, i) =>
    evaluate(axes.x.equation, e, i)
  );
  var yData = readRow(source, axes.y.address, axes.y.cols, axes.y.bytes).map((e, i) =>
    evaluate(axes.y.equation, e, i)
  );
  var zData = readRange(source, axes.z.address, axes.z.rows, axes.z.cols, axes.z.bytes, axes.z.colsFirst).map((e, i) =>
    evaluate(axes.z.equation, e, i)
  );
  return {
    x: axes.z.transpose !== true ? xData : yData,
    y: axes.z.transpose !== true ? yData : xData,
    z: axes.z.transpose !== true ? zData : transpose(zData),
  };
}

let isString = (value) => typeof value === "string" || value instanceof String;
function hsv2rgb(h, s, v) {
  let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
function rgb2hex(r, g, b) {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function getColorScaleHsv(data, val, minHue, maxHue, saturation, value) {
  var min = Math.min(...data().map((e) => (Array.isArray(e) ? Math.min(...e) : e)));
  var max = Math.max(...data().map((e) => (Array.isArray(e) ? Math.max(...e) : e)));
  if (max == min) return "inherit";
  return [
    ((val - min) / (max - min)) * (maxHue - minHue) + minHue,
    saturation == undefined ? 0.5 : saturation,
    value == undefined ? 0.5 : value,
  ];
}
function getColorScaleRgb(data, val, minHue, maxHue, saturation, value) {
  var val = getColorScaleHsv(data, val, minHue, maxHue, saturation, value);
  return isString(val) ? val : hsv2rgb(...val);
}
function getColorScaleHex(data, val, minHue, maxHue, saturation, value) {
  var val = getColorScaleRgb(data, val, minHue, maxHue, saturation, value);
  return isString(val) ? val : rgb2hex(...val);
}

function update2dMap(source, axes, observables) {
  const data = read2dMap(source, axes);
  try { observables.x(data.x); } catch { }
  try { observables.y(data.y); } catch { }
  try { observables.z(data.z); } catch { }
}

function computed2dDelta(original, updated) {
  return ko.computed(() => {
    return _map2dRange(original(), (val, i, j) => {
      return updated()[i][j] - val;
    });
  });
}
function computed1dDelta(original, updated) {
  return ko.computed(() => {
    return _mapRange(original(), (val, i) => {
      return updated()[i] - val;
    });
  });
}
function computedDelta(original, updated) {
  return ko.computed(() => {
      return updated() - original();
  });
}
function computedRange(range, callback) {
  return ko.computed(() => _mapRange(range(), callback));
}
function computed2dRange(range, callback) {
  return ko.computed(() => _map2dRange(range(), callback));
}

function _updateChart(refresh, map, callback_fn) {
  let axes = map.maps.map((e) => e.axes);
  for(var i = 0; i < axes.length; i++) {
    callback_fn(i, axes[i]);
  }
  if (!$(`#${map.chart.elemId}`).length) return
  if (refresh) Plotly.redraw(map.chart.elemId);
  else Plotly.newPlot(map.chart.elemId, map.chart.data, map.chart.layout);
}

function updateChart3D(refresh, map) {
  _updateChart(refresh, map, (i, ax) => {
    map.chart.data[i].x = ax.x();
    map.chart.data[i].y = ax.y();
    map.chart.data[i].z = ax.z();
  });
}

function updateChart2D(refresh, map) {
  _updateChart(refresh, map, (i, ax) => {
    map.chart.data[i].x = ax.x();
    map.chart.data[i].y = ax.z()[0];
  });
}

function scaleValue(value, srcMin, srcMax, outMin, outMax) {
  return (value - srcMin) / (srcMax - srcMin) * (outMax - outMin) + outMin;
}

function indexToX(index, length) {
  return index / (length - 1);
}

function reinterpolateData(data, newLength, fitDegree) {
  if (data.length == newLength) return data;
  var coeffs = Polyfit(
    Array.from({length: data.length}).map((_, i) => indexToX(i, data.length)),
    data
  ).computeCoefficients(fitDegree || 4);
  var vals = [];
  for (var i = 0; i < newLength; i++) {
    var x = indexToX(i, newLength);
    var y = 0;
    for(var j = 0; j < coeffs.length; j++) {
      var coeff = coeffs[j];
      if (j == 0)
        y += coeff;
      else
        y += coeff * x ** j
    }
    vals.push(y);
  }
  return vals;
}

function sumBytes (bytes, lsb) {
  return bytes.reduce((s, v, i) => s + (v << (8 * (lsb ? i : (bytes.length - i - 1)))), 0);
}
