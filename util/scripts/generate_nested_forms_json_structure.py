#!/usr/bin/env python3
import sys
import argparse
import requests
import json
import re
from pathlib import Path

# Match lines like:
# [[!--  items must be subclasses of http://…/S15_Observable_Entity --]]
SUBCLASS_LINE_RE = re.compile(
    r'\[\[!--\s*items must be subclasses of\s*(\S+)\s*--\]\]'
)
def extract_requirements_json(folder: str, pattern: str = "*") -> str:
    """
    Scan `folder` for files whose names start with the hard-coded prefix
    and that match `pattern`. For each, read the first line and, if it
    matches the “items must be subclasses of …” marker, extract the URL.
    Returns a JSON string of the form:
    [
      {"filename": "<path/to/file1>", "url": "<extracted-url-or-null>"},
      ...
    ]
    """
    PREFIX = (
        "http%3A%2F%2Fwww.researchspace.org%2Fresource%2Fsystem"
        "%2FNestedFormTemplates_"
    )
    base = Path(folder)
    entries = []

    for file_path in base.glob(pattern):
        if not file_path.is_file():
            continue
        if not file_path.name.startswith(PREFIX):
            continue
        print(file_path.name)
        try:
            first_line = file_path.open("r", encoding="utf-8").readline().rstrip("\n")
        except Exception as e:
            url = None
            error = str(e)
        else:
            m = SUBCLASS_LINE_RE.search(first_line)
            url = m.group(1) if m else None
            error = None

        entries.append({
            "filename": str(file_path),
            "url":      url,
            **({"error": error} if error else {})
        })

    print(json.dumps(entries, indent=2, ensure_ascii=False))
    # Return pretty-printed JSON
    return entries#//json.dumps(entries, indent=2, ensure_ascii=False)

def remove_duplicates_by_label(entries):
    """
    Given a list of dicts each with a 'label' key,
    return a new list where only the first entry
    for each distinct label is kept.
    """
    seen = set()
    unique = []
    for entry in entries:
        lbl = entry.get("label")
        if lbl in seen:
            continue
        seen.add(lbl)
        unique.append(entry)
    return unique

def filter_out(entries, entry_labels_to_remove):
    """
    Return a new list containing only those dicts whose 'label'
    is not in the labels_to_remove list.
    """
    to_remove = set(entry_labels_to_remove)
    return [entry for entry in entries if entry.get("label") not in to_remove]

def sparql_post(endpoint, query, user=None, password=None):
    headers = {
        "Accept": "application/sparql-results+json",
        "Content-Type": "application/sparql-query"
    }
    #auth = (user, password) if user and password else None
    auth = ("admin","admin")
    resp = requests.post(endpoint, data=query.encode("utf-8"), headers=headers, auth=auth)
    resp.raise_for_status()
    return resp.json()

def get_subclasses(endpoint, parent_iri, user=None, password=None):
    q = f"""
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?subclass WHERE {{
  ?subclass rdfs:subClassOf* <{parent_iri}> .
}}
ORDER BY DESC(STR(?subclass))
"""
    results = sparql_post(endpoint, q, user, password)
    return [b["subclass"]["value"] for b in results["results"]["bindings"]]

def get_details(endpoint, iri, user=None, password=None):
    q = f"""
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?label ?resourceFormIRI WHERE {{    
  ?resourceConfiguration 
      <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> <{iri}> ;
      a <http://www.researchspace.org/resource/system/resource_configuration> ;
      <http://www.researchspace.org/pattern/system/resource_configuration/resource_name> ?label ;
      <http://www.researchspace.org/pattern/system/resource_configuration/resource_form> ?resourceFormIRI .
}}
"""
    results = sparql_post(endpoint, q, user, password)

    # Collect every binding into a list of dicts
    entries = []
    for b in results["results"]["bindings"]:
        entries.append({
            "label": b["label"]["value"],
            "resourceConfigurationFormIRI": b["resourceFormIRI"]["value"]
        })

    return entries


def main():
    # How to run the script
    # ./generate_nested_forms_json_structure.py http://localhost:10214/sparql http://www.cidoc-crm.org/cidoc-crm/E7_Activity
    p = argparse.ArgumentParser(description="List subclasses + labels/comments from a SPARQL endpoint")
    p.add_argument("endpoint", help="SPARQL endpoint URL")
    p.add_argument("--iri",    help="Parent class IRI")
    p.add_argument("--user",   help="(optional) HTTP BASIC auth user")
    p.add_argument("--password",help="(optional) HTTP BASIC auth password")
    args = p.parse_args()

    inputFolder = "../src/main/resources/org/researchspace/apps/default/data/templates"
    outputFolder = "."
    nestedTemplatesJson = extract_requirements_json(inputFolder, pattern="*")
    
    for nested in nestedTemplatesJson: 
        try:
            subs = get_subclasses(args.endpoint, nested["url"], args.user, args.password)
        except requests.HTTPError as e:
            print(f"❌ Failed to fetch subclasses: {e}", file=sys.stderr)
            sys.exit(1)

        if not subs:
            print("No subclasses found.", file=sys.stderr)
            sys.exit(0)

        print(f"Found {len(subs)} subclasses of <{nested["url"]}>. Gathering details…", file=sys.stderr)

        # Prepare list to hold all subclass entries
        results = []

        for uri in subs:
            try:
                subconfigs = get_details(
                    args.endpoint, uri, args.user, args.password
                )
            except requests.HTTPError as e:
                print(f"  • {uri} → detail-fetch error: {e}", file=sys.stderr)
                continue
        
            # Build a dict for this subclass
            entry = {}
            
            for config in subconfigs:
                if (config["label"]):
                    if (config["resourceConfigurationFormIRI"]):
                        entry["label"] = config["label"]
                        entry["nestedForm"] = "{{{{raw}}}}{{> \""+config["resourceConfigurationFormIRI"]+"\" nested=true editable=true mode=\"new\" }}{{{{/raw}}}}"
            
                    results.append(entry)
                    
        filtered = filter_out(results, ["Chart","KP category", "Knowledge map", "Semantic narrative", "Set", "Set Item", "Timeline", "User"])         
        no_duplicates_results = remove_duplicates_by_label(results)
        header = "[[!-- "+ nested["url"]+ " --]]"
        
        # Sort in‐place by the "label" field (alphabetical)
        no_duplicates_results.sort(key=lambda e: e.get("label", ""))
    
        # Write out the JSON file
        out_path = outputFolder+nested["filename"].replace("../src/main/resources/org/researchspace/apps/default/data/templates","");
        with open(out_path, "w", encoding="utf-8") as f:
            # first line
            f.write(header)
            # then the actual JSON      
            json.dump(no_duplicates_results, f, indent=2, ensure_ascii=False)

        print(f"✅ Wrote {len(no_duplicates_results)} entries to {out_path}")
if __name__ == "__main__":
    main()
