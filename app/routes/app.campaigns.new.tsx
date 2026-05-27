// import { Link } from "@remix-run/react";
// import { Page, Layout, Card, BlockStack, Text, Button, InlineStack, Box } from "@shopify/polaris";
// import { TitleBar } from "@shopify/app-bridge-react";
// import type { LoaderFunctionArgs } from "@remix-run/node";
// import { authenticate } from "../shopify.server";

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   await authenticate.admin(request);
//   return null;
// };

// const TYPES = [
//   { key: "FBT_LIST", title: "Frequently bought together (List)", description: "A pre-selected bundle in list format.", available: true, preview: "list" },
//    { key: "FBT_AMAZON", title: "Frequently bought together (Amazon)", description: "A horizontal bundle in Amazon style.", available: true, preview: "amazon" },
//    { key: "FBT_CLASSIC", title: "Frequently bought together (Classic)", description: "A grid layout with horizontal product row.", available: true, preview: "classic" },
// ] as const;

// export default function NewCampaign() {
//   return (
//     <Page backAction={{ content: "Campaigns", url: "/app/campaigns" }}>
//       <TitleBar title="Create campaign" />
//       <Layout>
//         <Layout.Section>
//           <Text as="h2" variant="headingMd">Product page</Text>
//           <Box paddingBlockStart="400">
//             <InlineStack gap="400" wrap>
//               {TYPES.map((t) => (
//                 <Box key={t.key} width="320px">
//                   <Card>
//                     <BlockStack gap="300">
//                       <Box
//                         background="bg-surface-secondary"
//                         padding="400"
//                         borderRadius="200"
//                         minHeight="180px"
//                       >
//                         <PreviewMockup variant={t.preview} />
//                       </Box>
//                       <Text as="h3" variant="headingSm">{t.title}</Text>
//                       <Text as="p" tone="subdued">{t.description}</Text>
//                       <InlineStack align="end">
//                         <Button
//                           url={`/app/campaigns/new/${t.key}`}
//                           disabled={!t.available}
//                           variant="primary"
//                         >
//                           Create
//                         </Button>
//                       </InlineStack>
//                     </BlockStack>
//                   </Card>
//                 </Box>
//               ))}
//             </InlineStack>
//           </Box>
//         </Layout.Section>
//       </Layout>
//     </Page>
//   );
// }

// function PreviewMockup({ variant }: { variant: "list" | "amazon" | "classic" }) {
//   if (variant === "list") return <ListMockup />;
//   if (variant === "amazon") return <AmazonMockup />;
//   return <ClassicMockup />;
// }

// /* ---------------- List layout (trigger on top, offers below, vertical) ---------------- */
// function ListMockup() {
//   return (
//     <svg
//       viewBox="0 0 280 180"
//       xmlns="http://www.w3.org/2000/svg"
//       width="100%"
//       style={{ display: "block" }}
//     >
//       {/* Trigger row */}
//       <rect x="10" y="10" width="260" height="38" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <TShirtIcon x={20} y={19} />
//       <rect x="70" y="26" width="140" height="6" rx="3" fill="#d9d9d9" />

//       {/* Plus divider */}
//       <circle cx="140" cy="62" r="7" fill="#fff" stroke="#b5b5b5" />
//       <line x1="136" y1="62" x2="144" y2="62" stroke="#8a8a8a" strokeWidth="1.2" />
//       <line x1="140" y1="58" x2="140" y2="66" stroke="#8a8a8a" strokeWidth="1.2" />

//       {/* Offers group */}
//       <rect x="10" y="76" width="260" height="68" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <ShortsIcon x={20} y={84} />
//       <rect x="70" y="96" width="130" height="6" rx="3" fill="#d9d9d9" />
//       <Checkbox x={244} y={92} />

//       <line x1="20" y1="115" x2="260" y2="115" stroke="#ececec" />

//       <SneakerIcon x={20} y={120} />
//       <rect x="70" y="128" width="130" height="6" rx="3" fill="#d9d9d9" />
//       <Checkbox x={244} y={124} />

