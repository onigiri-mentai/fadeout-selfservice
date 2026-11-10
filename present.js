/* EP001の現在。探索・消去の判定には触れず、試みと反応だけを保存する。 */
(function(root){
  'use strict';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  class FadeoutPresent {
    static markup(d){
      const spots=[['reach','背中',37,46],['window','窓辺',73,31],['object','スマートフォン',79,74]];
      const hotspots=spots.map(([action,label,x,y])=>`<button class="hotspot present-hotspot" data-present-action="${action}" style="left:${x}%;top:${y}%" aria-label="${label}を調べる"><span class="spot-dot" aria-hidden="true"></span><span class="spot-label" aria-hidden="true">${label}</span></button>`).join('');
      const list=spots.map(([action,label])=>`<button class="outline-button" data-present-action="${action}">${label}</button>`).join('');
      return `<section class="present-page" aria-labelledby="present-title">
        <header class="present-header"><div><span class="eyebrow">履歴001 / 対象者の現状確認</span><h1 id="present-title">${esc(d.title)}</h1><p>現在 · ${esc(d.location)}</p></div><button class="back-button" data-action="episode">手続きへ →</button></header>
        <div class="present-layout"><div class="present-stage" role="region" aria-label="現在の寝室。気になる場所の丸印を押すと調べられます。">
          <div class="present-picture"><img class="present-image" src="${d.image}" alt="${esc(d.description)}"><div class="present-curtain" aria-hidden="true"></div><div class="present-shoulders" aria-hidden="true"></div>${hotspots}</div>
          <span class="present-time">現在 / 夜の寝室</span><p class="present-sensation" aria-hidden="true"></p>
        </div><div class="present-panel">
          <p class="present-caption" role="status"></p><div class="present-response" aria-live="polite" aria-atomic="true"></div>
          <p class="present-help">気になる場所の丸印を押して、調べてみる。</p>
          <div class="present-tools"><button class="text-button" data-present-action="near" aria-pressed="false">少し近づく</button><details class="present-places"><summary>調べる場所</summary><div class="present-actions">${list}</div></details></div>
          <div class="present-next"><p>次に、過去の記憶を確認します。</p><button class="solid-button" data-action="finish-present">過去の記憶を確認する →</button><p class="small-note">この人が記憶の消去を望んでいるかは、わからない。</p></div>
        </div></div></section>`;
    }
    constructor({mount,data,progress,reduced=false,onChange,onSound}){
      Object.assign(this,{mount,data,progress,reduced,onChange,onSound});this.disposed=false;this.paused=document.hidden;this.sounds=new Set();
      this.stage=mount.querySelector('.present-stage');
      this.click=e=>{const b=e.target.closest('[data-present-action]');if(b){e.preventDefault();this.act(b.dataset.presentAction);}};
      mount.addEventListener('click',this.click);
      const first=!progress.entered;progress.entered=true;this.onChange();this.setReduced(reduced);this.updateScene();this.respond(progress.last,false);
      if(first)this.sound('sobQuiet');
    }
    sound(id){const sources=this.onSound(id);if(Array.isArray(sources))for(const node of sources.filter(Boolean)){this.sounds.add(node);node.addEventListener('ended',()=>this.sounds.delete(node),{once:true});}}
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
      if(action==='reach')this.progress.near=true;
      if(action==='window'){
        this.stage.classList.remove('has-breeze');void this.stage.offsetWidth;this.stage.classList.add('has-breeze');
        clearTimeout(this.windTimer);this.windTimer=setTimeout(()=>{if(!this.disposed)this.stage.classList.remove('has-breeze');},5200);
        if(this.lastWindSound===undefined||performance.now()-this.lastWindSound>1200){this.sound('clearWind');this.lastWindSound=performance.now();}
      }
      this.updateScene();this.respond(action);
    }
    updateScene(){this.stage.classList.toggle('is-near',this.progress.near);this.stage.classList.toggle('wind-seen',this.progress.window>0);const b=this.mount.querySelector('[data-present-action="near"]');b.textContent=this.progress.near?'少し離れる':'少し近づく';b.setAttribute('aria-pressed',String(this.progress.near));}
    setReduced(reduced){this.reduced=reduced;this.mount.classList.toggle('present-reduced',reduced);}
    setPaused(paused){this.paused=paused;this.mount.classList.toggle('present-paused',paused);this.mount.getAnimations({subtree:true}).forEach(a=>paused?a.pause():a.play());}
    dispose(){this.disposed=true;for(const node of this.sounds){try{node.stop();node.disconnect();}catch{}}this.sounds.clear();clearTimeout(this.windTimer);this.mount.getAnimations({subtree:true}).forEach(a=>a.cancel());this.mount.removeEventListener('click',this.click);}
  }
  root.FadeoutPresent=FadeoutPresent;
})(window);
