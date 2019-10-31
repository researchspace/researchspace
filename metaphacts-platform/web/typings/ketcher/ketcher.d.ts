declare module 'ketcher/dist/ketcher' {  
  interface ketcherui{
    (el:any,option:{})
  }
  interface molfile{
    stringify(obj:{},options:{}) : string
  }

  interface smiles{
    stringify(obj:{},options:{}) : string
  }
  const ketcherui : ketcherui;
  const molfile : molfile;
  const smiles:smiles;
  export {ketcherui, molfile,smiles};
}