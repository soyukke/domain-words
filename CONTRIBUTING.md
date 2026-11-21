# Contributing to domain-words

専門ワードの追加提案・解説や AI 指示例の改善・デモのブラッシュアップなど、PR や Issue を歓迎します。

## 参加のしかた

### 1. ワード追加の提案だけする（コード不要）

「この分野のこの言葉も欲しい」「こんなデモだと分かりやすそう」という案があれば、Issue テンプレート「ワード追加リクエスト」から気軽に起票してください。

### 2. 既存ワードの解説・モヤモヤ語・AI 指示文を改善する（Node.js のみで検証可能）

Kizu コンパイラを入れなくても、既存ワードの説明・逆引き用モヤモヤ語・AI 指示 Before / After・対比ワードは JSON だけで修正できます。

1. `data/words.json` を編集する
2. 配信用へ同期する:
   ```sh
   cp data/words.json web/data/words.json
   ```
3. 整合性と Wasm 動作を検証する:
   ```sh
   node scripts/verify.mjs
   ```
4. ローカルで表示を確認する:
   ```sh
   node scripts/serve.mjs --port 8081
   ```
5. PR を作成する

### 3. 新しいワードやライブデモを追加・改善する（Kizu コンパイラ使用）

1. `data/words.json` に新しいエントリ（末尾の連番 `idx`・固有 `id`・`controls` 等）を追加する
2. `src/demos/` の該当分野モジュールへ SVG デモ（および必要に応じて `src/demos/audio_dsp/` へ PCM 合成）を追加し、`src/demos/demos.kizu` の `total_words()` と分岐を更新する
3. ユニットテスト・Wasm ビルド・E2E 検証をすべて通す:
   ```sh
   KIZU_LIB_DIR=/path/to/kizu/lib/kizu "$KIZU" test .
   KIZU=/path/to/kizu KIZU_LIB_DIR=/path/to/kizu/lib/kizu sh scripts/build.sh
   node scripts/verify.mjs
   ```

## 文体・UI のガイドライン

- 画面の短い文（見出し・ボタン・ラベル・一覧の一言説明）の末尾に「。」を付けない
- 専門的な定義の網羅よりも「初心者・非専門者が AI へ指示するとき、一目で何の話か分かるか」を優先する
- ページ全体の縦横スクロールが出ない 1 画面構成を維持し、待機中にアニメーションを勝手に動かし続けない
- `data/words.json` と `web/data/words.json` は常に同じ内容に揃える
