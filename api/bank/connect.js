// api/bank/connect.js
import { callGetHesapHareketleri, formatAlbarakaDate } from './_albaraka.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });
  }

  const { apiKey, apiSecret, customerNo } = req.body;

  // transactions.js ile aynı mantık: body'de gelmezse env değişkenine düş.
  // (Önceden connect.js env fallback kullanmıyordu, transactions.js kullanıyordu;
  //  bu tutarsızlık iki endpoint'in farklı davranmasına yol açıyordu.)
  const pId = apiKey || process.env.ALBARAKA_USERNAME;
  const pIdPass = apiSecret || process.env.ALBARAKA_PASSWORD;

  if (!pId || !pIdPass) {
    return res.status(400).json({ success: false, error: 'Banka API bilgileri eksik.' });
  }

  const mNo = customerNo || pId;
  const today = formatAlbarakaDate(new Date());

  try {
    // Kimlik bilgilerini gercekten bankaya sorup dogrulamak icin dar bir tarih araligiyla
    // (bugun) getHesapHareketleri cagrisi yapiyoruz; sadece banka sonuc koduna bakiyoruz.
    const { bankaSonucu } = await callGetHesapHareketleri({
      pId,
      pIdPass,
      mNo,
      basTarih: today,
      sonTarih: today
    });

    // code bazen string ("0") olarak dönebilir; Number() ile güvenli karşılaştırma.
    const kod = bankaSonucu?.code !== undefined && bankaSonucu?.code !== null
      ? Number(bankaSonucu.code)
      : null;

    if (kod !== null && kod !== 0) {
      return res.status(400).json({
        success: false,
        error: bankaSonucu.message || 'Banka kimlik bilgilerini reddetti.',
        kod
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Banka API Bağlantı Hatası:', error.message);
    // detay alanı geçici: gerçek hatayı görmek için. Sorun çözülünce kaldırabilirsin.
    return res.status(500).json({
      success: false,
      error: 'Albaraka servisine bağlanırken hata oluştu.',
      detay: error.message
    });
  }
}