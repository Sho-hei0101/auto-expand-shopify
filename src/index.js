import { Router } from 'itty-router';

// 署名検証関数: JSONボディを読み込み、ShopifyのHMACヘッダを検証
async function verifyHMAC(request, secret) {
  // 1) リクエストボディを文字列として読む
  const text = await request.text();
  // 2) Shopifyが付ける HMAC ヘッダを取ってくる
  const header = request.headers.get('x-shopify-hmac-sha256');
  if (!header) return false;
  const [algo, signature] = header.split('=');
  if (algo !== 'sha256') return false;

  // TextEncoder でバイト配列に変換
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(text);

  // Web Crypto API で HMAC-SHA256 用のキーボードをインポート
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  // メッセージを署名
  const sigBuffer = await crypto.subtle.sign('HMAC', key, msgData);
  const expected = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  const actual   = new Uint8Array(sigBuffer);

  // timingSafeEqual の有無で比較
  return crypto.subtle.timingSafeEqual
    ? crypto.subtle.timingSafeEqual(actual, expected)
    : actual.every((v,i) => v === expected[i]);
}

// ★ Router セットアップ
const router = Router();

// /expand エンドポイントを定義
router.post('/expand', async (request, env) => {
  // HMAC 検証
  if (!await verifyHMAC(request, env.SHOPIFY_WEBHOOK_SECRET)) {
    return new Response('Invalid HMAC', { status: 401 });
  }
  // 本来の expand ロジックをここに書く
  // 例: const body = await request.json(); …
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// それ以外は 404
router.all('*', () => new Response('Not found', { status: 404 }));

// Worker の fetch ハンドラをエクスポート
export default {
  fetch: (request, env) => router.handle(request, env),
};
