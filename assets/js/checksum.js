const CHECKSUM_START = 0x1F810;
const CHECKSUM_END = 0x1F810 + 0x10 * 31 + 1;

class FileChecksumModel {
  constructor() {
    var self = this;

    self.file = ko.observable();
    self.data = ko.observableArray();

    // Meta
    self.filename = ko.observable("");
    self.filesize = ko.observable("");
    self.status = ko.observable("");

    self.fixButtonDisabled = ko.computed(() => self.file() == null || self.status() != "Invalid");
    self.downloadButtonDisabled = ko.computed(() => self.file() == null || self.status() != "Corrected");

    self.file.subscribe(function () {
      var reader = new FileReader();
      reader.onloadstart = function () {
        self.filename("");
        self.filesize("");
        self.status("");
      };
      reader.onload = function () {
        self.filename(self.file().name);
        self.filesize(self.file().size);
        self.data(new Uint8Array(this.result));
        self.status(self.verifyChecksum() ? "Valid" : "Invalid");
      };
      reader.readAsArrayBuffer(self.file());
    });

    self.verifyChecksum = function () {
      var data = self.data();
      for(var i = CHECKSUM_START; i < CHECKSUM_END; i += 0x10) {
        var bytes = data.subarray(i, i + 0x10);
        var startAddr = bytes.subarray(0, 4).reduce((a, c, i) => a + (c << (i * 8)));
        var endAddr = bytes.subarray(4, 8).reduce((a, c, i) => a + (c << (i * 8)));
        var sum = bytes.subarray(8, 12).reduce((a, c, i) => a + (c << (i * 8)));
        var _sum = bytes.subarray(12, 16).reduce((a, c, i) => a + (c << (i * 8)));

        if (~sum != _sum) return false
        var chk = 0;
        for(var a = startAddr; a < endAddr; a += 2){
          chk += data[a];
          chk += data[a + 1] << 8;
        }
        if(chk != sum) return false
      }
      return true;
    }

    self.fixChecksum = function () {
      var data = self.data();
      for(var i = CHECKSUM_START; i < CHECKSUM_END; i += 0x10) {
        var bytes = data.subarray(i, i + 0x10);
        var startAddr = bytes.subarray(0, 4).reduce((a, c, i) => a + (c << (i * 8)));
        var endAddr = bytes.subarray(4, 8).reduce((a, c, i) => a + (c << (i * 8)));
        var sum = bytes.subarray(8, 12).reduce((a, c, i) => a + (c << (i * 8)));

        var chk = 0;
        for(var a = startAddr; a < endAddr; a += 2){
          chk += data[a];
          chk += data[a + 1] << 8;
        }
        if(chk != sum) {
          data[i + 8] = (chk & 0x000000FF);
          data[i + 9] = (chk & 0x0000FF00) >> 8;
          data[i + 10] = (chk & 0x00FF0000) >> 16;
          data[i + 11] = (chk & 0xFF000000) >> 24;
          var _chk = ~chk;
          data[i + 12] = (_chk & 0x000000FF);
          data[i + 13] = (_chk & 0x0000FF00) >> 8;
          data[i + 14] = (_chk & 0x00FF0000) >> 16;
          data[i + 15] = (_chk & 0xFF000000) >> 24;
        }
      }
      self.data(data);
      self.status(self.verifyChecksum() ? "Corrected" : "Invalid");
    }

    self.downloadFile = function () {
      var blob = new Blob([self.data()], {type: "text/plain"});
      var link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      var fileName = self.filename().replace(/\.[^/.]+$/, " (corrected).bin");
      link.download = fileName;
      link.click();
    };
  }
}

ko.applyBindings({
  checksum: new FileChecksumModel()
});
