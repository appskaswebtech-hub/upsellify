import "@shopify/shopify-app-remix/adapters/node";

import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";

import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

import prisma from "./db.server";

// ✅ Plan constants
export const BASIC_PLAN = "basic";
export const ADVANCED_PLAN = "advanced";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,

  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",

  apiVersion: ApiVersion.January25,

  scopes: process.env.SCOPES?.split(","),

  appUrl: process.env.SHOPIFY_APP_URL || "",

  authPathPrefix: "/auth",

  sessionStorage: new PrismaSessionStorage(prisma),

  distribution: AppDistribution.AppStore,

  /*
    IMPORTANT:
    These billing keys MUST exactly match
    the handles created in Shopify Partner Dashboard.

    Your current handles:
    - free
    - advanced
  */

  billing: {
    basic: {
      trialDays: 7,

      lineItems: [
        {
          amount: 9.99,

          currencyCode: "USD",

          interval: BillingInterval.Every30Days,

          name: "Basic Plan",
        },
      ],
    },

    advanced: {
      trialDays: 7,

      lineItems: [
        {
          amount: 17.99,

          currencyCode: "USD",

          interval: BillingInterval.Every30Days,

          name: "Advanced Plan",
        },
      ],
    },
  },

  future: {
    unstable_newEmbeddedAuthStrategy: true,

    expiringOfflineAccessTokens: true,
  },

  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? {
        customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN],
      }
    : {}),
});

export default shopify;

export const apiVersion = ApiVersion.January25;

export const addDocumentResponseHeaders =
  shopify.addDocumentResponseHeaders;

export const authenticate = shopify.authenticate;

export const unauthenticated = shopify.unauthenticated;

export const login = shopify.login;

export const registerWebhooks = shopify.registerWebhooks;

export const sessionStorage = shopify.sessionStorage;