//       {/* CTA */}
//       <rect x="10" y="154" width="260" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
//       <text
//         x="140"
//         y="166"
//         textAnchor="middle"
//         fontSize="8"
//         fill="#6b6b6b"
//         fontFamily="-apple-system, system-ui, sans-serif"
//       >
//         Add bundle to cart
//       </text>
//     </svg>
//   );
// }

// /* ---------------- Amazon layout (horizontal row of products) ---------------- */
// function AmazonMockup() {
//   return (
//     <svg
//       viewBox="0 0 280 180"
//       xmlns="http://www.w3.org/2000/svg"
//       width="100%"
//       style={{ display: "block" }}
//     >
//       <rect x="40" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <TShirtIcon x={50} y={40} scale={0.75} />

//       <PlusDot cx={105} cy={55} />

//       <rect x="120" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <ShortsIcon x={130} y={40} scale={0.75} />
//       <CheckboxSmall x={158} y={33} />

//       <PlusDot cx={185} cy={55} />

//       <rect x="200" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <SneakerIcon x={210} y={44} scale={0.7} />
//       <CheckboxSmall x={238} y={33} />

//       {/* CTA */}
//       <rect x="40" y="110" width="210" height="22" rx="5" fill="#fff" stroke="#c9c9c9" />
//       <text
//         x="145"
//         y="124"
//         textAnchor="middle"
//         fontSize="8"
//         fill="#6b6b6b"
//         fontFamily="-apple-system, system-ui, sans-serif"
//       >
//         Add bundle to cart
//       </text>

//       {/* Small price rows */}
//       <rect x="40" y="144" width="80" height="4" rx="2" fill="#d9d9d9" />
//       <rect x="40" y="154" width="60" height="4" rx="2" fill="#ececec" />
//     </svg>
//   );
// }

// /* ---------------- Classic layout (horizontal products + vertical checklist below) ---------------- */
// function ClassicMockup() {
//   return (
//     <svg
//       viewBox="0 0 280 180"
//       xmlns="http://www.w3.org/2000/svg"
//       width="100%"
//       style={{ display: "block" }}
//     >
//       <rect x="40" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <TShirtIcon x={48} y={20} scale={0.65} />

//       <PlusDot cx={95} cy={33} />

//       <rect x="108" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <ShortsIcon x={116} y={20} scale={0.65} />

//       <PlusDot cx={163} cy={33} />

//       <rect x="176" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <SneakerIcon x={184} y={22} scale={0.6} />

//       {/* CTA */}
//       <rect x="40" y="68" width="180" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
//       <text
//         x="130"
//         y="80"
//         textAnchor="middle"
//         fontSize="7"
//         fill="#6b6b6b"
//         fontFamily="-apple-system, system-ui, sans-serif"
//       >
//         Add bundle to cart
//       </text>

//       {/* Check rows */}
//       <CheckboxSmall x={40} y={98} />
//       <rect x="56" y="101" width="160" height="4" rx="2" fill="#d9d9d9" />

//       <CheckboxSmall x={40} y={118} />
//       <rect x="56" y="121" width="160" height="4" rx="2" fill="#d9d9d9" />

//       <CheckboxSmall x={40} y={138} />
//       <rect x="56" y="141" width="130" height="4" rx="2" fill="#ececec" />
//     </svg>
//   );
// }

// /* ---------------- Icon primitives ---------------- */
// function TShirtIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
//   return (
//     <g transform={`translate(${x}, ${y}) scale(${scale})`}>
//       <path
//         d="M6 4 L12 1 L14 3 L18 3 L20 1 L26 4 L30 8 L26 11 L24 9 L24 22 L8 22 L8 9 L6 11 L2 8 Z"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.3"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M13 3 Q16 5 19 3"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.1"
//       />
//     </g>
//   );
// }

