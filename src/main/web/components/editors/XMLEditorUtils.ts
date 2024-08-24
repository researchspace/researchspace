import fetch from 'node-fetch';

export const evaluateMultipleXPathsOnXml = (data: string, xpaths: string[]): Promise<any[]> => {
  const formData = new FormData();
  formData.append('data', new Blob([data], { type: 'application/xml' }));
  xpaths.forEach(xpath => formData.append('xpaths', xpath));

  return fetch('/rest/x3ml/evaluate-xpath', {
    method: 'POST',
    body: formData,
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to evaluate XPaths');
    }
    return response.json();
  });
};

export const getXPathFromPosition = (data: string, line: number, offset: number): Promise<string> => {
  const formData = new FormData();
  formData.append('data', new Blob([data], { type: 'application/xml' }));
  formData.append('line', line.toString());
  formData.append('offset', offset.toString());

  return fetch('/rest/x3ml/get-xpath', {
    method: 'POST',
    body: formData,
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to get XPath from position');
    }
    return response.text();
  });
};