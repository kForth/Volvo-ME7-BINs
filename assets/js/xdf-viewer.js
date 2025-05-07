class MapAxis {
  constructor(settings, address, nBytes, equation, decimalPlaces) {
    var self = this;

    self.data = settings.data;
    self.axis = settings.axis
    self.showRawHex = settings.showHex;

    self.len = () => self.axis().cols || self.axis().indexcount || 1;
    self.lsb = () => self.axis().lsb;
    self.address = () => self.axis().address || 0;
    self.nBytes = () => self.axis().nBytes || 1;
    self.equation = () => self.axis().equation || "x";
    self.decimalPlaces = () => self.axis().decimalPlaces || 2;

    self.valBytes = ko.computed(() => {
      var data = self.data();
      var nBytes = parseInt(self.nBytes());
      var addr = self.address();
      return Array.from({length: self.len()}).map((_, i) => {
        var _addr = addr + (i * nBytes);
        return data.slice(_addr, _addr + nBytes);
      });
    });
    self.valHex = ko.computed(() => self.valBytes().map(e => e.reduce((s, v) => v.toString(16).padStart(2, '0') + s, '').toUpperCase()));
    self.valInts = ko.computed(() => self.valBytes().map(e => sumBytes(e, self.lsb())));
    self.values = ko.computed(() =>
      (self.data() && self.address())
        ? self.valInts().map((X, i) => eval(self.equation()))
        : Array.from({length: self.len()}).map((_, i) => i + 1)
      );

    self.strValues = ko.computed(() => self.values().map(e => e.toFixed(parseInt(self.decimalPlaces()))));
    self.headers = ko.computed(() =>
      (self.data() && self.address())
        ? (self.showRawHex() ? self.valHex() : self.strValues())
        : self.axis().labels
            ? self.axis().labels.map(e => e.value)
            : Array.from({length: self.len()}).map((_, i) => i + 1)
    );
  }
}

