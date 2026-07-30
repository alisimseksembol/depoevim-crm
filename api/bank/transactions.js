// api/bank/transactions.js
import { callGetHesapHareketleri, formatAlbarakaDate } from './_albaraka.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, apiSecret, customerNo } = req.body;

  const pId = apiKey || process.env.ALBARAKA_USERNAME;
  const pIdPass = apiSecret || process.env.ALBARAKA_PASSWORD;

  const mNo = customerNo || pId;

  // Test için süreyi son 3 günden son 30 GÜNE çıkarıyoruz
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 30);

  try {
    const { bankaSonucu, hareketler } = await callGetHesapHareketleri({
      pId,
      pIdPass,
      mNo,
      basTarih: formatAlbarakaDate(pastDate),
      sonTarih: formatAlbarakaDate(today)
    });

    if (bankaSonucu?.code && bankaSonucu.code !== 0) {
      return res.status(400).json({
        success: false,
        error: bankaSonucu.message || 'Banka hata döndü',
        kod: bankaSonucu.code
      });
    }

    const transactions = hareketler.map(t => {
       const rawDate = String(t.Tarih || '');
       const formattedDate = rawDate.length >= 8 
         ? `${rawDate.substring(0,4)}-${rawDate.substring(4,6)}-${rawDate.substring(6,8)}` 
         : new Date().toISOString().split('T')[0];

       return {
         id: t.fisNo || Date.now() + Math.random(),
         date: formattedDate,
         amount: parseFloat(t.islemTutari || 0),
         description: t.Aciklama || 'Açıklama Yok',
         // Gelen/Giden kontrolü (A=Alacak, B=Borç, C=Credit vb. bankaya göre değişebilir)
         isCredit: t.borcAlacak === 'A' || t.borcAlacak === 'C',
         rawBorcAlacak: t.borcAlacak // Ekranda test için ham veriyi tutalım
       }
    }); 
    
    // DİKKAT: .filter(t => t.isCredit) kısmını SİLDİK. 
    // Artık gelen/giden tüm 30 günlük hareketler listelenecek!

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Banka API Hatası:', error.message);
    res.status(500).json({ success: false, error: 'Albaraka servisine bağlanırken hata oluştu.' });
  }
}