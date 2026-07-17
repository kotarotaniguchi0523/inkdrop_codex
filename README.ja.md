# Inkdrop Codex

[![CI](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/ci.yml/badge.svg)](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/codeql.yml/badge.svg)](https://github.com/kotarotaniguchi0523/inkdrop_codex/actions/workflows/codeql.yml)

日本語 | [English](./README.md)

Inkdrop Codexは、Codex Subscriptionを使ってMarkdownを作成・編集するInkdrop 6 Extensionです。
Inkdropのエディターを離れずに、インライン編集、文章変換プリセット、次の編集内容の予測を利用できます。

## 機能とショートカットキー

ショートカットキーはMarkdownエディターにフォーカスがあるときに動作します。

| 機能 | ショートカットキー | 動作 |
| --- | --- | --- |
| インラインアシスタントを開く | `Ctrl+Enter` | カーソル位置または選択範囲に指示入力Popoverを表示します。 |
| 次の編集内容を予測する | `Alt+\` | カーソル位置へ候補をGhost Textとして表示します。 |
| 表示中の予測を確定する | `Tab` | Ghost Textをノートへ挿入します。予測表示中だけ有効です。 |
| 表示中の予測を破棄する | `Escape` | ノートを変更せずGhost Textを消します。 |
| インラインアシスタントを閉じる | `Escape` | ノートを変更せず指示入力Popoverを閉じます。 |

### Windows版・Linux版キーマップ

Windows版とLinux版の標準キーマップは同じです。

| 機能 | Windows | Linux | 有効になる場面 |
| --- | --- | --- | --- |
| インラインアシスタントを開く | `Ctrl+Enter` | `Ctrl+Enter` | Markdownエディターにフォーカスがあるとき |
| 手動で予測する | `Alt+\` | `Alt+\` | 選択範囲がなく、予測が無効化されていないとき |
| 予測を確定する | `Tab` | `Tab` | Ghost Textが表示されているときだけ |
| 予測を破棄する | `Escape` | `Escape` | Ghost Textが表示されているときだけ |
| インラインアシスタントを閉じる | `Escape` | `Escape` | 指示入力Popoverが開いているとき |
| Accountを開く | 標準割り当てなし | 標準割り当てなし | **Plugins → Inkdrop Codex → Account**を使用 |
| 自動予測 | キー操作不要 | キー操作不要 | `automatic`モードで入力を止めた後に実行 |

日本語配列キーボードでは、`Alt+\`の`\`キーが`¥`と表示されている場合があります。

### Markdownを新しく書く

挿入したい場所へカーソルを置いて`Ctrl+Enter`を押します。指示を入力して**Generate**を選ぶと、
生成されたMarkdownがカーソル位置へ挿入されます。

指示の例：

- リリース前のチェックリストを書いて
- この節を具体例つきで説明して
- Mermaidのシーケンス図を作って
- Markdownの比較表を作って

**Plugins → Inkdrop Codex → Edit with Codex**またはエディターのコンテキストメニューからも
インラインアシスタントを開けます。

### 選択した文章を書き換える

文章を選択して`Ctrl+Enter`を押します。生成結果は選択範囲だけを置換します。Popoverでは次の
プリセットを利用できます。

- **Improve writing** — 意味を保ったまま明確さと構成を改善します。
- **Make shorter** — 重要な情報を残して簡潔にします。
- **Expand** — 有用な詳細を加えて構成を整えます。
- **Fix grammar** — 文法、スペル、句読点を修正します。
- **Generate Mermaid** — Mermaidのコードブロックを生成します。
- **Generate table** — 簡潔なMarkdownテーブルを生成します。

プリセットを選ぶと指示欄へ内容が入ります。**Generate**を選ぶ前に指示を編集することもできます。
`Escape`を押すか**Cancel**を選ぶと、ノートを変更せず閉じます。

### Next Edit Predictionを使う

テキストを選択せず、予測したい位置へカーソルを置いて`Alt+\`を押します。候補がGhost Textで
表示されたら、次のキーで操作します。

- `Tab`：候補をノートへ挿入します。
- `Escape`：候補を破棄します。

確定前にノートまたはカーソル位置が変わった場合も、その候補は破棄されます。

InkdropのPlugin Settingsで予測方法を選択できます。

- **manual** — `Alt+\`を押したときだけ予測します。
- **automatic** — 入力を止めた後に自動で予測します。
- **disabled** — 予測を行いません。

### Codexアカウントを接続する

**Plugins → Inkdrop Codex → Account**を開いて**Sign in**を選択します。最初にブラウザOAuthを試し、
必要な場合はDevice Code Flowを案内します。同じAccountメニューから接続状態の確認、再ログイン、
サインアウトができます。

`inkdrop-codex:login`と`inkdrop-codex:logout`はInkdropのコマンドとしても利用できますが、標準の
ショートカットキーは割り当てていません。

## 設定

InkdropのPlugin Settingsから次を設定できます。

- **Next edit prediction** — `automatic`、`manual`、`disabled`から選択します。
- **Codex model** — 任意のModel IDです。空欄の場合はProviderの標準Modelを使用します。

## プライバシーと認証情報の保存

チャット履歴は保存せず、ほかのノートも読み取りません。Codexへ送るのは現在の選択範囲と、
アクティブなノート内の範囲を限定した周辺テキストです。

OAuth認証情報はAES-256-GCMで暗号化します。暗号化済みEnvelopeはInkdropのUser Data Directoryへ、
暗号鍵はPerry製のネイティブHelperを通じてOS Credential Vaultへ保存します。HelperまたはCredential
Vaultが利用できない場合は安全側に失敗し、平文保存へフォールバックしません。

## 開発

宣言済みのネイティブToolchainへ入り、全品質ゲートを実行します。

```sh
nix develop
pnpm install
pnpm quality
```

`pnpm quality`はWorkflow Lint、BiomeのFormat・Lint検査、TypeScriptの型検査、Vitest、Perry互換性検査、
本番用Extension Buildを実行します。安全なFormat・Lintの自動修正は`pnpm biome:fix`で実行できます。

現在のPlatform向けCredential Helperは次のコマンドでビルドします。

```sh
pnpm build:helper
```

`packages/credential-helper/dist/<platform>-<arch>/`の実行ファイルを
`packages/plugin/bin/<platform>-<arch>/`へ配置してから、ExtensionをInkdropへリンクします。

```sh
cd packages/plugin
ipm link --dev
```

InkdropでDevelopment Modeを有効にして再読み込みします。詳しいSmoke Testは
[Inkdrop APIと実地テスト](./docs/inkdrop-api.md)を参照してください。

## Continuous Integration

Pull Requestでは全品質ゲート、依存関係レビュー、CodeQL、Linux・Windows・macOSのx64・ARM64向けの
ネイティブCredential Helper Buildを実行しますが、Release Archiveは生成しません。`main`から
**Release** Workflowを
手動実行すると、`inkdrop-codex-release-bundle`を一度だけBuildし、保護された`inkdrop-production`
Environmentで停止します。そのArtifactをDownloadして各PlatformのSmoke Testを完了してから承認します。
承認後は再Buildせず、確認した同一ArchiveへProvenanceを付与して公開し、公開時にだけVersion Tagを
作成します。失敗時はDeploymentを拒否します。Inkdrop Registryへの公開は、GitHub Release検証後に行う
別の手動工程です。

PerryはWindows ARM64向けCompilerを配布していません。そのためWindows ARM64 Jobでは、Windows 11 ARMの
x64 Emulation上でHelperをBuildし、ARM64 Runner上で実行できることを確認してから
`bin/win32-arm64`へ格納します。

## コマンド

- `inkdrop-codex:edit`
- `inkdrop-codex:trigger-next-edit`
- `inkdrop-codex:accept-next-edit`
- `inkdrop-codex:dismiss-next-edit`
- `inkdrop-codex:open-account`
- `inkdrop-codex:login`
- `inkdrop-codex:logout`

## ライセンス

MITです。詳細は[LICENSE](./LICENSE)を参照してください。
