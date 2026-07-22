import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 原始 prices.json 结构（CMS 可编辑） */
export type PricesFile = {
  chatgpt: {
    plus: number;
    pro5x: number;
    pro20x: number;
  };
  claude: {
    pro: number;
  };
  grok: {
    monthly: number;
    bimonthly: number;
    /** 可手填；加载时一律按 monthly×2 − bimonthly 重算，避免口径错误 */
    bimonthly_save?: number;
  };
  payment?: PaymentConfig;
  policy?: PolicyConfig;
};

export type PaymentConfig = {
  /** 技术标识，如 wechat / alipay */
  methods: string[];
  /** 短标签，如「微信支付」 */
  label: string;
  /** 列表/信任条，如「微信支付，人民币结算」 */
  labelWithRmb: string;
  /** 眉标/副标题片段，如「微信支付」 */
  eyebrow: string;
  /** CTA 点，如「微信付款」 */
  ctaPoint: string;
  /** FAQ 完整答 */
  faq: string;
  /** 流程描述里用，如「微信扫码完成付款」 */
  flow: string;
};

export type PolicyConfig = {
  refund: string;
  noPassword: string;
  ownAccount: string;
};

export type Prices = {
  chatgpt: PricesFile['chatgpt'];
  claude: PricesFile['claude'];
  grok: {
    monthly: number;
    bimonthly: number;
    bimonthly_save: number;
  };
  payment: PaymentConfig;
  policy: PolicyConfig;
};

const DEFAULT_PAYMENT: PaymentConfig = {
  methods: ['wechat'],
  label: '微信支付',
  labelWithRmb: '微信支付，人民币结算',
  eyebrow: '微信支付',
  ctaPoint: '微信付款',
  faq: '目前支持微信支付。企业采购、批量账号和周期续费需求可以提前联系客服沟通。',
  flow: '微信扫码完成付款',
};

const DEFAULT_POLICY: PolicyConfig = {
  refund: '充值失败全额退款',
  noPassword: '无需账号密码',
  ownAccount: '原账号开通',
};

function normalize(raw: PricesFile): Prices {
  const monthly = Number(raw.grok.monthly);
  const bimonthly = Number(raw.grok.bimonthly);
  const bimonthly_save = monthly * 2 - bimonthly;

  return {
    chatgpt: {
      plus: Number(raw.chatgpt.plus),
      pro5x: Number(raw.chatgpt.pro5x),
      pro20x: Number(raw.chatgpt.pro20x),
    },
    claude: {
      pro: Number(raw.claude.pro),
    },
    grok: {
      monthly,
      bimonthly,
      bimonthly_save,
    },
    payment: { ...DEFAULT_PAYMENT, ...raw.payment },
    policy: { ...DEFAULT_POLICY, ...raw.policy },
  };
}

/** 构建期读取 public/prices.json，并统一派生字段 */
export function loadPrices(): Prices {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'public/prices.json'), 'utf-8')
  ) as PricesFile;
  return normalize(raw);
}
