// api/bank/_albaraka.js
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { XMLParser } from 'fast-xml-parser';

export function createAlbarakaHttpsAgent() {
  const proxyUrl = process.env.FIXIE_URL;

  if (!proxyUrl) {
    console.error('[Albaraka] Kritik Hata: FIXIE_URL bulunamadı!');
    return undefined;
  }

  // Albaraka SOAP servisi TLS handshake'inde ara sertifikayı (intermediate CA)
  // göndermiyor. rejectUnauthorized'ı doğrudan constructor'a veriyoruz.
  // (Önceki `.connect` monkey-patch yöntemi https-proxy-agent sürümüne göre
  //  sessizce devre dışı kalabiliyordu; bu, "bazen bağlanıyor bazen
  //  bağlanmıyor" davranışının olası nedenlerinden biriydi.)
  return new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
}

export const formatAlbarakaDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

// ALBARAKA_DEBUG=1 ortam değişkenini Vercel'de tanımlarsan ham XML ve
// parse edilmiş JSON'u loglara basar. Gerçek response yapısını görüp
// aşağıdaki extractHareketler/extractBankaSonucu fonksiyonlarına doğru
// yolu eklemek için kullan; sorunu bulduktan sonra kapatabilirsin.
const DEBUG = process.env.ALBARAKA_DEBUG === '1';

// Hareket listesinin bankanın döndüğü XML'de hangi anahtarın altında
// olduğunu kesin bilmediğimiz için birkaç olası yolu sırayla deniyoruz.
function extractHareketler(hesapHareketleriResponse) {
  const candidates = [
    hesapHareketleriResponse?.responseData?.return,
    hesapHareketleriResponse?.return,
    hesapHareketleriResponse?.getHesapHareketleriResult?.return,
    hesapHareketleriResponse?.getHesapHareketleriResult?.hareketler,
    hesapHareketleriResponse?.responseData?.hareketler,
    hesapHareketleriResponse?.hareketler
  ];

  for (const c of candidates) {
    if (!c) continue;
    if (Array.isArray(c)) return c;
    if (c.hareket) return Array.isArray(c.hareket) ? c.hareket : [c.hareket];
    if (typeof c === 'object') return [c]; // tek kayıt objesi olarak dönmüş olabilir
  }
  return [];
}

function extractBankaSonucu(hesapHareketleriResponse) {
  return (
    hesapHareketleriResponse?.responseData?.result ||
    hesapHareketleriResponse?.result ||
    hesapHareketleriResponse?.getHesapHareketleriResult?.bankaSonucu ||
    hesapHareketleriResponse?.getHesapHareketleriResult?.result ||
    hesapHareketleriResponse?.bankaSonucu ||
    null
  );
}

// Albaraka getHesapHareketleri SOAP servisini çağırır ve ayrıştırılmış sonucu döner.
export async function callGetHesapHareketleri({ pId, pIdPass, mNo, basTarih, sonTarih }) {

  const xmlPayload = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.albaraka.com/">
     <soapenv:Header/>
     <soapenv:Body>
        <ser:getHesapHareketleri>
           <pId><![CDATA[${pId}]]></pId>
           <pIdPass><![CDATA[${pIdPass}]]></pIdPass>
           <pParams>
              <musteriNo><![CDATA[${mNo}]]></musteriNo>
              <hesapNo></hesapNo>
              <basTarih>${basTarih}</basTarih>
              <sonTarih>${sonTarih}</sonTarih>
           </pParams>
        </ser:getHesapHareketleri>
     </soapenv:Body>
  </soapenv:Envelope>`;

  if (DEBUG) {
    console.log('[Albaraka] Giden istek -> pId:', pId, 'musteriNo:', mNo, 'pIdPass uzunluk:', pIdPass?.length);
  }

  const response = await axios.post(
    'https://eservice.albarakaturk.com.tr:10214/invoiceincomingsite/HesapBilgileriService.asmx',
    xmlPayload,
    {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://services.albaraka.com/getHesapHareketleri'
      },
      httpsAgent: createAlbarakaHttpsAgent(),
      proxy: false, // axios'un HTTP(S)_PROXY env değişkenlerini otomatik algılayıp httpsAgent ile çakışmasını engeller
      timeout: 25000
    }
  );

  if (DEBUG) {
    console.log('[Albaraka] HAM XML:', response.data);
  }

  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
  const jsonObj = parser.parse(response.data);

  if (DEBUG) {
    console.log('[Albaraka] PARSE EDİLMİŞ JSON:', JSON.stringify(jsonObj, null, 2));
  }

  const hesapHareketleriResponse = jsonObj?.Envelope?.Body?.getHesapHareketleriResponse;

  const bankaSonucu = extractBankaSonucu(hesapHareketleriResponse);
  const hareketler = extractHareketler(hesapHareketleriResponse);

  if (DEBUG) {
    console.log('[Albaraka] Banka sonucu:', JSON.stringify(bankaSonucu), '| hareket sayısı:', hareketler.length);
  }

  return { bankaSonucu, hareketler };
}