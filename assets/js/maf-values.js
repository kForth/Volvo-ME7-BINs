class MafValuesModel {
  constructor() {
    var self = this;

    self.mafs = MAFS;

    self.selectedMaf = ko.observable();
    self._maf = () => self.selectedMaf() || {};
    self.orgMapLength = ko.computed(() => (self._maf().data || []).length);
    self.orgMapStr = ko.computed(() => (self._maf().data || []).map(e => e.toFixed(2)).join("\t"));

    self.newMapLength = ko.observable(512);
    self.newMapData = ko.computed(() => {
      if (!self.selectedMaf())
        return [];

      return reinterpolateData(self.selectedMaf().data, self.newMapLength());
    });
    self.newMapStr = ko.computed(() => self.newMapData().map(e => e.toFixed(2)).join("\t"));

    self.chart = {
      elemId: "maf-canvas",
      data: self.mafs.map((e) => {return {
          name: e.title,
          x: e.data.map((_, i) => indexToX(i, e.data.length) * 5),
          y: e.data.map(v => v - e.offset),
          type: "scatter",
          showscale: false,
          opacity:0.9,
      };}),
      layout: {
        title: "MAF Curve",
        autosize: true,
        legend: {"orientation": "h"},
        scene: {
          xaxis: { title: "Voltage" },
          yaxis: { title: "Flow" },
        },
      },
      config: {
        responsive: true,
      }
    };
    self.plot = Plotly.newPlot(self.chart.elemId, self.chart.data, self.chart.layout, self.chart.config);
  }
}

ko.applyBindings({
  maf: new MafValuesModel(),
});
