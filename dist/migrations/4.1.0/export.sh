#!/usr/bin/env bash
set -euo pipefail

# Usage: $0 <data_folder> <graphs_file>
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <data_folder> <graphs_file>"
  exit 1
fi

# The path to the folder containing the *.nt files
dataDir="$1"

# The path to the file containing a list of all the named graphs in the database
graphsFile="$2"

# The sparql endpoint
sparqlEndpoint="http://localhost:10214/blazegraph/sparql"

# ensure output directory exists
mkdir -p "$dataDir"

# get list of all named graphs (writes to graphsFile)
curl "$sparqlEndpoint" \
     -H 'Accept:text/tab-separated-values' \
     --data-urlencode 'query=SELECT DISTINCT ?g { GRAPH ?g { ?s ?p ?o } }' \
     > "$graphsFile"

# export each named graph into an .nt file
i=0
while IFS=$'\n' read -r line; do
    graph=$(echo "$line" | tr -d '\r\n')
    curl "$sparqlEndpoint" \
         -H 'Accept:application/n-triples' \
         --data-urlencode "query=CONSTRUCT { ?s ?p ?o } WHERE { <http://www.bigdata.com/queryHints#Query> <http://www.bigdata.com/queryHints#analytic> \"true\" . <http://www.bigdata.com/queryHints#Query> <http://www.bigdata.com/queryHints#constructDistinctSPO> \"false\" . GRAPH $graph { ?s ?p ?o } }" \
         -o "${dataDir}/${i}.nt"
    (( i++ ))
done < <(tail -n +2 "$graphsFile")

echo "Number of named graphs:"
curl "$sparqlEndpoint" \
     -H 'Accept:text/csv' \
     --data-urlencode "query=SELECT (COUNT(DISTINCT ?g) AS ?count) { GRAPH ?g { ?s ?p ?o . }}"

echo "Number of triples in named graphs:"
curl "$sparqlEndpoint" \
     -H 'Accept:text/csv' \
     --data-urlencode "query=SELECT (COUNT(*) AS ?count) { GRAPH ?g { ?s ?p ?o . }}"

echo "Number of triples in the null graph:"
curl "$sparqlEndpoint" \
     -H 'Accept:text/csv' \
     --data-urlencode "query=SELECT (COUNT(*) AS ?count) { GRAPH <http://www.bigdata.com/rdf#nullGraph> { ?s ?p ?o . }}"
