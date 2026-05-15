import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";  // 👈 import useNavigate
import { Page } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.findUnique({
    where: { shop: session.shop },
  });

  return { currentPlan: shop?.plan || "free" };
}

export default function PlansPage() {
  const { currentPlan } = useLoaderData<typeof loader>();
  const navigate = useNavigate(); // ✅ use this instead of <a href>

  const plans = [
    {
      name: "Basic",
      price: "$9.99",
      period: "/month",
      tagline: "Start boosting revenue today",
      description:
        "Perfect for growing stores ready to unlock the power of smart upsells.",
      features: [
        { text: "10 active campaigns", highlight: false },
        { text: "Product page upsells", highlight: false },
        { text: "Cart upsells", highlight: false },
        { text: "Analytics dashboard", highlight: false },
        { text: "Custom widget styling", highlight: false },
      ],
      planKey: "basic",
      recommended: false,
      trialText: "7-day free trial",
    },
    {
      name: "Advanced",
      price: "$17.99",
      period: "/month",
      tagline: "For serious growth & scale",
      description:
        "Best for scaling brands that need unlimited power without compromise.",
      features: [
        { text: "Unlimited campaigns", highlight: true },
        { text: "Advanced analytics & insights", highlight: true },
        { text: "Priority 24/7 support", highlight: false },
        { text: "Unlimited upsells", highlight: true },
        { text: "Premium customization", highlight: false },
      ],
      planKey: "advanced",
      recommended: true,
      trialText: "7-day free trial",
    },
  ];

  // ✅ Key fix: use navigate() to stay within the embedded app session
 const handleSelectPlan = (planKey: string) => {
  const params = new URLSearchParams(window.location.search);

  const host = params.get("host");
  const shop = params.get("shop");

  navigate(
    `/app/billing?plan=${planKey}&host=${host}&shop=${shop}`
  );
};

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    .plans-wrapper {
      font-family: 'Plus Jakarta Sans', sans-serif;
      padding: 8px 0 40px;
    }

    .plans-hero {
      text-align: center;
      margin-bottom: 40px;
      padding: 0 16px;
    }

    .plans-hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #eef1fd, #dde3fb);
      border: 1px solid #c5cdf8;
      color: #3a50d0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 100px;
      margin-bottom: 16px;
    }

    .plans-hero-title {
      font-size: 32px;
      font-weight: 800;
      color: #0d1117;
      line-height: 1.15;
      margin: 0 0 12px;
      letter-spacing: -0.03em;
    }

    .plans-hero-subtitle {
      font-size: 16px;
      color: #6b7280;
      font-weight: 400;
      max-width: 440px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      max-width: 820px;
      margin: 0 auto;
    }

    .plan-card {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      cursor: default;
    }

    .plan-card:hover {
      transform: translateY(-6px);
    }

    .plan-card-light {
      background: linear-gradient(145deg, #ffffff, #f4f6fd);
      border: 1.5px solid #e2e6f3;
      box-shadow: 0 4px 24px rgba(79, 106, 240, 0.06), 0 1px 4px rgba(0,0,0,0.04);
    }

    .plan-card-light:hover {
      box-shadow: 0 16px 48px rgba(79, 106, 240, 0.13), 0 4px 12px rgba(0,0,0,0.06);
    }

    .plan-card-dark {
      background: linear-gradient(145deg, #1a1f6e 0%, #2a3bc8 60%, #4f6af0 100%);
      border: 1.5px solid rgba(255,255,255,0.12);
      box-shadow: 0 8px 40px rgba(45, 63, 212, 0.35), 0 2px 8px rgba(0,0,0,0.15);
    }

    .plan-card-dark:hover {
      box-shadow: 0 20px 60px rgba(45, 63, 212, 0.45), 0 6px 20px rgba(0,0,0,0.2);
    }

    .popular-ribbon {
      position: absolute;
      top: 0;
      right: 0;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #1a0a00;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 6px 20px 6px 14px;
      border-radius: 0 20px 0 20px;
      box-shadow: 0 2px 12px rgba(251, 191, 36, 0.4);
    }

    .plan-card-inner {
      padding: 32px 28px 28px;
    }

    .plan-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 22px;
    }

    .plan-icon-light { background: linear-gradient(135deg, #eef1fd, #dde3fb); }
    .plan-icon-dark  { background: rgba(255,255,255,0.15); }

    .plan-name-light {
      font-size: 22px; font-weight: 800; color: #0d1117;
      letter-spacing: -0.02em; margin: 0 0 4px;
    }
    .plan-name-dark {
      font-size: 22px; font-weight: 800; color: #ffffff;
      letter-spacing: -0.02em; margin: 0 0 4px;
    }

    .plan-tagline-light {
      font-size: 12.5px; color: #4f6af0; font-weight: 600;
      letter-spacing: 0.01em; margin: 0 0 20px;
    }
    .plan-tagline-dark {
      font-size: 12.5px; color: rgba(255,255,255,0.65); font-weight: 600;
      letter-spacing: 0.01em; margin: 0 0 20px;
    }

    .plan-price-row { display: flex; align-items: flex-end; gap: 4px; margin-bottom: 4px; }

    .plan-price-light {
      font-size: 42px; font-weight: 800; color: #0d1117;
      letter-spacing: -0.04em; line-height: 1;
    }
    .plan-price-dark {
      font-size: 42px; font-weight: 800; color: #ffffff;
      letter-spacing: -0.04em; line-height: 1;
    }

    .plan-period-light { font-size: 14px; color: #9ca3af; font-weight: 500; padding-bottom: 7px; }
    .plan-period-dark  { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; padding-bottom: 7px; }

    .plan-trial-light {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; font-weight: 600; color: #22c55e;
      background: #f0fdf4; border: 1px solid #bbf7d0;
      padding: 3px 10px; border-radius: 100px; margin-bottom: 20px;
    }
    .plan-trial-dark {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; font-weight: 600; color: #4ade80;
      background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.25);
      padding: 3px 10px; border-radius: 100px; margin-bottom: 20px;
    }

    .plan-divider-light { height: 1px; background: linear-gradient(90deg, #e5e7eb, transparent); margin: 20px 0; }
    .plan-divider-dark  { height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent); margin: 20px 0; }

    .plan-description-light { font-size: 13.5px; color: #6b7280; line-height: 1.6; margin: 0 0 20px; }
    .plan-description-dark  { font-size: 13.5px; color: rgba(255,255,255,0.7); line-height: 1.6; margin: 0 0 20px; }

    .features-label-light {
      font-size: 11px; font-weight: 700; color: #9ca3af;
      letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px;
    }
    .features-label-dark {
      font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
      letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px;
    }

    .feature-item { display: flex; align-items: center; gap: 10px; padding: 7px 0; }

    .feature-check-light {
      width: 18px; height: 18px; border-radius: 50%;
      background: linear-gradient(135deg, #eef1fd, #dde3fb);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .feature-check-dark {
      width: 18px; height: 18px; border-radius: 50%;
      background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .feature-check-icon { width: 10px; height: 10px; }

    .feature-text-light           { font-size: 13.5px; color: #374151; font-weight: 500; }
    .feature-text-highlight-light { font-size: 13.5px; color: #1a1f6e; font-weight: 700; }
    .feature-text-dark            { font-size: 13.5px; color: rgba(255,255,255,0.85); font-weight: 500; }
    .feature-text-highlight-dark  { font-size: 13.5px; color: #ffffff; font-weight: 700; }

    .plan-cta-wrap { margin-top: 24px; }

    /* ── CTA Buttons ── */
    .cta-btn-base {
      width: 100%; padding: 13px 24px; border-radius: 12px;
      font-size: 14.5px; font-weight: 700;
      font-family: 'Plus Jakarta Sans', sans-serif;
      letter-spacing: -0.01em; border: none; cursor: pointer;
      transition: all 0.2s ease;
    }

    .cta-btn-primary-light {
      background: linear-gradient(135deg, #2d3fd4, #4f6af0);
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(79, 106, 240, 0.35);
    }
    .cta-btn-primary-light:hover {
      background: linear-gradient(135deg, #1a2fb8, #3a55d8);
      box-shadow: 0 6px 24px rgba(79, 106, 240, 0.5);
      transform: translateY(-1px);
    }

    .cta-btn-primary-dark {
      background: #ffffff; color: #1a2fb8;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .cta-btn-primary-dark:hover {
      background: #f0f4ff;
      box-shadow: 0 6px 28px rgba(0,0,0,0.25);
      transform: translateY(-1px);
    }

    .cta-btn-active-light {
      background: #f9fafb; color: #9ca3af;
      border: 1.5px solid #e5e7eb; cursor: not-allowed;
    }
    .cta-btn-active-dark {
      background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
      border: 1.5px solid rgba(255,255,255,0.2); cursor: not-allowed;
    }

    .plan-guarantee       { text-align: center; margin-top: 10px; font-size: 11.5px; color: rgba(255,255,255,0.45); font-weight: 500; }
    .plan-guarantee-light { text-align: center; margin-top: 10px; font-size: 11.5px; color: #9ca3af; font-weight: 500; }

    .plans-footer {
      text-align: center; margin-top: 36px;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .footer-trust {
      display: flex; align-items: center; gap: 20px;
      flex-wrap: wrap; justify-content: center;
    }
    .trust-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #6b7280; font-weight: 500; }
    .trust-dot  { width: 5px; height: 5px; border-radius: 50%; background: #d1d5db; }

    .savings-badge {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border: 1px solid #f59e0b; color: #92400e;
      font-size: 12px; font-weight: 700;
      padding: 6px 16px; border-radius: 100px; letter-spacing: 0.01em;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <Page>
        <div className="plans-wrapper">

          {/* Hero */}
          <div className="plans-hero">
            <div className="plans-hero-eyebrow">✦ Unlock Your Store's Potential</div>
            <h1 className="plans-hero-title">Simple, Transparent Pricing</h1>
            <p className="plans-hero-subtitle">
              Start with a free trial. No credit card required. Cancel anytime with no questions asked.
            </p>
          </div>

          {/* Cards */}
          <div className="plans-grid">
            {plans.map((plan) => {
              const isActive = currentPlan === plan.planKey;
              const isDark   = plan.recommended;

              return (
                <div
                  key={plan.planKey}
                  className={`plan-card ${isDark ? "plan-card-dark" : "plan-card-light"}`}
                >
                  {plan.recommended && (
                    <div className="popular-ribbon">⭐ Most Popular</div>
                  )}

                  <div className="plan-card-inner">
                    {/* Icon */}
                    <div className={`plan-icon-wrap ${isDark ? "plan-icon-dark" : "plan-icon-light"}`}>
                      {isDark ? "🚀" : "⚡"}
                    </div>

                    {/* Name & Tagline */}
                    <div className={isDark ? "plan-name-dark" : "plan-name-light"}>{plan.name}</div>
                    <div className={isDark ? "plan-tagline-dark" : "plan-tagline-light"}>{plan.tagline}</div>

                    {/* Price */}
                    <div className="plan-price-row">
                      <span className={isDark ? "plan-price-dark" : "plan-price-light"}>{plan.price}</span>
                      <span className={isDark ? "plan-period-dark" : "plan-period-light"}>{plan.period}</span>
                    </div>

                    {/* Trial pill */}
                    <div style={{ marginBottom: "16px" }}>
                      <span className={isDark ? "plan-trial-dark" : "plan-trial-light"}>
                        ✓ {plan.trialText} — free
                      </span>
                    </div>

                    {/* Description */}
                    <p className={isDark ? "plan-description-dark" : "plan-description-light"}>
                      {plan.description}
                    </p>

                    {/* Divider */}
                    <div className={isDark ? "plan-divider-dark" : "plan-divider-light"} />

                    {/* Features */}
                    <div className={isDark ? "features-label-dark" : "features-label-light"}>
                      What's included
                    </div>
                    <div>
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="feature-item">
                          <div className={isDark ? "feature-check-dark" : "feature-check-light"}>
                            <svg className="feature-check-icon" viewBox="0 0 10 10" fill="none">
                              <path
                                d="M2 5l2.5 2.5L8 3"
                                stroke={isDark ? "#4ade80" : "#4f6af0"}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <span
                            className={
                              isDark
                                ? feature.highlight ? "feature-text-highlight-dark"  : "feature-text-dark"
                                : feature.highlight ? "feature-text-highlight-light" : "feature-text-light"
                            }
                          >
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="plan-cta-wrap">
                      {isActive ? (
                        <button
                          className={`cta-btn-base ${isDark ? "cta-btn-active-dark" : "cta-btn-active-light"}`}
                          disabled
                        >
                          ✓ Your Active Plan
                        </button>
                      ) : (
                        // ✅ onClick + navigate() — no full page reload, session stays alive
                        <button
                          className={`cta-btn-base ${isDark ? "cta-btn-primary-dark" : "cta-btn-primary-light"}`}
                          onClick={() => handleSelectPlan(plan.planKey)}
                        >
                          Start Free Trial →
                        </button>
                      )}

                      <p className={isDark ? "plan-guarantee" : "plan-guarantee-light"}>
                        No credit card required
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="plans-footer">
            <div className="savings-badge">
              💡 Advanced saves you $96/yr vs monthly elsewhere
            </div>
            <div className="footer-trust">
              <span className="trust-item">🔒 Secure billing via Shopify</span>
              <span className="trust-dot" />
              <span className="trust-item">↩ Cancel anytime</span>
              <span className="trust-dot" />
              <span className="trust-item">💬 Friendly support team</span>
            </div>
          </div>

        </div>
      </Page>
    </>
  );
}