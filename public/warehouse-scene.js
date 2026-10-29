const clamp = value => Math.min(1, Math.max(0, value));
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function fallback(container) {
  const rack = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0 230-110 294-78 64 32Z" fill="#e4eadd"/><path d="M0 0V136L64 168V32Z" fill="#dae3d2"/><path d="m64 32 230-110v136L64 168Z" fill="#c9d7bf"/><path d="M0 0V136M64 32V168M294-78V58M230-110V26M141-5V131M218-42V94" fill="none" stroke="#244e3b" stroke-width="2"/><path d="m0 42 64 32 230-110M0 88l64 32 230-110" fill="none" stroke="#b67953" stroke-width="3"/><path d="m76 46 54-26v30L76 76Zm74-36 54-26v30l-54 26Zm75-36 54-26v30l-54 26ZM76 92l54-26v30l-54 26Zm74-36 54-26v30l-54 26Zm75-36 54-26v30l-54 26Z" fill="#e8d7b6"/></g>`;
  container.innerHTML = `<svg viewBox="0 0 760 560" role="img" aria-label="Illustrative warehouse model with storage racks, material movement, and loading docks" style="display:block;width:100%;height:100%;overflow:visible"><path d="m66 336 323-155 310 155-323 155Z" fill="#ecf0e4" stroke="#bdcbb5"/><path d="m66 336v13l310 155 323-155v-13L376 491Z" fill="#d6e0cc"/><path d="m91 327 285 143 284-136" fill="none" stroke="#b67953" stroke-dasharray="5 9" opacity=".6"/>${rack(161,263)}${rack(237,301)}${rack(313,339)}<path d="M66 336V196L389 41l310 155v140M389 41v140" fill="none" stroke="#b8c8af" stroke-width="1" opacity=".6"/><path d="m624 367 47-23v-49l-47 23Z" fill="#bed0b1" stroke="#78936d"/><path d="m571 393 40-20v-49l-40 20Z" fill="#bed0b1" stroke="#78936d"/></svg>`;
  container.dataset.renderer = 'svg';
  container.dataset.sceneReady = 'true';
  return { setProgress() {}, resize() {}, destroy() { container.replaceChildren(); delete container.dataset.renderer; delete container.dataset.sceneReady; } };
}

