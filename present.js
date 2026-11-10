/* EP001の現在。探索・消去の判定には触れず、試みと反応だけを保存する。 */
(function(root){
  'use strict';
  const hand='<svg viewBox="0 0 60 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 98 17 73C8 63 5 51 9 48c4-3 8 8 12 9L17 17c0-6 7-7 8-1l5 31-2-38c0-7 7-8 8-1l3 38 1-32c0-7 7-7 7 0l-1 36 4-21c1-6 8-4 7 2l-3 35c-1 11-6 17-8 23l2 9"/></svg>';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  class FadeoutPresent {
    static markup(d){return `<section class="present-page" aria-labelledby="present-title"><header class="present-header"><div><span class="eyebrow">履歴001 / 対象者の現状確認</span><h1 id="present-title">${esc(d.title)}</h1><p>現在 · ${esc(d.location)}</p></div><button class="back-button" data-action="episode">手続きへ →</button></header><div class="present-layout"><div class="present-stage" role="region" aria-label="現在の寝室。下の手を背中に向かって動かせます。ボタンでも操作できます。"><div class="present-picture"><img class="present-image" src="${d.image}" alt="${esc(d.description)}"><div class="present-curtain" aria-hidden="true"></div><div class="present-shoulders" aria-hidden="true"></div></div><span class="present-time">現在 / 夜の寝室</span><button class="present-region person-region" data-present-action="reach" aria-label="背中に手を伸ばす"></button><button class="present-region window-region" data-present-action="window" aria-label="カーテンに手を伸ばす"></button><button class="present-region phone-region" data-present-action="object" aria-label="スマートフォンに触れようとする"></button><p class="present-sensation" aria-hidden="true"></p><span class="present-hand" aria-hidden="true">${hand}</span><div class="reach-rail"><button class="reach-token" data-present-action="reach" aria-label="手を背中へ動かす。タップ、Enter、Spaceでも試せます。">${hand}<span>手を背中へ動かす</span><span aria-hidden="true">↖</span></button></div></div><div class="present-panel"><p class="present-caption" role="status"></p><div class="present-response" aria-live="polite" aria-atomic="true"></div><div class="present-actions"><button class="outline-button" data-present-action="reach">背中に手を伸ばす</button><button class="outline-button" data-present-action="window">窓辺に手を伸ばす</button><button class="text-button" data-present-action="object">枕元に触れてみる</button><button class="text-button" data-present-action="near" aria-pressed="false">少し近づく</button></div><p class="present-help">画面下の手を、背中に向かって動かせます。<br>上のボタンでも、同じことを試せます。</p><div class="present-next"><p>次に、過去の記憶を確認します。</p><button class="solid-button" data-action="finish-present">過去の記憶を確認する →</button><p class="small-note">この人が記憶の消去を望んでいるかは、わからない。</p></div></div></div></section>`;}
    constructor({mount,data,progress,reduced=false,onChange,onSound}){
      Object.assign(this,{mount,data,progress,reduced,onChange,onSound});this.disposed=false;this.paused=document.hidden;this.drag=null;this.suppressClick=0;this.sounds=new Set();
      this.stage=mount.querySelector('.present-stage');this.hand=mount.querySelector('.present-hand');this.token=mount.querySelector('.reach-token');
      this.click=e=>{const b=e.target.closest('[data-present-action]');if(b){e.preventDefault();if(performance.now()<this.suppressClick)return;this.act(b.dataset.presentAction);}else if(e.target.closest('.present-picture'))this.respond('withdraw');};
      this.down=e=>{if(e.button!==0)return;e.preventDefault();this.token.setPointerCapture(e.pointerId);this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,amount:0};this.hand.style.opacity='.8';this.moveHand(.69,.85);};
      this.move=e=>{if(!this.drag||e.pointerId!==this.drag.id)return;const r=this.stage.getBoundingClientRect();this.drag.amount=Math.max(0,Math.min(1,(this.drag.y-e.clientY)/(r.height*.32)));const t=this.drag.amount;this.moveHand(.69-(.69-.59)*t,.85-(.85-.43)*t);};
      this.up=e=>{if(!this.drag||e.pointerId!==this.drag.id)return;const moved=Math.hypot(e.clientX-this.drag.x,e.clientY-this.drag.y);const reached=this.drag.amount>.75||moved<8;this.drag=null;this.suppressClick=performance.now()+300;this.hand.style.opacity='';if(reached)this.act('reach');else this.respond('withdraw');};
      this.cancel=()=>{if(!this.drag)return;this.drag=null;this.hand.style.opacity='';this.respond('withdraw');};
      mount.addEventListener('click',this.click);this.token.addEventListener('pointerdown',this.down);this.token.addEventListener('pointermove',this.move);this.token.addEventListener('pointerup',this.up);this.token.addEventListener('pointercancel',this.cancel);
      const first=!progress.entered;progress.entered=true;this.onChange();this.setReduced(reduced);this.updateScene();this.respond(progress.last,false);
      if(first)this.sound('sobQuiet');
    }
    sound(id){const sources=this.onSound(id);if(Array.isArray(sources))for(const node of sources.filter(Boolean)){this.sounds.add(node);node.addEventListener('ended',()=>this.sounds.delete(node),{once:true});}}
    moveHand(x,y){this.hand.style.left=x*100+'%';this.hand.style.top=y*100+'%';}
    respond(key,save=true){
      let response=key;
      if(key==='reach')response=this.progress.window?'reachAfterWind':this.progress.reach>1?'reachAgain':'reach';
      if(key==='window'&&this.progress.window>1)response='windowAgain';
      const d=this.data.responses[response]||this.data.responses.intro;
      this.mount.querySelector('.present-response').innerHTML=d.text.split('\n').map(p=>`<p>${esc(p)}</p>`).join('');this.mount.querySelector('.present-caption').textContent='♪ '+d.caption;
      this.mount.querySelector('.present-sensation').textContent=this.data.sensations[key]||'';
      if(save){this.progress.last=key;this.onChange();}
    }
    act(action){
      if(this.disposed||this.paused)return;
      if(action==='near'){this.progress.near=!this.progress.near;this.updateScene();this.respond(this.progress.near?'look':'withdraw');return;}
      if(!['reach','window','object'].includes(action))return;
      this.progress[action]=Math.min(9,this.progress[action]+1);
      if(action==='reach'){
        this.progress.near=true;this.updateScene();this.hand.getAnimations().forEach(a=>a.cancel());this.hand.style.opacity='';this.moveHand(.59,.43);
        if(!this.reduced)this.hand.animate([{left:'69%',top:'85%',opacity:0},{left:'64%',top:'53%',opacity:.9,offset:.6},{left:'64%',top:'53%',opacity:0}],{duration:1600,easing:'ease-in-out'});
        else this.hand.style.opacity='.6';
      }
      if(action==='window'){
        this.stage.classList.remove('has-breeze');void this.stage.offsetWidth;this.stage.classList.add('has-breeze');
        clearTimeout(this.windTimer);this.windTimer=setTimeout(()=>{if(!this.disposed)this.stage.classList.remove('has-breeze');},5200);
        if(this.lastWindSound===undefined||performance.now()-this.lastWindSound>1200){this.sound('clearWind');this.lastWindSound=performance.now();}
      }
      this.updateScene();this.respond(action);
    }
    updateScene(){this.stage.classList.toggle('is-near',this.progress.near);this.stage.classList.toggle('wind-seen',this.progress.window>0);const b=this.mount.querySelector('[data-present-action="near"]');b.textContent=this.progress.near?'少し離れる':'少し近づく';b.setAttribute('aria-pressed',String(this.progress.near));}
    setReduced(reduced){this.reduced=reduced;this.mount.classList.toggle('present-reduced',reduced);if(reduced)this.hand.getAnimations().forEach(a=>a.cancel());}
    setPaused(paused){this.paused=paused;this.mount.classList.toggle('present-paused',paused);this.mount.getAnimations({subtree:true}).forEach(a=>paused?a.pause():a.play());if(paused)this.cancel();}
    dispose(){this.disposed=true;for(const node of this.sounds){try{node.stop();node.disconnect();}catch{}}this.sounds.clear();clearTimeout(this.windTimer);this.mount.getAnimations({subtree:true}).forEach(a=>a.cancel());this.mount.removeEventListener('click',this.click);this.token.removeEventListener('pointerdown',this.down);this.token.removeEventListener('pointermove',this.move);this.token.removeEventListener('pointerup',this.up);this.token.removeEventListener('pointercancel',this.cancel);}
  }
  root.FadeoutPresent=FadeoutPresent;
})(window);
