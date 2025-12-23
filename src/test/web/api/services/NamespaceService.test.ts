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

  it('should resolve custom namespace correctly', () => {
     const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
     };
     nsService.init(prefixes);
     
     const iri = nsService.resolveToIRI(DUMMY_IRI1_AS_PREFIXED_IRI);
     assert.isTrue(iri.isJust);
     assert.equal(iri.get().value, DUMMY_IRI1);
  });

  it('should resolve prefixed IRI with colon in local name', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    const iri = nsService.resolveToIRI("myns1:skos:Concept");
    assert.isTrue(iri.isJust, 'Should resolve IRI');
    assert.equal(iri.get().value, "http://myns1.example.com/skos:Concept");
  });

  it('should fail resolution when prefix is undefined', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    const iri = nsService.resolveToIRI("unknownNs:myTest");
    assert.isTrue(iri.isNothing);
  });

  it('should get prefixed IRI from full IRI', () => {
    const prefixes = {
       [DUMMY_PREFIX1]: DUMMY_NAMESPACE1
    };
    nsService.init(prefixes);

    // Mocking Rdf.Iri structure if we can't instantiate it easily, 
    // but assuming Rdf.iri() factory is available via import or we use compatible object.
    // However, since we import Rdf from platform/api/rdf, we might need a real instance or mock.
    // In unit tests, we often rely on the real implementation if it's a value object.
    // But `platform/api/rdf` is an alias.
    // Let's try using a simple object with .value property first as strict typing might not be enforced in runtime tests.
    // But this is TS.
    // Let's assume Rdf.iri(string) works if Rdf is available.
    // If not, we might need to cast.
    
    // For now, let's use Rdf.iri if available.
    const iri = Rdf.iri(DUMMY_IRI1);
    const prefixed = nsService.getPrefixedIRI(iri);
    assert.isTrue(prefixed.isJust);
    assert.equal(prefixed.get(), DUMMY_IRI1_AS_PREFIXED_IRI);
  });

  it('should resolve full IRI enclosed in angle brackets', () => {
      const fullIRI = '<http://example.com/something>';
      const result = nsService.resolveToIRI(fullIRI);
      assert.isTrue(result.isJust);
      assert.equal(result.get().value, 'http://example.com/something');
  });
  
  it('should resolve default namespace when no prefix is present', () => {
      const prefixes = {
        '': 'http://default.example.com/'
      };
      nsService.init(prefixes);
      
      const result = nsService.resolveToIRI('localName');
      assert.isTrue(result.isJust);
      assert.equal(result.get().value, 'http://default.example.com/localName');
  });

  it('should fallback to Default namespace if empty prefix is not set', () => {
      const prefixes = {
        'Default': 'http://default.example.com/'
      };
      nsService.init(prefixes);
      
      const result = nsService.resolveToIRI('localName');
      assert.isTrue(result.isJust);
      assert.equal(result.get().value, 'http://default.example.com/localName');
  });

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
});
