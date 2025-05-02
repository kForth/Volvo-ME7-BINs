class EngineSpecsModel {
  constructor() {
    var self = this;

    self.cylinders = ko.observable(5);

    self.boreRaw = ko.observable(83);
    self.boreUnit = ko.observable("mm");
    self.bore_dm = _computedUnit(
      self.boreRaw,
      self.boreUnit,
      () => "dm"
    );

    self.strokeRaw = ko.observable(93.2);
    self.strokeUnit = ko.observable("mm");
    self.stroke_dm = _computedUnit(
      self.strokeRaw,
      self.strokeUnit,
      () => "dm"
    );

    self.cylinderVolume_dm3 = _computedUnit(
      () => Math.PI * Math.pow(self.bore_dm() / 2, 2) * self.stroke_dm(),
      () => "dm^3",
      () => "L"
    );

    self.displacement_dm3 = ko.computed(() => {
      return self.cylinders() * self.cylinderVolume_dm3();
    });
    self.displacementUnit = ko.observable("L");
    self.displacementRaw = _computedUnit(
      self.displacement_dm3,
      () => "dm^3",
      self.displacementUnit,
      2
    );
    self.displacement_cm3 = _computedUnit(
      self.displacement_dm3,
      () => "dm^3",
      () => "cm^3",
      2
    );

    self.volumetricEfficiency = ko.observable(92); // %
  }
}
