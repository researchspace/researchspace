/* eslint-disable react/prop-types */
// from https://github.com/jacomyal/sigma.js/blob/main/demo/src/views/Panel.tsx

import * as React from 'react';
import { FC, useEffect, useRef, useState } from "react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import AnimateHeight from "react-animate-height";

const DURATION = 300;

export const Panel: FC<{ title: JSX.Element | string; initiallyDeployed?: boolean }> = ({
  title,
  initiallyDeployed,
  children,
}) => {
  const [isDeployed, setIsDeployed] = useState(initiallyDeployed || false);
  const dom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDeployed)
      setTimeout(() => {
        if (dom.current) dom.current.parentElement!.scrollTo({ top: dom.current.offsetTop - 5, behavior: "smooth" });
      }, DURATION);
  }, [isDeployed]);

  return (
    <div className="panel" ref={dom}>
      <a onClick={() => setIsDeployed((v) => !v)}>
        <div>
            {title}{" "}
            <span className="icon toggle">
                {isDeployed ? <MdExpandLess /> : <MdExpandMore />}
            </span>
        </div>
      </a>
      <AnimateHeight duration={DURATION} height={isDeployed ? "auto" : 0}>
        {children}
      </AnimateHeight>
    </div>
  );
};

export default Panel;