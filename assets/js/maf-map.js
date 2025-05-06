class MafMapToolModel {
  constructor() {
    var self = this;

    self.originalMap = ko.observable("");
    self.orgMapVals = ko.observable([]);
    self.originalLength = ko.observable(0);
    self.newLength = ko.observable(0);
    self.originalDelim = ko.observable("\t");

    self.originalMap.subscribe(() => {
      var mapStr = self.originalMap().trim();
      var vals = mapStr.split(/\s/);
      var delims = [
        ["\t", (mapStr.match(/\t/g) || []).length],
        [" ", (mapStr.match(/ /g) || []).length],
        [",", (mapStr.match(/,/g) || []).length],
        [";", (mapStr.match(/;/g) || []).length],
        ["\n", (mapStr.match(/\n/g) || []).length],
      ].sort((a, b) => b[1] - a[1]);
      self.originalDelim(delims[0][0]);
      self.orgMapVals(vals.map((x) => parseFloat(x)));
      self.originalLength(vals.length);
      self.newLength(vals.length);
    });

    self.offsetPreScale = ko.observable(0);
    self.scale = ko.observable(1);
    self.offsetPostScale = ko.observable(0);

    self.newLength = ko.observable(0);
    self.newMapVals = ko.computed(() => {
      if (!self.originalMap()) return [];

      var offset1 = parseFloat(self.offsetPreScale());
      var offset2 = parseFloat(self.offsetPostScale());
      var scale = parseFloat(self.scale());
      var data = self.orgMapVals().map(e => (e + offset1) * scale + offset2);
      return reinterpolateData(data, self.newLength());
    });
    self.newMap = ko.computed(() => self.newMapVals().map(e => e.toFixed(2)).join(self.originalDelim()));

    self.chart = {
      elemId: "maf-canvas",
      data: [
        {
          name: "Original", x: [], y: [],
          type: "scatter", showscale: false, opacity:0.9,
        },
        {
          name: "Modified", x: [], y: [],
          type: "scatter", showscale: false, opacity:0.9,
        },
      ],
      layout: {
        title: "MAF Curve",
        autosize: true,
        scene: {
          xaxis: { title: "Voltage" },
          yaxis: { title: "Flow" },
        },
      }
    };
    self.plot = Plotly.newPlot(self.chart.elemId, self.chart.data, self.chart.layout);

    self.newMap.subscribe(() => {
      self.chart.data[0].x = Array.from({length: self.originalLength()}, (_,k) => indexToX(k, self.originalLength()));
      self.chart.data[0].y = self.orgMapVals();
      self.chart.data[1].x = Array.from({length: self.newLength()}, (_,k) => indexToX(k, self.newLength()));
      self.chart.data[1].y = self.newMapVals();
      Plotly.redraw(self.chart.elemId);
    });

  }
}

ko.applyBindings({
  maf: new MafMapToolModel(),
});
