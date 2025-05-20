import { Router } from 'itty-router'
import crypto from 'crypto'

// 環境変数読み込み
const {
  SHOPIFY_API_SECRET,
  SHOPIFY_APP_URL
} = process.env

// Shopify HMAC 検証関数
function verifyHMAC(rawBody, hmacHeader, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader))
}

const router = Router()

router.post('/expand', async request => {
  // 生のリクエストボディを取得
  const raw = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  if (!verifyHMAC(raw, hmac, SHOPIFY_API_SECRET)) {
    return new Response('Invalid HMAC', { status: 401 })
  }

  const { product } = JSON.parse(raw)
  const { id, title, body_html, vendor } = product

  // LLM に投げるプロンプトを生成
  const prompt = `Generate an SEO-optimized product description, tags and ALT texts for:
Title: ${title}
Existing Description: ${body_html}`

  // ここは Ollama や Cloudflare AI などに置き換えてください
  const aiResp = await fetch('https://api.ollama.com/v1/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral-instruct', prompt })
  })
  const { text } = await aiResp.json()

  // Shopify Admin API で商品を更新
  const updateResp = await fetch(
    `https://${vendor}.myshopify.com/admin/api/2025-04/products/${id}.json`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_API_SECRET
      },
      body: JSON.stringify({ product: { id, body_html: text } })
    }
  )

  if (!updateResp.ok) {
    const err = await updateResp.text()
    return new Response(`Shopify update failed: ${err}`, { status: 500 })
  }

  return new Response('Success', { status: 200 })
})

export default {
  fetch: router.handle
}
