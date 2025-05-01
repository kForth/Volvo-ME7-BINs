import os
import shutil
import sys

import click

from bin_info import BinInfo


@click.command()
@click.argument("outdir", type=click.Path(file_okay=False, dir_okay=True))
@click.argument("srcfiles", type=click.Path(exists=True, dir_okay=False), nargs=-1)
def main(outdir, srcfiles):
    click.echo(f"Importing {len(srcfiles)} bin files...")

    for fp in srcfiles:
        info = BinInfo.from_file(fp)

        filename = "-".join(
            e.replace("/", "_")
            for e in (
                info.Variant,
                info.SubVariant,
                info.Transmission,
                info.Drivetrain,
                info.Region,
            )
            if e
        )
        outpath = os.path.join(outdir, filename + ".bin")
        if os.path.isfile(outpath):
            i = 1
            while os.path.isfile(finalpath := (outpath[:-4] + f" {i}.bin")):
                i += 1
            outpath = finalpath
        os.makedirs(outdir, exist_ok=True)
        print(fp)
        print(outpath)
        shutil.copy(fp, outpath)

    click.echo("Done.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
