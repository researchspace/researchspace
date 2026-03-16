import * as React from 'react';
import { CSSProperties } from "react";

import { useCamera } from "@react-sigma/core";


type ZoomLabelKeys = "zoomIn" | "zoomOut" | "reset";

/**
 * Properties for `ZoomControl` component
 */
export interface ZoomControlProps {
  /**
   * HTML class that will be added to all div button wrapper
   */
  className?: string;

  /**
   * HTML CSS style that will be added to all div button wrapper
   */
  style?: CSSProperties;

  /**
   * Number of ms for the zoom animation (default is 200ms)
   */
  animationDuration?: number;

  /**
   * It's possible to customize the button, by passing to JSX Element.
   * First one is for the "zoom in", second for "zoom out" and third for "view whole graph".
   * Example :
   * ```jsx
   * <ZoomControl>
   *   <BsZoomIn />
   *   <BsZoomOut />
   *   <BiReset />
   * </FullScreenControl>
   * ```
   */
  children?: [JSX.Element, JSX.Element, JSX.Element];

  /**
   * Map of the labels we use in the component.
   * This is usefull for I18N
   */
  labels?: { [Key in ZoomLabelKeys]?: string };

  /**
   * Define a custom function to be called when the user clicks on the "reset" button.
   */
  resetFunction?: () => void;
}

/**
 * The `ZoomControl` create three UI buttons that allows the user to
 * - zoom in
 * - zoom out
 * - reset zoom (ie. see the whole graph)
 *
 * ```jsx
 * <SigmaContainer>
 *   <ControlsContainer>
 *     <ZoomControl />
 *   </ControlsContainer>
 * </SigmaContainer>
 * ```
 * See [[ZoomControlProps]] for more information.
 *
 * @category Component
 */
const ZoomControl: React.FC<ZoomControlProps> = ({
  className,
  style,
  animationDuration = 200,
  children,
  labels = {},
  resetFunction
}: ZoomControlProps) => {
  const { zoomIn, zoomOut, reset } = useCamera({ duration: animationDuration, factor: 1.5 });

  // Common html props for the div wrapper
  const htmlProps = {
    style,
    className: `react-sigma-control ${className || ""}`,
  };

  return (
    <>
      <div {...htmlProps}>
        <button onClick={() => zoomIn()} title={labels["zoomIn"] || "Zoom In"}>
          {children[0]}
        </button>
      </div>
      <div {...htmlProps}>
        <button onClick={() => zoomOut()} title={labels["zoomOut"] || "Zoom Out"}>
          {children[1]}
        </button>
      </div>
      <div {...htmlProps}>
        <button onClick={ resetFunction ? resetFunction : () => reset()} title={labels["reset"] || "See whole graph"}>
          {children[2]}
        </button>
      </div>
    </>
  );
};

export default ZoomControl;