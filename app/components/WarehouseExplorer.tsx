"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";

export type EquipmentGroup = {
  number: string;
  title: string;
  items: string[];
};

const applications = [
  { short: "Storage", key: "storage", title: "Make room for the operation.", copy: "Explore rack, shelving, and pick modules as part of a coordinated storage plan.", label: "Storage layout" },
  { short: "Movement", key: "flow", title: "Connect each part of the floor.", copy: "Consider how cartons, pallets, and equipment move between storage, work areas, and the dock.", label: "Material movement" },
  { short: "Dock & facility", key: "dock", title: "Bring the work areas together.", copy: "Coordinate the dock, packaging areas, and facility equipment with the rest of the system.", label: "Dock and work areas" },
  { short: "Protection", key: "safety", title: "Plan protection into the system.", copy: "Consider rack protection, guarding, decking, and netting alongside the equipment layout.", label: "Protection zones" },
];

export function WarehouseExplorer({ groups }: { groups: EquipmentGroup[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % groups.length;
    else if (event.key === "ArrowLeft") next = (index + groups.length - 1) % groups.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = groups.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="warehouse-explorer" data-system={applications[active].key}>
      <div className="explorer-topline"><span>Explore the system</span><span>Four connected applications</span></div>
      <div className="explorer-tabs" role="tablist" aria-label="Warehouse applications">
        {groups.map((group, index) => (
          <button key={group.number} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1}
            ref={(element) => { tabs.current[index] = element; }} onClick={() => setActive(index)} onKeyDown={(event) => moveTab(event, index)}>
            <span className="explorer-tab-number" aria-hidden="true">{group.number}</span>
            <span>{applications[index].short}</span>
            <span className="explorer-tab-marker" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <div className="explorer-body">
        <div className="explorer-drawing">
          <div className="explorer-drawing-label"><span>Warehouse / system overview</span><span aria-hidden="true">MMH—01</span></div>
          <svg className="warehouse-map" viewBox="0 0 720 490" role="img" aria-labelledby={`${id}-map-title ${id}-map-description`}>
            <title id={`${id}-map-title`}>{`Illustrative warehouse system: ${applications[active].label}`}</title>
            <desc id={`${id}-map-description`}>A schematic floor plan with storage at the back, a central movement aisle, work areas at the side, loading docks at the front, and protection around the storage rows. The selected application is highlighted.</desc>
            <defs>
              <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="currentColor" strokeWidth=".5" /></pattern>
            </defs>
            <rect x="0" y="0" width="720" height="490" fill={`url(#${id}-grid)`} className="map-grid" />
            <g className="map-boundary"><path d="M64 400V58H658V400H578M532 400H431M385 400H284M238 400H64" /><path d="M50 58H35M50 400H35M42 58V400M64 35V22M658 35V22M64 28H658" /><path d="M39 62L45 54M39 404L45 396M68 25L60 31M662 25L654 31" /></g>
            <g className="map-zone map-storage">
              {[112, 228, 430].map((x) => (
                <g key={x}>
                  <rect x={x} y="104" width="64" height="174" rx="2" />
                  {[133,162,191,220,249].map((y) => <path key={y} d={`M${x} ${y}h64`} />)}
                  <path d={`M${x + 32} 104v174`} />
                </g>
              ))}
            </g>
            <g className="map-zone map-dock">
              <rect x="555" y="104" width="64" height="67" rx="2" />
              <rect x="555" y="211" width="64" height="67" rx="2" />
              <path d="M555 118h64M555 225h64M238 400v-35h46v35M385 400v-35h46v35M532 400v-35h46v35" />
              <path d="M243 376h36m-36 8h36m111-8h36m-36 8h36m111-8h36m-36 8h36" />
            </g>
            <g className="map-zone map-safety">
              {[106,222,424].map((x) => <path key={x} d={`M${x} 114V98h76v16M${x} 268v16h76v-16`} />)}
              <path d="M544 96h84v190h-84M96 312h206M424 312h204" />
            </g>
            <g className="map-zone map-flow">
              <path className="map-flow-track" d="M261 417V330H354V82M354 190H199V82M354 330H516V190H588M516 330H556V353" />
              <path className="map-flow-moving" d="M261 417V330H354V82M354 190H199V82M354 330H516V190H588M516 330H556V353" />
            </g>
            <g className="map-caption"><text x="202" y="77" textAnchor="middle">STORAGE</text><text x="462" y="77" textAnchor="middle">PICKING</text><text x="587" y="77" textAnchor="middle">WORK AREA</text><text x="409" y="441" textAnchor="middle">RECEIVING / DISPATCH</text></g>
            <g className="map-point map-point-storage"><circle cx="144" cy="190" r="17"/><text x="144" y="195" textAnchor="middle">01</text></g>
            <g className="map-point map-point-flow"><circle cx="354" cy="239" r="17"/><text x="354" y="244" textAnchor="middle">02</text></g>
            <g className="map-point map-point-dock"><circle cx="408" cy="382" r="17"/><text x="408" y="387" textAnchor="middle">03</text></g>
            <g className="map-point map-point-safety"><circle cx="465" cy="312" r="17"/><text x="465" y="317" textAnchor="middle">04</text></g>
          </svg>
          <ol className="map-mobile-legend" aria-label="Warehouse diagram legend">
            {applications.map((application, index) => <li key={application.key} data-active={active === index ? "true" : undefined}><span>{groups[index].number}</span>{application.short}</li>)}
          </ol>
          <div className="explorer-drawing-bottom"><span><i aria-hidden="true" />{applications[active].label}</span><span>Illustrative layout · Not to scale</span></div>
        </div>
        <div className="explorer-panels">
          {groups.map((group, index) => (
            <div className="explorer-panel" key={group.number} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={active !== index}>
              <p className="explorer-panel-kicker">{group.number} / {group.title}</p>
              <h3>{applications[index].title}</h3>
              <p className="explorer-panel-description">{applications[index].copy}</p>
              <ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul>
              <Link className="text-link text-link-light" href="/contact">Discuss your system <span aria-hidden="true">↗</span></Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
