import * as React from 'react';
import { Range, getTrackBackground } from 'react-range';

// Define the type for a mark, which can be either a number or an object with value and label
type Mark = number | { value: number; label: string };

// Update the marks type to be an array of Mark
type SliderProps = {
  marks: Mark[] | number[];
  onChange?: (values: number[]) => void;
  value?: number; // The externally controlled value
};

type SliderState = {
  values: number[];
  initialized: boolean;
};

class Slider extends React.Component<SliderProps, SliderState> {
  static SNAP_THRESHOLD = 5;

  constructor(props: SliderProps) {
    super(props);
    // Initialize with the externally provided value or default to the first mark's value (or a sensible default)
    const initialValue = props.value !== undefined ? props.value : this.getInitialValue(props.marks);
    console.log("The initial value for SemanticSlider is", initialValue)
    this.state = {
      values: [initialValue],
      initialized: false
    };
  }

  shouldSnapToMark(value: number, closestValue: number): boolean {
    // Determine if the absolute difference between the value and the closest mark is within the threshold
    return Math.abs(value - closestValue) <= Slider.SNAP_THRESHOLD;
  }

  
  getInitialValue(marks: Mark[] | number[]): number {
    if (marks && marks.length > 0) {
      const firstMark = marks[0];
      return typeof firstMark === 'number' ? firstMark : firstMark.value;
    }
    // Return a default value if marks is empty or not provided
    return 0; // You can change this default value as needed
  }


  componentDidUpdate(prevProps: SliderProps) {
    // Update state when value prop is received or changed
    if (this.props.value !== undefined && this.props.value !== prevProps.value) {
      this.setState({ values: [this.props.value] });
    }
  
    // Update state when marks prop is received and is not empty
    if (!this.state.initialized && this.props.marks && this.props.marks.length > 0) {
      if (this.props.marks !== prevProps.marks) {
        const firstMark = this.props.marks[0];
        // Ensure firstMark is not undefined before accessing its value
        const firstValue = firstMark !== undefined && (typeof firstMark === 'number' ? firstMark : firstMark.value);
        if (firstValue !== undefined) {
          this.setState({ values: [firstValue], initialized: true });
        }
      }
    }
  }
  

  

  getNumericValue(mark: Mark | number): number {
    return typeof mark === 'number' ? mark : mark.value;
  }

  findClosestMark(value: number): number {
    const { marks } = this.props;
    const numericMarks = marks.map(mark => this.getNumericValue(mark));
  
    return numericMarks.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  }

  handleOnChange = (values: number[]) => {
    const rawValue = values[0]; // The raw slider value before considering snapping
    const closestValue = this.findClosestMark(rawValue);

    // Decide whether to snap based on the threshold
    const shouldSnap = this.shouldSnapToMark(rawValue, closestValue);
    const finalValue = shouldSnap ? closestValue : rawValue;

    this.setState({ values: [finalValue] }, () => {
      // Call the onChange method passed in props, if it exists, with the possibly adjusted value
      if (this.props.onChange) {
        this.props.onChange(this.state.values);
      }
    });
  };

  render() {
    const { marks } = this.props;
    const { values, initialized } = this.state;

    if (!initialized || !marks || marks.length === 0) {
      return <div>Loading...</div>; // Or any other placeholder
    }

    const STEP = 1;
    const MIN = this.getNumericValue(marks[0]);
    const MAX = this.getNumericValue(marks[marks.length - 1]);

    return (
      <div style={{ margin: '2rem', height: '36px', display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Range
          values={values}
          step={STEP}
          min={MIN}
          max={MAX}
          onChange={this.handleOnChange}
          renderTrack = {({ props, children }) => {
            const { marks } = this.props;
            const MIN = this.getNumericValue(marks[0]);
            const MAX = this.getNumericValue(marks[marks.length - 1]);
            const { values } = this.state;
          
            return (
              <div
                onMouseDown={props.onMouseDown}
                onTouchStart={props.onTouchStart}
                style={{
                  ...props.style,
                  height: '36px',
                  display: 'flex',
                  width: '100%'
                }}
              >
                <div
                  ref={props.ref}
                  style={{
                    height: '5px',
                    width: '100%',
                    borderRadius: '4px',
                    background: getTrackBackground({
                      values: values,
                      colors: ['#ccc', '#548BF4', '#ccc'],
                      min: MIN,
                      max: MAX
                    }),
                    alignSelf: 'center',
                    position: 'relative' // Needed for absolute positioning of marks
                  }}
                >
                  {marks.map(mark => {
                    const value = this.getNumericValue(mark);
                    const label = typeof mark === 'object' ? mark.label : mark.toString();
                    const position = ((value - MIN) / (MAX - MIN)) * 100;
          
                    return (
                      <div
                        key={value}
                        style={{
                          position: 'absolute',
                          left: `calc(${position}% + 10px)`,
                          transform: 'translateX(-50%)',
                          marginTop: '5px'
                        }}
                      >
                        <div
                          style={{
                            height: '10px',
                            width: '2px',
                            backgroundColor: 'black',
                            marginBottom: '5px'
                          }}
                        />
                        <div style={{ fontSize: '10px', textAlign: 'center' }}>{label}</div>
                      </div>
                    );
                  })}
                  {children}
                </div>
              </div>
            );
          }}
          
          renderThumb={({ props }) => (
            <div
              {...props}
              style={{
                ...props.style,
                height: '25px',
                width: '25px',
                borderRadius: '21px',
                backgroundColor: '#FFF',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0px 2px 6px #AAA'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-28px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  fontFamily: 'Arial,Helvetica Neue,Helvetica,sans-serif',
                  padding: '4px',
                  borderRadius: '4px',
                  backgroundColor: '#548BF4'
                }}
              >
                {values[0]}
              </div>
            </div>
          )}
        />
      </div>
    );
  }
}

export default Slider;
