class MapAxis {
  constructor(settings, address, nBytes, equation, decimalPlaces) {
    var self = this;

    self.data = settings.data;
    self.length = settings.length
    self.lsb = settings.lsb;
    self.headersFromData = settings.fromData;
    self.showRawHex = settings.showHex;

    self.address = ko.observable(address || "0x0");
    self.nBytes = ko.observable(nBytes || 1);
    self.equation = ko.observable(equation || "X");
    self.decimalPlaces = ko.observable(decimalPlaces || 2);

    self._addr = ko.computed(() => self.address().startsWith("0x") ? parseInt(self.address(), 16) : parseInt(self.address()));
    self.valBytes = ko.computed(() => {
      var data = self.data();
      var nBytes = parseInt(self.nBytes());
      var addr = self._addr();
      return Array.from({length: self.length()}).map((_, i) => {
        var _addr = addr + (i * nBytes);
        return data.slice(_addr, _addr + nBytes);
      });
    });
    self.valHex = ko.computed(() => self.valBytes().map(e => e.reduce((s, v) => v.toString(16).padStart(2, '0') + s, '').toUpperCase()));
    self.valInts = ko.computed(() => self.valBytes().map(e => sumBytes(e, self.lsb())));
    self.values = ko.computed(() =>
      self.headersFromData() && self.data()
        ? self.valInts().map((X, i) => eval(self.equation()))
        : Array.from({length: self.length()}).map((_, i) => i + 1)
      );

    self.strValues = ko.computed(() => self.values().map(e => e.toFixed(parseInt(self.decimalPlaces()))));
    self.headers = ko.computed(() => {
      return self.headersFromData() && self.data()
        ? (self.showRawHex() ? self.valHex() : self.strValues())
        : Array.from({length: self.length()}).map((_, i) => i + 1);
    });
  }
}

class MapViewerModel {
  constructor() {
    var self = this;

    // Config
    self.file = ko.observable();
    self.fileData = ko.observable([]);
    self.startAddr = ko.observable("0x14690")
    self.numRows = ko.observable(16);
    self.numCols = ko.observable(16);
    self.numBytes = ko.observable(2);
    self.decimalPlaces = ko.observable(2);
    self.scaleEquation = ko.observable("X*0.0234380000");
    self.lsbOrder = ko.observable(true);
    self.headersFromData = ko.observable(false);

    self._addr = ko.computed(() => self.startAddr().startsWith("0x") ? parseInt(self.startAddr(), 16) : parseInt(self.startAddr()));
    self._rows = ko.computed(() => parseInt(self.numRows()));
    self._cols = ko.computed(() => parseInt(self.numCols()));

    // Options
    self.colourScaleBg = ko.observable(true);
    self.showRawHex = ko.observable(false);

    // Map Data
    self.mapHex = ko.computed(() => {
      var data = self.fileData();
      var addr = self._addr();
      var cols = self._cols();
      var nBytes = parseInt(self.numBytes());
      var addr = self._addr();
      return Array.from({length: self._rows()}).map((_, i_row) => {
        return Array.from({length: cols}).map((_, i_col) => {
          var _addr = addr + (i_row * cols * nBytes + i_col * nBytes);
          return data.slice(_addr, _addr + nBytes);
        });
      });
    });
    self.mapHexStr = ko.computed(() => self.mapHex().map(row => row.map(e => e.reduce((s, v) => v.toString(16).padStart(2, '0') + s, '').toUpperCase())));
    self.mapInts = ko.computed(() => self.mapHex().map(row => row.map(e => sumBytes(e, self.lsbOrder()))));
    self.mapData = ko.computed(() => self.mapInts().map(row => row.map(X => eval(self.scaleEquation()))));
    self.mapVals = ko.computed(() =>self.mapData().map(row => row.map(e => e.toFixed(parseInt(self.decimalPlaces())))));
    self.tableData = ko.computed(() => {
      return self.fileData()
        ? (self.showRawHex() ? self.mapHexStr() : self.mapVals())
        : Array.from({length: 16}).map(() => Array.from({length: 16}).map(() => 0));
    });

    // Row & Column Headers
    self.rowHeaders = new MapAxis({
      data: self.fileData,
      length: self.numRows,
      lsb: self.lsbOrder,
      fromData: self.headersFromData,
      showHex: self.showRawHex,
    }, "0x14670", 2, "X*0.0015259", 2);
    self.colHeaders = new MapAxis({
      data: self.fileData,
      length: self.numCols,
      lsb: self.lsbOrder,
      fromData: self.headersFromData,
      showHex: self.showRawHex,
    }, "0x14650", 2, "X*0.25", 2);

    self.file.subscribe(function () {
      var reader = new FileReader();
      reader.onload = function () {
        self.fileData(new Uint8Array(this.result));
      };
      reader.readAsArrayBuffer(self.file());
    });

    [
      self.mapData,
      self.startAddr,
      self.numRows,
      self.numCols,
      self.numBytes,
      self.scaleEquation,
      self.lsbOrder,
      self.headersFromData,
    ].map(e => e.subscribe(() => {
      // Update chart
      self.chart.data[0].x = self.colHeaders.values();
      self.chart.data[0].y = self.rowHeaders.values();
      self.chart.data[0].z = self.mapData();
      Plotly.redraw(self.chart.elemId);
    }));

    // Plotly chart
    self.chart = {
      elemId: "map-canvas",
      data: [{
          x: self.colHeaders.data(), y: self.rowHeaders.data(), z: self.mapData(),
          type: "surface", showscale: false, opacity:0.9,
      }],
      layout: {
        autosize: true,
        scene: {
          xaxis: { title: "Column" },
          yaxis: { title: "Row" },
          zaxis: { title: "Value" },
        },
      },
      config: {
        responsive: true,
      }
    };
    self.plot = Plotly.newPlot(self.chart.elemId, self.chart.data, self.chart.layout, self.chart.config);

    // TODO: Update bg colour when theme changes
    self.getBgColour = (i, j) => self.colourScaleBg() && self.mapInts() && self.mapInts()[0] ? getColorScaleHex(
      self.mapInts, self.mapInts()[i][j],
      115, 0, 0.8,
      0.8, //document.documentElement.getAttribute("data-bs-theme") == "dark" ? 0.5 : 0.8,
    ) : undefined;
  }
}

ko.applyBindings({
  viewer: new MapViewerModel(),
});
