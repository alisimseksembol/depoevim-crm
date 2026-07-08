/* eslint-env node */
// Vercel serverless function - Parasut OAuth2 + taslak fatura olusturma koprusu.
// Sirlar (client id/secret, kullanici bilgileri) sadece burada, process.env uzerinden okunur; frontend'e asla gonderilmez.

const PARASUT_BASE_URL = 'https://api.parasut.com';

// GEÇİCİ MANUEL TANIMLAMALAR (Vercel paneline erişim düzelene kadar sistemi bypass ediyoruz)
process.env.PARASUT_CLIENT_ID = "50vdTAC79y6kjfrMt70l9vV3pdN6SAWGAmKUMgXm1oA"; // Sıfır (0) düzeltmesi yapılmış çalışan anahtar
process.env.PARASUT_COMPANY_ID = "842421"; // API'den teyit ettiğimiz gerçek Firma ID numarası

let cachedToken = null; // warm invocation'lar arasinda token'i tekrar almamak icin basit bellek ici cache

async function getAccessToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.accessToken;
    }

    const { PARASUT_USERNAME, PARASUT_PASSWORD, PARASUT_CLIENT_ID, PARASUT_CLIENT_SECRET } = process.env;

    if (!PARASUT_USERNAME || !PARASUT_PASSWORD || !PARASUT_CLIENT_ID || !PARASUT_CLIENT_SECRET) {
        throw new Error('Parasut kimlik bilgileri eksik: PARASUT_USERNAME, PARASUT_PASSWORD, PARASUT_CLIENT_ID, PARASUT_CLIENT_SECRET .env icinde tanimlanmali.');
    }

    // Parasut destek ekibinin istegi uzerine: parametreler manuel olarak '&' ile birlestirilmis ham string olarak gonderiliyor.
    const body = `grant_type=password&client_id=${PARASUT_CLIENT_ID}&client_secret=${PARASUT_CLIENT_SECRET}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&username=${PARASUT_USERNAME}&password=${PARASUT_PASSWORD}`;

    const response = await fetch(`${PARASUT_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
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
        console.error('=== PARAŞÜT API DETAYLI RED MESAJI ===');
        console.error(JSON.stringify(data, null, 2));
        console.error('=======================================');

        const message = data.errors?.[0]?.title || data.error_description || response.statusText;
        const detail = data.errors?.[0]?.detail ? ` (${data.errors[0].detail})` : '';
        const pointer = data.errors?.[0]?.source?.pointer ? ` [Hatalı Alan: ${data.errors[0].source.pointer}]` : '';
        
        throw new Error(`Parasut istegi basarisiz (${path}): ${message}${detail}${pointer}`);
    }
    return data;
}

// Müşteri numarasına göre Paraşüt'te Ürün/Hizmet kartı bulur veya otomatik oluşturur
async function findOrCreateProduct(companyId, accessToken, customerNo) {
    const productName = customerNo
        ? `${customerNo} NO.LU MÜŞTERİ DEPOLAMA BEDELİ`
        : 'Depolama Hizmet Bedeli';

    const filterPath = `/v4/${companyId}/products?filter[name]=${encodeURIComponent(productName)}`;
    const existing = await parasutRequest(filterPath, accessToken);
    if (existing.data?.length > 0) {
        return existing.data[0].id;
    }

    const created = await parasutRequest(`/v4/${companyId}/products`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
            data: {
                type: 'products',
                attributes: {
                    name: productName,
                    vat_rate: 20
                }
            }
        })
    });
    return created.data.id;
}

// Türkiye'nin 81 ili - adres metninden il/ilçe ayıklamak için kullanılır
const TR_PROVINCES = ['ADANA', 'ADIYAMAN', 'AFYONKARAHİSAR', 'AĞRI', 'AMASYA', 'ANKARA', 'ANTALYA', 'ARTVİN', 'AYDIN',
    'BALIKESİR', 'BİLECİK', 'BİNGÖL', 'BİTLİS', 'BOLU', 'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI', 'ÇORUM', 'DENİZLİ',
    'DİYARBAKIR', 'EDİRNE', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM', 'ESKİŞEHİR', 'GAZİANTEP', 'GİRESUN', 'GÜMÜŞHANE', 'HAKKARİ',
    'HATAY', 'ISPARTA', 'MERSİN', 'İSTANBUL', 'İZMİR', 'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRKLARELİ', 'KIRŞEHİR', 'KOCAELİ',
    'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA', 'KAHRAMANMARAŞ', 'MARDİN', 'MUĞLA', 'MUŞ', 'NEVŞEHİR', 'NİĞDE', 'ORDU', 'RİZE',
    'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP', 'SİVAS', 'TEKİRDAĞ', 'TOKAT', 'TRABZON', 'TUNCELİ', 'ŞANLIURFA', 'UŞAK', 'VAN',
    'YOZGAT', 'ZONGULDAK', 'AKSARAY', 'BAYBURT', 'KARAMAN', 'KIRIKKALE', 'BATMAN', 'ŞIRNAK', 'BARTIN', 'ARDAHAN', 'IĞDIR',
    'YALOVA', 'KARABÜK', 'KİLİS', 'OSMANİYE', 'DÜZCE'];

// Serbest metin adresten il (city) ve ilçe (district) bilgisini ayıklamaya çalışır (ör: "... Kadıköy/İstanbul")
function parseCityDistrictFromAddress(address) {
    if (!address) return { city: undefined, district: undefined };

    const slashMatch = address.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*\/\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*$/);
    if (slashMatch) {
        const [, district, city] = slashMatch;
        const cityUpper = city.toLocaleUpperCase('tr-TR');
        if (TR_PROVINCES.includes(cityUpper)) {
            return { city: cityUpper, district: district.toLocaleUpperCase('tr-TR') };
        }
    }

    const upper = address.toLocaleUpperCase('tr-TR');
    for (const province of TR_PROVINCES) {
        const idx = upper.lastIndexOf(province);
        if (idx !== -1) {
            const before = upper.slice(0, idx).trim();
            const tokens = before.split(/[\s,/]+/).filter(Boolean);
            const district = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
            return { city: province, district };
        }
    }

    return { city: undefined, district: undefined };
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
                    city: customer.city || undefined,
                    district: customer.district || undefined,
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

// Fatura notu şablonunu müşteri numarasıyla doldurur
function buildInvoiceNote(customerNo) {
    return `TR90 0020 3000 0871 2889 0000 34
Sembol Nakliyat Depoculuk Tic. Ltd. Şti
Albaraka
Ödeme yaparken açıklama kısmına müşteri numaranızı yazmayı unutmayınız.
Müşteri No : ${customerNo || '-'}`;
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

    const { customerName, taxNumber, address, email, phone, netAmount, vatRate, description, dueDate, customerNo, city, district } = req.body || {};

    if (!customerName || !netAmount) {
        return res.status(400).json({ error: 'customerName ve netAmount alanlari zorunludur.' });
    }

    try {
        const accessToken = await getAccessToken();

        // Adresten il/ilçe ayıklama (frontend'den açıkça gönderilmişse onlar önceliklidir)
        const parsedAddress = parseCityDistrictFromAddress(address);

        // Müşteri kontrolü / oluşturulması
        const contactId = await findOrCreateContact(PARASUT_COMPANY_ID, accessToken, {
            name: customerName,
            taxNumber,
            address,
            city: city || parsedAddress.city,
            district: district || parsedAddress.district,
            email,
            phone
        });

        // Ürün/Hizmet kontrolü / oluşturulması (müşteri numarasına göre dinamik isim)
        const invoiceDescription = description || 'Depolama Hizmet Bedeli';
        const productId = await findOrCreateProduct(PARASUT_COMPANY_ID, accessToken, customerNo);

        const today = new Date().toISOString().split('T')[0];
        const invoice = await parasutRequest(`/v4/${PARASUT_COMPANY_ID}/sales_invoices?include=details,contact`, accessToken, {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    type: 'sales_invoices',
                    attributes: {
                        item_type: 'invoice',
                        description: invoiceDescription,
                        note: buildInvoiceNote(customerNo),
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
                                        description: invoiceDescription
                                    },
                                    relationships: {
                                        product: { data: { id: productId, type: 'products' } }
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