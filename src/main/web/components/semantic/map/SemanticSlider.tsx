import * as React from 'react';
import { Range, getTrackBackground } from 'react-range';

// Updated Mark type to explicitly define a mark object
type Mark = { value: number; label: string };

// Updated SliderProps to only accept marks as an array of Mark
type SliderProps = {
  marks: Mark[];
  onChange?: (values: number[]) => void;
  value?: number;
};

type SliderState = {
  values: number[];
  initialized: boolean;
};

class Slider extends React.Component<SliderProps, SliderState> {
  static SNAP_THRESHOLD = 5;

  constructor(props: SliderProps) {
    super(props);
    // Ensure that there is at least one mark and it's defined before accessing its value
    const firstMarkValue = props.marks.length > 0 ? props.marks[0].value : 0;
    const initialValue = props.value !== undefined ? props.value : firstMarkValue;
    console.log("The initial value for SemanticSlider is", initialValue)
    this.state = {
      values: [initialValue],
      initialized: false
    };
  }  

  getInitialValue(marks: Mark[]): number {
    return marks.length > 0 ? marks[0].value : 0;
  }

  componentDidUpdate(prevProps: SliderProps) {
    if (this.props.value !== undefined && this.props.value !== prevProps.value) {
      this.setState({ values: [this.props.value] });
    }

    if (!this.state.initialized && this.props.marks.length > 0) {
      if (this.props.marks !== prevProps.marks) {
        const firstValue = this.props.marks[0].value;
        this.setState({ values: [firstValue], initialized: true });
      }
    }
  }

  findClosestMark(value: number): number {
    const numericMarks = this.props.marks.map(mark => mark.value);
    return numericMarks.reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
  }

  handleOnChange = (values: number[]) => {
    const rawValue = values[0];
    const closestValue = this.findClosestMark(rawValue);
    const shouldSnap = Math.abs(rawValue - closestValue) <= Slider.SNAP_THRESHOLD;
    const finalValue = shouldSnap ? closestValue : rawValue;

    this.setState({ values: [finalValue] }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state.values);
      }
    });
  };

  render() {
    const { marks } = this.props;
    const { values, initialized } = this.state;

    if (!initialized || marks.length === 0) {
      return <div>Loading...</div>;
    }

    const MIN = marks[0].value;
    const MAX = marks[marks.length - 1].value;

    return (
      <div style={{ margin: '2rem', height: '36px', display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Range
          values={values}
          step={1}
          min={MIN}
          max={MAX}
          onChange={this.handleOnChange}
          renderTrack={({ props, children }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{ ...props.style, height: '36px', display: 'flex', width: '100%' }}
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
                    max: MAX,
                  }),
                  alignSelf: 'center',
                  position: 'relative',
                }}
              >
                {marks.map(mark => (
                  <div
                    key={mark.value}
                    style={{
                      position: 'absolute',
                      left: `calc(${((mark.value - MIN) / (MAX - MIN)) * 100}% + 10px)`,
                      transform: 'translateX(-50%)',
                      marginTop: '5px',
                    }}
                  >
                    <div style={{ height: '10px', width: '2px', backgroundColor: 'black', marginBottom: '5px' }} />
                    <div style={{ fontSize: '10px', textAlign: 'center' }}>{mark.label}</div>
                  </div>
                ))}
                {children}
              </div>
            </div>
          )}
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
                boxShadow: '0px 2px 6px #AAA',
              }}
            >
              <div style={{ position: 'absolute', top: '-28px', color: '#fff', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#548BF4' }}>
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
