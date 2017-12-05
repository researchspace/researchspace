///<reference types="react" />

declare module ReactListModule {
  interface ReactListProps {
    elementHeight: number
    containerHeight: number
  }
  
  interface ReactListComponent extends React.ComponentClass<ReactListProps> {}
}

declare module "react-infinite" {
  var ReactListCom: ReactListModule.ReactListComponent;
  export = ReactListCom
}
