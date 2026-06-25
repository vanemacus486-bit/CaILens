/**
 * 赞助 / Support 渠道配置
 * ────────────────────────────────────────────────────────────
 * 这是你「收钱」的唯一配置入口。上架/发布前，把下面占位 URL 换成你自己的：
 *
 *   1. 爱发电(国内 · 收款到支付宝/微信)
 *      去 https://afdian.com 注册 → 创建个人主页
 *      → 把 afdian 的 url 改成你的主页，如 https://afdian.com/a/yourname
 *
 *   2. Gumroad(海外 · 收款到 PayPal / Payoneer)
 *      去 https://gumroad.com 注册 → 建一个产品或主页
 *      → 把 gumroad 的 url 改成你的地址，如 https://yourname.gumroad.com
 *
 * 可选 · 桌面端「扫码付款」(国内最顺手)：
 *   把你的收款二维码图片放到  public/sponsor/  下，
 *   再把对应 channel 的 qrImage 取消注释、改成 'sponsor/你的文件名.png'。
 *   不配置则只显示链接 + 复制按钮。
 *
 * 安全：URL 仍含 'REPLACE_ME' 时视为「未配置」，正式构建里「支持」标签会自动隐藏
 *   (开发模式 npm run dev 下始终显示，方便你预览)。见 isSponsorConfigured()。
 */

export interface SponsorChannel {
  id: string
  nameZh: string
  nameEn: string
  descZh: string
  descEn: string
  /** 你的收款主页 / 产品页地址 */
  url: string
  /** 可选：public/ 下的二维码图片路径，如 'sponsor/afdian-qr.png' */
  qrImage?: string
  region: 'cn' | 'intl'
}

export const SPONSOR_CHANNELS: SponsorChannel[] = [
  {
    id: 'afdian',
    nameZh: '爱发电',
    nameEn: 'Afdian',
    descZh: '国内用户 · 支付宝 / 微信',
    descEn: 'For users in China · Alipay / WeChat',
    url: 'https://afdian.com/a/REPLACE_ME',
    // qrImage: 'sponsor/afdian-qr.png',
    region: 'cn',
  },
  {
    id: 'gumroad',
    nameZh: 'Gumroad',
    nameEn: 'Gumroad',
    descZh: '海外用户 · 信用卡 / PayPal',
    descEn: 'International · Card / PayPal',
    url: 'https://REPLACE_ME.gumroad.com',
    // qrImage: 'sponsor/gumroad-qr.png',
    region: 'intl',
  },
]

/** 至少有一个渠道填了真实 URL(占位符已替换)。未配置时隐藏正式构建的「支持」入口。 */
export function isSponsorConfigured(): boolean {
  return SPONSOR_CHANNELS.some((c) => !c.url.includes('REPLACE_ME'))
}
