import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type TdkBlock = {
  title: string;
  description: string;
  keywords?: string;
};

export type FooterLink = {
  text: string;
  href: string;
  /** qr = 打开客服二维码弹窗 */
  action?: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export type SiteConfig = {
  /** 联动小铺链接（备用，当前主 CTA 已改回微信） */
  shopUrl: string;
  tdk: {
    home: TdkBlock;
    chatgpt: TdkBlock;
    chatgptPro: TdkBlock;
    claude: TdkBlock;
    grok: TdkBlock;
  };
  footer: {
    brandDesc: string;
    columns: FooterColumn[];
    seoTitle?: string;
    seoLinks?: FooterLink[];
    copyright?: string;
  };
};

/** 默认小铺地址；配置缺失时回退 */
export const DEFAULT_SHOP_URL = 'https://pay.ldxp.cn/shop/GJ8N9HL8';

export function getShopUrl(config?: SiteConfig): string {
  return (config ?? loadSiteConfig()).shopUrl || DEFAULT_SHOP_URL;
}

export function loadSiteConfig(): SiteConfig {
  const raw = readFileSync(join(process.cwd(), 'public/site-config.json'), 'utf-8');
  const parsed = JSON.parse(raw) as SiteConfig;
  if (!parsed.shopUrl) parsed.shopUrl = DEFAULT_SHOP_URL;
  return parsed;
}
