/**
 * ResearchSpace
 * Copyright (C) 2025, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import * as React from 'react';
import { Component, CSSProperties } from 'react';
import * as classnames from 'classnames';

import * as styles from './ToggleSwitch.scss';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

interface State {
  checked: boolean;
}

export class ToggleSwitch extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      checked: this.props.checked,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.checked !== this.state.checked) {
      this.setState({ checked: nextProps.checked });
    }
  }

  handleChange = () => {
    if (this.props.disabled) {
      return;
    }
    const newChecked = !this.state.checked;
    this.setState({ checked: newChecked });
    this.props.onChange(newChecked);
  };

  render() {
    const { className, style, disabled } = this.props;
    const { checked } = this.state;

    const classes = classnames(styles.component, className, {
      [styles.checked]: checked,
      [styles.disabled]: disabled,
    });

    return (
      <div
        className={classes}
        style={style}
        onClick={this.handleChange}
      >
        <div className={styles.slider} />
      </div>
    );
  }
}

export default ToggleSwitch;
