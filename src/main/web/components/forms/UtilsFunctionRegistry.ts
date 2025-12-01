import { getObservedEntity, getPrimaryAppellation } from "platform/api/services/resource-util";

export const UtilsFunctionRegistry = {      
    primaryAppellation: getPrimaryAppellation,
    observedEntity: getObservedEntity,
};


export async function callFunctionsAndBuildJson(keys, functionRegistry, iri) {
  // Check for invalid keys
  for (const key of keys) {
    if (typeof functionRegistry[key] !== 'function') {
      throw new Error(`No async function registered for key: "${key}"`);
    }
  }

  // Call all functions in parallel
  const promises = keys.map(key => functionRegistry[key](iri));

  // Await all results
  const results = await Promise.all(promises);

  // Construct output object
  const output = keys.reduce((obj, key, i) => {
    obj[key] = results[i];
    return obj;
  }, {});

  return output;
}