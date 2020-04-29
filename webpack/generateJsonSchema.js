/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// script that can be used to generate JSON Schemas used in the documentation
//
// by default typescript-json-schema can generate schema only for a single type,
// which is quite slow because it needs to initialize typescript server for each invocation.
// Instead we create it only once and then go through the list of types for which we
// need schema, generate it and store into the file
//
// inspired by https://github.com/YousefED/typescript-json-schema/blob/v0.42.0/typescript-json-schema.ts#L1331


const tjs = require('typescript-json-schema');
const defaults = require('./defaults')();
const fs = require('fs');
const path = require('path');
const stringify = require('json-stable-stringify');

const args = {
    ...tjs.getDefaultArgs(),
    required: true,
    propOrder: true
};

const program = tjs.programFromConfig('tsconfig.json');
const base = path.join(__dirname, '../src/main/web/schemas');

defaults.PROJECT.jsonSchemTypes.forEach(
    t => {
        console.log('Generateing JSON Schema for: ' + t);
        const definition = tjs.generateSchema(program, t, args);
        if (definition === null) {
            throw new Error(`Can't generae JSON Schema for ${t}, make sure that there are no typescript compilation errors`);
        }

        const json = stringify(definition, {space: 4}) + "\n\n";
        fs.writeFileSync(path.join(base, t + '.json'), json);
    }
);

//./node_modules/.bin/typescript-json-schema tsconfig.json OntodiaConfig --out ./src/main/web/schemas/OntodiaConfig.json --required --propOrder true


