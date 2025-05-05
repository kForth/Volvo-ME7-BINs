class MafHousingScaleModel {
  constructor() {
    var self = this;

    self.orgSizeRaw = ko.observable(3.5);
    self.orgSizeUnit = ko.observable("in");
    self.orgSize_in = _computedUnit(
      self.orgSizeRaw,
      self.orgSizeUnit,
      () => "in"
    );

    self.newSizeRaw = ko.observable(4.0);
    self.newSizeUnit = ko.observable("in");
    self.newSize_in = _computedUnit(
      self.newSizeRaw,
      self.newSizeUnit,
      () => "in"
    );

    self.scaling = ko.computed(() => {
      return ((self.newSize_in() / 2)**2 / (self.orgSize_in() / 2)**2);
    });
  }
}

ko.applyBindings({
  maf: new MafHousingScaleModel(),
});
