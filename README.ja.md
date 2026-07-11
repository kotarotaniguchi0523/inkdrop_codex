# Inkdrop Codex

[![CI](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/ci.yml/badge.svg)](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/codeql.yml/badge.svg)](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/codeql.yml)

日本語 | [English](./README.md)

Codex Subscriptionを`@earendil-works/pi-ai`経由で利用するInkdrop 6 Extensionです。

## 機能

- カーソル位置へのMarkdown生成と、選択範囲の置換
- 文章の改善、Mermaid、Markdownテーブルなどのプリセット
- 手動または自動のNext Edit PredictionとGhost Text表示
- `Tab`による予測の確定と`Escape`による破棄
- CodexのブラウザOAuthとDevice Codeフォールバック
- AES-256-GCMによるOAuth認証情報の暗号化
- Perryを利用したOS Credential Vaultへの暗号鍵保存

チャット履歴は保存せず、ほかのノートも読み取りません。Codexへ送信するのは、選択テキストと
アクティブなノートの範囲を限定した周辺テキストだけです。

## 開発

```sh
nix develop
pnpm install
pnpm quality
```

`pnpm quality`ひとつでBiomeのFormat・Lint検査、TypeScript 7の型検査、テスト、
Perry互換性検査、Extensionのビルドを実行します。安全な自動修正は`pnpm biome:fix`で実行できます。

NixはNode.js、pnpm、clang、LLVM、libsecretなどのネイティブ開発環境を宣言します。
Nix入力のリビジョンは`flake.lock`を生成してコミットした時点で再現可能になります。
JavaScriptライブラリはpnpmと`pnpm-lock.yaml`で固定します。対象はNode.js 24とECMAScript 2025です。
そのため、互換性のない最新メジャーではなくNode 24系の最新型定義を使用しています。

使用するAPIとInkdrop 6での実地テスト手順は、
[Inkdrop APIと実地テスト](./docs/inkdrop-api.md)を参照してください。

## Continuous Integration

Pull Requestでは全品質ゲート、Linux・Windows・macOSのCredential Helperビルド、依存関係レビュー、
CodeQLを実行します。CIを手動実行した場合だけ、各OSのHelperとPlugin bundleをまとめた検証用Artifactを
生成します。Inkdrop Registryへの公開やGitHub Releaseの作成は行いません。

## ライセンス

MITです。詳細は[LICENSE](./LICENSE)を参照してください。

## Perry Credential Helper

対応するOSとアーキテクチャごとにネイティブヘルパーをビルドします。

```sh
pnpm build:helper
```

配布前に`packages/credential-helper/dist/<platform>-<arch>/`の実行ファイルを
`packages/plugin/bin/<platform>-<arch>/`へ配置します。平文保存へのフォールバックはありません。

## コマンド

- `inkdrop-codex:edit`
- `inkdrop-codex:trigger-next-edit`
- `inkdrop-codex:accept-next-edit`
- `inkdrop-codex:dismiss-next-edit`
- `inkdrop-codex:open-account`
- `inkdrop-codex:login`
- `inkdrop-codex:logout`

標準キーバインドはInline Editが`Ctrl-Enter`、手動予測が`Alt-\`です。
