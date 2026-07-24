// api/bank/transactions.js
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { XMLParser } from 'fast-xml-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, apiSecret, customerNo } = req.body;

  // Fixie proxy bilgilerini doğrudan koda sabitliyoruz (407 hatasını %100 çözer)
  const proxyUrl = 'http://fixie:WEorldlNsAsn2KF@ventoux.usefixie.com:80';
  const httpsAgent = new HttpsProxyAgent(proxyUrl);
  
  const pId = apiKey || process.env.ALBARAKA_USERNAME;
  const pIdPass = apiSecret || process.env.ALBARAKA_PASSWORD;
  const mNo = customerNo || pId;

  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 3);

  const formatDate = (d) => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const basTarihStr = formatDate(pastDate);
  const sonTarihStr = formatDate(today);

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
              <basTarih>${basTarihStr}</basTarih>
              <sonTarih>${sonTarihStr}</sonTarih>
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
        timeout: 25000
      }
    );

    const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
    const jsonObj = parser.parse(response.data);

    if (jsonObj?.Envelope?.Body?.Fault) {
        console.error("Banka SOAP Hatası:", jsonObj.Envelope.Body.Fault);
        return res.status(400).json({ success: false, error: 'Bankadan hata döndü.', detay: jsonObj.Envelope.Body.Fault });
    }

    const responseBody = jsonObj?.Envelope?.Body?.getHesapHareketleriResponse?.return || [];
    let hareketler = Array.isArray(responseBody) ? responseBody : (responseBody.hareket ? (Array.isArray(responseBody.hareket) ? responseBody.hareket : [responseBody.hareket]) : []);

    const transactions = hareketler.map(t => {
       const rawDate = String(t.Tarih || '');
       const formattedDate = rawDate.length >= 8 ? `${rawDate.substring(0,4)}-${rawDate.substring(4,6)}-${rawDate.substring(6,8)}` : new Date().toISOString().split('T')[0];
       
       return {
         id: t.fisNo || Date.now() + Math.random(),
         date: formattedDate,
         amount: parseFloat(t.islemTutari || 0),
         description: t.Aciklama || '',
         isCredit: String(t.borcAlacak || '').toUpperCase().startsWith('A') 
       }
    }).filter(t => t.isCredit);

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Banka Baglanti Hatasi',
      hataMesaji: error.message,
      hataKodu: error.code,
      detay: error.response?.data || "Zaman aşımı veya proxy hatası"
    });
  }
}