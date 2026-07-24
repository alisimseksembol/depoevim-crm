// api/bank/transactions.js
import { callGetHesapHareketleri, formatAlbarakaDate } from './_albaraka.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, apiSecret, customerNo } = req.body;

  const pId = apiKey || process.env.ALBARAKA_USERNAME;
  const pIdPass = apiSecret || process.env.ALBARAKA_PASSWORD;

  // Arayüzden musteriNo gelmezse (ki gelmiyor), banka kullanıcı adını musteriNo olarak kullan
  const mNo = customerNo || pId;

  // Banka formatına uygun tarih (yyyyMMdd) - Son 3 günü tarar
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 3);

  try {
    const { bankaSonucu, hareketler } = await callGetHesapHareketleri({
      pId,
      pIdPass,
      mNo,
      basTarih: formatAlbarakaDate(pastDate),
      sonTarih: formatAlbarakaDate(today)
    });

    // Banka kimlik dogrulama/istek hatasini (orn. "Sifre yanlis") sessizce bos listeye
    // cevirmek yerine gercek hata olarak dondur.
    if (bankaSonucu?.code && bankaSonucu.code !== 0) {
      return res.status(400).json({
        success: false,
        error: bankaSonucu.message || 'Banka hata döndü',
        kod: bankaSonucu.code
      });
    }

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
