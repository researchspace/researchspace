export interface XPathResultItem {
    xpath: string;
    text: string;
    nodeName?: string;
    startLine?: number;
    startOffset?: number;
    endLine?: number;
    endOffset?: number;
    absoluteXPath?: string;
    resultType?: string;
  }
  
  export const evaluateMultipleXPathsOnXml = async (xmlContent: string, xpaths: string[]): Promise<XPathResultItem[]> => {
    const formData = new FormData();
    formData.append('data', new Blob([xmlContent], { type: 'application/xml' }));
    xpaths.forEach(xpath => formData.append('xpaths', xpath));
  
    const response = await fetch('/rest/x3ml/evaluate-xpath', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Failed to evaluate xpaths: ${response.statusText}`);
    }
    return await response.json();
  };
  
  export const calculateXPathFromPosition = async (xmlContent: string, position: { line: number, offset: number }): Promise<string> => {
    const formData = new FormData();
    formData.append('data', new Blob([xmlContent], { type: 'application/xml' }));
    formData.append('line', `${position.line}`);
    formData.append('offset', `${position.offset}`);
  
    const response = await fetch('/rest/x3ml/get-xpath', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Failed to get xpath from position: ${response.statusText}`);
    }
    return await response.text();
  };
  