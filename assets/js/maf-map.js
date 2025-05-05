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
      console.log(delims);
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
      var vals = []
      if (self.originalLength() == self.newLength()) {
        for (var val of self.orgMapVals()) {
          vals.push((val + parseFloat(self.offsetPreScale())) * parseFloat(self.scale()) + parseFloat(self.offsetPostScale()));
        }
      } else {
        var sizeScale = self.newLength() / self.originalLength();
        for (var i = 0; i < self.newLength(); i++) {
          var lb = Math.floor(i / sizeScale);
          var ub = Math.ceil(i / sizeScale);
          var lv = self.orgMapVals()[lb];
          var uv = self.orgMapVals()[ub];
          var scale = (i / sizeScale) - lb;
          var val = (lv + (uv - lv) * scale);
          val = (val + parseFloat(self.offsetPreScale())) * parseFloat(self.scale()) + parseFloat(self.offsetPostScale());
          vals.push(val);
        }
      }
      return vals;
    });
    self.newMap = ko.computed(() => self.newMapVals().join(self.originalDelim()));

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
      self.chart.data[0].x = Array.from({length: self.originalLength()}, (_,k) => k+1);
      self.chart.data[0].y = self.orgMapVals();
      self.chart.data[1].x = Array.from({length: self.newLength()}, (_,k) => k+1);
      self.chart.data[1].y = self.newMapVals();
      Plotly.redraw(self.chart.elemId);
    });

  }
}

ko.applyBindings({
  maf: new MafMapToolModel(),
});
