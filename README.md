# domain-words（専門ワード体感図鑑）

AI へ的確に指示するための、9 分野 54 ワードのインタラクティブ体感図鑑です。

- **公開版**: https://tools.soyukke.com/domain-words/

作業そのものを AI へ任せる前提で、「その概念の名前と手触り」を触って・聴いて 1 秒で掴み、そのまま AI へ指示できる形を目指しています。
SVG デモ生成・22050Hz DSP 音声合成・検索・UI 状態遷移のコアを [Kizu](https://github.com/kizu-lang/kizu) (`--target wasm32-browser`) で実装し、ブラウザ側はビルド不要の素の HTML / CSS / ES Modules で動かします。

## 収録分野（全 54 ワード）

1. **イラスト**: リムライト / 空気遠近法 / アオリ・俯瞰 / シルエット / 明度・彩度コントラスト / 三分割法・余白の抜け
2. **サムネ・デザイン**: ジャンプ率 / カーニング・トラッキング / 余白・近接 / コントラスト比 / 視線誘導 / 配色比率 70:25:5
3. **動画構成**: ジャンプカット / Jカット・Lカット / Bロール・インサート / フック(冒頭3秒) / セーフエリア・座布団 / 緩急・間(タメ)
4. **音楽・BGM**: BPM / ローパス・ハイパス / フィルイン・ブレイク / イントロ付きループ / 長調・短調 / 帯域分け・アレンジ密度
5. **SE・効果音**: アタック・リリース(ADSR) / ピッチベンド / レイヤー重ね / ダッキング / ピッチランダム化 / フォーリー vs シンセSE
6. **プログラム**: マージ・ブランチ・コンフリクト / 型・bool / 状態遷移(ステートマシン) / リファクタリング / 非同期・ローディング / キャッシュ
7. **テスト・QA**: 境界値 / リグレッション(デグレ) / エッジケース / 再現手順・期待値と実測値 / モック・スタブ / スモークテスト
8. **ゲームデザイン**: ヒットストップ / コヨーテタイム / 先行入力(入力バッファ) / イージング / 予兆・テレグラフ / ゲームフィール・ジュース
9. **UI / UX**: アフォーダンス・シグニファイア / フィードバック状態 / スケルトンスクリーン / エンプティステート / トースト・インライン・モーダル / 情報階層

## 構成

| パス | 中身 |
| --- | --- |
| `data/words.json` | 全 54 ワードの語彙データ正本（モヤモヤ語・AI 指示 Before/After・対比・操作定義） |
| `src/catalog/` | 検索・モヤモヤ逆引きエンジン（Kizu） |
| `src/demos/` | 9 分野 54 語の SVG デモ生成・22050Hz Float32 PCM DSP 音声合成（Kizu） |
| `src/state/` | UI 状態遷移（`std::machine` 互換） |
| `src/browser/` | `wasm32-browser` ABI 境界 |
| `js/bridge.mjs` | Wasm 高水準 JS ラッパー |
| `web/` | そのまま静的配信できる Web アプリ一式（`web/core/app.wasm` 同梱） |

## ローカル起動と検証

```sh
# ローカルで開く（Node.js のみ。Kizu 不要）
node scripts/serve.mjs --port 8081

# カタログ整合性・Wasm 全 54 デモ・DSP 音声・検索・状態機械の検証
node scripts/verify.mjs
```

Kizu ソース (`src/`) を変更して再ビルドする場合:

```sh
# ユニットテスト
KIZU_LIB_DIR=/path/to/kizu/lib/kizu "$KIZU" test .

# WebAssembly ビルド & web/ 同期
KIZU=/path/to/kizu KIZU_LIB_DIR=/path/to/kizu/lib/kizu sh scripts/build.sh
```

## PR・ワード追加の提案

既存ワードの解説改善やモヤモヤ語追加の PR、Issue でのワードリクエストを歓迎しています。手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

[MIT License](LICENSE)
