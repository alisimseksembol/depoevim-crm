// api/bank/connect.js
export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });
    
    const { apiKey, apiSecret } = req.body;
    if (apiKey && apiSecret) {
        return res.status(200).json({ success: true });
    }
    return res.status(400).json({ success: false, error: 'Banka API bilgileri eksik.' });
}