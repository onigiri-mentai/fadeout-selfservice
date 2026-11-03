/* 試作シナリオ v0.2。文章・座標・解放条件・確認事項はこのファイルで編集できます。 */
(function (root) {
  'use strict';
  root.FadeoutData = {
  "version": 1,
  "guide": [
    "こちらは、フェードアウト受付機です。",
    "当機では、手放したい記憶の確認・整理・消去を受け付けております。",
    "お手続きの前に、記憶の履歴をご確認ください。"
  ],
  "guideNotes": [
    "※本機が処理できるのは、ここで確認された記憶のみです。",
    "※最終操作の代行はできません。"
  ],
  "prologue": [
    "私は、死んだ。",
    "私がいなくなってから、悲しんでいる人たちがいる。",
    "その人たちの中から、私の記憶を消せたら。\n少しは楽になるのだろうか。",
    "そう思って、この受付機に来た。"
  ],
  "memories": [
    {
      "id": "001",
      "title": "空いた席",
      "place": "夕方のダイニング",
      "time": "夕方",
      "panel": 0,
      "image": "assets/images/memories.png",
      "imageDescription": "夕方の食卓。左に空いた椅子、中央にマグカップと輪染み。右端では顔の見えない人物の手が食器に触れている。",
      "intro": "夕方のダイニング。椅子がひとつ引かれたままで、誰も座っていない。",
      "ambience": "clock",
      "ambienceCaption": "遠い車の音。時計の針。",
      "required": [
        "chair",
        "cup",
        "hand",
        "chairAgain"
      ],
      "hints": [
        {
          "unless": "chair",
          "text": "まず、空いた椅子を調べてみてください。",
          "target": "chair"
        },
        {
          "unless": "cup",
          "text": "カップの隣に、もうひとつ置いていた跡があります。",
          "target": "cup"
        },
        {
          "unless": "hand",
          "text": "椅子とカップを見たあとで、食器を片づける手を調べてみてください。",
          "target": "hand"
        },
        {
          "unless": "chairAgain",
          "text": "手の動きを見たあとで、空いた椅子をもう一度調べてください。",
          "target": "chair"
        }
      ],
      "hotspots": [
        {
          "id": "chair",
          "label": "空いた椅子",
          "x": 22,
          "y": 68,
          "base": {
            "text": "椅子がテーブルから少し引かれている。\n今は誰も座っていない。",
            "sound": "wood",
            "caption": "椅子の脚が、床をこする音。"
          },
          "variants": [
            {
              "when": [
                "hand"
              ],
              "grant": "chairAgain",
              "effect": "recognition",
              "response": {
                "text": "皿を二人分出そうとして、手が止まった。\nこの椅子に座る人が、もういないからだ。\n椅子は片づけられず、同じ場所に残っている。",
                "sound": "woodReturn",
                "caption": "椅子の脚が床をこする。そのあと、しばらく音がしない。"
              }
            }
          ]
        },
        {
          "id": "cup",
          "label": "マグカップ",
          "x": 56,
          "y": 64,
          "effect": "ring",
          "base": {
            "text": "使われているカップは、ひとつだけ。\n隣には、もうひとつのカップを置いていた輪染みがある。",
            "sound": "ceramic",
            "caption": "カップを置く、小さな音。"
          },
          "variants": [
            {
              "when": [
                "hand"
              ],
              "response": {
                "text": "手は二人分の皿を取ろうとしたが、カップはひとつしかない。\nもうひとつを置いていた跡だけが、テーブルに残っている。",
                "sound": "ceramic",
                "caption": "食器の音が、ひとつだけ。"
              }
            }
          ]
        },
        {
          "id": "calendar",
          "label": "カレンダー",
          "x": 71,
          "y": 21,
          "optional": true,
          "effect": "calendar",
          "base": {
            "text": "予定の書き込みが、月の途中で途切れている。\nカレンダーは、その月のままになっている。",
            "sound": "paper",
            "caption": "紙の端が、かすかに揺れる。"
          }
        },
        {
          "id": "hand",
          "label": "食器を片づける手",
          "x": 84,
          "y": 66,
          "base": {
            "text": "皿を一枚、持ち上げかけている。\n指は、その下のもう一枚にもかかっている。",
            "sound": "cloth",
            "caption": "袖のこすれる音。"
          },
          "blocked": {
            "unless": [
              "chair",
              "cup"
            ],
            "hint": "椅子とカップを調べたあとで、この手をもう一度見てください。"
          },
          "variants": [
            {
              "when": [
                "chair",
                "cup"
              ],
              "grant": "hand",
              "effect": "reach",
              "response": {
                "text": "手が、皿を二枚まとめて取ろうとした。\n二人分を用意していたときと、同じ動きだった。\n途中で気づいたように、手が止まった。",
                "sound": "pause",
                "caption": "皿がふれ合う音。時計の音が、途切れる。"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "002",
      "title": "止まった日常",
      "place": "カーテンの閉じた寝室",
      "time": "昼",
      "panel": 1,
      "image": "assets/images/memories.png",
      "imageDescription": "閉じたカーテンと乱れた寝具。顔が見えない人物がベッドに座り、スマートフォンが置かれている。",
      "intro": "カーテンの閉まった寝室。ベッドに座る人の前に、スマホが置かれている。",
      "ambience": "room",
      "ambienceCaption": "布のこすれる音。遠くの車。",
      "required": [
        "phone",
        "hand",
        "phoneAgain"
      ],
      "hints": [
        {
          "unless": "phone",
          "text": "消えたスマートフォンの画面を見てみる。",
          "target": "phone"
        },
        {
          "unless": "hand",
          "text": "膝の上の手に、目を向けてみる。",
          "target": "hand"
        },
        {
          "unless": "phoneAgain",
          "text": "あの書きかけの言葉を、もう一度。",
          "target": "phone"
        }
      ],
      "hotspots": [
        {
          "id": "curtain",
          "label": "カーテン",
          "x": 18,
          "y": 32,
          "optional": true,
          "effect": "curtain",
          "base": {
            "text": "昼でもカーテンが閉まっている。\n隙間から入る光が、ベッドの端に当たっている。",
            "sound": "cloth",
            "caption": "外を通る車の音。"
          }
        },
        {
          "id": "phone",
          "label": "スマートフォン",
          "x": 48,
          "y": 77,
          "effect": "phone",
          "base": {
            "text": "メッセージ欄に「今日さ、」と入力されている。\n送信ボタンは押されていない。",
            "sound": "touch",
            "caption": "画面に指がふれる音。"
          },
          "variants": [
            {
              "when": [
                "hand"
              ],
              "grant": "phoneAgain",
              "effect": "recognition",
              "response": {
                "text": "「今日さ、」から先が、書けないままだ。\n宛先を開いては閉じている。\n話したいことがあっても、返事はもう来ない。",
                "sound": "breath",
                "caption": "「……あのさ。」という言葉だけが、途切れて残る。"
              }
            }
          ]
        },
        {
          "id": "glass",
          "label": "水の入ったコップ",
          "x": 60,
          "y": 49,
          "optional": true,
          "base": {
            "text": "水が半分ほど残っている。\nコップは、手の届くところに置かれている。",
            "sound": "glass",
            "caption": "コップの縁を、爪がかすめる。"
          }
        },
        {
          "id": "hand",
          "label": "膝の上の手",
          "x": 83,
          "y": 83,
          "base": {
            "text": "膝の上で握っていた手が、ゆっくり開く。\nスマホに伸ばしかけて、また袖口をつまんだ。",
            "sound": "cloth",
            "caption": "息を吸う音。言葉になる前に、止まる。"
          }
        }
      ]
    },
    {
      "id": "003",
      "title": "ふたつめのプリン",
      "place": "夜の台所",
      "time": "夜",
      "panel": 2,
      "image": "assets/images/memories.png",
      "imageDescription": "開いた冷蔵庫にプリンがふたつ。台所のカウンターにはレシート、ふた、使い込んだスプーン。",
      "intro": "開いた冷蔵庫に、同じプリンがふたつ並んでいる。",
      "ambience": "fridge",
      "ambienceCaption": "冷蔵庫の低い稼働音。",
      "required": [
        "spoon",
        "pudding",
        "spoonAgain"
      ],
      "hints": [
        {
          "unless": "spoon",
          "text": "カウンターのスプーンを見てみる。",
          "target": "spoon"
        },
        {
          "unless": "pudding",
          "text": "冷蔵庫には、プリンがふたつ。",
          "target": "pudding"
        },
        {
          "unless": "spoonAgain",
          "text": "さっきのスプーンの音を、もう一度。",
          "target": "spoon"
        }
      ],
      "hotspots": [
        {
          "id": "pudding",
          "label": "ふたつのプリン",
          "x": 33,
          "y": 43,
          "effect": "pudding",
          "base": {
            "text": "プリンをひとつ取ってから、もうひとつにも手を伸ばした。\n少し迷い、ふたつとも手前に寄せた。",
            "sound": "fridgeOpen",
            "caption": "冷蔵庫の棚を、容器がすべる音。"
          }
        },
        {
          "id": "receipt",
          "label": "レシート",
          "x": 70,
          "y": 63,
          "optional": true,
          "base": {
            "text": "今日のレシートに「プリン 2点」とある。\n今も二個ずつ買っている。",
            "sound": "paper",
            "caption": "薄い紙を広げる音。"
          }
        },
        {
          "id": "spoon",
          "label": "傷のあるスプーン",
          "x": 80,
          "y": 83,
          "base": {
            "text": "スプーンの柄に、小さな傷がある。\nいつも指が当たる部分は、なめらかになっている。",
            "sound": "spoon",
            "caption": "金属が、容器の縁にふれる音。"
          },
          "variants": [
            {
              "when": [
                "pudding"
              ],
              "grant": "spoonAgain",
              "effect": "warmth",
              "response": {
                "text": "「そっち、カラメル多くない？」\n前は二人で、同じプリンを食べていた。\nスプーンの音に、そのときの笑い声が重なった。",
                "sound": "chime",
                "caption": "スプーンがふたつ。昔の笑い声が、少しだけ重なる。"
              }
            }
          ]
        },
        {
          "id": "lid",
          "label": "プリンのふた",
          "x": 52,
          "y": 73,
          "optional": true,
          "base": {
            "text": "開けたふたを、指先で押さえて畳んでいる。\n隣のプリンは、まだ開けていない。",
            "sound": "paper",
            "caption": "ふたを折る、乾いた音。"
          }
        }
      ]
    },
    {
      "id": "004",
      "title": "いつもの日",
      "place": "休日の食卓",
      "time": "昼下がり",
      "panel": 3,
      "image": "assets/images/memories.png",
      "imageDescription": "日が差す食卓を複数の人が囲む。顔は見えず、手元だけが描かれ、手前の小皿は使われていない。",
      "intro": "何人かで食卓を囲み、話をしている。手前の小皿だけ、使われていない。",
      "ambience": "table",
      "ambienceCaption": "食器と、いくつかの声。開いた窓の外の音。",
      "required": [
        "plate",
        "hand",
        "plateAgain"
      ],
      "hints": [
        {
          "unless": "plate",
          "text": "使われていない小皿を見てみる。",
          "target": "plate"
        },
        {
          "unless": "hand",
          "text": "会話の途中で止まった手に、目を向けてみる。",
          "target": "hand"
        },
        {
          "unless": "plateAgain",
          "text": "もう一度、手前の小皿へ。",
          "target": "plate"
        }
      ],
      "hotspots": [
        {
          "id": "plate",
          "label": "使われていない小皿",
          "x": 31,
          "y": 75,
          "base": {
            "text": "料理の載っていない小皿が一枚ある。\nほかの人は、自分の皿に料理を取っている。",
            "sound": "ceramic",
            "caption": "離れたところで、箸が皿をたたく。"
          },
          "variants": [
            {
              "when": [
                "hand"
              ],
              "grant": "plateAgain",
              "effect": "together",
              "response": {
                "text": "誰かが、余った小皿をテーブルの中央へ寄せた。\n止まっていた会話が、また続く。\n話しているのは、私と過ごした日のことだった。",
                "sound": "tableChime",
                "caption": "ひとつの沈黙のあと、また食器の音。"
              }
            }
          ]
        },
        {
          "id": "voices",
          "label": "会話する手元",
          "x": 63,
          "y": 24,
          "optional": true,
          "effect": "voices",
          "base": {
            "text": "「あのときも、そうだったよね」\n一人がそう話すと、ほかの人も思い出したように笑った。",
            "sound": "chime",
            "caption": "短い相槌。窓の外を自転車が通る。"
          }
        },
        {
          "id": "frame",
          "label": "写真立ての裏",
          "x": 89,
          "y": 39,
          "optional": true,
          "base": {
            "text": "写真立ては、食卓にいる人たちのほうを向いている。\n木枠の角には、何度も拭いた跡がある。",
            "sound": "cloth",
            "caption": "布で木枠を拭く音。"
          }
        },
        {
          "id": "hand",
          "label": "ふと止まる手",
          "x": 74,
          "y": 62,
          "effect": "pause",
          "base": {
            "text": "笑っていた一人が、途中で手を止めた。\n袖で目元を拭くと、隣の人がお茶を寄せた。\n少し待ってから、また話し始めた。",
            "sound": "pause",
            "caption": "会話が一瞬途切れる。湯呑みを寄せる音。"
          }
        }
      ]
    }
  ],
  "endings": {
    "erase": {
      "heading": "消去手続きが完了しました。",
      "label": "手続き記録 / 消去",
      "text": [
        "しばらくたった、ある日のこと。",
        "食卓には、あのカップが残っている。\n使う人は、前にこの席に誰がいたか思い出せない。",
        "買い物では、プリンを一個だけ買った。\nそれでも、二個目に手を伸ばしかけた。\nどうしてそうしたのかは、わからない。",
        "私は、死んだ。\nあの人たちの暮らしは、そのあとも続いている。"
      ],
      "sound": "ceramic",
      "caption": "カップを置く音。遠くを通る車。"
    },
    "keep": {
      "heading": "消去は行われませんでした。",
      "label": "手続き記録 / 消去せずに終了",
      "text": [
        "しばらくたった、ある日のこと。",
        "食卓には、あのカップがある。\nその横に、小さな花が置かれている。",
        "プリンを食べながら、誰かが私の話で笑った。\n笑い終わると、少し黙った。\nそれから、その日にあったことを話し始めた。",
        "私は、死んだ。\nあの人たちは、ときどき私を思い出しながら暮らしている。"
      ],
      "sound": "tableChime",
      "caption": "ふたを開ける音。窓から入る、風。"
    }
  },
  "finalNotes": [
    "消去によって、悲しみがなくなることは保証されません。",
    "記憶を持つ人たちが消去を望んでいるか、この端末では確認できません。"
  ]
};
  if (typeof module !== 'undefined') module.exports = root.FadeoutData;
})(typeof window !== 'undefined' ? window : globalThis);
