/* 未照合の消去ボタンだけに描く、ランダムな信号の乱れ。 */
(function(root) {
  'use strict';
  class FadeoutButtonNoise {
    constructor(button,{reduced=false,paused=false}={}) {
      this.button=button; this.reduced=reduced; this.paused=paused; this.disposed=false;
      this.canvas=document.createElement('canvas'); this.canvas.className='erase-noise'; this.canvas.setAttribute('aria-hidden','true'); button.append(this.canvas);
      this.context=this.canvas.getContext('2d');
      this.grain=document.createElement('canvas'); this.grain.width=96; this.grain.height=48;
      this.grainContext=this.grain.getContext('2d');
      this.label=button.querySelector('strong');
      this.onResize=()=>{this.resize();this.paint(.15);};
      if(typeof ResizeObserver!=='undefined') {this.observer=new ResizeObserver(this.onResize);this.observer.observe(button);}
      this.resize(); this.setReduced(reduced);
    }
    resize() {
      this.width=Math.max(1,Math.round(this.button.clientWidth)); this.height=Math.max(1,Math.round(this.button.clientHeight));
      this.canvas.width=this.width; this.canvas.height=this.height;
      const style=getComputedStyle(this.label);
      this.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      this.fontSize=parseFloat(style.fontSize);
      this.labelX=this.label.offsetLeft; this.labelY=this.label.offsetTop+this.fontSize*.85;
    }
    paint(intensity) {
      if(this.disposed || !this.context || !this.grainContext) return;
      const ctx=this.context,w=this.width,h=this.height;
      const noise=this.grainContext.createImageData(96,48),pixels=noise.data;
      for(let i=0;i<pixels.length;i+=4) {
        const light=Math.random()>.53;
        pixels[i]=light?238:39; pixels[i+1]=light?242:49; pixels[i+2]=light?245:58;
        pixels[i+3]=Math.floor(Math.random()*48*intensity);
      }
      this.grainContext.putImageData(noise,0,0);
      ctx.clearRect(0,0,w,h); ctx.imageSmoothingEnabled=false; ctx.drawImage(this.grain,0,0,w,h);
      const bars=Math.ceil(3+Math.random()*6*intensity);
      for(let i=0;i<bars;i++) {
        const y=Math.random()*h,height=1+Math.random()*4;
        ctx.fillStyle=['rgba(37,47,56,.66)','rgba(247,249,251,.76)','rgba(98,113,126,.65)'][Math.floor(Math.random()*3)];
        ctx.globalAlpha=.25+intensity*.6;
        ctx.fillRect(Math.random()*w*.55,y,w*(.14+Math.random()*.4),height);
      }
      ctx.globalAlpha=1;
      if(intensity>.3) {
        ctx.font=this.font; ctx.textBaseline='alphabetic';
        for(let i=0;i<4;i++) {
          ctx.save(); ctx.beginPath();ctx.rect(0,this.labelY-this.fontSize+Math.random()*this.fontSize,w,2+Math.random()*6);ctx.clip();
          ctx.fillStyle=i%2?'#f7f8fa':'#445564';ctx.fillText(this.label.textContent,this.labelX+(Math.random()-.5)*22,this.labelY);ctx.restore();
        }
      }
    }
    resetShift() {
      this.button.classList.remove('is-noisy');
      this.button.style.removeProperty('--noise-x');this.button.style.removeProperty('--noise-y');this.button.style.removeProperty('--noise-skew');
    }
    cancel() {clearTimeout(this.frameTimer);clearTimeout(this.idleTimer);this.frameTimer=null;this.idleTimer=null;}
    queueIdle() {
      if(this.disposed || this.reduced || this.paused) return;
      this.idleTimer=setTimeout(()=>this.burst(260+Math.random()*180,.4),2400+Math.random()*3800);
    }
    burst(duration,intensity) {
      this.cancel();
      if(this.disposed || this.paused) return;
      if(this.reduced) {this.paint(.18);return;}
      const end=performance.now()+duration;
      this.button.classList.add('is-noisy');
      const frame=()=>{
        if(this.disposed || this.paused || this.reduced) return;
        if(performance.now()>=end) {this.resetShift();this.paint(.12);this.queueIdle();return;}
        this.button.style.setProperty('--noise-x',((Math.random()-.5)*12*intensity).toFixed(2)+'px');
        this.button.style.setProperty('--noise-y',((Math.random()-.5)*6*intensity).toFixed(2)+'px');
        this.button.style.setProperty('--noise-skew',((Math.random()-.5)*9*intensity).toFixed(2)+'deg');
        this.paint(intensity);
        this.frameTimer=setTimeout(frame,38+Math.random()*25);
      };
      frame();
    }
    trigger() {this.burst(900,1);}
    setReduced(reduced) {
      this.reduced=reduced;this.cancel();this.resetShift();
      this.button.classList.toggle('noise-reduced',reduced);this.paint(.15);this.queueIdle();
    }
    setPaused(paused) {
      this.paused=paused;this.cancel();this.resetShift();
      if(!paused) {this.paint(.15);this.queueIdle();}
    }
    dispose() {
      this.disposed=true;this.cancel();this.observer?.disconnect();this.resetShift();this.canvas.remove();this.button.classList.remove('noise-reduced');
    }
  }
  root.FadeoutButtonNoise=FadeoutButtonNoise;
})(window);
