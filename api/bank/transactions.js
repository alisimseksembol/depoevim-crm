// api/bank/transactions.js
import { callGetHesapHareketleri, formatAlbarakaDate } from './_albaraka.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, apiSecret, customerNo, gunSayisi } = req.body;

  const pId = apiKey || process.env.ALBARAKA_USERNAME;
  const pIdPass = apiSecret || process.env.ALBARAKA_PASSWORD;
  const mNo = customerNo || pId;

  if (!pId || !pIdPass) {
    return res.status(400).json({ success: false, error: 'Banka API bilgileri eksik.' });
  }

  // Varsayılan 30 gün (test amaçlı geniş aralık); istersen body'de
  // gunSayisi göndererek override edebilirsin (örn. 3).
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
      basTarih: formatAlbarakaDate(pastDate),
      sonTarih: formatAlbarakaDate(today)
    });

    // code bazen string ("0") olarak dönebilir; Number() ile güvenli karşılaştırma.
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
      const rawDate = String(t.Tarih || '');
      const formattedDate = rawDate.length >= 8
        ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
        : new Date().toISOString().split('T')[0];

      // Türk bankacılık formatı "1.250,50" -> "1250.50" dönüşümü.
      // Bankadan düz "1250.50" gelirse de bu işlem zarar vermez.
      const tutarStr = String(t.islemTutari ?? '0').replace(/\./g, '').replace(',', '.');

      return {
        id: t.fisNo || `${Date.now()}-${Math.random()}`,
        date: formattedDate,
        amount: parseFloat(tutarStr),
        description: t.Aciklama || 'Açıklama Yok',
        // Gelen/Giden kontrolü (A=Alacak, B=Borç, C=Credit vb. bankaya göre değişebilir)
        isCredit: t.borcAlacak === 'A' || t.borcAlacak === 'C',
        rawBorcAlacak: t.borcAlacak // Ekranda test için ham veriyi tutalım
      };
    });

    // DİKKAT: filtre yok, 30 günlük tüm gelen/giden hareketler dönüyor.
    // Sadece gelenleri (alacak) istersen: transactions.filter(t => t.isCredit)
    res.status(200).json({ success: true, transactions, toplamKayit: transactions.length });
  } catch (error) {
    console.error('Banka API Hatası:', error.message);
    // detay alanı geçici: gerçek hatayı görmek için. Sorun çözülünce kaldırabilirsin.
    res.status(500).json({
      success: false,
      error: 'Albaraka servisine bağlanırken hata oluştu.',
      detay: error.message
    });
  }
}