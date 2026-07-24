// api/bank/transactions.js
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { XMLParser } from 'fast-xml-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, apiSecret, customerNo } = req.body;

  // Vercel Ortam Değişkenlerinden Fixie ve Kimlik Bilgilerini Al
  const proxyUrl = process.env.FIXIE_URL;
  const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  const pId = apiKey || process.env.ALBARAKA_USERNAME;
  const pIdPass = apiSecret || process.env.ALBARAKA_PASSWORD;
  
  // Arayüzden musteriNo gelmezse (ki gelmiyor), banka kullanıcı adını musteriNo olarak kullan
  const mNo = customerNo || pId; 

  // Banka formatına uygun tarih (yyyyMMdd) - Son 3 günü tarar
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 3);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  // Albaraka SOAP XML İsteği
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
              <basTarih>${formatDate(pastDate)}</basTarih>
              <sonTarih>${formatDate(today)}</sonTarih>
           </pParams>
        </ser:getHesapHareketleri>
     </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    const response = await axios.post(
      'https://eservice.albarakaturk.com.tr:10214/invoiceincomingsite/HesapBilgileriService.asmx',
      xmlPayload,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://services.albaraka.com/getHesapHareketleri'
        },
        httpsAgent,
        timeout: 20000
      }
    );

    // XML Yanıtını JSON'a Çevirme
    const parser = new XMLParser({ ignoreAttributes: true });
    const jsonObj = parser.parse(response.data);

    const responseBody = jsonObj['soap:Envelope']?.['soap:Body']?.['getHesapHareketleriResponse']?.['return'] || [];
    let hareketler = Array.isArray(responseBody) ? responseBody : (responseBody.hareket ? (Array.isArray(responseBody.hareket) ? responseBody.hareket : [responseBody.hareket]) : []);

    const transactions = hareketler.map(t => {
       const rawDate = String(t.Tarih);
       const formattedDate = rawDate ? `${rawDate.substring(0,4)}-${rawDate.substring(4,6)}-${rawDate.substring(6,8)}` : new Date().toISOString().split('T')[0];
       
       return {
         id: t.fisNo || Date.now() + Math.random(),
         date: formattedDate,
         amount: parseFloat(t.islemTutari || 0),
         description: t.Aciklama || '',
         isCredit: t.borcAlacak === 'A' 
       }
    }).filter(t => t.isCredit);

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Banka API Hatası:', error.message);
    res.status(500).json({ success: false, error: 'Albaraka servisine bağlanırken hata oluştu.' });
  }
}