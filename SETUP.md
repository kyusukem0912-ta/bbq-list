# BBQ Together — みんなの買い出しリスト

GitHub Pages + Firebase Authentication（匿名）+ Cloud Firestore。ビルド不要のスマホ対応Webアプリです。

## 実装済み
品目追加・編集・削除、数量、カテゴリー、担当、メモ、購入済みチェック、進捗、未購入フィルター、共有URLコピー、Firestoreリアルタイム購読。各品目を独立保存し、チェックではチェック関連フィールドのみ更新します。同じ項目への同時編集は最後の保存を採用します。

## 初回設定
1. Firebaseで専用プロジェクトを作成。Sparkを維持し、課金アカウントを紐づけない。
2. Webアプリを登録し、公開用firebaseConfigをpublic/firebase-config.jsへ設定（nullをオブジェクトに変更）。管理者の秘密鍵・サービストークンは不要。
3. Authenticationのログイン方法で「匿名」を有効化。
4. Cloud Firestore Standard / Nativeのデータベースを本番モードで作成。地域は東京等を選択し、作成前に確認する。
5. firestore.rulesをFirestoreのルール画面へ貼り付けて公開。または接続済みFirebase CLIで `firebase deploy --only firestore:rules --project PROJECT_ID`。
6. GitHubリポジトリへpushし、Settings > Pages > SourceをGitHub Actionsにする。mainへのpushでpublic/のみ公開される。
7. 必要に応じてFirebase Authenticationの承認済みドメインへGitHub Pagesのホストを追加。
8. 公開URLでリストを新規作成。生成された # 以下を含むURLを参加者へ共有。

## アクセス仕様
192ビットのランダムなリストIDが共有鍵です。リスト一覧の読み取りは禁止。IDはURLフラグメントに格納し、コードには書きません。匿名認証は自動で、参加者に会員登録操作はありません。URLを知る人全員が対象リストを編集・削除できます。匿名認証単独では招待制にならず、長い共有鍵とルールを組み合わせます。URLが漏れた場合は新しいリストへ移行してください。個人情報は入れない運用を想定します。

## 動作確認
`npm run check` でJSの構文を確認。
ローカルで確認する場合は `python3 -m http.server 8000 --directory public`。
本番接続後、別ブラウザ・別端末で同じ共有URLを開き、追加・チェック・編集・削除が相互反映することを確認。別リストとの分離、未認証アクセス拒否、一覧取得拒否、不正な項目の書き込み拒否も確認する。

未設定時は未接続表示となり、ローカル保存を共有成功として扱いません。オフラインの変更はサーバーの確認まで保存中表示です。ブラウザを閉じると未同期の変更を失う場合があります。

## 現在の検証状況
JavaScript構文確認済み。Firebaseプロジェクト未接続のため、実際の複数端末同期・ルールのエミュレータ検証・本番公開は未実施。
