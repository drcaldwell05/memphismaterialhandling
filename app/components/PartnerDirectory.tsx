"use client";

import { useId, useState } from "react";
import Image from "next/image";

type Resource = { name: string; logo: string; width: number; height: number; role: string; products: string; website: string; categories: string[]; anchor?: string };
const filters = ["All resources", "Storage & flow", "Safety & protection", "Dock & facility"];

export function PartnerDirectory({ resources }: { resources: Resource[] }) {
  const id = useId();
  const [active, setActive] = useState(filters[0]);
  const count = resources.filter(brand => active === filters[0] || brand.categories.includes(active)).length;
  return (
    <>
      <div className="partner-filter-bar">
        <div className="partner-filters" role="group" aria-label="Filter equipment resources">{filters.map(filter => <button type="button" key={filter} aria-pressed={active === filter} aria-controls={`${id}-resources`} onClick={() => setActive(filter)}>{filter}</button>)}</div>
        <p className="partner-filter-count" role="status">{count} resources</p>
      </div>
      <ul className="partner-card-grid" id={`${id}-resources`}>
        {resources.map((brand, index) => (
          <li key={brand.name} id={brand.anchor} hidden={active !== filters[0] && !brand.categories.includes(active)}>
            <a className="partner-card" href={brand.website} target="_blank" rel="noreferrer" aria-label={`Visit ${brand.name} website, opens in a new tab`}>
              <div className="partner-card-topline"><span>{brand.role}</span><span aria-hidden="true">0{index + 1}</span></div>
              <div className={`partner-card-logo partner-logo-${index}`}><Image src={brand.logo} alt="" width={brand.width} height={brand.height} unoptimized /></div>
              <div className="partner-card-info"><div className="partner-card-heading"><h3>{brand.name}</h3><span className="partner-visit-arrow" aria-hidden="true">↗</span></div><p>{brand.products}</p><span className="partner-card-visit">View equipment</span></div>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
