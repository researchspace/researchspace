/**
 * ResearchSpace
 * Copyright (C) 2025, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import * as React from 'react';
import { HTMLAttributes } from 'react';
import TypeItLib from 'typeit';
import * as _ from 'lodash';

// Define the instruction types
interface TypeInstruction {
  type: 'type';
  content: string;
}

interface DeleteInstruction {
  type: 'delete';
  count?: number;
}

interface EraseInstruction {
  type: 'erase';
  count?: number;
}

interface PauseInstruction {
  type: 'pause';
  duration: number;
}

interface BreakInstruction {
  type: 'break';
}

type TypeItInstruction = TypeInstruction | DeleteInstruction | EraseInstruction | PauseInstruction | BreakInstruction;

export interface TypeItProps extends HTMLAttributes<HTMLElement> {
  /**
   * Array of typing instructions
   */
  instructions?: Array<TypeItInstruction>;
  
  /**
   * Controls typing speed (in milliseconds)
   */
  speed?: string;
  
  /**
   * Boolean to enable/disable realistic typing with variable delays
   */
  lifeLike?: string;
  
  /**
   * Custom cursor character
   */
  cursorChar?: string;
  
  /**
   * Boolean to enable/disable HTML parsing in typed content
   */
  html?: string;
  
  /**
   * Boolean to enable/disable looping
   */
  loop?: string;
  
  /**
   * Boolean to control line break behavior
   */
  breakLines?: string;
}

/**
 * @example
 * <rs-typeit 
 *   instructions='[
 *     {"type": "type", "content": "Hello, world!"},
 *     {"type": "pause", "duration": 1000},
 *     {"type": "delete", "count": 7},
 *     {"type": "type", "content": "ResearchSpace!"}
 *   ]'
 *   speed="50"
 *   life-like="true"
 *   cursor-char="|">
 * </rs-typeit>
 */
export class TypeItComponent extends React.Component<TypeItProps> {
  private containerRef: React.RefObject<HTMLDivElement>;
  private typeItInstance: any;

  constructor(props: TypeItProps) {
    super(props);
    this.containerRef = React.createRef();
  }

  componentDidMount() {
    this.initTypeIt();
  }

  componentDidUpdate(prevProps: TypeItProps) {    
    if (!_.isEqual(this.props, prevProps)) {
      this.destroyTypeIt();
      this.initTypeIt();
    }
  }

  componentWillUnmount() {
    this.destroyTypeIt();
  }

  private destroyTypeIt() {
    if (this.typeItInstance) {
      this.typeItInstance.destroy();
      this.typeItInstance = null;
    }
  }

  private initTypeIt() {
    if (!this.containerRef.current) {
      return;
    }

    // Parse TypeIt options from props
    const options = {
      speed: this.props.speed ? parseInt(this.props.speed, 10) : undefined,
      lifeLike: this.props.lifeLike === 'true',
      cursorChar: this.props.cursorChar,
      html: this.props.html === 'true',
      loop: this.props.loop === 'true',
      breakLines: this.props.breakLines === 'true',
    };

    // Create TypeIt instance
    this.typeItInstance = new TypeItLib(this.containerRef.current, options);

    // Parse and apply instructions
    if (this.props.instructions) {
      try {        
        // Apply each instruction
        this.props.instructions.forEach(instruction => {
          switch (instruction.type) {
            case 'type':
              this.typeItInstance.type(instruction.content);
              break;
            case 'delete':
              this.typeItInstance.delete(instruction.count);
              break;
            case 'erase':
              // Erase is similar to delete but can be implemented differently if needed
              this.typeItInstance.delete(instruction.count);
              break;
            case 'pause':
              this.typeItInstance.pause(instruction.duration);
              break;
            case 'break':
              this.typeItInstance.break();
              break;
            default:
              console.warn(`Unknown TypeIt instruction type: ${(instruction as any).type}`);
          }
        });
      } catch (e) {
        console.error('Failed to parse TypeIt instructions:', e);
      }
    }

    // Start the animation
    this.typeItInstance.go();
  }

  render() {
    const { 
      instructions, 
      speed, 
      lifeLike, 
      cursorChar, 
      html, 
      loop, 
      breakLines, 
      ...otherProps 
    } = this.props;

    return <div ref={this.containerRef} {...otherProps}></div>;
  }
}

export default TypeItComponent;
