class MapViewerModel {
  constructor() {
    var self = this;
    self._sumBytes = function (bytes) {
      return bytes.reduce((s, v, i) => s + (v << (8 * (self.lsbOrder() ? i : (bytes.length - i - 1)))), 0);
    }

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
    self.mapInts = ko.computed(() => self.mapHex().map(row => row.map(e => self._sumBytes(e))));
    self.mapData = ko.computed(() => self.mapInts().map(row => row.map(X => eval(self.scaleEquation()))));
    self.mapVals = ko.computed(() =>self.mapData().map(row => row.map(e => e.toFixed(parseInt(self.decimalPlaces())))));
    self.tableData = ko.computed(() => {
      return self.fileData()
        ? (self.showRawHex() ? self.mapHexStr() : self.mapVals())
        : Array.from({length: 16}).map(() => Array.from({length: 16}).map(() => 0));
    });

    // Row & Column Headers
    self.rowValAddr = ko.observable("0x14670");
    self._rowValAddr = ko.computed(() => self.rowValAddr().startsWith("0x") ? parseInt(self.rowValAddr(), 16) : parseInt(self.rowValAddr()));
    self.rowValBytes = ko.observable(2);
    self.rowValScale = ko.observable("X*0.0015259");
    self.rowDecimalPlaces = ko.observable(2);
    self.rowHex = ko.computed(() => {
      var data = self.fileData();
      var nBytes = parseInt(self.rowValBytes());
      var addr = self._rowValAddr();
      return Array.from({length: self._rows()}).map((_, i) => {
        var _addr = addr + (i * nBytes);
        return data.slice(_addr, _addr + nBytes);
      });
    });
    self.rowHexStr = ko.computed(() => self.rowHex().map(e => e.reduce((s, v) => v.toString(16).padStart(2, '0') + s, '').toUpperCase()));
    self.rowInts = ko.computed(() => self.rowHex().map(e => self._sumBytes(e)));
    self.rowData = ko.computed(() =>
      self.headersFromData()
      ? self.rowInts().map(X => eval(self.rowValScale()))
      : Array.from({length: self._rows()}).map((_, i) => i + 1)
    );
    self.rowVals = ko.computed(() => self.rowData().map(e => e.toFixed(parseInt(self.rowDecimalPlaces()))));
    self.tableRowData = ko.computed(() => {
      return self.headersFromData() && self.fileData()
        ? (self.showRawHex() ? self.rowHexStr() : self.rowVals())
        : Array.from({length: self._rows()}).map((_, i) => i + 1);
    });

    self.colValAddr = ko.observable("0x14650");
    self._colValAddr = ko.computed(() => self.colValAddr().startsWith("0x") ? parseInt(self.colValAddr(), 16) : parseInt(self.colValAddr()));
    self.colValBytes = ko.observable(2);
    self.colValScale = ko.observable("X*0.25");
    self.colDecimalPlaces = ko.observable(2);
    self.colHex = ko.computed(() => {
      var data = self.fileData();
      var nBytes = parseInt(self.colValBytes());
      var addr = self._colValAddr();
      return Array.from({length: self._cols()}).map((_, i) => {
        var _addr = addr + (i * nBytes);
        return data.slice(_addr, _addr + nBytes);
      });
    });
    self.colHexStr = ko.computed(() => self.colHex().map(e => e.reduce((s, v) => v.toString(16).padStart(2, '0') + s, '').toUpperCase()));
    self.colInts = ko.computed(() => self.colHex().map(e => self._sumBytes(e)));
    self.colData = ko.computed(() =>
      self.headersFromData()
      ? self.colInts().map(X => eval(self.colValScale()))
      : Array.from({length: self._cols()}).map((_, i) => i + 1)
    );
    self.colVals = ko.computed(() =>self.colData().map(e => e.toFixed(parseInt(self.colDecimalPlaces()))));
    self.tableColData = ko.computed(() => {
      return self.headersFromData() && self.fileData()
        ? (self.showRawHex() ? self.colHexStr() : self.colVals())
        : Array.from({length: self._cols()}).map((_, i) => i + 1);
    });

    self.file.subscribe(function () {
      var reader = new FileReader();
      reader.onload = function () {
        self.fileData(new Uint8Array(this.result));
      };
      reader.readAsArrayBuffer(self.file());
    });

    [self.mapData, self.rowData, self.colData].map(e => e.subscribe(() => {
      // Update chart
      self.chart.data[0].x = self.colData();
      self.chart.data[0].y = self.rowData();
      self.chart.data[0].z = self.mapData();
      Plotly.redraw(self.chart.elemId);
    }));

    // Plotly chart
    self.chart = {
      elemId: "map-canvas",
      data: [{
          x: self.colData(), y: self.rowData(), z: self.mapData(),
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