// function ShortsIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
//   return (
//     <g transform={`translate(${x}, ${y}) scale(${scale})`}>
//       <path
//         d="M4 2 L28 2 L26 22 L18 22 L16 10 L14 22 L6 22 Z"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.3"
//         strokeLinejoin="round"
//       />
//       <line x1="4" y1="5" x2="28" y2="5" stroke="#8a8a8a" strokeWidth="1" />
//     </g>
//   );
// }

// function SneakerIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
//   return (
//     <g transform={`translate(${x}, ${y}) scale(${scale})`}>
//       <path
//         d="M2 16 L2 10 Q4 6 10 6 L14 10 L20 11 L26 14 L30 16 L30 19 Q30 21 28 21 L4 21 Q2 21 2 19 Z"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.3"
//         strokeLinejoin="round"
//       />
//       <line x1="10" y1="7" x2="12" y2="10" stroke="#8a8a8a" strokeWidth="1" />
//       <line x1="14" y1="8" x2="15" y2="11" stroke="#8a8a8a" strokeWidth="1" />
//       <line x1="18" y1="10" x2="18" y2="13" stroke="#8a8a8a" strokeWidth="1" />
//     </g>
//   );
// }

// function Checkbox({ x, y }: { x: number; y: number }) {
//   return (
//     <g transform={`translate(${x}, ${y})`}>
//       <rect width="14" height="14" rx="3" fill="#4a4a4a" />
//       <path d="M3.5 7 L6 9.5 L10.5 4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//     </g>
//   );
// }

// function CheckboxSmall({ x, y }: { x: number; y: number }) {
//   return (
//     <g transform={`translate(${x}, ${y})`}>
//       <rect width="11" height="11" rx="2" fill="#4a4a4a" />
//       <path d="M2.5 5.5 L4.5 7.5 L8.5 3.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
//     </g>
//   );
// }

// function PlusDot({ cx, cy }: { cx: number; cy: number }) {
//   return (
//     <g>
//       <circle cx={cx} cy={cy} r="6" fill="#fff" stroke="#b5b5b5" />
//       <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#8a8a8a" strokeWidth="1.2" />
//       <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#8a8a8a" strokeWidth="1.2" />
//     </g>
//   );
// }


import { Link } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, Button, InlineStack, Box } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const PRODUCT_PAGE_TYPES = [
  { key: "FBT_LIST", title: "Frequently bought together (List)", description: "A pre-selected bundle in list format.", available: true, preview: "list" },
  { key: "FBT_AMAZON", title: "Frequently bought together (Amazon)", description: "A horizontal bundle in Amazon style.", available: true, preview: "amazon" },
  { key: "FBT_CLASSIC", title: "Frequently bought together (Classic)", description: "A grid layout with horizontal product row.", available: true, preview: "classic" },
] as const;

const POPUP_TYPES = [
  { key: "FBT_ATC_POPUP", title: "Frequently bought together (Popup)", description: "Shown as a popup when shoppers click Add to cart.", available: true, preview: "popup" },
] as const;

