import json
import os
import re
import sys
from dataclasses import asdict

import click
import yaml

from bin_info import BinInfo

@click.command()
@click.argument("src", type=click.Path(), nargs=-1)
def main(src):
    click.echo("Checking for duplicate files...")

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

    # Check for duplicates using the file checksum
    checksums = {}
    for info in bins:
        checksum = info["FileChecksum"]
        if checksum in checksums:
            checksums[checksum] += [info["FileName"]]
        else:
            checksums[checksum] = [info["FileName"]]
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
