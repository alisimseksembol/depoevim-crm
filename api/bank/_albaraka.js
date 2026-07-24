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

// Albaraka getHesapHareketleri SOAP servisini çağırır ve ayrıştırılmış sonucu döner.
// Banka tarafı bir hata koduyla (örn. şifre yanlış) dönerse bankaSonucu doldurulur,
// ağ/bağlantı hatalarında ise exception fırlatılır.
export async function callGetHesapHareketleri({ pId, pIdPass, mNo, basTarih, sonTarih }) {
  const xmlPayload = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.albaraka.com/">
     <soapenv:Header/>
     <soapenv:Body>
        <ser:getHesapHareketleri>
           <pId>${pId}</pId>
           <pIdPass>${pIdPass}</pIdPass>
           <pParams>
              <musteriNo>${mNo}</musteriNo>
              <hesapNo></hesapNo>
              <basTarih>${basTarih}</basTarih>
              <sonTarih>${sonTarih}</sonTarih>
           </pParams>
        </ser:getHesapHareketleri>
     </soapenv:Body>
  </soapenv:Envelope>`;

  const response = await axios.post(
    'https://eservice.albarakaturk.com.tr:10214/invoiceincomingsite/HesapBilgileriService.asmx',
    xmlPayload,
    {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://services.albaraka.com/getHesapHareketleri'
      },
      httpsAgent: createAlbarakaHttpsAgent(),
      timeout: 20000
    }
  );

  const parser = new XMLParser({ ignoreAttributes: true });
  const jsonObj = parser.parse(response.data);

  const hesapHareketleriResponse = jsonObj?.['soap:Envelope']?.['soap:Body']?.['getHesapHareketleriResponse'];
  const bankaSonucu = hesapHareketleriResponse?.responseData?.result;

  const responseBody = hesapHareketleriResponse?.responseData?.return || hesapHareketleriResponse?.return || [];
  const hareketler = Array.isArray(responseBody)
    ? responseBody
    : (responseBody.hareket ? (Array.isArray(responseBody.hareket) ? responseBody.hareket : [responseBody.hareket]) : []);

  return { bankaSonucu, hareketler };
}
