declare module 'html-to-react' {
  import * as React from 'react';

  type NodeType = 'text' | 'tag' | 'script' | 'comment';

  interface Node {
    name?: string
    data: string
    type: NodeType
    attribs?: { [key:string]: string }
    parent: Node
    children?: Node[]
  }

  type ProcessNode = (
    node: Node, children: Array<React.ReactElement<any>>, index?: number
  ) => Promise<React.ReactElement<any> | Array<React.ReactElement<any>>>
  interface Instruction {
    shouldProcessNode(node: Node): boolean;
    processNode: ProcessNode;
  }

  interface Options {
    recognizeCDATA?: boolean
  }

  class Parser {
    constructor(react: any, options?: Options);
    parse(html: string): React.ReactElement<any>;
    parseWithInstructions(
      html: string, isValidNode: (node: Node) => boolean, instructions: Array<Instruction>
    ): Promise<React.ReactElement<any>>;
  }

  class ProcessNodeDefinitions {
    constructor(react: any)
    processDefaultNode: ProcessNode
  }
}
