import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Metadata } from 'next';
import * as freighter from '@stellar/freighter-api';

// A preview must render before/without the wallet extension. Any Freighter
// call here is a failure, and the mock makes accidental use obvious.
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(() => {
    throw new Error('Freighter must not be used to render a link preview');
  }),
  getPublicKey: vi.fn(() => {
    throw new Error('Freighter must not be used to render a link preview');
  }),
  signTransaction: vi.fn(() => {
    throw new Error('Freighter must not be used to render a link preview');
  }),
  isAllowed: vi.fn(() => {
    throw new Error('Freighter must not be used to render a link preview');
  }),
  setAllowed: vi.fn(() => {
    throw new Error('Freighter must not be used to render a link preview');
  }),
}));

import { generateMetadata } from '../pay/[id]/layout';

const SELLER_NAME = 'Acme Studio';
const CLIENT_EMAIL = 'client@example.com';
const SELLER_EMAIL = 'seller@example.com';
const PAYER_ADDRESS = 'GPAYERXQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V';
const OTHER_INVOICE_MEMO = 'INV-OTHER-0042';
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const expiredInvoice = {
  id: 'inv_preview_1',
  amount: 12.5,
  assetCode: 'USDC',
  assetIssuer: USDC_ISSUER,
  sellerName: SELLER_NAME,
  sellerEmail: SELLER_EMAIL,
  customerName: 'Sam Client',
  customerEmail: CLIENT_EMAIL,
  memo: OTHER_INVOICE_MEMO,
  payerPublicKey: PAYER_ADDRESS,
  description: 'Logo design',
  status: 'EXPIRED',
  expiresAt: '2026-01-01T00:00:00.000Z',
};

function mockInvoiceResponse(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * Turn the metadata Next.js would emit as <head> tags into markup, so the
 * assertions below read exactly like what a chat client receives.
 */
function renderHead(metadata: Metadata): string {
  const title = typeof metadata.title === 'string' ? metadata.title : '';
  const description = typeof metadata.description === 'string' ? metadata.description : '';
  const openGraph = (metadata.openGraph ?? {}) as {
    title?: unknown;
    description?: unknown;
  };
  const ogTitle = typeof openGraph.title === 'string' ? openGraph.title : '';
  const ogDescription = typeof openGraph.description === 'string' ? openGraph.description : '';

  return renderToStaticMarkup(
    <head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
    </head>,
  );
}

async function headFor(id: string): Promise<string> {
  return renderHead(await generateMetadata({ params: { id } }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('payment link preview metadata', () => {
  it('names the amount, asset code and seller display name', async () => {
    mockInvoiceResponse({ success: true, data: expiredInvoice });

    const head = await headFor(expiredInvoice.id);

    expect(head).toContain('Pay 12.5 USDC to Acme Studio');
    expect(head).toContain('Invoice for 12.5 USDC from Acme Studio.');
    // Credit assets keep their code; a human-readable alias would be ambiguous.
    expect(head).toContain('USDC');
    expect(head).not.toContain('USD Coin');
  });

  it('fetches only this invoice by id', async () => {
    const fetchMock = mockInvoiceResponse({
      success: true,
      data: expiredInvoice,
    });

    await headFor(expiredInvoice.id);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(`/invoices/${expiredInvoice.id}`);
    expect(url).not.toMatch(/\/invoices(\?|$)/);
  });

  it('omits the client email, payer address, memo and seller email from the head', async () => {
    mockInvoiceResponse({ success: true, data: expiredInvoice });

    const head = await headFor(expiredInvoice.id);

    expect(head).not.toContain(CLIENT_EMAIL);
    expect(head).not.toContain(SELLER_EMAIL);
    expect(head).not.toContain(PAYER_ADDRESS);
    expect(head).not.toContain(OTHER_INVOICE_MEMO);
  });

  it('still previews an expired invoice', async () => {
    mockInvoiceResponse({ success: true, data: expiredInvoice });

    const head = await headFor(expiredInvoice.id);

    expect(head).toContain('12.5 USDC');
    expect(head).not.toContain('Invoice not found');
  });

  it('previews an unknown id as missing, not as another invoice', async () => {
    mockInvoiceResponse({ success: false, error: 'Invoice not found' }, { ok: false, status: 404 });

    const head = await headFor('inv_missing');

    expect(head).toContain('Invoice not found');
    expect(head).not.toContain('12.5 USDC');
    expect(head).not.toContain(SELLER_NAME);
    expect(head).not.toContain(CLIENT_EMAIL);
  });

  it('treats a mismatched invoice payload as missing', async () => {
    mockInvoiceResponse({ success: true, data: expiredInvoice });

    const head = await headFor('inv_someone_else');

    expect(head).toContain('Invoice not found');
    expect(head).not.toContain(SELLER_NAME);
  });

  it('treats an unreachable API as a missing invoice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const head = await headFor(expiredInvoice.id);

    expect(head).toContain('Invoice not found');
    expect(head).not.toContain(CLIENT_EMAIL);
  });

  it('does not require Freighter', async () => {
    mockInvoiceResponse({ success: true, data: expiredInvoice });

    await headFor(expiredInvoice.id);

    expect(freighter.isConnected).not.toHaveBeenCalled();
    expect(freighter.getPublicKey).not.toHaveBeenCalled();
    expect(freighter.isAllowed).not.toHaveBeenCalled();
  });
});