export default function NewCampaign() {
  return (
    <Page backAction={{ content: "Campaigns", url: "/app/campaigns" }}>
      <TitleBar title="Create campaign" />
      <Layout>
        {/* Product page section */}
        <Layout.Section>
          <Text as="h2" variant="headingMd">Product page</Text>
          <Box paddingBlockStart="400">
            <InlineStack gap="400" wrap>
              {PRODUCT_PAGE_TYPES.map((t) => (
                <CampaignTypeCard key={t.key} type={t} />
              ))}
            </InlineStack>
          </Box>
        </Layout.Section>

        {/* Popups section */}
        <Layout.Section>
          <Box paddingBlockStart="400">
            <Text as="h2" variant="headingMd">Popups</Text>
          </Box>
          <Box paddingBlockStart="400">
            <InlineStack gap="400" wrap>
              {POPUP_TYPES.map((t) => (
                <CampaignTypeCard key={t.key} type={t} />
              ))}
            </InlineStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function CampaignTypeCard({
  type,
}: {
  type: { key: string; title: string; description: string; available: boolean; preview: string };
}) {
  return (
    <Box width="320px">
      <Card>
        <BlockStack gap="300">
          <Box
            background="bg-surface-secondary"
            padding="400"
            borderRadius="200"
            minHeight="180px"
          >
            <PreviewMockup variant={type.preview as any} />
          </Box>
          <Text as="h3" variant="headingSm">{type.title}</Text>
          <Text as="p" tone="subdued">{type.description}</Text>
          <InlineStack align="end">
            <Button
              url={`/app/campaigns/new/${type.key}`}
              disabled={!type.available}
              variant="primary"
            >
              Create
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </Box>
  );
}

function PreviewMockup({ variant }: { variant: "list" | "amazon" | "classic" | "popup" }) {
  if (variant === "list") return <ListMockup />;
  if (variant === "amazon") return <AmazonMockup />;
  if (variant === "popup") return <PopupMockup />;
  return <ClassicMockup />;
}

/* ---------------- List layout (trigger on top, offers below, vertical) ---------------- */
function ListMockup() {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      {/* Trigger row */}
      <rect x="10" y="10" width="260" height="38" rx="6" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={20} y={19} />
      <rect x="70" y="26" width="140" height="6" rx="3" fill="#d9d9d9" />

      {/* Plus divider */}
      <circle cx="140" cy="62" r="7" fill="#fff" stroke="#b5b5b5" />
      <line x1="136" y1="62" x2="144" y2="62" stroke="#8a8a8a" strokeWidth="1.2" />
      <line x1="140" y1="58" x2="140" y2="66" stroke="#8a8a8a" strokeWidth="1.2" />

      {/* Offers group */}
      <rect x="10" y="76" width="260" height="68" rx="6" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={20} y={84} />
      <rect x="70" y="96" width="130" height="6" rx="3" fill="#d9d9d9" />
      <Checkbox x={244} y={92} />

      <line x1="20" y1="115" x2="260" y2="115" stroke="#ececec" />

      <SneakerIcon x={20} y={120} />
      <rect x="70" y="128" width="130" height="6" rx="3" fill="#d9d9d9" />
      <Checkbox x={244} y={124} />

      {/* CTA */}
      <rect x="10" y="154" width="260" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="140"
        y="166"
        textAnchor="middle"
        fontSize="8"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        Add bundle to cart
      </text>
    </svg>
  );
}

/* ---------------- Amazon layout (horizontal row of products) ---------------- */
function AmazonMockup() {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="40" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={50} y={40} scale={0.75} />

      <PlusDot cx={105} cy={55} />

      <rect x="120" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={130} y={40} scale={0.75} />
      <CheckboxSmall x={158} y={33} />

      <PlusDot cx={185} cy={55} />

      <rect x="200" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
      <SneakerIcon x={210} y={44} scale={0.7} />
      <CheckboxSmall x={238} y={33} />

      {/* CTA */}
      <rect x="40" y="110" width="210" height="22" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="145"
        y="124"
        textAnchor="middle"
        fontSize="8"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        Add bundle to cart
      </text>

      {/* Small price rows */}
      <rect x="40" y="144" width="80" height="4" rx="2" fill="#d9d9d9" />
      <rect x="40" y="154" width="60" height="4" rx="2" fill="#ececec" />
    </svg>
  );
}

/* ---------------- Classic layout (horizontal products + vertical checklist below) ---------------- */
function ClassicMockup() {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="40" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={48} y={20} scale={0.65} />

      <PlusDot cx={95} cy={33} />

      <rect x="108" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={116} y={20} scale={0.65} />

      <PlusDot cx={163} cy={33} />

      <rect x="176" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
      <SneakerIcon x={184} y={22} scale={0.6} />

      {/* CTA */}
      <rect x="40" y="68" width="180" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="130"
        y="80"
        textAnchor="middle"
        fontSize="7"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        Add bundle to cart
      </text>

      {/* Check rows */}
      <CheckboxSmall x={40} y={98} />
      <rect x="56" y="101" width="160" height="4" rx="2" fill="#d9d9d9" />

      <CheckboxSmall x={40} y={118} />
      <rect x="56" y="121" width="160" height="4" rx="2" fill="#d9d9d9" />

      <CheckboxSmall x={40} y={138} />
      <rect x="56" y="141" width="130" height="4" rx="2" fill="#ececec" />
    </svg>
  );
}

