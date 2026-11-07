/* 添付のOP曲と、合成した操作音・仮生活音。すべてローカルの音源を使う。 */
window.FadeoutAudio = class {
  constructor() {
    this.context = null; this.nodes = []; this.timers = []; this.scene = null; this.enabled = false; this.volume = .35;
    this.music = document.getElementById('intro-bgm'); this.introRequested = false; this.paused = document.hidden; this.musicMix = .65;
    this.introPending = false; this.introDelayTimer = null; this.introDelayDue = null; this.introDelayRemaining = 0;
    this.music.addEventListener('error', () => { if(this.introRequested && this.enabled) this.onMusicError?.(); });
  }
  async unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!this.context) {
        this.context = new Audio(); this.master = this.context.createGain(); this.master.gain.value = this.enabled ? this.volume : 0; this.master.connect(this.context.destination);
        // Web Audio also controls music volume on iOS, where media.volume is limited.
        if(location.protocol !== 'file:') {
          this.musicSource = this.context.createMediaElementSource(this.music); this.musicGain = this.context.createGain(); this.musicGain.gain.value = this.introPending ? 0 : this.musicMix;
          this.musicSource.connect(this.musicGain); this.musicGain.connect(this.master); this.music.volume = 1;
        }
      }
      if (['suspended','interrupted'].includes(this.context.state)) await this.context.resume();
    } catch { /* 無音で継続できる */ }
  }
  configure(settings) {
    this.enabled = settings.sound; this.volume = settings.volume / 100;
    if (this.master) this.master.gain.setTargetAtTime(this.enabled && !this.paused ? this.volume : 0, this.context.currentTime, .06);
    this.updateMusicLevel();
    if (!this.enabled) this.stopScene(); this.updateIntro();
  }
  updateMusicLevel() {
    const level = this.introPending ? 0 : this.musicMix;
    if(this.musicGain) this.musicGain.gain.value = level;
    else this.music.volume = this.volume * level;
  }
  scheduleIntro(ms) {
    clearTimeout(this.introDelayTimer); this.introDelayRemaining = ms; this.introDelayDue = performance.now() + ms;
    if(this.paused) return;
    this.introDelayTimer = setTimeout(() => {
      this.introDelayTimer = null; this.introDelayDue = null; this.introDelayRemaining = 0; this.introPending = false;
      // Rewind the silent priming playback so the audible music starts at its beginning.
      this.music.pause(); if(this.music.readyState) this.music.currentTime = 0;
      this.updateMusicLevel(); this.updateIntro();
    }, ms);
  }
  setIntro(active, delay = 0) {
    const starting = active && !this.introRequested;
    this.introRequested = active;
    if(!active) {
      clearTimeout(this.introDelayTimer);this.introDelayTimer=null;this.introDelayDue=null;this.introDelayRemaining=0;this.introPending=false;
      this.music.pause(); if(this.music.readyState) this.music.currentTime = 0; this.updateMusicLevel();
    } else {
      if(starting && delay>0) { this.introPending=true;this.scheduleIntro(delay); }
      this.updateMusicLevel();this.updateIntro();
    }
  }
  updateIntro() {
    if(!this.introRequested || !this.enabled || this.paused) { this.music.pause(); return; }
    if(!this.music.paused) return;
    // Prime silently during the start gesture, so the delayed start also works on mobile.
    this.music.play().catch(error => { if(error.name !== 'AbortError' && this.introRequested && this.enabled && !this.paused) this.onMusicError?.(); });
  }
  setPaused(paused) {
    const previous = this.paused; this.paused = paused;
    if(this.introPending && paused !== previous) {
      if(paused) {this.introDelayRemaining=Math.max(0,this.introDelayDue-performance.now());clearTimeout(this.introDelayTimer);this.introDelayTimer=null;}
      else this.scheduleIntro(this.introDelayRemaining);
    }
    if(paused) this.stopScene(); else if(this.enabled) this.unlock();
    if(this.master) this.master.gain.setTargetAtTime(!paused && this.enabled ? this.volume : 0,this.context.currentTime,.02);this.updateIntro();
  }
  ui(kind = 'tap') {
    if(kind === 'confirm') { this.tone(1046, .13, .09); this.tone(1397, .16, .055, .07); }
    else if(kind === 'back') this.tone(523, .1, .07);
    else if(kind === 'soft') this.tone(480, .075, .045);
    else { this.tone(784, .105, .08); this.tone(1175, .07, .025, .018); }
  }
  tone(freq, duration = .12, gain = .1, delay = 0, type = 'sine') {
    if (!this.context || !this.enabled || this.paused) return;
    const t = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator(), envelope = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, t);
    envelope.gain.setValueAtTime(0, t); envelope.gain.linearRampToValueAtTime(gain, t + .005); envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(envelope); envelope.connect(this.master); oscillator.start(t); oscillator.stop(t + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  noise(duration = .15, gain = .06, cutoff = 1200) {
    if (!this.context || !this.enabled || this.paused) return;
    const source = this.context.createBufferSource(), buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
    const samples = buffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    const filter = this.context.createBiquadFilter(), envelope = this.context.createGain(); filter.type = 'lowpass'; filter.frequency.value = cutoff; envelope.gain.value = gain;
    source.buffer = buffer; source.connect(filter); filter.connect(envelope); envelope.connect(this.master); source.start(); source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
  play(id) {
    if (!this.enabled) return;
    switch (id) {
      case 'boot': this.tone(680, .18, .035); break;
      case 'error': this.noise(.16, .045, 2000); this.tone(120, .14, .035); break;
      case 'wood': this.noise(.3, .12, 400); break;
      case 'woodReturn': this.noise(.3, .07, 400); this.quiet(1800); break;
      case 'paper': case 'cloth': this.noise(.45, .06, id === 'paper' ? 2200 : 650); break;
      case 'pause': this.tone(820, .13, .045); this.tone(1080, .12, .02, .08); this.quiet(2300); break;
      case 'breath': this.noise(.7, .025, 400); break;
      case 'touch': this.noise(.08, .03, 800); break;
      case 'spoon': this.tone(2100, .18, .025); this.tone(3200, .1, .012, .02); break;
      case 'glass': this.tone(1700, .5, .025); break;
      case 'fridgeOpen': this.noise(.5, .08, 300); break;
      case 'chime': case 'tableChime': this.tone(1250, .18, .035); this.tone(1650, .22, .02, .25); this.noise(.6, .025, 900); break;
      default: this.tone(900, .16, .045); this.tone(1400, .1, .015, .04);
    }
  }
  quiet(ms) { if (!this.ambientGain) return; const g = this.ambientGain; g.gain.setTargetAtTime(0, this.context.currentTime, .04); this.timers.push(setTimeout(() => { if (this.enabled && g === this.ambientGain) g.gain.setTargetAtTime(.025, this.context.currentTime, .3); }, ms)); }
  stopScene() { this.timers.forEach(clearTimeout); this.timers = []; this.nodes.forEach(n => { try { n.stop(); } catch {} n.disconnect(); }); this.nodes = []; if (this.ambientGain) this.ambientGain.disconnect(); this.ambientGain = null; }
  setScene(scene) {
    this.stopScene(); this.scene = scene;
    if (!this.enabled || !this.context || !scene || this.paused) return;
    const oscillator = this.context.createOscillator(), g = this.context.createGain(); oscillator.frequency.value = scene === 'fridge' ? 57 : 48; g.gain.value = .018; oscillator.connect(g); g.connect(this.master); oscillator.start(); this.nodes.push(oscillator); this.ambientGain = g;
    if (scene === 'clock') { const tick = () => { if (this.scene !== 'clock' || !this.enabled) return; if (g.gain.value > .008) this.noise(.024, .018, 1300); this.timers.push(setTimeout(tick, 1400)); }; tick(); }
  }
};
