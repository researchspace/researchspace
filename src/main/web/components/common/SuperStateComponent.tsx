import * as React from 'react';
import { List } from 'immutable';

interface ContextType {
  sharedStates: { [componentId: string]: { [stateName: string]: any } };
  registerSharedStates: (componentId: string, sharedStates: List<string>) => void;
  updateSharedState: (componentId: string, stateName: string, value: any) => void;
}

const SharedStateContext = React.createContext<ContextType | undefined>(undefined);

interface SuperStateComponentProps {
  children: React.ReactNode;
}

class SuperStateComponent extends React.Component<SuperStateComponentProps, ContextType> {
  constructor(props: SuperStateComponentProps) {
    super(props);

    const params = new URLSearchParams(window.location.search);
    let state: { [componentId: string]: { [stateName: string]: any } } = {};
    params.forEach((value, key) => {
      const [componentId, stateName] = key.split('.');
      if (!state[componentId]) {
        state[componentId] = {};
      }
      state[componentId][stateName] = value;
    });

    this.state = {
      sharedStates: state,
      registerSharedStates: this.registerSharedStates,
      updateSharedState: this.updateSharedState,
    };
  }

  registerSharedStates = (componentId: string, sharedStates: List<string>) => {
    this.setState((prevState) => {
      let componentStates = prevState.sharedStates[componentId] || {};
      sharedStates.forEach((stateName) => {
        if (!componentStates.hasOwnProperty(stateName)) {
          componentStates[stateName] = undefined;
        }
      });
      return {
        sharedStates: {
          ...prevState.sharedStates,
          [componentId]: componentStates,
        },
      };
    });
  };

  updateSharedState = (componentId: string, stateName: string, value: any) => {
    this.setState((prevState) => ({
      sharedStates: {
        ...prevState.sharedStates,
        [componentId]: {
          ...prevState.sharedStates[componentId],
          [stateName]: value,
        },
      },
    }));
  };

  componentDidUpdate(_, prevState: ContextType) {
    if (prevState.sharedStates !== this.state.sharedStates) {
      const params = new URLSearchParams();
      for (const componentId in this.state.sharedStates) {
        for (const stateName in this.state.sharedStates[componentId]) {
          const key = `${componentId}.${stateName}`;
          params.set(key, this.state.sharedStates[componentId][stateName]);
        }
      }
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }
  }

  render() {
    return (
      <SharedStateContext.Provider value={this.state}>
        {this.props.children}
      </SharedStateContext.Provider>
    );
  }
}

export default SuperStateComponent;
export { SharedStateContext };
