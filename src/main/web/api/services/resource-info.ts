import * as Basil from 'basil.js';

import { get, post } from 'platform/api/http';
import { Rdf } from 'platform/api/rdf';


const storage = new Basil({
    storages: ['local', 'memory'],
    namespace: 'rs-resource-info',
});
// probably we can have smarter cache reset, but for now we just reset the cache essentially on page reload
storage.reset();

export function getResourceInfo(iri: Rdf.Iri, profile: string, preferredLanguage?: string, repository?: string, defaultGraphs?: Array<string>): Promise<{}> {
    const key = Rdf.hashString(iri.value + profile + preferredLanguage + repository);
    const cached = storage.get(key);
    if (cached) {
        return Promise.resolve(JSON.parse(cached));
    } else {
    const request = get('/rest/resource-info').query({ iri: iri.value, repository, profile, preferredLanguage }).accept('application/json');
    return request.then((res) => {
        storage.set(key, res.text);
        return res.body
      });
    }
}

export function getResourceInfoForKnowledgePatterns(
  iri: Rdf.Iri, kps: Array<Rdf.Iri>, preferredLanguage?: string, repository?: string, defaultGraphs?: Array<string>, cache?: boolean
): Promise<{}> {
    if (cache) {
        const key = Rdf.hashString(iri.value + kps.join('') + preferredLanguage + repository);
        const cached = storage.get(key);
        if (cached) {
            return Promise.resolve(JSON.parse(cached));
        } else {
            fetchResourceInfoForKnowledgePatterns(iri, kps, preferredLanguage, repository, defaultGraphs).then((res) => {
                storage.set(key, res.text);
                return res.body
            })
        }
    } else {
        return fetchResourceInfoForKnowledgePatterns(iri, kps, preferredLanguage, repository, defaultGraphs).then((res) => res.body);
    }
}

function fetchResourceInfoForKnowledgePatterns(iri: Rdf.Iri, kps: Array<Rdf.Iri>, 
    preferredLanguage?: string, repository?: string, defaultGraphs?: Array<string>) {
        
  const request = 
    post('/rest/resource-info')
      .query({ iri: iri.value, repository, preferredLanguage, defaultGraphs })
      .set('Content-Type', 'application/json')
      .send(kps.map(kp => kp.value))
      .accept('application/json');

    return request;
}