/* ---------------- Popup layout (modal overlay with bundle inside) ---------------- */
function PopupMockup() {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      {/* Dim backdrop */}
      <rect x="0" y="0" width="280" height="180" fill="#000" opacity="0.08" />

      {/* Faint product page outline behind popup */}
      <rect x="14" y="14" width="252" height="152" rx="6" fill="none" stroke="#e3e3e3" strokeDasharray="3 3" />

      {/* Popup modal */}
      <rect x="40" y="22" width="200" height="140" rx="8" fill="#fff" stroke="#c9c9c9" />

      {/* Close (×) */}
      <line x1="224" y1="32" x2="230" y2="38" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="230" y1="32" x2="224" y2="38" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" />

      {/* Title bar */}
      <rect x="52" y="34" width="120" height="6" rx="3" fill="#d9d9d9" />

      {/* Horizontal product row inside popup */}
      <rect x="56" y="52" width="36" height="36" rx="5" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={62} y={58} scale={0.55} />

      <PlusDot cx={104} cy={70} />

      <rect x="116" y="52" width="36" height="36" rx="5" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={122} y={58} scale={0.55} />
      <CheckboxSmall x={144} y={54} />

      <PlusDot cx={164} cy={70} />

      <rect x="176" y="52" width="36" height="36" rx="5" fill="#fff" stroke="#d9d9d9" />
      <SneakerIcon x={182} y={60} scale={0.5} />
      <CheckboxSmall x={204} y={54} />

      {/* Price/text rows */}
      <rect x="56" y="100" width="100" height="5" rx="2" fill="#d9d9d9" />
      <rect x="56" y="112" width="70" height="4" rx="2" fill="#ececec" />

      {/* CTA inside popup */}
      <rect x="56" y="128" width="160" height="20" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="136"
        y="141"
        textAnchor="middle"
        fontSize="8"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        Add bundle to cart
      </text>
    </svg>
  );
}

/* ---------------- Icon primitives ---------------- */
function TShirtIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M6 4 L12 1 L14 3 L18 3 L20 1 L26 4 L30 8 L26 11 L24 9 L24 22 L8 22 L8 9 L6 11 L2 8 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M13 3 Q16 5 19 3"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.1"
      />
    </g>
  );
}

function ShortsIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M4 2 L28 2 L26 22 L18 22 L16 10 L14 22 L6 22 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <line x1="4" y1="5" x2="28" y2="5" stroke="#8a8a8a" strokeWidth="1" />
    </g>
  );
}

function SneakerIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M2 16 L2 10 Q4 6 10 6 L14 10 L20 11 L26 14 L30 16 L30 19 Q30 21 28 21 L4 21 Q2 21 2 19 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <line x1="10" y1="7" x2="12" y2="10" stroke="#8a8a8a" strokeWidth="1" />
      <line x1="14" y1="8" x2="15" y2="11" stroke="#8a8a8a" strokeWidth="1" />
      <line x1="18" y1="10" x2="18" y2="13" stroke="#8a8a8a" strokeWidth="1" />
    </g>
  );
}

function Checkbox({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width="14" height="14" rx="3" fill="#4a4a4a" />
      <path d="M3.5 7 L6 9.5 L10.5 4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function CheckboxSmall({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width="11" height="11" rx="2" fill="#4a4a4a" />
      <path d="M2.5 5.5 L4.5 7.5 L8.5 3.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function PlusDot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="6" fill="#fff" stroke="#b5b5b5" />
      <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#8a8a8a" strokeWidth="1.2" />
      <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#8a8a8a" strokeWidth="1.2" />
    </g>
  );
}
