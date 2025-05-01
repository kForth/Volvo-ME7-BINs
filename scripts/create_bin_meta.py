import json
import os
import re
import sys
from dataclasses import asdict

import click
import yaml

from bin_info import BinInfo

case_re = re.compile(r'(?<!^)(?=[A-Z])')
SEP = " | "
UKN = "?"
FMT = "| {0} |"


@click.command()
@click.argument("src", type=click.Path(), nargs=-1)
@click.option("-o", "--outfile", type=click.Path(dir_okay=False))
def main(src, outfile):
    click.echo(f"Extracting info from {len(src)} files...")

    bins = []
    for fp in src:
        info = BinInfo.from_file(fp)
        bins.append(asdict(info))

    bins.sort(
        key=lambda e: [
            e[k]
            for k in (
                "MeVersion",
                "ChassisGroup",
                "BuildDate",
                "Variant",
                "SubVariant",
                "FileName",
            )
        ]
    )

    # Convert keys to snake_case
    bins = [
        {case_re.sub('_', k).lower(): v for k, v in e.items()}
        for e in bins
    ]

    if outfile:
        bin_dict = {e["file_name"]: e for e in bins}
        if outdir := os.path.split(outfile)[0]:
            os.makedirs(outdir, exist_ok=True)
        with open(outfile, "w+", encoding="utf-8") as out:
            yaml.dump(bin_dict, out)
    else:
        click.echo(json.dumps([e for e in bins], indent=2))

    # Check for duplicates using the file checksum
    checksums = {}
    for info in bins:
        checksum = info["file_checksum"]
        if checksum in checksums:
            checksums[checksum] += [info["file_name"]]
        else:
            checksums[checksum] = [info["file_name"]]
    duplicates = [k for k, v in checksums.items() if len(v) > 1]
    if duplicates:
        click.echo("Duplicate files found:")
        for checksum in duplicates:
            click.echo(f"  {checksum}:")
            for fn in checksums[checksum]:
                click.echo(f"    {fn}")
    else:
        click.echo("No duplicate files found.")

    click.echo("Done.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