/** A warehouse built specifically for this story. No animation runs while idle. */
export async function createWarehouseScene(container) {
  if (!(container instanceof HTMLElement)) throw new TypeError('A warehouse scene container is required.');
  let THREE;
  try { THREE = await import('./assets/three.module.js'); }
  catch { return fallback(container); }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch { return fallback(container); }

  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Illustrative three-dimensional warehouse plan assembling into racks, material movement, and loading docks as you scroll. Not to scale.');
  container.replaceChildren(canvas);
  container.dataset.renderer = 'webgl';
  renderer.setClearColor(0xf6f5f0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  scene.add(world);
  const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, .1, 120);
  const geometries = new Set();
  const materials = new Set();
  const unit = new THREE.BoxGeometry(1, 1, 1); geometries.add(unit);
  const rollerGeometry = new THREE.CylinderGeometry(1, 1, 1, 10); geometries.add(rollerGeometry);
  const temp = new THREE.Object3D();
  const material = (color, options = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .75, metalness: .02, ...options });
    materials.add(value); return value;
  };
  const forest = material('#254c39', { roughness: .48, metalness: .22 });
  const copper = material('#b77850', { roughness: .53, metalness: .16 });
  const floorMaterial = material('#f1f2e8', { roughness: .95 });
  const edgeMaterial = material('#d8e1cc');
  const shelfMaterial = material('#b4c4aa', { roughness: .88 });
  const steel = material('#aebfa2', { roughness: .5, metalness: .38 });
  const shellMaterial = material('#c2cfb6', { transparent: true, opacity: .52 });
  const dockMaterial = material('#cad9bb', { roughness: .72 });
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: .15 }); materials.add(shadowMaterial);
  const blueprintMaterial = new THREE.LineBasicMaterial({ color: '#7d9a70', transparent: true, opacity: .5 }); materials.add(blueprintMaterial);
  const gridMaterial = new THREE.LineBasicMaterial({ color: '#9eaf90', transparent: true, opacity: .23 }); materials.add(gridMaterial);

  function batch(parent, mat, specs, cast = true, geometry = unit) {
    const mesh = new THREE.InstancedMesh(geometry, mat, specs.length);
    specs.forEach((spec, i) => {
      temp.position.set(spec[0], spec[1], spec[2]);
      temp.scale.set(spec[3], spec[4], spec[5]);
      temp.rotation.set(spec[6] || 0, spec[7] || 0, spec[8] || 0);
      temp.updateMatrix(); mesh.setMatrixAt(i, temp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = cast; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function segments(parent, pairs, mat) {
    const values = pairs.flatMap(pair => pair.flat());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(values, 3)); geometries.add(geometry);
    const result = new THREE.LineSegments(geometry, mat); parent.add(result); return result;
  }

  batch(world, edgeMaterial, [[0, -.17, 0, 20.2, .34, 13.3]], false);
  batch(world, floorMaterial, [[0, .015, 0, 20.1, .08, 13.2]], false);
  const shadowPlaneGeometry = new THREE.PlaneGeometry(34, 28); geometries.add(shadowPlaneGeometry);
  const shadowPlane = new THREE.Mesh(shadowPlaneGeometry, shadowMaterial);
  shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = -.36; shadowPlane.receiveShadow = true; scene.add(shadowPlane);

  const grid = [];
  for (let x = -9.5; x <= 9.5; x += 1.1) grid.push([[x, .061, -6.2], [x, .061, 6.2]]);
  for (let z = -6.1; z <= 6.1; z += 1.1) grid.push([[-9.8, .061, z], [9.8, .061, z]]);
  segments(world, grid, gridMaterial);
  const plan = [];
  const rowZ = [-3.65, -.3, 3.05];
  rowZ.forEach(z => {
    const a = [-6.8, .07, z - .7], b = [4.6, .07, z - .7], c = [4.6, .07, z + .7], d = [-6.8, .07, z + .7];
    plan.push([a,b],[b,c],[c,d],[d,a]);
    for (let bay = 1; bay < 5; bay++) plan.push([[-6.8+bay*2.28,.07,z-.7],[-6.8+bay*2.28,.07,z+.7]]);
  });
  segments(world, plan, blueprintMaterial);

  const rows = [];
  const palletGroups = [];
  rowZ.forEach((z, row) => {
    const group = new THREE.Group(); group.position.y = .08; world.add(group); rows.push(group);
    const posts = [], beams = [], shelves = [];
    for (let bay = 0; bay <= 5; bay++) {
      const x = -6.8 + bay * 2.28;
      posts.push([x,2.35,z-.7,.085,4.7,.085],[x,2.35,z+.7,.085,4.7,.085]);
      posts.push([x,4.67,z, .075,.075,1.49]);
    }
    [.25,1.68,3.11,4.54].forEach(y => {
      beams.push([-1.1,y,z-.7,11.48,.11,.075],[-1.1,y,z+.7,11.48,.11,.075]);
      shelves.push([-1.1,y-.045,z,11.35,.055,1.36]);
    });
    batch(group, forest, posts);
    batch(group, copper, beams);
    batch(group, shelfMaterial, shelves, false);
    [.34,1.77,3.2].forEach((y, level) => {
      const pallet = new THREE.Group(); pallet.userData.delay = row*.045+level*.027;
      const cartonMaterial = material(row === 1 ? '#ddc9a4' : '#d5c4a4', { roughness: .93, transparent: true });
      const woodMaterial = material('#bfa883', { transparent: true, roughness: .96 });
      const strapMaterial = material('#aeab90', { transparent: true, roughness: .9 });
      pallet.userData.materials = [cartonMaterial, woodMaterial, strapMaterial];
      const cartons=[], slats=[], straps=[];
      for (let bay = 0; bay < 5; bay++) {
        if ((row+level+bay)%5 === 3) continue;
        const x = -5.66+bay*2.28;
        cartons.push([x,y+.53,z,1.76,.86,1.08]);
        slats.push([x,y+.06,z,1.9,.12,1.2]);
        straps.push([x-.43,y+.968,z,.027,.012,1.085],[x+.43,y+.968,z,.027,.012,1.085]);
      }
      batch(pallet,cartonMaterial,cartons);batch(pallet,woodMaterial,slats);batch(pallet,strapMaterial,straps,false);
      world.add(pallet); palletGroups.push(pallet);
    });
  });

  const conveyor = new THREE.Group(); world.add(conveyor);
  const rails = [
    [-8.3,.73,.1,.07,.13,10.1],[-7.28,.73,.1,.07,.13,10.1],
    [-.06,.73,4.69,15.5,.13,.07],[-.06,.73,5.71,15.5,.13,.07],
    [7.18,.73,3.35,.07,.13,4.7],[8.2,.73,3.35,.07,.13,4.7],
  ];
  batch(conveyor,steel,rails);
  const rollers=[];
  for(let z=-4.65;z<=4.8;z+=.32)rollers.push([-7.79,.72,z,.075,.96,.075,0,0,Math.PI/2]);
  for(let x=-7.45;x<=7.85;x+=.32)rollers.push([x,.72,5.2,.075,.96,.075,Math.PI/2,0,0]);
  for(let z=1.1;z<=4.9;z+=.32)rollers.push([7.69,.72,z,.075,.96,.075,0,0,Math.PI/2]);
  batch(conveyor,steel,rollers,false,rollerGeometry);
  const legs=[];
  for(let z=-4.5;z<=4.5;z+=2.25)legs.push([-8.2,.34,z,.065,.68,.065],[-7.38,.34,z,.065,.68,.065]);
  for(let x=-5.8;x<=6;x+=2.4)legs.push([x,.34,4.79,.065,.68,.065],[x,.34,5.61,.065,.68,.065]);
  batch(conveyor,forest,legs);
  const movingBoxes=[];
  const parcelMaterial=material('#cda982',{roughness:.92});
  for(let i=0;i<4;i++){
    const parcel=new THREE.Mesh(unit,parcelMaterial);parcel.scale.set(.65,.49,.59);parcel.castShadow=true;conveyor.add(parcel);movingBoxes.push(parcel);
  }

  const guards=new THREE.Group();world.add(guards);
  const guardRails=[];
  rowZ.forEach(z=>[-7.04,4.88].forEach(x=>{
    guardRails.push([x,.53,z,.09,.09,1.9],[x,.29,z-.86,.085,.58,.085],[x,.29,z+.86,.085,.58,.085]);
  }));
  guardRails.push([-.3,.53,4.13,9.6,.09,.09]);
  for(let x=-5.1;x<=4.5;x+=2.4)guardRails.push([x,.29,4.13,.085,.58,.085]);
  batch(guards,copper,guardRails);

  const docks=new THREE.Group();world.add(docks);
  const doors=[],doorFrames=[],bumpers=[],doorSlats=[];
  [-3.7,-.7,2.3].forEach(z=>{
    doors.push([9.71,1.45,z,.12,2.8,1.85]);
    doorFrames.push([9.7,2.9,z,.19,.13,2.14],[9.7,1.45,z-1.02,.19,2.9,.13],[9.7,1.45,z+1.02,.19,2.9,.13]);
    bumpers.push([9.83,.23,z,.22,.3,2.02]);
    [.45,.9,1.35,1.8,2.25,2.7].forEach(y=>doorSlats.push([9.79,y,z,.025,.025,1.84]));
    batch(docks,edgeMaterial,[[10.15,.075,z,1.2,.08,2.1]],false);
  });
  batch(docks,dockMaterial,doors);batch(docks,forest,doorFrames);batch(docks,copper,bumpers);batch(docks,steel,doorSlats,false);

  const shell=new THREE.Group();world.add(shell);
  batch(shell,shellMaterial,[[-9.7,2.8,-6.25,.035,5.6,.035],[9.7,2.8,-6.25,.035,5.6,.035],[-9.7,2.8,6.25,.035,5.6,.035],
    [0,5.6,-6.25,19.4,.035,.035],[-9.7,5.6,0,.035,.035,12.5]],false);

  scene.add(new THREE.HemisphereLight(0xfffdf6,0xc7d2bc,2.4));
  const sun=new THREE.DirectionalLight(0xfff4df,3.15);sun.position.set(-9,18,12);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;
  sun.shadow.camera.near=.5;sun.shadow.camera.far=55;sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;sun.shadow.radius=4;
  scene.add(sun);
  const fill=new THREE.DirectionalLight(0xf1f6ef,.65);fill.position.set(10,9,-8);scene.add(fill);

  let progress=0, width=0, height=0, frame=0, disposed=false, isFallback=false;
  const cameraTarget=new THREE.Vector3(.2,1.9,0);
  // Fit the actual silhouette, rather than the empty upper corners of a box.
  const boundsCorners=[];
  [-10.1,10.8].forEach(x=>[-6.65,6.65].forEach(z=>boundsCorners.push(new THREE.Vector3(x,0,z))));
  [[-9.7,5.65,-6.25],[9.7,5.65,-6.25],[-9.7,5.65,6.25],[-6.85,4.8,-4.35],[4.65,4.8,-4.35],[-6.85,4.8,3.8],[4.65,4.8,3.8],[9.85,2.98,3.4]].forEach(p=>boundsCorners.push(new THREE.Vector3(...p)));
  function fitCamera(){
    const orbit=.77+smooth(.04,1,progress)*.24;
    const elevation=.91-smooth(.05,.9,progress)*.12;
    camera.position.set(Math.sin(orbit)*Math.cos(elevation)*40,Math.sin(elevation)*40,Math.cos(orbit)*Math.cos(elevation)*40).add(cameraTarget);
    camera.lookAt(cameraTarget);camera.updateMatrixWorld();
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const corner of boundsCorners){const value=corner.clone().applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,value.x);maxX=Math.max(maxX,value.x);minY=Math.min(minY,value.y);maxY=Math.max(maxY,value.y);}
    const aspect=width/height;
    const half=Math.max((maxY-minY)/2,(maxX-minX)/2/aspect)*1.035;
    const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
    camera.left=centerX-half*aspect;camera.right=centerX+half*aspect;camera.bottom=centerY-half;camera.top=centerY+half;
    camera.updateProjectionMatrix();
  }
  const path=[[-7.79,-4.65],[-7.79,5.2],[7.69,5.2],[7.69,1.1]];
  const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));
  const pathLength=lengths.reduce((a,b)=>a+b,0);
  function alongPath(t){let distance=t*pathLength;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const u=clamp(distance/lengths[i]);return[path[i][0]+(path[i+1][0]-path[i][0])*u,path[i][1]+(path[i+1][1]-path[i][1])*u];}distance-=lengths[i];}return path[0];}
  function update(){
    rows.forEach((row,i)=>{const p=smooth(.07+i*.045,.36+i*.045,progress);row.visible=p>.001;row.scale.y=Math.max(.001,p);});
    palletGroups.forEach(group=>{const p=smooth(.25+group.userData.delay,.52+group.userData.delay,progress);group.visible=p>.001;group.position.y=(1-p)*1.8;group.scale.setScalar(.96+.04*p);group.userData.materials.forEach(m=>{m.opacity=p;});});
    const flow=smooth(.47,.73,progress);conveyor.visible=flow>.001;conveyor.scale.y=Math.max(.001,flow);
    movingBoxes.forEach((parcel,i)=>{const [x,z]=alongPath(.08+i*.17+smooth(.5,.97,progress)*.22);parcel.position.set(x,1.045,z);});
    const safe=smooth(.6,.82,progress);guards.visible=safe>.001;guards.scale.y=Math.max(.001,safe);
    const dock=smooth(.52,.8,progress);docks.visible=dock>.001;docks.scale.y=Math.max(.001,dock);
    shell.visible=progress>.57;shellMaterial.opacity=smooth(.57,.86,progress)*.37;
    blueprintMaterial.opacity=.46*(1-smooth(.12,.52,progress))+.045;
    fitCamera();
  }
  function render(){frame=0;if(disposed||isFallback)return;update();renderer.render(scene,camera);container.dataset.sceneReady='true';}
  function queue(){if(!frame&&!disposed&&!isFallback)frame=requestAnimationFrame(render);}
  function resize(){
    if(disposed||isFallback)return;
    const rect=container.getBoundingClientRect();width=Math.max(1,rect.width||800);height=Math.max(1,rect.height||600);
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,width<600?1.4:1.8));renderer.setSize(width,height,false);queue();
  }
  function setProgress(value){const next=clamp(Number(value)||0);if(next===progress&&container.dataset.sceneReady)return;progress=next;queue();}
  const observer=new ResizeObserver(resize);observer.observe(container);
  const onContextLost=event=>{event.preventDefault();if(disposed)return;isFallback=true;cancelAnimationFrame(frame);frame=0;fallback(container);};
  canvas.addEventListener('webglcontextlost',onContextLost,false);
  function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('webglcontextlost',onContextLost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();container.replaceChildren();delete container.dataset.renderer;delete container.dataset.sceneReady;}
  resize();
  return {setProgress,resize,destroy};
}
