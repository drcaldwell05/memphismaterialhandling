let explorerCount = 0;

const systems = [
  {
    key: "storage",
    label: "Storage",
    number: "01",
    title: "A place for the whole operation.",
    copy: "Coordinate rack, shelving, and pick modules around the way your space needs to work.",
    items: ["Pallet rack", "Drive-in & push-back rack", "Pick modules", "Industrial shelving"],
    link: "Explore storage systems",
  },
  {
    key: "movement",
    label: "Movement",
    number: "02",
    title: "Keep every part connected.",
    copy: "Bring storage, work areas, and the dock together with equipment selected for the movement of your materials.",
    items: ["Carton & pallet flow", "Power conveyor", "Gravity conveyor", "Carts"],
    link: "Explore material movement",
  },
  {
    key: "dock",
    label: "Dock",
    number: "03",
    title: "Connect the floor to the dock.",
    copy: "Consider dock equipment and facility essentials as part of the complete warehouse plan.",
    items: ["Dock equipment", "Mezzanines", "Packaging tables", "Industrial fans"],
    link: "Explore dock & facility",
  },
  {
    key: "protection",
    label: "Protection",
    number: "04",
    title: "Make protection part of the plan.",
    copy: "Coordinate guarding, decking, and netting alongside the storage systems they support.",
    items: ["Guard rail", "End-of-rack guards", "Wire decking & mesh", "Safety netting"],
    link: "Explore safety equipment",
  },
];

// One consistent axonometric projection keeps the drawing architectural.
const project = (x, y, z = 0) => [340 + (x - y) * .85, 145 + (x + y) * .46 - z];
const point = (x, y, z = 0) => project(x, y, z).map(n => n.toFixed(1)).join(",");
const polygon = (points, className) => `<polygon class="${className}" points="${points.map(p => point(...p)).join(" ")}"/>`;
const line = (a, b, className) => `<line class="${className}" x1="${project(...a)[0].toFixed(1)}" y1="${project(...a)[1].toFixed(1)}" x2="${project(...b)[0].toFixed(1)}" y2="${project(...b)[1].toFixed(1)}"/>`;

function box(x, y, z, width, depth, height, className = "we-pallet") {
  return `<g class="${className}">
    ${polygon([[x,y,z+height],[x+width,y,z+height],[x+width,y+depth,z+height],[x,y+depth,z+height]],"we-box-top")}
    ${polygon([[x,y+depth,z],[x+width,y+depth,z],[x+width,y+depth,z+height],[x,y+depth,z+height]],"we-box-front")}
    ${polygon([[x+width,y,z],[x+width,y+depth,z],[x+width,y+depth,z+height],[x+width,y,z+height]],"we-box-side")}
  </g>`;
}

function rack(y, row) {
  let pallets = "";
  let frame = "";
  [0, 34, 68].forEach((z, level) => {
    for (let bay = 0; bay < 5; bay++) {
      // Deliberately leave a few bays open so the structure stays legible.
      if ((bay + level + row) % 5 !== 3) pallets += box(116 + bay * 59, y + 6, z + 4, 43, 26, 23);
    }
    frame += polygon([[107,y,z],[407,y,z],[407,y+39,z],[107,y+39,z]],"we-rack-shelf");
    frame += line([107,y+39,z+2],[407,y+39,z+2],"we-rack-beam");
    frame += line([107,y,z+2],[407,y,z+2],"we-rack-back-beam");
  });
  for (let bay = 0; bay <= 5; bay++) {
    const x = 107 + bay * 60;
    frame += line([x,y,0],[x,y,104],"we-rack-post we-rack-back-post");
    frame += line([x,y+39,0],[x,y+39,104],"we-rack-post");
    frame += line([x,y,104],[x,y+39,104],"we-rack-crown");
  }
  frame += line([107,y,104],[407,y,104],"we-rack-crown");
  frame += line([107,y+39,104],[407,y+39,104],"we-rack-crown");
  frame += line([107,y,2],[107,y+39,102],"we-rack-brace");
  frame += line([407,y,2],[407,y+39,102],"we-rack-brace");
  return `<g class="we-rack">${pallets}${frame}</g>`;
}

function guard(x, y, width, alongY = false) {
  const end = alongY ? [x,y+width,15] : [x+width,y,15];
  const base = alongY ? [x,y+width,0] : [x+width,y,0];
  return `<g>${line([x,y,15],end,"we-guard-rail")}${line([x,y,0],[x,y,19],"we-guard-post")}${line(base,[...end.slice(0,2),19],"we-guard-post")}</g>`;
}

