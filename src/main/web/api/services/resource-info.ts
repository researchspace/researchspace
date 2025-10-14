import { LRUCache } from 'lru-cache';

import { get, post } from 'platform/api/http';
import { Rdf } from 'platform/api/rdf';


const lruCache = new LRUCache<string, {}>({ max: 1000 });

export function getResourceInfo(iri: Rdf.Iri, profile: string, preferredLanguage?: string, repository?: string, defaultGraphs?: Array<string>): Promise<{}> {
    const key = Rdf.hashString(iri.value + profile + preferredLanguage + repository).toString();
    const cached = lruCache.get(key);
    if (cached) {
        return Promise.resolve(cached);
    } else {
    const request = get('/rest/resource-info').query({ iri: iri.value, repository, profile, preferredLanguage }).accept('application/json');
    return request.then((res) => {
        lruCache.set(key, res.body);
        return res.body
      });
    }
}

export function getResourceInfoForKnowledgePatterns(
  iri: Rdf.Iri, kps: Array<Rdf.Iri>, preferredLanguage?: string, repository?: string, defaultGraphs?: Array<string>, cache?: boolean
): Promise<{}> {
    if (cache) {
        const key = Rdf.hashString(iri.value + kps.join('') + preferredLanguage + repository).toString();
        const cached = lruCache.get(key);
        if (cached) {
            return Promise.resolve(cached);
        } else {
            return fetchResourceInfoForKnowledgePatterns(iri, kps, preferredLanguage, repository, defaultGraphs).then((res) => {
                lruCache.set(key, res.body);
                return res.body
            });
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
