const MINS_PER_MS = 1.67e-5;
const HEPTANE_DENSITY = 0.6795; // g/cm^3

class InjectorConfigModel {
  constructor(engine) {
    var self = this;

    // Engine Specs
    self.engine = engine;

    // Fuel Injectors
    self.injectorFlowRaw = ko.observable(330);
    self.injectorFlowUnit = ko.observable("cm^3/min");
    self.injectorFlow_ccm = _computedUnit(
      self.injectorFlowRaw,
      self.injectorFlowUnit,
      () => "cm^3/min"
    );
    self.injectorStoich = ko.observable(14.7); // n:1

    self.airDensityRaw = ko.observable(1.225);
    self.airDensityUnit = ko.observable("kg/m^3");
    self.airDensity_kg_m3 = _computedUnit(
      self.airDensityRaw,
      self.airDensityUnit,
      () => "kg/m^3"
    );
    self.airDensity_g_cm3 = _computedUnit(
      self.airDensityRaw,
      self.airDensityUnit,
      () => "g/cm^3"
    );

    // Fuel Pressure
    self.fuelPressureRaw = ko.observable(3);
    self.fuelPressureUnit = ko.observable("bar");
    self.fuelPressure_bar = _computedUnit(
      self.fuelPressureRaw,
      self.fuelPressureUnit,
      () => "bar"
    );
    self.nominalFuelPressureRaw = ko.observable(3);
    self.nominalFuelPressureUnit = ko.observable("bar");
    self.nominalFuelPressure_bar = _computedUnit(
      self.nominalFuelPressureRaw,
      self.nominalFuelPressureUnit,
      () => "bar"
    );

    // Tuned Values
    self.kvb = ko.computed(() => {
      return (self.injectorFlow_ccm() * Math.sqrt(self.fuelPressure_bar() / self.nominalFuelPressure_bar()));
    });
    self.krkte = ko.pureComputed(() => {
      const correction = 1.05;
      return (
        (self.airDensity_kg_m3() * self.engine.cylinderVolume_dm3() * self.engine.volumetricEfficiency()/100) /
        (100 *
          self.injectorStoich() *
          MINS_PER_MS *
          correction *
          self.kvb() *
          HEPTANE_DENSITY)
      ).toFixed(6);
    });
  }
}

const engine = new EngineSpecsModel();
const injectors = new InjectorConfigModel(engine);

ko.applyBindings({
  engine: engine,
  injectors: injectors,
});
