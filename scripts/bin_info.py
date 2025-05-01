from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass

UNKNOWN = ""

EpkStringRegex = re.compile(r"(\d{2}/1/(?:[\d\w]*/)+)")
FileHeaderRegex = re.compile(r"(\d+.\d+)Vatlab VOLVO ID.([^\n]+)\n")
BinVariantRegex = re.compile(r"(?:^|\s)([\d\w]+).a2l")
MeVersionRegex = re.compile(r"(?:^|\s)ME\s?(7[_\.\d]+)(?:\s|$)")
ChassisGroupRegex = re.compile(r"(?:^|\s)(P[\dX]+)(?:\s|$)")
EngineGroupRegex = re.compile(r"(?:^|\s)([BD][56][\d\w]{4}T)(?:\s|$)")
EngineModelRegex = re.compile(r"(?:^|\s)([BD][56][\dHLTR]+)(?:\s|$)")
SoftwareVersionRegex = re.compile(r"[sS][wWcC]:([\d\w]+)(?:\s|$)")
TransmissionStrRegex = re.compile(r"(?:^|\s)(AUT|MAN)(?:\s|$)")
DrivetrainStrRegex = re.compile(r"(?:^|\s)((?:[AFR24]WD/?)+)(?:\s|$)")
RegionStrRegex = re.compile(r"(?:^|\s)((?:EU|US)(?:-BLDC)?)(?:\s|$)")


@dataclass
class BinInfo:
    FileName: str = UNKNOWN
    FileSize: str = 0
    IsValid: bool = False
    EpkVersion: str = UNKNOWN
    HeaderPosition: int = 0
    HeaderVersion: str = UNKNOWN
    Variant: str = UNKNOWN
    SubVariant: str = UNKNOWN
    BuildDate: str = UNKNOWN
    ChassisGroup: str = UNKNOWN
    EngineGroup: str = UNKNOWN
    MeVersion: str = UNKNOWN
    SoftwareVersion: str = UNKNOWN
    EngineModel: str = UNKNOWN
    Transmission: str = UNKNOWN
    Drivetrain: str = UNKNOWN
    Region: str = UNKNOWN
    EcuVariant: str = UNKNOWN

    FileChecksum: str = ""

    @staticmethod
    def from_file(filepath: str) -> "BinInfo":
        with open(filepath, "rb") as _f:
            data = _f.read()
        return BinInfo.from_data(filepath, data)

    @staticmethod
    def from_data(filepath: str, data: bytes) -> "BinInfo":
        data_str = data.decode("ascii", "replace")

        info = BinInfo(
            FileName=os.path.split(filepath)[-1],
            FileSize=len(data),
            FileChecksum=hashlib.sha256(data).hexdigest(),
        )

        # Check start and end bytes
        info.IsValid = (bytearray(data[:6]) == bytearray([234, 0, 0, 2, 234, 0])) and (
            bytearray(data[-6:]) == bytearray([68, 68, 68, 68, 131, 131])
        )

        # Look for EPK version
        epk_match = EpkStringRegex.search(data_str)
        if epk_match:
            info.EpkVersion = epk_match.group(1)

        # Look for firmware info line
        header_match = FileHeaderRegex.search(data_str)
        if header_match:
            info.HeaderVersion = header_match.group(1)
            header_str = header_match.group(2)
            info.HeaderPosition = header_match.start()
            if header_str:
                header_parts = re.split(r"\s{4,}", header_str.strip())

                if m := ChassisGroupRegex.search(header_parts[0]):
                    info.ChassisGroup = m.group(1)
                if m := EngineGroupRegex.search(header_parts[0]):
                    info.EngineGroup = m.group(1)
                if m := MeVersionRegex.search(header_parts[0]):
                    info.MeVersion = ".".join(
                        [e.strip("0") or "0" for e in re.split(r"[_\.]", m.group(1))]
                    )

                if info.HeaderVersion in ("1.0", "0.0"):
                    info.Variant = header_parts[-3].split(".")[0].upper()
                    info.BuildDate = header_parts[-2]
                    if info.HeaderVersion == "1.0":
                        info.SubVariant = header_parts[2]
                        info_str = header_parts[3]
                    else:
                        info_str = header_parts[1]
                else:
                    if m := BinVariantRegex.search(header_str):
                        info.Variant = m.group(1)
                    _index = header_str.find(".a2l") + 10
                    info.BuildDate = header_str[_index : _index + 16]
                    info_str = header_str

                if info_str:
                    if m := SoftwareVersionRegex.search(info_str):
                        info.SoftwareVersion = m.group(1)
                    if m := EngineModelRegex.search(info_str):
                        info.EngineModel = m.group(1)
                    if m := TransmissionStrRegex.search(info_str):
                        info.Transmission = m.group(1)
                    if m := DrivetrainStrRegex.search(info_str):
                        info.Drivetrain = m.group(1)
                    if m := RegionStrRegex.search(info_str):
                        info.Region = m.group(1)

            addr = None
            for a in range(header_match.start(), header_match.start() + 0x1000):
                for i, b in enumerate([0x99, 0x99, 0x99, 0x00, 0x0A]):
                    if data[a + i] != b:
                        break
                else:
                    addr = a + 5
                    break
            if addr is not None:
                var_bytes = data[addr : addr + 7]
                info.EcuVariant = "".join(
                    [f"{int(e):02x}" for e in var_bytes[:-3]]
                ) + var_bytes[-2:].decode("ascii", "replace")

        return info
