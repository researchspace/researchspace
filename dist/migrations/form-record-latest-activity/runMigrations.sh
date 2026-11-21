#!/bin/bash
# Backfills the form record "last activity" marker. Run once after deploying the
# templates that read it (SystemActivityFrame, ActivityCardTemplate, system_activity/date).
set -e

sparqlEndpoint="${SPARQL_ENDPOINT:-http://localhost:10214/blazegraph/sparql}"
dir="$(cd "$(dirname "$0")" && pwd)"

echo "Before:"
curl "$sparqlEndpoint" --fail --show-error -s -H 'Accept: text/csv' --data-urlencode query@"$dir/check.sparql"
echo "Executing 1.sparql"
curl "$sparqlEndpoint" --fail --show-error -s --data-urlencode update@"$dir/1.sparql"
echo "After:"
curl "$sparqlEndpoint" --fail --show-error -s -H 'Accept: text/csv' --data-urlencode query@"$dir/check.sparql"
