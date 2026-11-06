/**
 * 赞助 / Support 渠道配置
 * ────────────────────────────────────────────────────────────
 * 这是「收钱」的唯一配置入口。当前只开放**微信**一个渠道（扫码赞赏码），
 * 其余渠道以注释形式保留模板，需要时取消注释并填真实地址即可。
 *
 * 微信（国内最省事，无需注册第三方平台）：
 *   微信 → 我 → 服务 → 收付款 → 赞赏码 → 保存到相册，
 *   把图片放到  public/sponsor/wechat-qr.png ，这里保持 qrImage 不变即可。
 *   文件不存在时页面会显示提示，不会报错（见 SettingsSupport 的 onError）。
 *
 * 备用模板（默认关闭）：
 *   1. 爱发电  https://afdian.com → 个人主页 → https://afdian.com/a/yourname
 *   2. Gumroad  https://gumroad.com → https://yourname.gumroad.com
 *
 * 判定规则：url 含 'REPLACE_ME' 视为未配置；有 qrImage 的渠道只要图片存在就算已配置。
 * 未配置的渠道不会出现在设置页里（开发模式 npm run dev 下仍会显示占位卡片方便预览）。
 */

export interface SponsorChannel {
  id: string
  nameZh: string
  nameEn: string
  descZh: string
  descEn: string
  /** 收款主页 / 产品页；纯扫码渠道可以留空 */
  url?: string
  /** 可选：public/ 下的二维码图片路径，如 'sponsor/wechat-qr.png' */
  qrImage?: string
  region: 'cn' | 'intl'
}

export const SPONSOR_CHANNELS: SponsorChannel[] = [
  {
    id: 'wechat',
    nameZh: '微信赞赏码',
    nameEn: 'WeChat tip code',
    descZh: '国内用户 · 微信扫码，金额随意',
    descEn: 'For users in China · scan with WeChat, any amount',
    qrImage: 'sponsor/wechat-qr.png',
    region: 'cn',
  },

  // 备用渠道模板：需要时取消注释并替换 REPLACE_ME
  // {
  //   id: 'afdian',
  //   nameZh: '爱发电',
  //   nameEn: 'Afdian',
  //   descZh: '国内用户 · 支付宝 / 微信',
  //   descEn: 'For users in China · Alipay / WeChat',
  //   url: 'https://afdian.com/a/REPLACE_ME',
  //   region: 'cn',
  // },
  // {
  //   id: 'gumroad',
  //   nameZh: 'Gumroad',
  //   nameEn: 'Gumroad',
  //   descZh: '海外用户 · 信用卡 / PayPal',
  //   descEn: 'International · Card / PayPal',
  //   url: 'https://REPLACE_ME.gumroad.com',
  //   region: 'intl',
  // },
]

/** url 是否已填真实地址（占位符已替换、且非空）。 */
export function hasRealUrl(channel: SponsorChannel): boolean {
  return Boolean(channel.url && !channel.url.includes('REPLACE_ME'))
}

/** 渠道是否已配置：有真实链接，或配置了二维码图片。 */
export function isChannelConfigured(channel: SponsorChannel): boolean {
  return hasRealUrl(channel) || Boolean(channel.qrImage)
}

/** 已配置的渠道（正式构建只渲染这些）。 */
export function configuredChannels(): SponsorChannel[] {
  return SPONSOR_CHANNELS.filter(isChannelConfigured)
}

/** 至少有一个渠道可用。未配置时「支持作者」页只显示引导文案。 */
export function isSponsorConfigured(): boolean {
  return configuredChannels().length > 0
}
