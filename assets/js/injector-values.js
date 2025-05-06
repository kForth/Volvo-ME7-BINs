class InjectorValuesModel {
  constructor() {
    var self = this;

    self.configs = INJECTOR_CONFIGS;

    self.selectedConfig = ko.observable();
    self._cfg = () => self.selectedConfig() || {tvub: []};
    self.krkte = ko.computed(() => self._cfg().krkte);
    self.kvb = ko.computed(() => self._cfg().kvb);
    self.temin = ko.computed(() => self._cfg().temin);
    self.teminva = ko.computed(() => self._cfg().teminva);
    self.tvub = ko.computed(() => self._cfg().tvub.join("\t"));
  }
}

ko.applyBindings({
  injectors: new InjectorValuesModel(),
});
