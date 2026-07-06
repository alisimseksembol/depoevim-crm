/* eslint-env node */
// Vercel serverless function - Parasut OAuth2 + taslak fatura olusturma koprusu.
// Sirlar (client id/secret, kullanici bilgileri) sadece burada, process.env uzerinden okunur; frontend'e asla gonderilmez.

const PARASUT_BASE_URL = 'https://api.parasut.com';

let cachedToken = null; // warm invocation'lar arasinda token'i tekrar almamak icin basit bellek ici cache

async function getAccessToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.accessToken;
    }

    const { PARASUT_CLIENT_ID, PARASUT_CLIENT_SECRET, PARASUT_USERNAME, PARASUT_PASSWORD } = process.env;

    if (!PARASUT_CLIENT_ID || !PARASUT_CLIENT_SECRET || !PARASUT_USERNAME || !PARASUT_PASSWORD) {
        throw new Error('Parasut kimlik bilgileri eksik: PARASUT_CLIENT_ID, PARASUT_CLIENT_SECRET, PARASUT_USERNAME, PARASUT_PASSWORD .env icinde tanimlanmali.');
    }

    const body = new URLSearchParams({
        grant_type: 'password',
        username: PARASUT_USERNAME,
        password: PARASUT_PASSWORD,
        client_id: PARASUT_CLIENT_ID,
        client_secret: PARASUT_CLIENT_SECRET,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
    });

    const response = await fetch(`${PARASUT_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Parasut token alinamadi: ${data.error_description || data.error || response.statusText}`);
    }

    cachedToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000
    };
    return cachedToken.accessToken;
}

async function parasutRequest(path, accessToken, options = {}) {
    const response = await fetch(`${PARASUT_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            ...options.headers
        }
    });
    const data = await response.json();
    if (!response.ok) {
        const message = data.errors?.[0]?.title || data.error_description || response.statusText;
        throw new Error(`Parasut istegi basarisiz (${path}): ${message}`);
    }
    return data;
}

async function findOrCreateContact(companyId, accessToken, customer) {
    const taxNumber = customer.taxNumber?.trim();

    if (taxNumber) {
        const filterPath = `/v4/${companyId}/contacts?filter[tax_number]=${encodeURIComponent(taxNumber)}`;
        const existing = await parasutRequest(filterPath, accessToken);
        if (existing.data?.length > 0) {
            return existing.data[0].id;
        }
    }

    const isCompany = !!taxNumber && taxNumber.length === 10;
    const created = await parasutRequest(`/v4/${companyId}/contacts`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
            data: {
                type: 'contacts',
                attributes: {
                    name: customer.name,
                    tax_number: taxNumber || undefined,
                    address: customer.address || undefined,
                    email: customer.email || undefined,
                    phone: customer.phone || undefined,
                    contact_type: isCompany ? 'company' : 'person',
                    account_type: 'customer'
                }
            }
        })
    });
    return created.data.id;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });
    }

    const { PARASUT_COMPANY_ID } = process.env;
    if (!PARASUT_COMPANY_ID) {
        return res.status(500).json({ error: 'PARASUT_COMPANY_ID .env icinde tanimlanmali.' });
    }

    const { customerName, taxNumber, address, email, phone, netAmount, vatRate, description, dueDate } = req.body || {};

    if (!customerName || !netAmount) {
        return res.status(400).json({ error: 'customerName ve netAmount alanlari zorunludur.' });
    }

    try {
        const accessToken = await getAccessToken();
        const contactId = await findOrCreateContact(PARASUT_COMPANY_ID, accessToken, {
            name: customerName,
            taxNumber,
            address,
            email,
            phone
        });

        const today = new Date().toISOString().split('T')[0];
        const invoice = await parasutRequest(`/v4/${PARASUT_COMPANY_ID}/sales_invoices?include=details,contact`, accessToken, {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    type: 'sales_invoices',
                    attributes: {
                        item_type: 'invoice',
                        description: description || 'Depolama Hizmet Bedeli',
                        issue_date: today,
                        due_date: dueDate || today,
                        currency: 'TRL'
                    },
                    relationships: {
                        contact: { data: { id: contactId, type: 'contacts' } },
                        details: {
                            data: [
                                {
                                    type: 'sales_invoice_details',
                                    attributes: {
                                        quantity: 1,
                                        unit_price: Number(netAmount),
                                        vat_rate: vatRate ?? 20,
                                        description: description || 'Depolama Hizmet Bedeli'
                                    }
                                }
                            ]
                        }
                    }
                }
            })
        });

        return res.status(200).json({
            success: true,
            invoiceId: invoice.data.id,
            invoiceNo: invoice.data.attributes?.invoice_no || null,
            raw: invoice.data
        });
    } catch (error) {
        console.error('Parasut fatura olusturma hatasi:', error);
        return res.status(502).json({ error: error.message || 'Parasut ile iletisimde beklenmeyen bir hata olustu.' });
    }
}
