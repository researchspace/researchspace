import * as React from "react";
import {Children, CSSProperties, InputHTMLAttributes} from "react";
import * as classnames from 'classnames';

export interface SelectLabelProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  style?: CSSProperties;
  defaultTitle?: string;
  onClickHandler?: () => void;
}

const CLASS_NAME = 'select-label';

const ClickableArea = (props: React.HTMLProps<HTMLDivElement>) => {
  const style = {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    height: '30px'
  }

  return (
    <div onClick={props.onClick} style={style}>
      {props.children}
    </div>
  )
}

export class SelectLabel extends React.Component<SelectLabelProps> {
  static defaultProps: Partial<SelectLabelProps> = {
    defaultTitle: 'Select input',
  };

  constructor(props: SelectLabelProps, context: any) {
    super(props, context);
  }

  render() {
    const { className, style, onClickHandler, children} = this.props;

    const groupClass = classnames(
      `${CLASS_NAME}`,
      className
    );

    const hasNonEmptyAddon = Children.count(children) > 0;

    return (
      <div className={groupClass} style={style}>
        {
          hasNonEmptyAddon ? (
            <>
              {children}
              <ClickableArea  onClick={() => {onClickHandler?.()} }/>
            </>
          ) : (
            <ClickableArea  onClick={() => {onClickHandler?.()} }>{this.props.defaultTitle}</ClickableArea>
          )
        }
      </div>
    );
  }

}

