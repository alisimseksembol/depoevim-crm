// api/bank/transactions.js
import { callGetHesapHareketleri, formatAlbarakaDate } from './_albaraka.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, apiSecret, customerNo, gunSayisi, accountSuffix } = req.body;

  const pId = apiKey || process.env.ALBARAKA_USERNAME;
  const pIdPass = apiSecret || process.env.ALBARAKA_PASSWORD;
  const mNo = customerNo || pId;
  
  // Bankanın beklediği 2 haneli Suffix (Ek Numara). Sembol Nakliyat (34) olarak ayarlandı[cite: 3, 4, 5].
  const hesapNo = accountSuffix || '34'; 

  if (!pId || !pIdPass) {
    return res.status(400).json({ success: false, error: 'Banka API bilgileri eksik.' });
  }

  const gun = Number.isFinite(Number(gunSayisi)) && Number(gunSayisi) > 0
    ? Number(gunSayisi)
    : 30;

  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - gun);

  try {
    const { bankaSonucu, hareketler } = await callGetHesapHareketleri({
      pId,
      pIdPass,
      mNo,
      hesapNo, 
      basTarih: formatAlbarakaDate(pastDate),
      sonTarih: formatAlbarakaDate(today)
    });

    const kod = bankaSonucu?.code !== undefined && bankaSonucu?.code !== null
      ? Number(bankaSonucu.code)
      : null;

    if (kod !== null && kod !== 0) {
      return res.status(400).json({
        success: false,
        error: bankaSonucu.message || 'Banka hata döndü',
        kod
      });
    }

    const transactions = hareketler.map(t => {
      // Bankanın küçük/büyük harf ihtimallerine karşı her iki formatı da okuyoruz[cite: 3, 5]
      const rawDate = String(t.tarih || t.Tarih || '');
      const formattedDate = rawDate.length >= 8
        ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
        : new Date().toISOString().split('T')[0];

      const tutarStr = String(t.islemTutari ?? '0').replace(/\./g, '').replace(',', '.');

      return {
        id: t.fisNo || `${Date.now()}-${Math.random()}`,
        date: formattedDate,
        amount: parseFloat(tutarStr),
        // Açıklama alanı için de aynı şekilde küçük/büyük harf garantisi[cite: 3, 5]
        description: t.aciklama || t.Aciklama || 'Açıklama Yok',
        isCredit: t.borcAlacak === 'A' || t.borcAlacak === 'C',
        rawBorcAlacak: t.borcAlacak 
      };
    });

    res.status(200).json({ success: true, transactions, toplamKayit: transactions.length });
  } catch (error) {
    console.error('Banka API Hatası:', error.message);
    res.status(500).json({
      success: false,
      error: 'Albaraka servisine bağlanırken hata oluştu.',
      detay: error.message
    });
  }
}