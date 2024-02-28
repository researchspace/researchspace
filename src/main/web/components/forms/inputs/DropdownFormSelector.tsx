import * as React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import { AtomicValueInputProps } from './SingleValueInput';
import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { Rdf } from 'platform/api/rdf';

type formData = {
  label?: string,
  nestedForm?: string  
}

export interface Props extends AtomicValueInputProps {
  formsData?: formData[];
}

type State =  {
  nestedForm?: React.ReactElement<any>;
  nestedFormOpen?: boolean;
  activeForm?: string;
}

export class RsDropdownFormSelector extends React.Component<Props, State> {

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = { nestedFormOpen: false, activeForm: null, nestedForm: null };
  }

  render() {
    // const a = FieldValue.isEmpty(this.props.value) ? null : this.props.value.value as Rdf.Iri
    return (
      <DropdownButton title="Add form" id="add-form">
        <MenuItem eventKey="1">Form 1</MenuItem>
        <MenuItem eventKey="2">Form 2</MenuItem>
        <MenuItem eventKey="3">Form 3</MenuItem>
      </DropdownButton>
    )
  }
}

export default RsDropdownFormSelector;