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
}

const CLASS_NAME='dropdown-no-caret'

export class ResourceDropdown extends React.Component<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      customDropdownOpen: false,
    };
  }

  onToggle = (open: boolean) => {
    this.setState({customDropdownOpen: open})
  }

  render() {
    const {id, className, children} = this.props
    return (
      <Dropdown id={id} className={classnames(CLASS_NAME, className)} pullRight onToggle={this.onToggle}>
        <Dropdown.Toggle>
          <Icon iconType='round' iconName='more_vert' />
        </Dropdown.Toggle>
        {this.state.customDropdownOpen ? children : <Dropdown.Menu></Dropdown.Menu>}
      </Dropdown>)
  }
  
}

export default ResourceDropdown