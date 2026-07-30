// api/bank/_albaraka.js
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { XMLParser } from 'fast-xml-parser';

export function createAlbarakaHttpsAgent() {
  const proxyUrl = process.env.FIXIE_URL;
  if (!proxyUrl) return undefined;

  const httpsAgent = new HttpsProxyAgent(proxyUrl);
  // Albaraka SOAP servisi TLS handshake'inde ara sertifikayı (intermediate CA) göndermiyor,
  // bu yüzden zincir doğrulanamıyor. connect(), proxy CONNECT sonrası hedef sunucuyla asıl
  // TLS upgrade'ini burada kurduğu için rejectUnauthorized'ı doğrudan bu adıma enjekte ediyoruz
  // (constructor'a verilen seçenek sadece proxy'ye bağlanırken kullanılıyor, hedefe ulaşmıyor).
  const originalConnect = httpsAgent.connect.bind(httpsAgent);
  httpsAgent.connect = (req, opts) => originalConnect(req, { ...opts, rejectUnauthorized: false });
  return httpsAgent;
}

export const formatAlbarakaDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

// XML gövdesine gömülen kullanıcı girdilerini (pId/pIdPass/musteriNo vb.) güvene alır:
// - Baş/son boşluk, sekme veya satır sonu karakterlerini temizler (kopyala-yapıştırdan
//   sızan görünmez karakterler "Şifre yanlış" (Kod 882) gibi hatalara yol açabiliyor).
// - XML özel karakterlerini (&, <, >) escape eder, aksi halde şifre/kullanıcı adında
//   bu karakterler varsa SOAP gövdesi bozulur.
const sanitizeForXml = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Albaraka getHesapHareketleri SOAP servisini çağırır ve ayrıştırılmış sonucu döner.
// Banka tarafı bir hata koduyla (örn. şifre yanlış) dönerse bankaSonucu doldurulur,
// ağ/bağlantı hatalarında ise exception fırlatılır.
export async function callGetHesapHareketleri({ pId, pIdPass, mNo, basTarih, sonTarih }) {
  const safePId = sanitizeForXml(pId);
  const safePIdPass = sanitizeForXml(pIdPass);
  const safeMNo = sanitizeForXml(mNo);
  const safeBasTarih = sanitizeForXml(basTarih);
  const safeSonTarih = sanitizeForXml(sonTarih);

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
              <basTarih>${basTarihStr}</basTarih>
              <sonTarih>${sonTarihStr}</sonTarih>
           </pParams>
        </ser:getHesapHareketleri>
     </soapenv:Body>
  </soapenv:Envelope>`;
  
  // DEBUG: pId/musteriNo'nun bankaya ne olarak gittiğini teyit etmek için geçici log.
  // pIdPass bilerek loglanmıyor (şifreyi log'a yazmayın).
  console.log('[Albaraka] Giden istek -> pId:', JSON.stringify(safePId), 'musteriNo:', JSON.stringify(safeMNo), 'pIdPass uzunluk:', safePIdPass.length);

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
      timeout: 20000
    }
  );

  const parser = new XMLParser({ ignoreAttributes: true });
  const jsonObj = parser.parse(response.data);

  const hesapHareketleriResponse = jsonObj?.['soap:Envelope']?.['soap:Body']?.['getHesapHareketleriResponse'];
  const bankaSonucu = hesapHareketleriResponse?.responseData?.result;

  // DEBUG: Bankadan dönen ham sonuç kodu/mesajını görmek için geçici log.
  console.log('[Albaraka] Banka sonucu:', JSON.stringify(bankaSonucu));

  const responseBody = hesapHareketleriResponse?.responseData?.return || hesapHareketleriResponse?.return || [];
  const hareketler = Array.isArray(responseBody)
    ? responseBody
    : (responseBody.hareket ? (Array.isArray(responseBody.hareket) ? responseBody.hareket : [responseBody.hareket]) : []);

  return { bankaSonucu, hareketler };
}