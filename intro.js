/* 冒頭専用の演出。進行・探索には触れず、同じ画像上のカメラだけを動かす。 */
(function (root) {
  'use strict';
  const FRAMES = {
    landscape: { width:1536, height:1024, body:{x:686,y:431,width:165,height:409}, monitor:{x:719,y:465,width:98,height:134} },
    portrait: { width:1024, height:1536, body:{x:451,y:823,width:121,height:309}, monitor:{x:476,y:848,width:73,height:102} },
  };
  const PHASES = ['prologue', 'wide', 'approach', 'monitor', 'title'];
  const AUTO_DURATION = {wide:3200,approach:7800,monitor:5200,title:6600};
  const REDUCED_DURATION = {wide:2600,approach:2600,monitor:1800,title:5600};
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  class FadeoutIntro {
    constructor({mount, lines, stage='prologue', line=0, reduced=false, onCheckpoint, onComplete, onMotion}) {
      Object.assign(this, {mount, lines, reduced, onCheckpoint, onComplete, onMotion});
      this.disposed = false; this.paused = false; this.timer=null; this.due=null; this.remaining=null; this.waitingForImage=false;
      mount.innerHTML = `<section class="intro-experience" data-phase="prologue" aria-label="冒頭の演出">
        <div class="intro-world" aria-hidden="true"><div class="intro-world-plane">
          <picture><source media="(max-width:700px)" srcset="assets/images/intro-hall-portrait.webp"><img class="intro-world-image" src="assets/images/intro-hall.webp" alt="" fetchpriority="high" decoding="async"></picture>
          <div class="intro-screen-surface"></div>
        </div></div>
        <div class="intro-monitor-veil" aria-hidden="true"></div>
        <div class="intro-title-card" aria-hidden="true"><h1><img src="assets/title-logo.svg" alt="フェードアウトはセルフでお願いします。" width="720" height="570" decoding="async"></h1></div>
        <div class="intro-dark"><p class="intro-line" id="intro-line" aria-live="polite" aria-atomic="true"></p></div>
        <p class="intro-scene-description sr-only" aria-live="polite"></p>
        <button class="intro-advance" data-intro-action="next" aria-label="次の場面へ進む"><span class="intro-tap-label">タップして次へ<span aria-hidden="true"> →</span></span></button>
        <div class="intro-tools"><button data-intro-action="motion" aria-pressed="${reduced}">${reduced ? '動き軽減 ON' : '動きを少なく'}</button><button data-intro-action="skip">案内へスキップ</button></div>
      </section>`;
      this.element = mount.querySelector('.intro-experience');
      this.plane = mount.querySelector('.intro-world-plane');
      this.image = mount.querySelector('.intro-world-image');
      this.lineElement = mount.querySelector('.intro-line');
      this.surface = mount.querySelector('.intro-screen-surface');
      this.onClick = event => {
        const button = event.target.closest('[data-intro-action]');
        if (!button) return;
        event.preventDefault();
        if (button.dataset.introAction === 'next') this.next();
        if (button.dataset.introAction === 'skip') this.finish();
        if (button.dataset.introAction === 'motion') this.onMotion?.();
      };
      this.onResize = () => this.camera(false);
      this.onImageLoad = () => { this.camera(false); if(this.waitingForImage && this.stage==='wide') { this.waitingForImage=false; this.schedule(this.duration()); } };
      this.onImageError = () => { this.element.classList.add('image-unavailable'); this.mount.querySelector('.intro-scene-description').textContent = '背景画像を読み込めませんでした。ご利用案内へスキップできます。'; if(this.waitingForImage) {this.waitingForImage=false;this.schedule(this.duration());} };
      this.element.addEventListener('click', this.onClick);
      this.image.addEventListener('load', this.onImageLoad);
      this.image.addEventListener('error', this.onImageError);
      window.addEventListener('resize', this.onResize);
      this.setReduced(reduced);
      this.show(PHASES.includes(stage) ? stage : 'prologue', Math.max(0, Math.min(lines.length - 1, line)));
    }
    frame() { return this.image.currentSrc.includes('portrait') || (!this.image.currentSrc && matchMedia('(max-width:700px)').matches) ? FRAMES.portrait : FRAMES.landscape; }
    camera(animate=true) {
      if (this.disposed) return;
      const frame = this.frame(), vw = this.element.clientWidth, vh = this.element.clientHeight;
      const fit = Math.max(vw/frame.width, vh/frame.height);
      let scale = fit, x = (vw-frame.width*fit)/2, y = (vh-frame.height*fit)/2;
      if (this.stage === 'approach') {
        const b=frame.body;
        scale=Math.max(fit, Math.min(vh*.58/b.height, vw*.60/b.width));
        x=vw/2-(b.x+b.width/2)*scale;
        y=vh*.52-(b.y+b.height/2)*scale;
      } else if (this.stage === 'monitor' || this.stage === 'title') {
        // A small drift into a white dissolve, instead of a large screen-filling rush.
        const b=frame.body;
        const near=Math.max(fit,Math.min(vh*.58/b.height,vw*.60/b.width));
        scale=near*1.12;
        x=vw/2-(b.x+b.width/2)*scale;
        y=vh*.56-(b.y+b.height/2)*scale;
      }
      const duration=this.stage === 'approach' ? 7000 : this.stage === 'monitor' ? 5000 : 0;
      Object.assign(this.plane.style, {width:frame.width+'px',height:frame.height+'px',transition:animate&&!this.reduced ? `transform ${duration}ms cubic-bezier(.45,0,.55,1)` : 'none',transform:`translate(${x}px,${y}px) scale(${scale})`});
      const s=frame.monitor;
      Object.assign(this.surface.style,{left:s.x+'px',top:s.y+'px',width:s.width+'px',height:s.height+'px'});
      this.element.dataset.frame=frame===FRAMES.portrait ? 'portrait' : 'landscape';
    }
    show(stage, line=0) {
      if(this.disposed) return;
      clearTimeout(this.timer); this.timer=null; this.due=null; this.remaining=null; this.waitingForImage=false;
      const previous=this.stage==='prologue'?this.lines[this.line]:null;
      this.stage=stage; this.line=line;
      this.element.dataset.phase=stage;
      this.mount.querySelector('.intro-advance').hidden=stage!=='prologue';
      this.mount.querySelector('.intro-title-card').setAttribute('aria-hidden',String(stage!=='title'));
      this.onCheckpoint?.({stage,line});
      if(stage === 'prologue') {
        const text=this.lines[line];
        // Only a user action changes the passage. Its text stays readable until the next tap.
        this.lineElement.innerHTML=`${previous?`<span class="intro-passage-out" aria-hidden="true">${escape(previous)}</span>`:''}<span class="intro-passage-current">${escape(text)}</span>`;
        this.mount.querySelector('.intro-tap-label').textContent='タップして次へ →';
        this.mount.querySelector('.intro-advance').setAttribute('aria-label','次のモノローグへ進む');
        this.camera(false);
      } else {
        this.lineElement.innerHTML=previous?`<span class="intro-passage-out" aria-hidden="true">${escape(previous)}</span>`:'';
        const description={wide:'高い白い柱と雲の見える空間。花のそばに、一台の受付機が立っている。',approach:'同じ受付機へゆっくり近づく。人物はいない。',monitor:'受付機のモニターへ近づく。',title:'フェードアウトはセルフでお願いします。'}[stage];
        this.mount.querySelector('.intro-scene-description').textContent=description;
        this.mount.querySelector('.intro-tap-label').textContent='';
        this.camera(stage!=='title');
        if(stage==='wide' && !this.image.complete) this.waitingForImage=true;
        else this.schedule(this.duration());
      }
    }
    duration() { return (this.reduced?REDUCED_DURATION:AUTO_DURATION)[this.stage]; }
    schedule(ms) {
      clearTimeout(this.timer); this.remaining=ms; this.due=performance.now()+ms;
      if(!this.paused) this.timer=setTimeout(()=>this.advanceCamera(),ms);
    }
    advanceCamera() {
      if(this.disposed) return;
      if(this.stage==='wide') this.show('approach');
      else if(this.stage==='approach') this.show('monitor');
      else if(this.stage==='monitor') this.show('title');
      else if(this.stage==='title') this.finish();
    }
    next() {
      if(this.disposed || this.stage!=='prologue') return;
      if(this.stage==='prologue' && this.line<this.lines.length-1) this.show('prologue',this.line+1);
      else this.show('wide');
    }
    setReduced(reduced) {
      this.reduced=reduced;
      this.element.classList.toggle('is-reduced',reduced);
      const button=this.mount.querySelector('[data-intro-action="motion"]');
      button.textContent=reduced?'動き軽減 ON':'動きを少なく'; button.setAttribute('aria-pressed',String(reduced));
      this.camera(false);
      if(this.due!==null) this.schedule(Math.min(Math.max(0,this.paused?this.remaining:this.due-performance.now()),this.duration()));
    }
    setPaused(paused) {
      if(this.disposed || paused===this.paused) return;
      this.paused=paused;
      if(paused && this.due!==null) {this.remaining=Math.max(0,this.due-performance.now());clearTimeout(this.timer);}
      this.element.getAnimations({subtree:true}).forEach(animation=>{ if(paused) animation.pause(); else animation.play(); });
      if(!paused && this.remaining!==null) this.schedule(this.remaining);
    }
    finish() { if(this.disposed) return; this.dispose(); this.onComplete?.(); }
    dispose() {
      this.disposed=true; clearTimeout(this.timer);
      this.element.removeEventListener('click',this.onClick);
      this.image.removeEventListener('load',this.onImageLoad);
      this.image.removeEventListener('error',this.onImageError);
      window.removeEventListener('resize',this.onResize);
    }
  }
  root.FadeoutIntro=FadeoutIntro;
})(window);
