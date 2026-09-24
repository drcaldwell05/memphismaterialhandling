"use client";

import { useId, useRef, useState } from "react";

type Stage = { id: string; number: string; label: string; title: string; copy: string };

export function ProjectPath({ stages }: { stages: Stage[] }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div className="project-path">
      <div className="project-path-topline"><span>From planning to installation</span><span aria-hidden="true">01—03</span></div>
      <div className="project-path-tabs" role="tablist" aria-label="Explore the project stages">
        {stages.map((stage, index) => <button key={stage.id} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} ref={node => { tabs.current[index] = node; }} onClick={() => setActive(index)} onKeyDown={event => {
          let next = active;
          if (event.key === "ArrowRight") next = (active + 1) % stages.length;
          else if (event.key === "ArrowLeft") next = (active - 1 + stages.length) % stages.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = stages.length - 1;
          else return;
          event.preventDefault(); setActive(next); tabs.current[next]?.focus();
        }}><span>{stage.number}</span>{stage.label}</button>)}
      </div>
      <div className="project-path-track" aria-hidden="true"><span style={{ transform: `scaleX(${(active + 1) / stages.length})` }} /></div>
      {stages.map((stage, index) => <div className="project-path-panel" key={stage.id} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} tabIndex={0}>
        <p className="project-path-number">Stage {stage.number}</p><h2>{stage.title}</h2><p>{stage.copy}</p><a href={`#${stage.id}`}>Explore this stage <span aria-hidden="true">↓</span></a>
      </div>)}
      <p className="project-path-bottom">Select a stage to explore the process.</p>
    </div>
  );
}
