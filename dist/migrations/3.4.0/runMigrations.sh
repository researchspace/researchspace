#!/bin/bash
set -e

# sparql endpoint
sparqlEndpoint="http://localhost:10214/blazegraph/sparql"

queriesFolder=./4.0.0-saturn

for filename in $queriesFolder/*.sparql; do
    [ -e "$filename" ] || continue
    echo "Executing $filename"
    curl $sparqlEndpoint --fail --show-error -v --data-urlencode update@$filename
done

echo "All migrations scripts were executed."
