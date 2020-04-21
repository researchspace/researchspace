//// <reference types="react" />

declare module ReactTreeMenuModule {

    interface ReactTreeviewComponentProps{
      key:any
      nodeLabel:any
      collapsed:boolean
      onClick:Function
    }
    interface ReactTreeviewComponentClass extends React.ComponentClass<ReactTreeviewComponentProps> { }


    interface ReactTreeviewComponent extends React.Component<ReactTreeviewComponentProps, {}> {

    }

}

declare module "react-treeview" {
    const ReactTreeviewComponent: ReactTreeMenuModule.ReactTreeviewComponentClass
    export = ReactTreeviewComponent
}
