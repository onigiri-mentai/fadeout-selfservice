/* シナリオ仮案。文章・座標・音・解放条件をこのファイルで差し替えられます。 */
(function (root) {
  'use strict';
  const line = (text, sound, caption, effect) => ({ text, sound, caption, effect });
  root.FadeoutData = {
    version: 1,
    guide: ['こちらは、フェードアウト受付機です。', '当機では、手放したい記憶の確認・整理・消去を受け付けております。', 'お手続きの前に、記憶の履歴をご確認ください。'],
    guideNotes: ['※本機が処理できるのは、ここで確認された記憶のみです。', '※最終操作の代行はできません。'],
    prologue: ['私は、死んだ。', 'それでも、私を覚えている人がいる。', 'その人たちは、今も悲しんでいる。', 'だから私は、ここに来た。'],
    memories: [
      {
        id: '001', title: '空いた席', place: '夕方のダイニング', time: '夕方', panel: 0,
        image: 'assets/images/memories.png', imageDescription: '夕方の食卓。左に空いた椅子、中央にマグカップと輪染み。右端では顔の見えない人物の手が食器に触れている。',
        intro: '椅子がひとつ、引かれたままになっている。', ambience: 'clock', ambienceCaption: '遠い車の音。時計の針。',
        required: ['chair', 'cup', 'hand', 'chairAgain'],
        hints: [
          { unless: 'chair', text: '引かれたままの椅子に、目を向けてみる。', target: 'chair' },
          { unless: 'cup', text: 'マグカップの隣。何かの跡が残っている。', target: 'cup' },
          { unless: 'hand', text: '食器に触れた手が、少しだけ動いた。', target: 'hand' },
          { unless: 'chairAgain', text: 'もう一度、空いた椅子を見てみる。', target: 'chair' },
        ],
        hotspots: [
          { id: 'chair', label: '空いた椅子', x: 22, y: 68, base: line('少しだけ引かれた椅子。\n誰かが、すぐに戻ってくるような位置にある。', 'wood', '椅子の脚が、床をこする音。'), variants: [{ when: ['hand'], grant: 'chairAgain', effect: 'recognition', response: line('戻ってくる人のために、空いているのだと思った。\n\nけれど、その手は椅子を寄せなかった。\nここに座る人がいないことを、知っていた。', 'woodReturn', '同じ椅子の音。そのあとに、長い間。') }] },
          { id: 'cup', label: 'マグカップ', x: 56, y: 64, effect: 'ring', base: line('カップは、ひとつだけ。\nその隣には、もうひとつぶんの丸い輪染み。', 'ceramic', 'カップを置く、小さな音。'), variants: [{ when: ['hand'], response: line('縁の欠けたカップは、まだ温かい。\n隣の輪染みには、もう何も置かれていない。', 'ceramic', '食器の音が、ひとつだけ。') }] },
          { id: 'calendar', label: 'カレンダー', x: 71, y: 21, optional: true, effect: 'calendar', base: line('小さな書き込みが、ある日を境に途絶えている。\nめくり忘れたページに、夕方の光だけが動く。', 'paper', '紙の端が、かすかに揺れる。') },
          { id: 'hand', label: '食器を片づける手', x: 84, y: 66, base: line('一枚の皿を持ち上げて、手が止まる。\nその下の皿に、指がかかっている。', 'cloth', '袖のこすれる音。'), blocked: { unless: ['chair', 'cup'], hint: '椅子とカップを見たあとで、この手にもう一度目を向けてみる。' }, variants: [{ when: ['chair', 'cup'], grant: 'hand', effect: 'reach', response: line('指が、二枚目の皿も取ろうとする。\nいつものように。\n\n……そこで、止まった。', 'pause', '皿がふれ合う音。時計の音が、途切れる。') }] },
        ],
      },
      {
        id: '002', title: '止まった日常', place: 'カーテンの閉じた寝室', time: '昼', panel: 1,
        image: 'assets/images/memories.png', imageDescription: '閉じたカーテンと乱れた寝具。顔が見えない人物がベッドに座り、スマートフォンが置かれている。',
        intro: '昼なのか、夕方なのか。部屋の中からはわからない。', ambience: 'room', ambienceCaption: '布のこすれる音。遠くの車。',
        required: ['phone', 'hand', 'phoneAgain'],
        hints: [{ unless: 'phone', text: '消えたスマートフォンの画面を見てみる。', target: 'phone' }, { unless: 'hand', text: '膝の上の手に、目を向けてみる。', target: 'hand' }, { unless: 'phoneAgain', text: 'あの書きかけの言葉を、もう一度。', target: 'phone' }],
        hotspots: [
          { id: 'curtain', label: 'カーテン', x: 18, y: 32, optional: true, effect: 'curtain', base: line('隙間から、細い光が落ちている。\nその光の上だけ、埃がゆっくり動く。', 'cloth', '外を通る車の音。') },
          { id: 'phone', label: 'スマートフォン', x: 48, y: 77, effect: 'phone', base: line('「今日さ、」\n\n書きかけの文字。その先は、空白になっている。', 'touch', '画面に指がふれる音。'), variants: [{ when: ['hand'], grant: 'phoneAgain', effect: 'recognition', response: line('「今日さ、」\n\n何を話すつもりだったのだろう。\n宛先を開いては、閉じる。それだけを繰り返していた。', 'breath', '「……あのさ。」という言葉だけが、途切れて残る。') }] },
          { id: 'glass', label: '水の入ったコップ', x: 60, y: 49, optional: true, base: line('水面に、窓の形が映っている。\n半分ほど残ったまま、動かない。', 'glass', 'コップの縁を、爪がかすめる。') },
          { id: 'hand', label: '膝の上の手', x: 83, y: 83, base: line('握った指が、ゆっくりほどける。\n何かを言いかけるように、袖口をつまんだ。', 'cloth', '息を吸う音。言葉になる前に、止まる。') },
        ],
      },
      {
        id: '003', title: 'ふたつめのプリン', place: '夜の台所', time: '夜', panel: 2,
        image: 'assets/images/memories.png', imageDescription: '開いた冷蔵庫にプリンがふたつ。台所のカウンターにはレシート、ふた、使い込んだスプーン。',
        intro: '冷蔵庫の灯りの中に、同じものがふたつ並んでいる。', ambience: 'fridge', ambienceCaption: '冷蔵庫の低い稼働音。',
        required: ['spoon', 'pudding', 'spoonAgain'],
        hints: [{ unless: 'spoon', text: 'カウンターのスプーンを見てみる。', target: 'spoon' }, { unless: 'pudding', text: '冷蔵庫には、プリンがふたつ。', target: 'pudding' }, { unless: 'spoonAgain', text: 'さっきのスプーンの音を、もう一度。', target: 'spoon' }],
        hotspots: [
          { id: 'pudding', label: 'ふたつのプリン', x: 33, y: 43, effect: 'pudding', base: line('ひとつを取って、もうひとつにも手を伸ばす。\n少し迷って、ふたつとも手前に寄せた。', 'fridgeOpen', '冷蔵庫の棚を、容器がすべる音。') },
          { id: 'receipt', label: 'レシート', x: 70, y: 63, optional: true, base: line('プリン　2点。\n\n折り目を伸ばした跡。日付だけが新しい。', 'paper', '薄い紙を広げる音。') },
          { id: 'spoon', label: '傷のあるスプーン', x: 80, y: 83, base: line('柄に、小さな傷がある。\n使う指の位置だけ、なめらかになっている。', 'spoon', '金属が、容器の縁にふれる音。'), variants: [{ when: ['pudding'], grant: 'spoonAgain', effect: 'warmth', response: line('「そっち、カラメル多くない？」\n\nスプーンがふたつ、同時に鳴った。\n短い笑い声。そのあとも、冷蔵庫は鳴っている。', 'chime', 'スプーンがふたつ。昔の笑い声が、少しだけ重なる。') }] },
          { id: 'lid', label: 'プリンのふた', x: 52, y: 73, optional: true, base: line('ふたの裏に、少しだけ甘い匂いが残る。\n指先で押さえ、まっすぐに畳んだ。', 'paper', 'ふたを折る、乾いた音。') },
        ],
      },
      {
        id: '004', title: 'いつもの日', place: '休日の食卓', time: '昼下がり', panel: 3,
        image: 'assets/images/memories.png', imageDescription: '日が差す食卓を複数の人が囲む。顔は見えず、手元だけが描かれ、手前の小皿は使われていない。',
        intro: '誰かが話して、誰かが笑う。窓が、少し開いている。', ambience: 'table', ambienceCaption: '食器と、いくつかの声。開いた窓の外の音。',
        required: ['plate', 'hand', 'plateAgain'],
        hints: [{ unless: 'plate', text: '使われていない小皿を見てみる。', target: 'plate' }, { unless: 'hand', text: '会話の途中で止まった手に、目を向けてみる。', target: 'hand' }, { unless: 'plateAgain', text: 'もう一度、手前の小皿へ。', target: 'plate' }],
        hotspots: [
          { id: 'plate', label: '使われていない小皿', x: 31, y: 75, base: line('小皿が一枚、余っている。\n誰もそこへ、料理を取り分けない。', 'ceramic', '離れたところで、箸が皿をたたく。'), variants: [{ when: ['hand'], grant: 'plateAgain', effect: 'together', response: line('小皿を、テーブルの真ん中へ寄せる。\n誰かが話の続きを始める。\n\n私の知らない声で、私の話をしていた。', 'tableChime', 'ひとつの沈黙のあと、また食器の音。') }] },
          { id: 'voices', label: '会話する手元', x: 63, y: 24, optional: true, effect: 'voices', base: line('「あのときも、そうだったよね」\n\n相槌のかわりに、小さくテーブルをたたく手。\n笑いが、ひとつ遅れて重なる。', 'chime', '短い相槌。窓の外を自転車が通る。') },
          { id: 'frame', label: '写真立ての裏', x: 89, y: 39, optional: true, base: line('こちらに背を向けた写真立て。\n角には、何度も拭かれた跡がある。', 'cloth', '布で木枠を拭く音。') },
          { id: 'hand', label: 'ふと止まる手', x: 74, y: 62, effect: 'pause', base: line('笑い声の途中、ひとつの手が止まる。\n袖で目元を拭う気配。\nもう一方の手が、黙ってお茶を寄せた。', 'pause', '会話が一瞬途切れる。湯呑みを寄せる音。') },
        ],
      },
    ],
    endings: {
      erase: { heading: '消去手続きが完了しました。', label: '手続き記録 / 消去', text: ['それから、いくつか季節が過ぎた。', '食卓には、同じカップがある。\nその横に何も置かないことを、\n誰も不思議には思わない。', '帰り道、プリンをふたつ手に取って、\nひとつを棚に戻す。\n少しだけ迷った理由は、わからない。', '私は、死んだ。\n窓の向こうで、今日も暮らしが続いている。'], sound: 'ceramic', caption: 'カップを置く音。遠くを通る車。' },
      keep: { heading: '消去は行われませんでした。', label: '手続き記録 / 保留せず、残す', text: ['それから、いくつか季節が過ぎた。', '食卓には、同じカップがある。\nその横に、今日は小さな花がある。', 'プリンのふたを開けながら、誰かが笑う。\n笑い終わって、少し黙る。\n窓を開ける手は、止まらなかった。', '私は、死んだ。\n私の知らない今日が、ここにはある。'], sound: 'tableChime', caption: 'ふたを開ける音。窓から入る、風。' },
    },
  };
  if (typeof module !== 'undefined') module.exports = root.FadeoutData;
})(typeof window !== 'undefined' ? window : globalThis);
