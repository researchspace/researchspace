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

/**
 * Converting between what people type ("30 BC") and what is stored as xsd:gYear.
 *
 * STORAGE CONVENTION: historical numbering, i.e. the XSD 1.0 rules, with no year zero.
 *   30 BC  <->  "-0030"^^xsd:gYear
 *    1 BC  <->  "-0001"^^xsd:gYear
 *   AD 1   <->  "0001"^^xsd:gYear
 * "0000" is never written. Blazegraph (XSD 1.0) rejects it. QLever accepts it.
 * Ordering is correct on both stores.
 */

const BC = /^(bce|bc|b\.c\.e\.|b\.c\.|v\.?\s?chr\.?|av\.?\s?j\.?-?c\.?)$/i;
const AD = /^(ce|ad|a\.d\.|c\.e\.|n\.?\s?chr\.?)$/i;

/** Parses user input into a signed historical year (negative = BC), or undefined. */
export function parseHistoricalYear(input: string): number | undefined {
  const text = (input || '').trim().replace(/\s+/g, ' ');
  if (!text) {
    return undefined;
  }

  // 1) "30BC", "30 BC", "30 B.C.", "30 BCE", "AD 30", "30 AD", "30 CE"
  let m = text.match(/^(\d{1,9})\s?([a-z.\s-]+)$/i) || null;
  let year: number | undefined;
  if (m) {
    const n = parseInt(m[1], 10);
    const era = m[2].trim();
    if (BC.test(era)) {
      year = -n;
    } else if (AD.test(era)) {
      year = n;
    }
  } else if ((m = text.match(/^([a-z.]+)\s?(\d{1,9})$/i))) {
    if (AD.test(m[1])) {
      year = parseInt(m[2], 10);
    }
  } else if ((m = text.match(/^(-?)(\d{1,9})(Z|[+-]\d{2}:\d{2})?$/))) {
    // 2) A raw value such as "-30", "-0030" or "1886" (also what comes back from the store)
    year = parseInt(m[2], 10) * (m[1] ? -1 : 1);
  }

  if (year === undefined || year === 0 || !isFinite(year)) {
    return undefined; // there is no year 0 in historical numbering
  }
  return year;
}

/** Signed historical year -> xsd:gYear lexical form ("-0030", "0800", "12026"). */
export function toGYearLexical(year: number): string {
  let abs = String(Math.abs(year));
  while (abs.length < 4) {
    abs = '0' + abs; // tsconfig targets es2016, so no String.prototype.padStart
  }
  return (year < 0 ? '-' : '') + abs;
}

/** Stored xsd:gYear lexical form -> display string ("30 BC", "AD 30", "1886"). */
export function formatGYear(lexical: string, opts: { adBelow?: number } = {}): string {
  const year = parseHistoricalYear(lexical);
  if (year === undefined) {
    return lexical; // unknown or invalid: show it unchanged
  }
  if (year < 0) {
    return `${-year} BC`;
  }
  // Add "AD" to small years so "30" isn't confused with "30 BC". The threshold is configurable.
  const adBelow = opts.adBelow ?? 1000;
  return year < adBelow ? `AD ${year}` : String(year);
}
