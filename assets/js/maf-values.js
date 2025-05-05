class MafValuesModel {
  constructor() {
    var self = this;

    self.mafs = MAFS;

    self.chart = {
      elemId: "maf-canvas",
      data: self.mafs.map((e) => {return {
          name: e.title,
          x: e.data.map((_, i) => i / e.data.length * 5),
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
