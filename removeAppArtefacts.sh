#!/bin/bash

APPS=src/main/resources/org/researchspace/apps

mv $APPS/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2F*.html .discard/
mv $APPS/default/data/templates/Template%3Ahttp%3A%2F%2Fwww.researchspace.org%2Fresource%2F*.html .discard/
mv $APPS/default/ldp/assets/*.* .discard/