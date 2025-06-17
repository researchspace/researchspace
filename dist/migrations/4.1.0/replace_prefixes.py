#!/usr/bin/env python3
"""
replace_prefixes.py

A script to perform string replacements in all files under an input directory,
writes modified files to an output directory, preserving subdirectory structure.

Usage:
    ./replace_prefixes.py -i INPUT_DIR -o OUTPUT_DIR [--backup]

Options:
    -i, --input    Path to the input directory containing files to process
    -o, --output   Path to the output directory for modified files
    -b, --backup   If set, will back up existing files in the output directory with a .bak extension
"""
import argparse
import shutil
import sys
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Built-in mapping: list of (old_prefix, new_prefix) tuples
# ─────────────────────────────────────────────────────────────────────────────
MAPPING = [
    ("http://www.cidoc-crm.org/cidoc-crm/CRMarchaeo/", "http://www.cidoc-crm.org/extensions/crmarchaeo/"),
    ("http://www.cidoc-crm.org/cidoc-crm/CRMba/",       "http://www.cidoc-crm.org/extensions/crmba/"),
    ("http://www.ics.forth.gr/isl/CRMdig/",             "http://www.cidoc-crm.org/extensions/crmdig/"),
    ("http://www.ics.forth.gr/isl/CRMgeo/",             "http://www.cidoc-crm.org/extensions/crmgeo/"),
    ("http://www.cidoc-crm.org/cidoc-crm/influence/",   "http://www.cidoc-crm.org/extensions/influence/"),
    ("http://www.cidoc-crm.org/cidoc-crm/CRMsci/",      "http://www.cidoc-crm.org/extensions/crmsci/"),
    ("http://www.ics.forth.gr/isl/CRMsci/",             "http://www.cidoc-crm.org/extensions/crmsci/"),
    ("http://www.ics.forth.gr/isl/CRMinf/",             "http://www.cidoc-crm.org/extensions/crminf/"),
    ("http://iflastandards.info/ns/fr/frbr/frbroo/",    "http://iflastandards.info/ns/lrm/lrmoo/"),
]


def process_file(src_path: Path, dst_path: Path, mapping, backup: bool = False):
    """
    Read content from src_path, apply replacements, and write to dst_path.
    If backup is True and dst_path exists, rename it to *.bak before writing.
    """
    try:
        content = src_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Error reading '{src_path}': {e}", file=sys.stderr)
        return

    new_content = content
    for old_prefix, new_prefix in mapping:
        new_content = new_content.replace(old_prefix, new_prefix)

    # Ensure destination directory exists
    dst_path.parent.mkdir(parents=True, exist_ok=True)

    # Backup if requested and file already exists
    if backup and dst_path.exists():
        bak_path = dst_path.with_suffix(dst_path.suffix + '.bak')
        shutil.move(str(dst_path), str(bak_path))
        print(f"Backup of existing file saved as '{bak_path}'")

    try:
        dst_path.write_text(new_content, encoding='utf-8')
        print(f"Wrote modified file to '{dst_path}'")
    except Exception as e:
        print(f"Error writing '{dst_path}': {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Replace URI prefixes in files under an input directory, output to another directory.'
    )
    parser.add_argument(
        '-i', '--input', required=True,
        help='Input directory containing files to process'
    )
    parser.add_argument(
        '-o', '--output', required=True,
        help='Output directory for modified files'
    )
    parser.add_argument(
        '-b', '--backup', action='store_true',
        help='Backup existing output files with a .bak extension'
    )
    args = parser.parse_args()

    in_dir = Path(args.input)
    out_dir = Path(args.output)

    if not in_dir.is_dir():
        print(f"Error: input '{in_dir}' is not a directory.", file=sys.stderr)
        sys.exit(1)

    # Process all files recursively
    for src_path in in_dir.rglob('*'):
        if src_path.is_file():
            # Compute destination path
            rel_path = src_path.relative_to(in_dir)
            dst_path = out_dir / rel_path
            process_file(src_path, dst_path, MAPPING, backup=args.backup)

if __name__ == '__main__':
    main()
