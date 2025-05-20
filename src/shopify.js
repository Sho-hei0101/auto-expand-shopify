// Front-end Integration for Shopify Admin
import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge-utils';

const app = createApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  shopOrigin: Shopify.shop
});

// ページ読み込み時にボタンを追加する例
document.addEventListener('DOMContentLoaded', () => {
  // 商品一覧テーブルの各行に「Expand」ボタンを差し込み
  document.querySelectorAll('tr[data-product-id]').forEach(row => {
    const prod = JSON.parse(row.dataset.product);
    const btn = document.createElement('button');
    btn.textContent = 'Expand';
    btn.style.marginLeft = '8px';
    btn.onclick = async () => {
      // セッション用トークンを取得
      const token = await getSessionToken(app);
      // Worker の /expand エンドポイントに投げる
      const res = await fetch(`${process.env.SHOPIFY_APP_URL}/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ product: prod })
      });
      if (res.ok) {
        alert('✅ Description expanded!');
        location.reload();
      } else {
        const err = await res.text();
        alert(`❌ Failed: ${err}`);
      }
    };
    // 行の最後のセルにボタンを追加
    row.querySelector('td:last-child').appendChild(btn);
  });
});
