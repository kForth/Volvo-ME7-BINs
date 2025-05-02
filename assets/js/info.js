const EpkStringRegex = /(\d{2}\/1\/(?:[\d\w]*\/)+)/;
const FileHeaderRegex = /(\d+.\d+)Vatlab VOLVO ID.([^\n]+)\n/;
const BinVariantRegex = /(?:^|\s)([\d\w]+).a2l/;
const MeVersionRegex = /(?:^|\s)ME\s?(7[_\.\d]+)(?:\s|$)/;
const ChassisGroupRegex = /(?:^|\s)(P[\dX]+)(?:\s|$)/;
const EngineGroupRegex = /(?:^|\s)([BD][56][\d\w]{4}T)(?:\s|$)/;
const EngineModelRegex = /(?:^|\s)([BD][56][\dHLTR]+)(?:\s|$)/;
const SoftwareVersionRegex = /[sS][wWcC]:([\d\w]+)(?:\s|$)/;
const TransmissionStrRegex = /(?:^|\s)(AUT|MAN)(?:\s|$)/;
const DrivetrainStrRegex = /(?:^|\s)((?:[AFR24]WD\/?)+)(?:\s|$)/;
const RegionStrRegex = /(?:^|\s)((?:EU|US)(?:-BLDC)?)(?:\s|$)/;

class FirmwareFileModel {
  constructor() {
    var self = this;

    self.file = ko.observable();
    self.data = ko.observableArray();

    // Meta
    self.filename = ko.observable("");
    self.filesize = ko.observable("");
    self.isValid = ko.observable("");
    self.epkVersion = ko.observable("");
    self.headerPosition = ko.observable("");
    self.headerString = ko.observable("");
    self.headerVersion = ko.observable("");
    self.variant = ko.observable("");
    self.subVariant = ko.observable("");
    self.buildDate = ko.observable("");
    self.chassis = ko.observable("");
    self.engine = ko.observable("");
    self.meVersion = ko.observable("");
    self.softwareVersion = ko.observable("");
    self.engineModel = ko.observable("");
    self.transmission = ko.observable("");
    self.drivetrain = ko.observable("");
    self.region = ko.observable("");
    self.ecuVariant = ko.observable("");

    self.file.subscribe(function () {
      var reader = new FileReader();
      reader.onloadstart = function () {
        self.filename("");
        self.filesize("");
        self.isValid("");
        self.epkVersion("");
        self.headerPosition("");
        self.headerString("");
        self.headerVersion("");
        self.variant("");
        self.subVariant("");
        self.buildDate("");
        self.chassis("");
        self.engine("");
        self.meVersion("");
        self.softwareVersion("");
        self.engineModel("");
        self.transmission("");
        self.drivetrain("");
        self.region("");
        self.ecuVariant("");
      };
      reader.onload = function () {
        self.filename(self.file().name);
        self.filesize(self.file().size);
        self.data(new Uint8Array(this.result));
      };
      reader.readAsArrayBuffer(self.file());
    });

    self.data.subscribe(function () {
      var data = self.data();

      // Check start and end bytes
      self.isValid(
        data.subarray(0, 6) == [234, 0, 0, 2, 234, 0] &&
          data.subarray(data.length - 6) == [68, 68, 68, 68, 131, 131]
      );

      var dataStr = Array.from(data, (e) => String.fromCharCode(e)).join("");
      var match = null;

      // Look for EPK version
      if ((match = EpkStringRegex.exec(dataStr))) self.epkVersion(match[1]);

      // Look for firmware info line
      if ((match = FileHeaderRegex.exec(dataStr))) {
        self.headerVersion(match[1]);
        self.headerString(match[2]);
        self.headerPosition(match.index);
        if (self.headerString()) {
          var headerParts = self
            .headerString()
            .trim()
            .split(/\s{4,}/);
          var info_str = "";

          self.chassis((match = ChassisGroupRegex.exec(headerParts[0])) ? match[1] : "");
          self.engine((match = EngineGroupRegex.exec(headerParts[0])) ? match[1] : "");
          if ((match = MeVersionRegex.exec(headerParts[0]))) {
            self.meVersion(
              match[1].split(/[_\.]/).map(e => (e = e.replace(/0+$/, "")).length > 0 ? e : "0").join(".")
            );
          }
          if (self.headerVersion() == "1.0" || self.headerVersion() == "0.0") {
            self.variant(headerParts[headerParts.length - 3].split(".")[0].toUpperCase());
            self.buildDate(headerParts[headerParts.length - 2]);

            if (self.headerVersion() == "1.0") {
              self.subVariant(headerParts[2]);
              info_str = headerParts[3];
            } else {
              self.subVariant("");
              info_str = headerParts[1];
            }
          } else if ((match = BinVariantRegex.exec(self.headerString))) {
            self.variant(match[1]);
            var _index = self.headerString.find(".a2l") + 10;
            self.buildDate(self.headerString.subarray(_index, _index + 16));
            info_str = self.headerString;
            self.subVariant("");
          } else {
            self.variant("");
            self.buildDate("");
            self.subVariant("");
          }

          if (info_str) {
            self.softwareVersion(
              (match = SoftwareVersionRegex.exec(info_str)) ? match[1] : ""
            );
            self.engineModel((match = EngineModelRegex.exec(info_str)) ? match[1] : "");
            self.transmission(
              (match = TransmissionStrRegex.exec(info_str)) ? match[1] : ""
            );
            self.drivetrain((match = DrivetrainStrRegex.exec(info_str)) ? match[1] : "");
            self.region((match = RegionStrRegex.exec(info_str)) ? match[1] : "");
          }
        }

        var addr = null
        const needle = [0x99, 0x99, 0x99, 0x00, 0x0A];
        for(var a = self.headerPosition(); a < self.headerPosition() + 0x1000; a++) {
          var i;
          for(i = 0; i < needle.length; i++) {
              if (data[a + i] != needle[i]) {
                break;
              }
          }
          if (i == needle.length) {
            addr = a + 5;
            break;
          }
        }
        if (addr !== null) {
          var bytes = data.subarray(addr, addr + 7)
          self.ecuVariant(
            Array.from(bytes.subarray(0, 4), (e) => e.toString(16).padStart(2, '0')).join("")
            + Array.from(bytes.subarray(5, 7), (e) => String.fromCharCode(e)).join("")
          );
        }
        console.log(addr);
      }


      console.log(self.filename());
      console.log(self.filesize());
      console.log(self.isValid());
      console.log(self.epkVersion());
      console.log(self.headerPosition());
      console.log(self.headerString());
      console.log(self.headerVersion());
      console.log(self.variant());
      console.log(self.subVariant());
      console.log(self.buildDate());
      console.log(self.chassis());
      console.log(self.engine());
      console.log(self.meVersion());
      console.log(self.softwareVersion());
      console.log(self.engineModel());
      console.log(self.transmission());
      console.log(self.drivetrain());
      console.log(self.region());
      console.log(self.ecuVariant());

    });
  }
}

ko.applyBindings({
  firmware: new FirmwareFileModel()
});
