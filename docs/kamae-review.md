# Kamae Review

## 対象

Kamaeは認証、Credential保存、helper protocol、外部設定境界へ適用した。CodeMirrorとDOM描画は
frontend固有のため、Kamaeのdomain modeling対象外とした。

## 初回評価

| Severity | Finding | Risk |
|---|---|---|
| High | JSON、暗号Envelope、Credential file、Inkdrop Configを型assertionで信用していた | 破損データがdomainへ侵入する |
| High | OAuth Credentialをschema validationせず復元していた | 欠損tokenや不正expiresをPiへ渡す |
| Medium | helper responseがoptional fieldを持ち、不正な成功状態を表現できた | encrypt成功時にEnvelopeが存在しない |
| Medium | process、file、crypto失敗が例外文字列へ集約されていた | 呼び出し側が失敗種別を安全に分岐できない |
| Medium | Composition RootとCredential Storeが複数責務を持っていた | 認証変更がEditor lifecycleへ波及する |
| Low | Portのmethod notation、imperative loop、catch-all contract fileが存在した | 型の反変性とリファクタリング耐性が弱い |

## 実施内容

- Zodを外部境界へ導入
  - helper requestとresponse
  - AES-256-GCM Envelope
  - 復号済みCredential record
  - Inkdrop Config
- neverthrowを境界処理へ導入
  - process探索と実行
  - protocol parsing
  - file read、write、delete
  - encryptとdecrypt
- Wire protocolを`kind`判別Unionへ変更
  - `Encrypt`、`Decrypt`、`DeleteKey`
  - `Encrypted`、`Decrypted`、`KeyDeleted`、`Failure`
- ErrorをReadonly判別Unionへ変更
  - `CredentialCryptographyError`
  - `CredentialStorageError`
  - `ContractBoundaryError`
- Credential更新をimmutable operationへ変更
- 責務を独立ファイルへ分割
  - `credential-file.ts`
  - `credential-storage-error.ts`
  - `stored-credentials.ts`
  - `plugin-services.ts`
  - protocol concept files

## 検証

ブラックボックステストはExtensionのactivateと公開command dispatchから開始する。実物の
`EditorState`、`EditorView`、DOM、filesystemを使い、最終本文、選択位置、表示状態、暗号化ファイルを
検証する。外部AIとInkdrop DesktopだけをFakeにし、Mock frameworkとSpyは使用しない。

Perry検査は`--check-deps --deep-deps --strict`を使用する。Biomeはnurseryを含む`preset: all`を
使用し、Format、Lint、import整理を`pnpm quality`の先頭で検査する。生成済み`dist`と`lib`だけを
検査対象から除外する。

Biomeの全ルールから、実行環境と衝突する規則だけを無効化する。対象はQwik専用規則、Node.js API
禁止、NodeNextの`.js`specifier禁止、pnpm workspaceを解決できないimport検査、package entrypointの
barrelとdefault export禁止である。テストでは秘密情報検出と`describe` callbackの行数だけを除外する。

## 外部契約

Piの`CredentialStore`はPromise rejectionを要求するため、内部Resultを最外周でErrorへ変換する。
Pi Credentialの`type` discriminantは外部ライブラリ契約として維持する。Perry、Pi、CodeMirrorの
infrastructure classも外部APIとの統合に必要なため維持する。
