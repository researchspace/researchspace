/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import { expect } from 'chai';

import { Rdf, XsdDataTypeValidation } from 'platform/api/rdf';

const {
  parseXsdDatatype,
  validate,
  sameXsdDatatype,
  equal,
  datatypeEqual,
  datatypeToString,
} = XsdDataTypeValidation;

const SHORT_STRING = 'xsd:string';
const RDF_SHORT_FORM = 'rdf:langString';
const FULL_FORM = 'http://www.w3.org/2001/XMLSchema#string';
const RDF_FULL_FORM = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
const VALID_RESPONSE = { success: true };

describe('XsdDatatypeValidation', () => {
  describe('parseXsdDatatype', () => {
    it('should parse string in full form', () => {
      expect(parseXsdDatatype(FULL_FORM)).to.be.eql(<XsdDataTypeValidation.Datatype>{
        iri: Rdf.iri(FULL_FORM),
        prefix: 'xsd',
        localName: 'string',
      });
    });

    it('should parse datatype namespace', () => {
      const DATATYPE = 'http://www.w3.org/2001/XMLSchema-datatypes#string';

      expect(
        parseXsdDatatype(DATATYPE)
      ).to.be.eql(<XsdDataTypeValidation.Datatype>{
        iri: Rdf.iri(DATATYPE),
        prefix: 'xsd',
        localName: 'string',
      });
    });

    it('should parse string in short form for rdf', () => {
      expect(
        parseXsdDatatype(RDF_FULL_FORM)
      ).to.be.eql(<XsdDataTypeValidation.Datatype>{
        iri: Rdf.iri(RDF_FULL_FORM),
        prefix: 'rdf',
        localName: 'langString',
      });
    });

    it('should parse string in short form for xsd', () => {
      expect(parseXsdDatatype(SHORT_STRING)).to.be.eql(<XsdDataTypeValidation.Datatype>{
        iri: Rdf.iri(FULL_FORM),
        prefix: 'xsd',
        localName: 'string',
      });
    });

    it('should parse string in short form for rdf', () => {
      expect(parseXsdDatatype(RDF_SHORT_FORM)).to.be.eql(<XsdDataTypeValidation.Datatype>{
        iri: Rdf.iri(RDF_FULL_FORM),
        prefix: 'rdf',
        localName: 'langString',
      });
    });

    it('should parse Rdf.iri in full form ', () => {
      expect(parseXsdDatatype(Rdf.iri(FULL_FORM))).to.be.eql(<XsdDataTypeValidation.Datatype>{
        iri: Rdf.iri(FULL_FORM),
        prefix: 'xsd',
        localName: 'string',
      });
    });

    it('should parse Rdf.iri in short form', () => {
      expect(parseXsdDatatype(Rdf.iri(SHORT_STRING))).to.be.undefined;
    });

    it('should return undefined when datatype is invalid', () => {
      expect(parseXsdDatatype('')).to.be.undefined;
    });
  });

  describe('validate', () => {
    it('should return success when datatype is valid', () => {
      expect(validate(Rdf.literal(SHORT_STRING))).to.be.eql(VALID_RESPONSE);
    });
  });

  describe('sameXsdDatatype', () => {
    it('should return true for same datatypes', () => {
      expect(sameXsdDatatype(Rdf.iri(SHORT_STRING), Rdf.iri(SHORT_STRING))).to.be.true;
    });

    it('should return false for different datatypes', () => {
      expect(sameXsdDatatype(Rdf.iri(SHORT_STRING), Rdf.iri('xsd:date'))).to.be.false;
    });
  });

  describe('equal', () => {
    it('should return true for same datatypes', () => {
      expect(equal(
        Rdf.literal(SHORT_STRING), Rdf.literal(SHORT_STRING))
      ).to.be.eql({ success: true });
    });

    it('should return error for different datatypes', () => {
      expect(
        equal(Rdf.literal(SHORT_STRING), Rdf.literal('xsd:date'))
      ).to.be.eql(<XsdDataTypeValidation.ValidationResult>{
        success: false,
        message: 'Invalid value, expected is [xsd:string]',
        child: <XsdDataTypeValidation.Datatype>{
          iri: Rdf.iri(FULL_FORM),
          prefix: 'xsd',
          localName: 'string',
        },
        errorPart: 'xsd:date',
      });
    });
  });

  describe('datatypeEqual', () => {
    describe('for string', () => {
      const datatype: XsdDataTypeValidation.Datatype = {
        iri: Rdf.iri(FULL_FORM),
        prefix: 'xsd',
        localName: 'string',
      };

      it('should return true for for same values', () => {
        expect(
          datatypeEqual(datatype, 'true', 'true')
        ).to.be.eql(
          VALID_RESPONSE
          );
      });

      it('should return false for for different values', () => {
        expect(datatypeEqual(datatype, 'true', '')).to.be.eql(<XsdDataTypeValidation.ValidationResult>{
          child: <XsdDataTypeValidation.Datatype>{
            iri: Rdf.iri(FULL_FORM),
            prefix: 'xsd',
            localName: 'string',
          },
          success: false,
          message: 'Invalid value, expected is [true]',
          errorPart: '',
        });
      });
    });
  });

  describe('datatypeToString', () => {
    it('should return string', () => {
      expect(
        datatypeToString(Rdf.iri(FULL_FORM))
      ).to.be.eql(
        SHORT_STRING
      );
    });
  });
});
