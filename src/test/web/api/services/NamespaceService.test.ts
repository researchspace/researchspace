import { assert } from 'chai';
import { NamespaceService } from 'platform/api/services/NamespaceService';
import * as Maybe from 'data.maybe';
import { Rdf } from 'platform/api/rdf';

describe('NamespaceService', () => {
  let nsService: NamespaceService;

  beforeEach(() => {
    nsService = new NamespaceService();
  });

  const DUMMY_PREFIX1 = "myns1";
  const DUMMY_NAMESPACE1 = "http://myns1.example.com/";
  const DUMMY_IRI1 = "http://myns1.example.com/abc";
  const DUMMY_IRI1_AS_PREFIXED_IRI = DUMMY_PREFIX1 + ":abc";

  // Test that system namespaces (like User, Platform) are correctly resolved when no custom prefixes are provided or when they are part of the init.
  // Expects 'User:Michael' to resolve to the full system IRI.
  it('should resolve system namespaces correctly', () => {
    const prefixes = {
      '': 'http://www.researchspace.org/resource/',
      'Default': 'http://www.researchspace.org/resource/',
      'User': 'http://www.researchspace.org/resource/user/',
      'Platform': 'http://www.researchspace.org/resource/system/',
      'Help': 'http://help.researchspace.org/resource/',
      'Admin': 'http://www.researchspace.org/resource/admin/'
    };
    nsService.init(prefixes);

    const iri = nsService.resolveToIRI('User:Michael');
    assert.isTrue(iri.isJust);
    assert.equal(iri.get().value, 'http://www.researchspace.org/resource/user/Michael');
  });

  // Test that a custom namespace provided in init is correctly used to resolve a prefixed IRI.
  // Expects 'myns1:abc' to resolve to 'http://myns1.example.com/abc'.
  it('should resolve custom namespace correctly', () => {
     const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
     };
     nsService.init(prefixes);
     
     const iri = nsService.resolveToIRI(DUMMY_IRI1_AS_PREFIXED_IRI);
     assert.isTrue(iri.isJust);
     assert.equal(iri.get().value, DUMMY_IRI1);
  });

  // Test that a prefixed IRI where the local part contains a colon is correctly resolved.
  // This validates that resolveToIRI splits only on the first colon.
  // Expects 'myns1:skos:Concept' to resolve to 'http://myns1.example.com/skos:Concept'.
  it('should resolve prefixed IRI with colon in local name', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    const iri = nsService.resolveToIRI("myns1:skos:Concept");
    assert.isTrue(iri.isJust, 'Should resolve IRI');
    assert.equal(iri.get().value, "http://myns1.example.com/skos:Concept");
  });

  // Test that resolution fails if the prefix used is not defined in the prefix map.
  // Expects 'unknownNs:myTest' to result in Nothing.
  it('should fail resolution when prefix is undefined', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    const iri = nsService.resolveToIRI("unknownNs:myTest");
    assert.isTrue(iri.isNothing);
  });

  // Test that a full IRI can be compacted into a prefixed IRI using the defined namespaces.
  // Expects 'http://myns1.example.com/abc' to be compacted to 'myns1:abc'.
  it('should get prefixed IRI from full IRI', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    // Mocking Rdf.Iri structure if we can't instantiate it easily, 
    // but assuming Rdf.iri() factory is available via import or we use compatible object.
    const iri = Rdf.iri(DUMMY_IRI1);
    const prefixed = nsService.getPrefixedIRI(iri);
    assert.isTrue(prefixed.isJust);
    assert.equal(prefixed.get(), DUMMY_IRI1_AS_PREFIXED_IRI);
  });

  // Test that passing a full IRI enclosed in angle brackets to resolveToIRI strips the brackets and returns the IRI as is.
  // Expects '<http://example.com/something>' to resolve to 'http://example.com/something'.
  it('should resolve full IRI enclosed in angle brackets', () => {
      const fullIRI = '<http://example.com/something>';
      const result = nsService.resolveToIRI(fullIRI);
      assert.isTrue(result.isJust);
      assert.equal(result.get().value, 'http://example.com/something');
  });
  
  // Test that an unqualified name (no prefix) resolves using the empty string ('') namespace if defined.
  // Expects 'localName' to resolve using the default namespace.
  it('should resolve default namespace when no prefix is present', () => {
      const prefixes = {
        '': 'http://default.example.com/'
      };
      nsService.init(prefixes);
      
      const result = nsService.resolveToIRI('localName');
      assert.isTrue(result.isJust);
      assert.equal(result.get().value, 'http://default.example.com/localName');
  });

  // Test fallback to 'Default' namespace key if the empty string key is not present.
  // Expects 'localName' to resolve using the 'Default' namespace.
  it('should fallback to Default namespace if empty prefix is not set', () => {
      const prefixes = {
        'Default': 'http://default.example.com/'
      };
      nsService.init(prefixes);
      
      const result = nsService.resolveToIRI('localName');
      assert.isTrue(result.isJust);
      assert.equal(result.get().value, 'http://default.example.com/localName');
  });

  // Test that validation prevents resolving IRIs with invalid characters ('/' or '#') in the local part of a prefixed name.
  // This ensures we don't accidentally create malformed IRIs.
  it('should fail resolution when local name contains invalid characters', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    // / in local name
    const iri1 = nsService.resolveToIRI("myns1:abc/def");
    assert.isTrue(iri1.isNothing);

    // # in local name
    const iri2 = nsService.resolveToIRI("myns1:abc#def");
    assert.isTrue(iri2.isNothing);
  });

  // Test handling of 'Template:' prefix which is special. It should be preserved or handled specifically.
  // Expects 'Template:myns1:templateTest' to resolve with the template prefix preserved and the inner part resolved.
  it('should resolve Template prefixed IRIs', () => {
     const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
     };
     nsService.init(prefixes);
     
     // Template + Prefixed IRI
     const iri1 = nsService.resolveToIRI("Template:" + DUMMY_PREFIX1 + ":templateTest");
     assert.isTrue(iri1.isJust);
     assert.equal(iri1.get().value, "Template:" + DUMMY_NAMESPACE1 + "templateTest");

     // Template + Full IRI
     const iri2 = nsService.resolveToIRI("Template:" + DUMMY_NAMESPACE1 + "templateTest");
     assert.isTrue(iri2.isJust);
     assert.equal(iri2.get().value, "Template:" + DUMMY_NAMESPACE1 + "templateTest");
  });

  // Test that getPrefixedIRI can handle local parts containing colons (or other chars allowed in resolveToIRI).
  // This ensures symmetry between resolveToIRI and getPrefixedIRI.
  // Expects 'http://myns1.example.com/foo:bar' to compact to 'myns1:foo:bar'.
  it('should get prefixed IRI with colon in local name', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    const iri = Rdf.iri("http://myns1.example.com/foo:bar");
    const prefixed = nsService.getPrefixedIRI(iri);
    assert.isTrue(prefixed.isJust);
    assert.equal(prefixed.get(), "myns1:foo:bar");
  });
});