function model(uid) {
  let floorGrid = "";
  for (let x = 0; x <= 500; x += 50) floorGrid += line([x,0],[x,340],"we-floor-grid");
  for (let y = 0; y <= 340; y += 50) floorGrid += line([0,y],[500,y],"we-floor-grid");
  let docks = "";
  [75,155,235].forEach(y => {
    docks += polygon([[500,y,0],[552,y,0],[552,y+44,0],[500,y+44,0]],"we-dock-apron");
    docks += polygon([[500,y,0],[500,y+44,0],[500,y+44,57],[500,y,57]],"we-dock-door");
    [12,24,36,48].forEach(z => { docks += line([500,y,z],[500,y+44,z],"we-dock-door-line"); });
    docks += line([505,y+3,2],[505,y+41,2],"we-dock-threshold");
  });
  const route = [[65,43],[65,306],[454,306],[454,176],[505,176]].map((p,i) => `${i ? "L" : "M"}${point(...p,3)}`).join(" ");
  const safeguards = [59,144,229].map(y => guard(98,y-3,45,true)+guard(417,y-3,45,true)).join("") + guard(138,294,252);
  return `<svg class="we-model" viewBox="0 0 860 590" role="img" aria-labelledby="${uid}-drawing-title ${uid}-drawing-desc">
    <title id="${uid}-drawing-title">A coordinated warehouse system</title>
    <desc id="${uid}-drawing-desc">Illustrative warehouse layout showing storage racks, material movement, loading docks, and protective guarding. Not to scale.</desc>
    <defs><linearGradient id="${uid}-ground" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3f4ed"/><stop offset="1" stop-color="#e5e9df"/></linearGradient></defs>
    <g class="we-shell">
      ${polygon([[0,0,0],[500,0,0],[500,0,116],[0,0,116]],"we-back-wall")}
      ${polygon([[0,0,0],[0,340,0],[0,340,116],[0,0,116]],"we-side-wall")}
      ${line([0,0,116],[500,0,116],"we-roof-edge")}
      ${line([0,0,116],[0,340,116],"we-roof-edge")}
      ${line([500,0,116],[500,0,0],"we-shell-post")}
      ${line([0,340,116],[0,340,0],"we-shell-post")}
    </g>
    ${polygon([[0,0,-6],[500,0,-6],[500,340,-6],[0,340,-6]],"we-floor-edge")}
    <polygon class="we-floor" fill="url(#${uid}-ground)" points="${[[0,0],[500,0],[500,340],[0,340]].map(p=>point(...p)).join(" ")}"/>
    <g>${floorGrid}</g>
    <g class="we-zone we-zone-movement"><path class="we-flow-bed" d="${route}"/><path class="we-flow-running" d="${route}"/></g>
    <g class="we-zone we-zone-storage">${rack(59,0)}${rack(144,1)}${rack(229,2)}</g>
    <g class="we-zone we-zone-dock">${docks}</g>
    <g class="we-zone we-zone-protection">${safeguards}</g>
    <g class="we-dimensions" aria-hidden="true">
      ${line([0,359],[500,359],"we-dimension-line")}
      ${line([-19,0],[-19,340],"we-dimension-line")}
      ${line([0,352],[0,366],"we-dimension-tick")}
      ${line([500,352],[500,366],"we-dimension-tick")}
      ${line([-26,0],[-12,0],"we-dimension-tick")}
      ${line([-26,340],[-12,340],"we-dimension-tick")}
    </g>
  </svg>`;
}

/** Initialize one self-contained, accessible warehouse systems explorer. */
export function initWarehouseExplorer(root) {
  if (!(root instanceof HTMLElement)) return () => {};
  const uid = `we-${++explorerCount}`;
  root.classList.add("we-explorer");
  root.dataset.system = systems[0].key;
  root.innerHTML = `
    <div class="we-drawing">
      <div class="we-drawing-head"><span>One connected system</span><span aria-hidden="true">MMH / 01</span></div>
      ${model(uid)}
      <div class="we-drawing-foot"><span class="we-drawing-selection">Storage systems</span><span>Illustrative layout · Not to scale</span></div>
    </div>
    <div class="we-content">
      <div class="we-tabs" role="tablist" aria-label="Warehouse systems">
        ${systems.map((system,i)=>`<button class="we-tab" id="${uid}-tab-${i}" role="tab" type="button" aria-controls="${uid}-panel" aria-selected="${i===0}" tabindex="${i===0?0:-1}"><span class="we-tab-number" aria-hidden="true">${system.number}</span>${system.label}</button>`).join("")}
      </div>
      <div class="we-panel" id="${uid}-panel" role="tabpanel" aria-labelledby="${uid}-tab-0" tabindex="0">
        <p class="we-kicker">01 / Storage systems</p>
        <h3 class="we-title"></h3><p class="we-copy"></p>
        <ul class="we-items"></ul>
        <a class="we-link" href="services.html#equipment"><span></span><span aria-hidden="true">↗</span></a>
      </div>
    </div>`;
  const tabs = [...root.querySelectorAll(".we-tab")];
  const panel = root.querySelector(".we-panel");
  const headings = ["Storage systems","Flow & movement","Dock & facility","Safety & protection"];
  const select = index => {
    const system = systems[index];
    root.dataset.system = system.key;
    tabs.forEach((tab,i) => {tab.setAttribute("aria-selected",String(i===index));tab.tabIndex=i===index?0:-1;});
    panel.setAttribute("aria-labelledby",tabs[index].id);
    root.querySelector(".we-kicker").textContent = `${system.number} / ${headings[index]}`;
    root.querySelector(".we-title").textContent = system.title;
    root.querySelector(".we-copy").textContent = system.copy;
    root.querySelector(".we-items").innerHTML = system.items.map(item=>`<li>${item}</li>`).join("");
    root.querySelector(".we-link span").textContent = system.link;
    root.querySelector(".we-drawing-selection").textContent = headings[index];
  };
  const onClick = event => { const button=event.target.closest(".we-tab"); if(button&&tabs.includes(button)) select(tabs.indexOf(button)); };
  const onKey = event => {
    const index=tabs.indexOf(event.target);
    if(index<0) return;
    let next;
    if(event.key==="ArrowRight") next=(index+1)%tabs.length;
    if(event.key==="ArrowLeft") next=(index+tabs.length-1)%tabs.length;
    if(event.key==="Home") next=0;
    if(event.key==="End") next=tabs.length-1;
    if(next===undefined) return;
    event.preventDefault();select(next);tabs[next].focus();
  };
  select(0);
  root.querySelector(".we-tabs").addEventListener("click",onClick);
  root.querySelector(".we-tabs").addEventListener("keydown",onKey);
  return () => {
    root.querySelector(".we-tabs")?.removeEventListener("click",onClick);
    root.querySelector(".we-tabs")?.removeEventListener("keydown",onKey);
  };
}
