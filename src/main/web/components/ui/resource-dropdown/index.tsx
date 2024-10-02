import * as React from 'react';
import { Dropdown } from 'react-bootstrap';
import Icon from '../../ui/icon/Icon';
import * as classnames from 'classnames';

interface State {
  customDropdownOpen: boolean;
  customDropdownTemplate?: any
}

interface Props {
  id: string;
  className?: string;
  toggleClassName?: string;
}

export class ResourceDropdown extends React.Component<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      customDropdownOpen: false,
    };
    this.onToggle = this.onToggle.bind(this); // Binding once in the constructor
  }

  onToggle(open: boolean) {
    this.setState({ customDropdownOpen: open });
  }

  onClick() {
    this.setState({ customDropdownOpen: false });
  }
 
  /* Prevent unnecessary re-renders by checking state and props */
  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return (
      nextProps.id !== this.props.id ||
      nextProps.className !== this.props.className ||
      nextProps.toggleClassName !== this.props.toggleClassName ||
      nextState.customDropdownOpen !== this.state.customDropdownOpen
    );
  }
 
  render() {
    const {id, className, toggleClassName, children} = this.props
    return (
      <Dropdown id={id} className={className} pullRight onToggle={this.onToggle}>
        <Dropdown.Toggle className={toggleClassName}>
          <Icon iconType='rounded' iconName='more_vert' symbol />
        </Dropdown.Toggle>
        {this.state.customDropdownOpen ? children : <Dropdown.Menu></Dropdown.Menu>}
      </Dropdown>)
  } 
}

export default ResourceDropdown