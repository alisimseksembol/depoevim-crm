// api/bank/connect.js
import { callGetHesapHareketleri, formatAlbarakaDate } from './_albaraka.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });

    const { apiKey, apiSecret, customerNo } = req.body;
    if (!apiKey || !apiSecret) {
        return res.status(400).json({ success: false, error: 'Banka API bilgileri eksik.' });
    }

    const mNo = customerNo || apiKey;
    const today = formatAlbarakaDate(new Date());

    try {
        // Kimlik bilgilerini gercekten bankaya sorup dogrulamak icin dar bir tarih araligiyla
        // (bugun) getHesapHareketleri cagrisi yapiyoruz; sadece banka sonuc koduna bakiyoruz.
        const { bankaSonucu } = await callGetHesapHareketleri({
            pId: apiKey,
            pIdPass: apiSecret,
            mNo,
            basTarih: today,
            sonTarih: today
        });

        if (bankaSonucu?.code && bankaSonucu.code !== 0) {
            return res.status(400).json({
                success: false,
                error: bankaSonucu.message || 'Banka kimlik bilgilerini reddetti.',
                kod: bankaSonucu.code
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Banka API Bağlantı Hatası:', error.message);
        return res.status(500).json({ success: false, error: 'Albaraka servisine bağlanırken hata oluştu.' });
    }
}
