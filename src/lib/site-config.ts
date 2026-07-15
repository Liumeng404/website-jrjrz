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
  tdk: {
    home: TdkBlock;
    chatgpt: TdkBlock;
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

export function loadSiteConfig(): SiteConfig {
  const raw = readFileSync(join(process.cwd(), 'public/site-config.json'), 'utf-8');
  return JSON.parse(raw) as SiteConfig;
}
