 import { createElement } from 'react';
 import * as Immutable from 'immutable';
 import { FormGroup, FormControl } from 'react-bootstrap';
 import { Cancellation } from 'platform/api/async';
import { listen, Event } from 'platform/api/events';
import {
  SemanticMapSendSelectedFeatures,
} from '../../../components/semantic/map/SemanticMapEvents';
 import { FieldValue, FieldError } from '../FieldValues';
 import { ValidationMessages } from './Decorations';
 import { AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';

 export interface EventInputProps extends AtomicValueInputProps {}
 
 interface EventInputState {
   inputValue: string;
}

 /**
  * Represents a hidden field, which will not be visible to the user and which
  * will be automatically saved as soon as the form is saved.
  *
  * @example
  * <semantic-form-hidden-input for='...' default-value='https://www.wikidata.org/wiki/Q2337004'>
  * </semantic-form-hidden-input>
  *
  * <semantic-form-hidden-input for='...' default-values='["Emmett Brown", "Marty McFly"]'>
  * </semantic-form-hidden-input>
  */
 export class EventInput extends AtomicValueInput<EventInputProps, {inputValue: string}> {
   /* UNCOMMENT TO HIDE CONTROL 
   static defaultProps: Partial<EventInputProps> = {
     renderHeader: true,
   };
   */
   private cancelation = new Cancellation();

   constructor(props: EventInputProps, context: any){
     super(props, context);
     this.state = {
      inputValue: ""
     }

     console.log("construction of Event input started!")
     this.cancelation
     .map(
       listen({
         eventType: SemanticMapSendSelectedFeatures,
       })
     )
     .onValue(this.handleValorization);
   }
 
   private handleValorization = (event: Event<any>) => {
    console.log("Received from " + event.source + " data: " + event.data)
    this.setState({
      inputValue: event.data
    }, () => {
      console.log(this.state)
    })

   }
 
   render() {
    let text = this.state.inputValue
    return createElement(
      FormGroup,
      { },
      createElement(FormControl, {
        className: 'plain-text-field__text',
        value: text,
        type: 'text',
        readOnly: !this.canEdit(),
      })
    );
   }
 }
 
 export default EventInput;
 