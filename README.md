# STARFALL（仮題）

スマホのブラウザで遊ぶ縦画面の弾幕シューティング。外部ライブラリ・素材なし、ビルドなし。
仕様は [docs/spec.md](docs/spec.md) を参照。

## 現在の状態（M3）

難易度を選んでボス戦（4フェーズ）を遊べる。道中・アイテム・サウンド・セーブはまだない（M4）。

| 操作 | 内容 |
|---|---|
| 画面のどこでもドラッグ | 自機が指の移動量だけ動く（相対移動） |
| 左下「低速」を押している間 | 低速移動、判定点の表示、ショットの間隔が狭まる |
| 左下「ボム」（低速の上） | 衝撃波で弾を消し、ボスに波が届くとダメージ。発動中は無敵。被弾直後の赤い輪が縮み切る前に押すと喰らいボム |
| 右上「Ⅱ」 | ポーズ（再開／やり直す／難易度選択へ）。アプリが裏に回っても自動でポーズ |

ボス戦のルール（詳しくは仕様書4.3）
- ボスの体力はフェーズごとに25%ずつ。削り切るか、制限時間まで耐えれば次のフェーズへ
- 最後のフェーズは攻撃が効かない耐え切りフェーズ。生き残ればボスを撃破
- 削り切りは「素点＋残りタイムボーナス」、時間切れは素点のみ。ノーミス・ノーボムでボーナス
- 3つ目のフェーズでは、ボスが赤く光ったあと突進してくる（突進中だけ本体に当たり判定がある）

### デバッグ（`?debug=1` を付けて開く）
- 難易度選択に「パターンテスト」が出る（M2のテスト画面。基本12パターンと約1000発の負荷テスト）
- ボス戦中に「次フェーズ」「無敵」ボタンが出る

## 起動方法

ES Modules を使うので、ファイルを直接開くのではなく、HTTPサーバーから配信する。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## スマホ実機での確認

### GitHub Pages（推奨）
1. リポジトリの Settings → Pages で、Source を「Deploy from a branch」、Branch を `main` / `/(root)` にする
2. 数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` をスマホで開く

### 同じWi-Fi内でのローカル配信
1. PCで `python3 -m http.server 8000` を実行する
2. PCのIPアドレスを調べる（macOS: `ipconfig getifaddr en0`、Windows: `ipconfig`）
3. スマホで `http://<PCのIPアドレス>:8000/` を開く

※ PWA（ホーム画面への追加・オフライン動作）はHTTPSが必要なので、GitHub Pages で確認する（M5で対応）。

## ファイル構成

```
index.html             キャンバスとスクロール防止のCSS
src/config.js          調整用の定数（速度、判定、難易度係数など）
src/main.js            起動、固定ステップのゲームループ
src/view.js            画面の拡大縮小、座標変換
src/input.js           タッチ入力（相対ドラッグ、ボタン）
src/rng.js             シード付き乱数
src/player.js          自機
src/shots.js           自機ショット
src/bullets.js         敵弾（型付き配列のプール、判定、グレイズ、イベント）
src/emitter.js         パターン定義を読んで弾を撃つ
src/sprites.js         弾の見た目（起動時に一度だけ描く）
src/patterns/basic.js  基本12パターン（データのみ）
src/render.js          背景の星、パーティクル
src/debug.js           FPS計測、デバッグ用フラグ
src/ui.js              ボタン配置・描画などの共通部品
src/bomb.js            ボム（衝撃波）
src/boss.js            ボス（フェーズ、体力の上限、移動、突進）
src/stages/stage1.js   1面のボス定義（フェーズ名・時間・移動・弾幕のデータ）
src/scenes/game.js     ボス戦の画面（難易度選択、残機・ボム・喰らいボム、HUD、結果）
src/scenes/test.js     パターンテスト画面（?debug=1）
```

## 弾パターンの足し方

`src/patterns/basic.js` の配列にオブジェクトを足すだけで増やせる。角度は度（0度が右、90度が真下）、速さは px/フレーム。

```js
{
  id: 'my_pattern', name: '新しいパターン',
  emitters: [{
    interval: 6, count: 5, spread: 360,
    baseAngle: { type: 'rotate', start: 0, speed: 4 },  // fixed / rotate / sine / aim / random
    bullet: {
      type: 'rice', color: '#4df', speed: 3, accel: -0.05, minSpeed: 0,
      events: [{ at: 60, do: 'aim', accel: 0.05, maxSpeed: 3 }],  // stop / aim / turn / split / vanish
    },
  }],
}
```
