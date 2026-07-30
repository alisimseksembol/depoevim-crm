// api/bank/_albaraka.js
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { XMLParser } from 'fast-xml-parser';

export function createAlbarakaHttpsAgent() {
  // Fixie proxy URL'sini Vercel'in güvenli ortam değişkenlerinden tam haliyle çekiyoruz (407 hatasını çözer)
  const proxyUrl = process.env.FIXIE_URL;
  
  if (!proxyUrl) {
    console.error('[Albaraka] Kritik Hata: FIXIE_URL bulunamadı!');
    return undefined;
  }
  
  const httpsAgent = new HttpsProxyAgent(proxyUrl);
  
  // Albaraka SOAP servisi TLS handshake'inde ara sertifikayı (intermediate CA) göndermiyor.
  // Sertifika doğrulama uyarısını bypass ediyoruz.
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
export async function callGetHesapHareketleri({ pId, pIdPass, mNo, basTarih, sonTarih }) {
  
  // XML CDATA ile zırhlandığı için ? ve %% gibi özel karakterler sunucuda bozulmadan okunur
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
  
  // DEBUG: pId/musteriNo'nun bankaya ne olarak gittiğini teyit etmek için geçici log.
  console.log('[Albaraka] Giden istek -> pId:', pId, 'musteriNo:', mNo, 'pIdPass uzunluk:', pIdPass?.length);

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

  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
  const jsonObj = parser.parse(response.data);

  const hesapHareketleriResponse = jsonObj?.Envelope?.Body?.getHesapHareketleriResponse;
  const bankaSonucu = hesapHareketleriResponse?.responseData?.result;

  // DEBUG: Bankadan dönen ham sonuç kodu/mesajını görmek için geçici log.
  console.log('[Albaraka] Banka sonucu:', JSON.stringify(bankaSonucu));

  const responseBody = hesapHareketleriResponse?.responseData?.return || hesapHareketleriResponse?.return || [];
  const hareketler = Array.isArray(responseBody)
    ? responseBody
    : (responseBody.hareket ? (Array.isArray(responseBody.hareket) ? responseBody.hareket : [responseBody.hareket]) : []);

  return { bankaSonucu, hareketler };
}