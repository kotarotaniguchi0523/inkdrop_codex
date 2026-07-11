# Inkdrop APIと実地テスト

このドキュメントはInkdrop Codexが利用するInkdrop 6 API、その責務、実際のInkdrop Desktopでの
確認方法をまとめたものです。古いInkdrop 5のCodeMirror 5向けAPIとは区別してください。

## Extensionのライフサイクル

Inkdrop 6はExtensionのdefault exportに対して`activate(app: Environment)`と
`deactivate(app: Environment)`を呼び出します。本Extensionはglobalの`inkdrop`に依存せず、
引数で渡された`Environment`だけを使用します。

- `activate`: コマンド、CodeMirror Extension、認証サービスを登録します。
- `deactivate`: UIとAIリクエストを停止し、DisposableとCodeMirror Extensionを解除します。
- `config`: Settings画面にNext Edit Predictionの動作モードとModel IDを公開します。

実装: [`packages/plugin/src/index.ts`](../packages/plugin/src/index.ts)

## Environment

### `getActiveEditor()`

現在のCodeMirror 6 `EditorView`を返します。ノートが開かれていない場合は`null`または`undefined`です。
コマンド実行時に毎回取得し、存在しない場合には何も変更しません。

### `commands.add(element, commandMap)`

Extension固有のコマンドを`document.body`へ登録します。戻り値のDisposableは`deactivate`で必ず
破棄します。

### `commands.dispatch(document.body, "editor:add-extension", { extension })`

CodeMirror 6 ExtensionをInkdrop Editorへ登録します。解除時は同一のExtension値を
`editor:remove-extension`へ渡します。本ExtensionではStateField、Decoration、ViewPlugin、keymapを
この経路で登録します。

### `config.get(keyPath)`

`inkdrop-codex.predictionMode`と`inkdrop-codex.model`を読み取ります。認証情報はConfigへ保存しません。

### `appDelegate.openExternal(url)`

Codex OAuth URLまたはDevice Code確認URLをOS標準ブラウザで開きます。

### `notifications`

ログイン完了、ログアウト、AIリクエスト失敗をInkdropの通知として表示します。アクセストークンや
Refresh Tokenは通知へ含めません。

### `userDataPath`

暗号化済みCredential Envelopeの保存先を組み立てるために使用します。保存ファイルは
`<userDataPath>/inkdrop-codex/credentials.enc.json`です。AES鍵はこのディレクトリではなく、Perry経由で
OS Credential Vaultへ保存します。

## CodeMirror 6 API

- `EditorView.state.selection.main`: 選択範囲またはカーソル位置を取得します。
- `EditorView.dispatch`: AIの結果を単一Transactionで挿入・置換します。
- `StateField`: 現在の予測DecorationをEditor Stateとして保持します。
- `StateEffect`: 予測の表示と破棄をTransactionへ伝えます。
- `Decoration.widget`: カーソル位置にGhost Textを表示します。
- `ViewPlugin`: ドキュメント変更を監視し、自動予測をdebounceします。
- `keymap`: 予測表示中の`Tab`と`Escape`を処理します。

CodeMirrorパッケージはビルド時にexternal扱いです。実行時はInkdropが提供するCodeMirror 6と同じ
モジュールを使用し、Extension内へ別のCodeMirror runtimeをbundleしません。

## 自動テスト方針

自動テストは古典派のAAA（Arrange、Act、Assert）で記述します。ExtensionをFake Inkdrop
Environmentへactivateし、利用者と同じ公開コマンドdispatchから操作します。判定対象は実際のDOM、
CodeMirror document、選択位置、暗号化済み保存ファイルです。

- Composition Root以外の内部モジュール、内部関数、private stateを直接テストしません。
- 内部メソッドの呼び出し回数を検証しません。
- CodeMirrorはTest Doubleにせず、実際の`EditorState`と`EditorView`を使用します。
- Inkdrop DesktopとネットワークAIの外部境界だけをFakeへ置き換えます。今回操作しないAccount境界には
  副作用のないNull Objectを使用します。Mock framework、Spy、内部Stubは使用しません。
- 各テスト内でArrange、Act、Assertを明示します。

この方針により内部構造のリファクタリングを許容しながら、ユーザーが観測する選択範囲の置換、
Ghost Textの表示、予測の確定・破棄をリグレッションから保護します。

## Inkdrop Desktopでの実地テスト

### 1. 開発ビルド

```sh
nix develop
pnpm install
pnpm quality
pnpm build:helper
```

生成したCredential HelperをREADMEに記載した`packages/plugin/bin/<platform>-<arch>/`へ配置します。

### 2. Inkdropへリンク

Inkdrop Plugin Managerの`ipm`を利用して、Extension packageを開発用ディレクトリへリンクします。

```sh
cd packages/plugin
ipm link --dev
```

InkdropのSettingsでDevelopment Modeを有効にして再読み込みします。

- macOS: `Alt+Cmd+Shift+R`
- Windows/Linux: `Alt+Ctrl+R`

DevToolsはmacOSでは`Alt+Cmd+I`、Windows/Linuxでは`Alt+Ctrl+I`で開きます。

### 3. API Smoke Test

1. ノートを開き、PluginsメニューにInkdrop Codexが表示されることを確認します。
2. DevTools ConsoleでExtension activation errorがないことを確認します。
3. テキストを選択して`Ctrl-Enter`を押し、Popoverが選択末尾に表示されることを確認します。
4. Cancelで閉じ、選択内容が変更されていないことを確認します。
5. AccountからSign inを選択し、OSブラウザが開くことを確認します。
6. ブラウザCallbackまたは手動URL入力でログインが完了することを確認します。
7. 選択テキストへ「Improve writing」を実行し、選択範囲だけが置換されることを確認します。
8. 選択を解除してMermaidを生成し、カーソル位置へ挿入されることを確認します。
9. 手動予測を実行し、Ghost Textを`Tab`で確定できることを確認します。
10. 再度予測を表示し、`Escape`で本文を変更せず破棄できることを確認します。
11. SettingsをAutomaticへ変更し、入力停止後に予測されることを確認します。
12. Extensionを無効化し、Popover、keymap、Ghost Textが残らないことを確認します。

### 4. Credentialの確認

1. `<userDataPath>/inkdrop-codex/credentials.enc.json`がJSON Envelopeであることを確認します。
2. ファイル内に`access`、`refresh`、JWT形式の文字列が平文で含まれないことを確認します。
3. OS Credential Vaultに`com.inkdrop-codex.credentials`の項目が存在することを確認します。
4. Credential Helperを一時的に外すと、平文へフォールバックせずエラーになることを確認します。
5. Sign out後に暗号化Credentialファイルが削除されることを確認します。

## 公式資料

- [Inkdrop Environment](https://developers.inkdrop.app/modules/environment)
- [Inkdrop 6 Plugin development](https://developers.inkdrop.app/guides/plugin-word-count)
- [Inkdrop command list](https://developers.inkdrop.app/guides/list-of-commands)

インストール済みの`@inkdropapp/types`も契約の根拠です。CIのTypeScript検査により、使用する
Environment、Command、Configのシグネチャが型定義と一致していることを確認します。