class XdfViewerModel {
  constructor() {
    var self = this;

    // Config
    self.file = ko.observable();
    self.xdf = ko.observable();

    self.xdfTables = ko.observable([]);
    self.selectedTable = ko.observable();

    // Options
    self.colourScaleBg = ko.observable(true);
    self.showRawHex = ko.observable(false);

    self.data = ko.observable([]);
    self._xdf = ko.observable({});

    self.file.subscribe(function () {
      var reader = new FileReader();
      reader.onload = function () {
        self.data(new Uint8Array(this.result));
      };
      reader.readAsArrayBuffer(self.file());
    });
    self.xdf.subscribe(function () {
      var reader = new FileReader();
      reader.onload = function () {
        var doc = new DOMParser().parseFromString(this.result, "text/xml");
        self.xdfTables([... doc.getElementsByTagName("XDFTABLE")].map(table => {
          return {
            title: (table.getElementsByTagName("title")[0] || {}).textContent,
            axes: [... table.getElementsByTagName("XDFAXIS")].map(axis => {
              var data = axis.getElementsByTagName("EMBEDDEDDATA")[0];
              var eq = (axis.getElementsByTagName("MATH") || [null])[0];
              var flags = parseAddrString(data.getAttribute("mmedtypeflags") || "0");
              return {
                address: parseAddrString(data.getAttribute("mmedaddress") || "0"),
                bytes: parseInt(data.getAttribute("mmedelementsizebits") || "8") / 8,
                rows: parseInt(data.getAttribute("mmedrowcount")) || undefined,
                cols: parseInt(data.getAttribute("mmedcolcount")) || undefined,
                signed: (flags & 0b001) > 1, // TODO: Use this
                lsb: (flags & 0b010) > 1,
                colsFirst: (flags & 0b100) > 1,
                indexcount: parseInt((axis.getElementsByTagName("indexcount")[0] || {}).textContent) || undefined,
                units: (axis.getElementsByTagName("units")[0] || {}).textContent,
                decimalPlaces: parseInt((axis.getElementsByTagName("decimalpl")[0] || {}).textContent) || 2,
                equation: eq ? eq.getAttribute("equation") : "X",
                vars: eq ? [... eq.getElementsByTagName("VAR")].map(v => v.getAttribute("id")) : [],
                labels: [... axis.getElementsByTagName("LABEL")].map(v => ({
                  index: v.getAttribute("index"),
                  value: v.getAttribute("value"),
                })),
              };
            }),
          };
        }));
      };
      reader.readAsText(self.xdf());
    });

    self.address = (() => self.selectedTable() ? self.selectedTable().axes[2].address : 0);
    self._rows = (() => self.selectedTable() ? self.selectedTable().axes[2].rows || 1 : 1);
    self._cols = (() => self.selectedTable() ? self.selectedTable().axes[2].cols || 1 : 1);
    self.numBytes = (() => self.selectedTable() ? self.selectedTable().axes[2].bytes : 1);
    self.decimalPlaces = (() => self.selectedTable() ? self.selectedTable().axes[2].decimalPlaces : 2);
    self.scaleEquation = (() => self.selectedTable() ? self.selectedTable().axes[2].equation : "X");
    self.lsbOrder = (() => self.selectedTable() ? self.selectedTable().axes[2].lsb : true);

    // Map Data
    self.mapHex = ko.computed(() => {
      if (!self.selectedTable()) return [];
      var zAxis = self.selectedTable().axes[2];
      var data = self.data();
      var addr = self.address();
      var cols = self._cols();
      var nBytes = zAxis.bytes;
      return Array.from({length: self._rows()}).map((_, i_row) => {
        return Array.from({length: cols}).map((_, i_col) => {
          var _addr = zAxis.colsFirst
            ? addr + (i_row * cols * nBytes + i_col * nBytes)
            : addr + (i_col * cols * nBytes + i_row * nBytes);
          return data.slice(_addr, _addr + nBytes);
        });
      });
    });
    self.mapHexStr = ko.computed(() => self.mapHex().map(row => row.map(e => e.reduce((s, v) => v.toString(16).padStart(2, '0') + s, '').toUpperCase())));
    self.mapInts = ko.computed(() => self.mapHex().map(row => row.map(e => sumBytes(e, self.lsbOrder()))));
    self.mapData = ko.computed(() => self.mapInts().map(row => row.map(X => eval(self.scaleEquation()))));
    self.mapVals = ko.computed(() =>self.mapData().map(row => row.map(e => e.toFixed(parseInt(self.decimalPlaces())))));
    self.tableData = ko.computed(() => {
      return self.data()
        ? (self.showRawHex() ? self.mapHexStr() : self.mapVals())
        : Array.from({length: 16}).map(() => Array.from({length: 16}).map(() => 0));
    });

    // Row & Column Headers
    self.colHeaders = new MapAxis({
      data: self.data,
      axis: () => self.selectedTable() ? self.selectedTable().axes[0] : {},
      showHex: self.showRawHex,
    });
    self.rowHeaders = new MapAxis({
      data: self.data,
      axis: () => self.selectedTable() ? self.selectedTable().axes[1] : {},
      showHex: self.showRawHex,
    });

    self.selectedTable.subscribe(() => {
      self.colHeaders.address(self.selectedTable().axes[0].address);
      self.rowHeaders.address(self.selectedTable().axes[1].address);
    });

    [
      self.mapData,
      self.selectedTable,
    ].map(e => e.subscribe(() => {
      // Update chart
      if (self._rows() == 1 || self._cols() == 1) {
        if (self._rows() == 1) {
          self.chart.data[0].x = self.colHeaders.values();
          self.chart.data[0].y = self.mapData()[0];
          self.chart.layout.scene.xaxis.title = self.selectedTable().axes[0].units;
        } else {
          self.chart.data[0].x = self.rowHeaders.values();
          self.chart.data[0].y = self.mapData().map(e => e[0]);
          self.chart.layout.scene.xaxis.title = self.selectedTable().axes[1].units;
        }
        self.chart.data[0].z = [];
        self.chart.data[0].type = "scatter";
        self.chart.layout.scene.yaxis.title = self.selectedTable().axes[2].units;
        self.chart.layout.scene.zaxis.title = "";
      }
      else {
        self.chart.data[0].x = self.colHeaders.values();
        self.chart.data[0].y = self.rowHeaders.values();
        self.chart.data[0].z = self.mapData();
        self.chart.data[0].type = "surface";
        self.chart.layout.scene.xaxis.title = self.selectedTable().axes[0].units;
        self.chart.layout.scene.yaxis.title = self.selectedTable().axes[1].units;
        self.chart.layout.scene.zaxis.title = self.selectedTable().axes[2].units;
      }
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
      document.documentElement.getAttribute("data-bs-theme") == "dark" ? 0.5 : 0.8,
    ) : undefined;
  }
}

const viewer = new XdfViewerModel();
ko.applyBindings({
  viewer: viewer,
});
