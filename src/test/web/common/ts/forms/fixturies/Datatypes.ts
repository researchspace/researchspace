/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

interface DataTypeSuit {
  datatype: string;
  values: {
    valid: Array<string | boolean>;
    invalid: Array<string | boolean>;
  };
  invalidMessage: string;
}

export const DATATYPES_FIXTURIES: DataTypeSuit[] = [
  {
    datatype: 'xsd:boolean',
    values: {
      valid: ['true', 'false'],
      invalid: ['testValue', '123'],
    },
    invalidMessage: 'Invalid xsd:boolean',
  },
  {
    datatype: 'xsd:decimal',
    values: {
      valid: ['123.456', '+1234.456', '-1234.456', '-.456', '-456'],
      invalid: ['1 234.456', '1234.456E+2', '+ 1234.456', '+1,234.456'],
    },
    invalidMessage: 'Invalid xsd:decimal',
  },
  {
    datatype: 'xsd:integer',
    values: {
      valid: ['1', '-123456789012345678901234567890', '2147483647', '0', '-0000000000000000000005'],
      invalid: ['1.', '2.6', 'A'],
    },
    invalidMessage: 'Invalid xsd:integer',
  },
  {
    datatype: 'xsd:double',
    values: {
      valid: ['123.456', '+1234.456', '-1.2344e56', '-.45E-6', 'INF', '-INF', 'NaN'],
      invalid: ['1E+2.5', '+INF', 'NAN'],
    },
    invalidMessage: 'Invalid xsd:double',
  },
  {
    datatype: 'xsd:float',
    values: {
      valid: ['123.456', '+1234.456', '-1.2344e56', '-.45E-6', 'INF', '-INF', 'NaN'],
      invalid: ['1E+2.5', '+INF', 'NAN'],
    },
    invalidMessage: 'Invalid xsd:float',
  },
  {
    datatype: 'xsd:date',
    values: {
      valid: ['2001-10-26', '2001-10-26+02:00', '2001-10-26Z', '2001-10-26+00:00', '-2001-10-26', '-20000-04-01'],
      invalid: ['A', '1'],
    },
    invalidMessage: 'Invalid xsd:date',
  },
  {
    datatype: 'xsd:time',
    values: {
      valid: ['21:32:52', '21:32:52+02:00', '19:32:52Z', '19:32:52+00:00', '21:32:52.12679'],
      invalid: ['-10:00:00', '1:20:10'],
    },
    invalidMessage: 'Invalid xsd:time',
  },
  {
    datatype: 'xsd:dateTime',
    values: {
      valid: [
        '2001-10-26T21:32:52',
        '2001-10-26T21:32:52+02:00',
        '2001-10-26T19:32:52Z',
        '2001-10-26T19:32:52+00:00',
        '-2001-10-26T21:32:52',
        '2001-10-26T21:32:52.12679',
      ],
      invalid: ['2001-10-26T21:32', '2001-10-26'],
    },
    invalidMessage: 'Invalid xsd:dateTime',
  },
  {
    datatype: 'xsd:gYear',
    values: {
      valid: ['2001', '2001+02:00', '2001Z', '2001+00:00', '-2001', '-20000'],
      invalid: ['01', '2001-12'],
    },
    invalidMessage: 'Invalid xsd:gYear',
  },
  {
    datatype: 'xsd:gMonth',
    values: {
      valid: ['--05', '--11Z', '--11+02:00', '--11-04:00', '--02'],
      invalid: ['--1', '01'],
    },
    invalidMessage: 'Invalid xsd:gMonth',
  },
  {
    datatype: 'xsd:gDay',
    values: {
      valid: ['---01', '---01Z', '---01+02:00', '---01-04:00', '---15', '---31'],
      invalid: ['---5', '15'],
    },
    invalidMessage: 'Invalid xsd:gDay',
  },
  {
    datatype: 'xsd:gYearMonth',
    values: {
      valid: ['2001-10', '2001-10+02:00', '2001-10Z', '2001-10+00:00', '-2001-10', '-20000-04'],
      invalid: ['2001', '2001-13-26+02:00', '01-10'],
    },
    invalidMessage: 'Invalid xsd:gYearMonth',
  },
  {
    datatype: 'xsd:gMonthDay',
    values: {
      valid: ['--05-01', '--11-01Z', '--11-01+02:00', '--11-01-04:00', '--11-15', '--02-29'],
      invalid: ['-01-30-', '--1-5', '01-15'],
    },
    invalidMessage: 'Invalid xsd:gMonthDay',
  },
  {
    datatype: 'xsd:duration',
    values: {
      valid: ['PT1004199059S', 'PT130S', 'PT2M10S', 'P1DT2S', '-P1Y', 'P1Y2M3DT5H20M30.123S'],
      invalid: ['1Y', 'P1S', 'P-1Y', 'P1M2Y', 'P1Y-1M'],
    },
    invalidMessage: 'Invalid xsd:duration',
  },
  {
    datatype: 'xsd:byte',
    values: {
      valid: ['27', '-34', '+105', '0'],
      invalid: ['0A'],
    },
    invalidMessage: 'Invalid xsd:byte',
  },
  {
    datatype: 'xsd:short',
    values: {
      valid: ['-32768', '-0000000000000000000005', '32767'],
      invalid: ['1Y'],
    },
    invalidMessage: 'Invalid xsd:short',
  },
  {
    datatype: 'xsd:int',
    values: {
      valid: ['-2147483648', '0', '-0000000000000000000005', '2147483647'],
      invalid: ['-2147483649'],
    },
    invalidMessage: 'Integer value is too small, minimum is -2147483648 for datatype xsd:int',
  },
  {
    datatype: 'xsd:long',
    values: {
      valid: ['-9223372036854775808', '0', '-0000000000000000000005', '9223372036854775807'],
      invalid: ['922337203685477580852'],
    },
    invalidMessage: 'Integer value is too big, maximum is 9223372036854776000 for datatype xsd:long',
  },
  {
    datatype: 'xsd:unsignedLong',
    values: {
      valid: ['18446744073709551615', '0', '+0000000000000000000005'],
      invalid: ['A'],
    },
    invalidMessage: 'Invalid xsd:unsignedLong',
  },
  {
    datatype: 'xsd:unsignedShort',
    values: {
      valid: ['65535', '0', '+0000000000000000000005', '1'],
      invalid: ['A'],
    },
    invalidMessage: 'Invalid xsd:unsignedShort',
  },
  {
    datatype: 'xsd:unsignedInt',
    values: {
      valid: ['4294967295', '0', '+0000000000000000000005', '1'],
      invalid: ['A'],
    },
    invalidMessage: 'Invalid xsd:unsignedInt',
  },
  {
    datatype: 'xsd:unsignedByte',
    values: {
      valid: ['255', '0', '+0000000000000000000005', '1'],
      invalid: ['A'],
    },
    invalidMessage: 'Invalid xsd:unsignedByte',
  },
  {
    datatype: 'xsd:positiveInteger',
    values: {
      valid: ['123456789012345678901234567890', '1', '0000000000000000000005'],
      invalid: ['0', '-1'],
    },
    invalidMessage: 'Integer value is too small, minimum is 1 for datatype xsd:positiveInteger',
  },
  {
    datatype: 'xsd:nonPositiveInteger',
    values: {
      valid: ['-123456789012345678901234567890', '0', '-0000000000000000000005', '-2147483647'],
      invalid: ['1'],
    },
    invalidMessage: 'Integer value is too big, maximum is 0 for datatype xsd:nonPositiveInteger',
  },
  {
    datatype: 'xsd:negativeInteger',
    values: {
      valid: ['-123456789012345678901234567890', '-1', '-0000000000000000000005'],
      invalid: ['0'],
    },
    invalidMessage: 'Integer value is too big, maximum is -1 for datatype xsd:negativeInteger',
  },
  {
    datatype: 'xsd:nonNegativeInteger',
    values: {
      valid: ['+123456789012345678901234567890', '0', '0000000000000000000005', '2147483647'],
      invalid: ['-1'],
    },
    invalidMessage: 'Integer value is too small, minimum is 0 for datatype xsd:nonNegativeInteger',
  },
  {
    datatype: 'xsd:hexBinary',
    values: {
      valid: ['3f3c6d78206c657673726f693d6e3122302e20226e656f636964676e223d54552d4622383e3f'],
      invalid: ['-1'],
    },
    invalidMessage: 'Invalid xsd:hexBinary',
  },
  {
    datatype: 'xsd:anyURI',
    values: {
      valid: [
        'http://data.com',
        'http://data.com/bar#foo',
        'urn:example:org',
        'mailto:info@data.com',
        'http://www.researchspace.org/resource/test34a7e382-2a7e-4334-b3d1-5a6426c2e5e4/test',
      ],
      invalid: ['http://data.com#foo#foo', 'http://data.com#f% foo'],
    },
    invalidMessage: 'Invalid xsd:anyURI',
  },
  {
    datatype: 'xsd:language',
    values: {
      valid: ['en', 'en-US', 'fr', 'fr-FR'],
      invalid: ['-1'],
    },
    invalidMessage: 'Invalid xsd:language',
  },
  {
    datatype: 'xsd:normalizedString',
    values: {
      valid: [' Being a Dog Is a Full-Time Job '],
      invalid: [
        `
        Being a Dog Is
        a Full-Time Job
        `,
      ],
    },
    invalidMessage: 'Invalid xsd:normalizedString',
  },
  {
    datatype: 'xsd:token',
    values: {
      valid: ['Being a Dog Is a Full-Time Job'],
      invalid: [
        `
        <title lang="en">
          Being a Dog Is
          a Full-Time Job
        </title>
        `,
      ],
    },
    invalidMessage: 'Invalid xsd:token',
  },
];

export default DATATYPES_FIXTURIES;
