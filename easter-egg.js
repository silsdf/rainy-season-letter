/* Installed inside the existing act-four scene; no main-story or afterword changes. */
window.installEasterEgg = function ({root, stage, setPhase, wait, buttonArt}) {
  const asset = name => new URL('./' + name, document.baseURI).href;
  // Coordinates refer to the existing 1536 × 1024 carriage artwork.
  const clues = [
    {id:'jupiter', label:'木星', pair:'木星', rect:[98,204,96,94]},
    {id:'city', label:'城市', pair:'summer', rect:[320,474,82,78]},
    {id:'tablet', label:'平板', pair:'train to Changsha', rect:[745,727,269,193]},
    {id:'grapes', label:'提子', pair:'20', rect:[1405,685,89,109]}
  ];
  // Final centres are percentages of the scene. Add a third paper here.
  const dialogueText = {
    jupiter:'\u5728\u5357\u5b81\u4e1c\u7ad9\u7b49\u4f60\u56de\u6765\u7684\u65f6\u5019\uff0c\u5929\u4e0a\u6709\u4e00\u9897\u597d\u4eae\u7684\u6728\u661f',
    city:'\u521a\u5f00\u5b66\u7684\u590f\u5929\u7ed9\u4f60\u4e70\u4e86\u82b1\u82b1\u6c14\u7403\uff0c\u4f60\u8dd1\u5f97\u597d\u5feb',
    tablet:'\u53bb\u957f\u6c99\u7684\u8def\u4e0a\u548c\u4f60\u4e00\u8d77\u770b\u2018\u5317\u6597\u4e03\u661f\u2019',
    grapes:'\u6211\u8fd8\u8bb0\u5f97\u7b2c\u4e00\u6b21\u966a\u4f60\u8fc7\u7684\u0032\u0030\u5c81\u751f\u65e5'
  };
  const paperLayout = [
    {kind:'photo', x:36, y:48, maxWidth:45, maxHeight:74, rotation:-7, startX:-18, startRotation:15, delay:0, duration:760},
    {kind:'card', x:64, y:56, maxWidth:47, maxHeight:44, rotation:5, startX:21, startRotation:-17, delay:220, duration:700}
  ];
  let view, art, foreground, dialogue, back, menuBack, active=false, locked=false, selected=null;
  const used=new Set(), buttons=new Map(), patches=new Map();
  const prepared=new Map();
  const background=new Image(), clean=new Image();
  background.src=asset('carriage.png');clean.src=asset('carriage-clean.png');
  // Start decoding eagerly, but handle loading failures at the entry point.
  const ready=Promise.all([background.decode(),clean.decode()]);ready.catch(()=>{});
  const eggMusic=new Audio(asset('easter-egg.mp4'));eggMusic.loop=true;eggMusic.preload='auto';eggMusic.volume=0;
  let musicGeneration=0,musicFade=null;
  function fadeMusicTo(target,duration,token){
    if(musicFade)cancelAnimationFrame(musicFade);const from=eggMusic.volume,start=performance.now();
    const step=now=>{if(token!==musicGeneration)return;const t=Math.min(1,(now-start)/duration);eggMusic.volume=from+(target-from)*(t*(2-t));if(t<1)musicFade=requestAnimationFrame(step);else musicFade=null;};
    musicFade=requestAnimationFrame(step);
  }
  function startEggMusic(){
    const token=++musicGeneration;eggMusic.volume=0;eggMusic.currentTime=0;
    try{Promise.resolve(eggMusic.play()).then(()=>{if(token===musicGeneration&&active)fadeMusicTo(.8,1300,token);}).catch(report);}catch(error){report(error);}
  }
  function stopEggMusic(){
    musicGeneration++;if(musicFade)cancelAnimationFrame(musicFade);musicFade=null;eggMusic.pause();eggMusic.volume=0;eggMusic.currentTime=0;
  }
  function state(value){setPhase(value);root.dataset.easterEggState=value;}
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function crop(image,rect){const c=document.createElement('canvas');c.setAttribute('aria-hidden','true');c.width=rect[2];c.height=rect[3];c.getContext('2d').drawImage(image,...rect,0,0,c.width,c.height);return c;}
  function position(el,[x,y,w,h]){Object.assign(el.style,{left:x/1536*100+'%',top:y/1024*100+'%',width:w/1536*100+'%',height:h/1024*100+'%'});}
  function syncButtons(){for(const [id,b] of buttons)b.disabled=locked||used.has(id);}
  function report(error){root.dataset.easterEggError=String(error);console.error(error);}
  function build(){
    const css=document.createElement('style');css.textContent=`
    #cloud-drift .egg-view{position:absolute;inset:0;z-index:15;background:#252c33;pointer-events:auto;overflow:hidden}
    #cloud-drift .egg-view:focus{outline:0}
    #cloud-drift .egg-view[hidden],#cloud-drift .egg-view [hidden]{display:none!important}
    #cloud-drift .egg-art{position:absolute;overflow:hidden;background:center/100% 100% no-repeat;container-type:size}
    #cloud-drift .egg-patch,#cloud-drift .egg-clue{position:absolute;border:0;padding:0;background:none}
    #cloud-drift .egg-patch{pointer-events:none}
    #cloud-drift .egg-clue{cursor:pointer;touch-action:manipulation;transform-origin:50% 65%}
    #cloud-drift .egg-clue::after{content:'';position:absolute;inset:min(0px,calc((100% - 44px)/2))}
    #cloud-drift .egg-clue canvas{display:block;width:100%;height:100%}
    #cloud-drift .egg-clue:focus-visible{outline:0;filter:drop-shadow(0 0 5px #f4e9ce)}
    #cloud-drift .egg-foreground{position:absolute;inset:0;pointer-events:none}
    #cloud-drift .egg-dialogue{position:absolute;z-index:3;left:6%;bottom:2.5%;box-sizing:border-box;width:88%;min-height:15%;padding:2% 7%;display:flex;align-items:center;justify-content:center;border:0;background:transparent var(--egg-button-art) center/100% 100% no-repeat;box-shadow:none;color:#48545a;text-align:center;font:clamp(14px,1.8cqw,24px)/1.55 KaiTi,STKaiti,serif;letter-spacing:.04em;text-shadow:0 1px 4px #fff8;pointer-events:none;opacity:0;transition:opacity 180ms ease}
    #cloud-drift .egg-dialogue.visible{opacity:1}
    #cloud-drift .egg-paper{position:absolute;box-sizing:border-box;margin:0;transform:translate(-50%,-50%) rotate(var(--rotation));box-shadow:2px 7px 13px #111a2340;will-change:transform}
    #cloud-drift .egg-paper img{display:block;width:100%;height:100%;object-fit:contain}
    #cloud-drift .egg-paper.photo{padding:clamp(3px,.65cqw,10px);background:#f6f0e3}
    #cloud-drift .egg-return{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:5;min-width:110px;min-height:48px;padding:9px 22px;border:0;background:transparent var(--egg-button-art) center/100% 100% no-repeat;color:#43535c;font:18px KaiTi,STKaiti,serif;cursor:pointer;touch-action:manipulation}
    #cloud-drift .egg-return:focus-visible{outline:0;filter:drop-shadow(0 0 4px #f4e9ce)}
    `;document.head.append(css);
    view=document.createElement('section');view.className='egg-view';view.setAttribute('aria-label','车厢里的回忆');view.tabIndex=-1;view.hidden=true;view.style.setProperty('--egg-button-art','url("'+buttonArt+'")');
    art=document.createElement('div');art.className='egg-art';art.style.backgroundImage='url("'+background.src+'")';view.append(art);
    for(const clue of clues){
      const patch=crop(clean,clue.rect);patch.className='egg-patch';position(patch,clue.rect);patch.hidden=true;art.append(patch);patches.set(clue.id,patch);
      const b=document.createElement('button');b.type='button';b.className='egg-clue';b.dataset.clue=clue.id;b.setAttribute('aria-label',clue.label+'线索');position(b,clue.rect);b.append(crop(background,clue.rect));
      b.addEventListener('click',()=>trigger(clue).catch(report));art.append(b);buttons.set(clue.id,b);
    }
    foreground=document.createElement('div');foreground.className='egg-foreground';art.append(foreground);
    dialogue=document.createElement('div');dialogue.className='egg-dialogue';dialogue.setAttribute('role','note');dialogue.setAttribute('aria-live','polite');art.append(dialogue);
    back=document.createElement('button');back.type='button';back.className='egg-return';back.textContent='返回车厢';back.hidden=true;back.addEventListener('click',returnToCarriage);view.append(back);
    menuBack=document.createElement('button');menuBack.type='button';menuBack.className='egg-return';menuBack.textContent='返回';menuBack.addEventListener('click',()=>{if(locked)return;stopEggMusic();view.hidden=true;active=false;state('LETTER_CLOSED');stage.querySelector('.birthday-letter')?.removeAttribute('inert');stage.querySelector('.letter-menu button:last-child')?.focus();});view.append(menuBack);
    view.addEventListener('keydown',e=>{if(e.key==='Escape'&&!back.hidden){e.preventDefault();returnToCarriage();}});
    stage.append(view);
    const fit=()=>{const b=stage.getBoundingClientRect(),s=Math.min(b.width/1536,b.height/1024);Object.assign(art.style,{width:1536*s+'px',height:1024*s+'px',left:(b.width-1536*s)/2+'px',top:(b.height-1024*s)/2+'px'});};
    new ResizeObserver(fit).observe(stage);fit();
  }
  async function start(){
    if(active)return;active=true;startEggMusic();
    try{await ready;await Promise.all(clues.filter(c=>!used.has(c.id)).map(async c=>{prepared.set(c.id,await preparePapers(c));}));if(!view)build();view.hidden=false;stage.querySelector('.birthday-letter')?.setAttribute('inert','');state('EASTER_EGG_CLUE_IDLE');syncButtons();view.focus({preventScroll:true});}
    catch(error){active=false;stopEggMusic();throw error;}
  }
  async function preparePapers(clue){
    return Promise.all(paperLayout.map(async layout=>{
      const img=new Image();img.src=layout.src||asset(clue.pair+(layout.kind==='photo'?'.jpg':'.png'));img.alt=clue.label+(layout.kind==='photo'?'照片':'剪贴记忆卡');await img.decode();
      const paper=document.createElement('figure');paper.className='egg-paper '+layout.kind;paper.dataset.kind=layout.kind;
      const ratio=img.naturalWidth/img.naturalHeight,width=Math.min(layout.maxWidth,layout.maxHeight*ratio/1.5),height=width*1.5/ratio;
      Object.assign(paper.style,{left:layout.x+'%',top:layout.y+'%',width:width+'%',height:height+'%'});paper.style.setProperty('--rotation',layout.rotation+'deg');paper.append(img);return {paper,layout};
    }));
  }
  // Only the clue fades. Both paper animations contain transforms only.
  async function dismissClue(clue){
    const b=buttons.get(clue.id);patches.get(clue.id).hidden=false;
    await b.animate([{transform:'scale(1)'},{transform:'translateY(2px) scale(.96)'},{transform:'scale(.985)'}],{duration:reduced()?60:160,easing:'ease-out',fill:'forwards'}).finished;
    state('CLUE_DISAPPEARING');
    await b.animate([{opacity:1,transform:'scale(.985)'},{opacity:0,transform:'translateY(-5px) scale(.87)'}],{duration:reduced()?60:190,easing:'ease-in',fill:'forwards'}).finished;b.hidden=true;
  }
  async function dropPaper({paper,layout:p}){
    await wait(reduced()?p.delay/3:p.delay);
    foreground.append(paper);
    // cqw/cqh follow the existing fitted carriage even when the viewport rotates.
    const transform=(x,y,r)=>`translate(-50%,-50%) translate(${x}cqw,${y}cqh) rotate(${r}deg)`;
    const frames=reduced()?[
      {transform:transform(0,-115,p.rotation)},{transform:transform(0,0,p.rotation)}
    ]:[
      {offset:0,transform:transform(p.startX,-115,p.startRotation),easing:'cubic-bezier(.28,.38,.48,1)'},
      {offset:.72,transform:transform(p.startX*.12,-3,p.rotation-2),easing:'cubic-bezier(.2,.65,.3,1)'},
      {offset:.91,transform:transform(1,.6,p.rotation+.5),easing:'ease-out'},
      {offset:1,transform:transform(0,0,p.rotation)}
    ];
    const animation=paper.animate(frames,{duration:reduced()?160:p.duration,fill:'both'});await animation.finished;
    paper.style.transform=transform(0,0,p.rotation);animation.cancel();paper.style.willChange='auto';
  }
  async function trigger(clue){
    if(!active||locked||used.has(clue.id))return;
    locked=true;selected=clue;syncButtons();menuBack.hidden=true;state('EASTER_EGG_CLUE_TRIGGERED');
    try{
      // Decode before retiring the clue, so missing images never consume it.
      const papers=prepared.get(clue.id)||await preparePapers(clue);await dismissClue(clue);used.add(clue.id);
      state('PHOTO_AND_CARD_FALLING');dialogue.textContent=dialogueText[clue.id];dialogue.classList.add('visible');await Promise.all(papers.map(dropPaper));state('EASTER_EGG_REVEALED');back.hidden=false;back.focus();
    }catch(error){
      foreground.replaceChildren();dialogue.classList.remove('visible');dialogue.textContent='';used.delete(clue.id);const b=buttons.get(clue.id);b.hidden=false;b.getAnimations().forEach(a=>a.cancel());patches.get(clue.id).hidden=true;locked=false;menuBack.hidden=false;syncButtons();state('EASTER_EGG_CLUE_IDLE');b.focus();throw error;
    }
  }
  function returnToCarriage(){
    if(root.dataset.easterEggState!=='EASTER_EGG_REVEALED')return;
    foreground.replaceChildren();dialogue.classList.remove('visible');dialogue.textContent='';back.hidden=true;menuBack.hidden=false;locked=false;syncButtons();state('EASTER_EGG_CLUE_IDLE');(Array.from(buttons.values()).find(b=>!b.disabled)||menuBack).focus();
  }
  stage.addEventListener('letter-extra',()=>start().catch(report));
  return {start, paperLayout, snapshot:()=>({state:root.dataset.easterEggState,used:[...used],selected:selected?.id,locked})};
};

