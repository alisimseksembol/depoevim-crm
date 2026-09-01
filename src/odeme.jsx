import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import {
  AlertCircle,
  Box,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Download,
  Edit,
  FileText as FileTextIcon,
  History,
  Info,
  Key,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Table,
  Trash2,
  Upload,
  Wallet,
  X
} from 'lucide-react';

// Dinamik olarak SheetJS (Excel) kütüphanesini yükleyen yardımcı fonksiyon (App.jsx ile aynı, bağımsız kopya)
const loadXLSXLibrary = () => {
  return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = reject;
      document.head.appendChild(script);
  });
};

// Yazdırma/PDF dosya adı yardımcıları (App.jsx ile aynı, bağımsız kopya)
const sanitizePdfName = (name) => {
    let s = String(name || 'Belge').trim();
    s = s.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
    return s || 'Belge';
};
let __prevDocTitle = null;
const setPdfFileName = (name) => {
    try {
        if (__prevDocTitle === null) __prevDocTitle = document.title;
        document.title = sanitizePdfName(name);
        // Yazdırma bittikten sonra eski başlığı geri koy
        const restore = () => { if (__prevDocTitle !== null) { document.title = __prevDocTitle; __prevDocTitle = null; } window.removeEventListener('afterprint', restore); };
        window.addEventListener('afterprint', restore);
        setTimeout(restore, 90000);
    } catch (e) {}
};

// Arama/karşılaştırma normalizasyon yardımcısı (App.jsx ile aynı, bağımsız kopya)
const normalizeStr = (str) => {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
};

// ============================================================================
// ÖDEME (TAHSİLAT / ÖDEME İŞLEMLERİ) BİLEŞENİ
// App.jsx içindeki "Ödeme İşlemleri" ekranları (Tahsilat Girişi Yap, Aylık Borç
// Takip, Tahsilat Hareketleri, Askıda Kalan Tahsilatlar, Tahsilat ve İşlem
// Oranları), ilgili modallar ve ödeme işlemlerini yapan kodlar buraya taşındı.
// Müşteri/Finans state'leri ve mantığı App.jsx içinde kalır; bu bileşen ihtiyaç
// duyduğu paylaşılan veriyi ve yardımcı fonksiyonları props üzerinden alır.
// ============================================================================
export default function Odeme(props) {
  const {
    activeMenu, setActiveMenu,
    customers, setCustomers,
    rooms,
    pendingCollections, setPendingCollections,
    db, firebaseUser, appId,
    checkActionPerm, logActivity, uploadImageToServer,
    currentUserProfile,
    sembolePaymentAktar, sembolePaymentSil,
    hasActivePaymentOnDate,
    getCustomerLedger,
    handleOpenMessageModal,
    reminders, setReminders,
    collectionRates, setCollectionRates,
    setSelectedCustomerId,
  } = props;

  const [debtMonthFilter, setDebtMonthFilter] = useState('all');
  // YENİ: "Ödeme Sözü Aldıklarım" filtresi — sadece ödeme sözü (promiseDate'li not) olan müşterileri gösterir.
  const [showOnlyPromises, setShowOnlyPromises] = useState(false);
  // YENİ EKLENEN: "Kaç aydır tahsilat yok / Yeni Eklenen" filtresi (varsayılan: yeni eklenen)
  const [debtPaymentFilter, setDebtPaymentFilter] = useState('new');
  const [debtSearchTerm, setDebtSearchTerm] = useState('');

  // --- TAHSİLAT HAREKETLERİ STATE'LERİ ---
  const [collectionFilter, setCollectionFilter] = useState('recent'); // Varsayılan: Son gelenler (son 2 ay)
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');

  // YENİ EKLENEN: Paraşüt'e fatura aktarıldıktan sonra çıkan bilgilendirme penceresi
  const [eInvoiceStartedInfo, setEInvoiceStartedInfo] = useState(null);
  // YENİ EKLENEN: "Faturayı Yükle" — Paraşüt'te kesilen faturayı elle müşterinin cari faturalarına yükleme
  const [uploadInvoiceData, setUploadInvoiceData] = useState(null);
  const [isUploadingInvoiceFile, setIsUploadingInvoiceFile] = useState(false);
  // YENİ EKLENEN: "Faturayı Paylaş" — yüklenmiş faturayı müşteriye WhatsApp / Gmail / SMS ile paylaşma penceresi
  const [shareInvoiceData, setShareInvoiceData] = useState(null);

  // --- TAHSİLAT NOTU STATE'LERİ ---
  const [isCollectionNoteModalOpen, setIsCollectionNoteModalOpen] = useState(false);
  const [collectionNoteData, setCollectionNoteData] = useState({ customerId: null, text: '', promiseDate: '' });

  // YENİ: Manuel askıda ödeme ekleme modalı
  const [isAddPendingModalOpen, setIsAddPendingModalOpen] = useState(false);
  const [manualPendingData, setManualPendingData] = useState({ date: new Date().toISOString().split('T')[0], amount: '', note: '' });
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignData, setAssignData] = useState({ paymentId: null, customerId: '' });
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');

  // --- ASKIDA KALAN TAHSİLATLARI DÜZENLEME STATE'LERİ ---
  const [isEditPendingModalOpen, setIsEditPendingModalOpen] = useState(false);
  const [editPendingData, setEditPendingData] = useState(null);

  // --- MBT E-FATURA ENTEGRASYONU STATE'LERİ ---
  const [eInvoiceModalData, setEInvoiceModalData] = useState(null);
  const [isSendingEInvoice, setIsSendingEInvoice] = useState(false);
  const [eInvoiceSuccess, setEInvoiceSuccess] = useState(false);
  const [eInvoiceError, setEInvoiceError] = useState(null);

const handleSendEInvoice = async () => {
      if (!eInvoiceModalData) return;
      const customerToUpdate = customers.find(c => c.id === eInvoiceModalData.customerId);
      if (!customerToUpdate) return;

      setIsSendingEInvoice(true);
      setEInvoiceError(null);

      const totalAmount = eInvoiceModalData.amount;
      const netAmount = (totalAmount / 1.20).toFixed(2);

      // ÖNİZLEME MODU: Firebase/backend yokken Paraşüt aktarımını simüle et.
      // Canlı ortamda aşağıdaki "if (!db)" bloğu kaldırılıp gerçek fetch çağrısı kullanılacaktır.
      if (!db) {
          setTimeout(() => {
              setIsSendingEInvoice(false);
              // Cariye e-fatura bilgisini işaretle (yerel state)
              const simInvoiceNo = 'PRS-' + Math.floor(100000 + Math.random() * 900000);
              setCustomers(prev => prev.map(c => c.id === customerToUpdate.id
                  ? { ...c, payments: (c.payments || []).map(p => p.id === eInvoiceModalData.id ? { ...p, hasEInvoice: true, eInvoiceNo: simInvoiceNo } : p) }
                  : c
              ));
              // Paraşüt'e aktarıldı bilgilendirme penceresini aç
              setEInvoiceStartedInfo({ ...eInvoiceModalData, invoiceNo: simInvoiceNo });
              setEInvoiceModalData(null);
          }, 1800);
          return;
      }

      try {
          const response = await fetch('/api/parasut/create-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  customerName: customerToUpdate.name,
                  taxNumber: customerToUpdate.tc,
                  address: customerToUpdate.address,
                  email: customerToUpdate.email,
                  phone: customerToUpdate.phone,
                  netAmount,
                  vatRate: 20,
                  description: eInvoiceModalData.note || 'Depolama Hizmet Bedeli'
              })
          });

          const result = await response.json();
          if (!response.ok || !result.success) {
              throw new Error(result.error || 'Paraşüt faturası oluşturulamadı.');
          }

          setIsSendingEInvoice(false);

          if (db && firebaseUser) {
              const updatedPayments = (customerToUpdate.payments || []).map(p =>
                  p.id === eInvoiceModalData.id
                  ? { ...p, hasEInvoice: true, eInvoiceNo: result.invoiceNo || `PRS-${result.invoiceId}` }
                  : p
              );
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), { payments: updatedPayments }, { merge: true });
          }

          // YENİ: Aktarım tamamlandı — Paraşüt bilgilendirme penceresini aç
          setEInvoiceStartedInfo({ ...eInvoiceModalData, invoiceNo: result.invoiceNo || `PRS-${result.invoiceId}` });
          setEInvoiceModalData(null);
      } catch (error) {
          console.error('E-Fatura oluşturma hatası:', error);
          setIsSendingEInvoice(false);
          setEInvoiceError(error.message || 'Faturanız oluşturulurken bir hata oluştu.');
      }
  };

  // YENİ EKLENEN: "Faturayı Yükle" — Paraşüt'te kesilen faturayı elle yükleyip
  // ilgili müşterinin cari profilindeki "Faturalar" bölümüne kaydeder.
  const handleUploadInvoiceFile = async (e) => {
      const file = e.target.files[0];
      if (!file || !uploadInvoiceData) return;
      const customerToUpdate = customers.find(c => c.id === uploadInvoiceData.customerId);
      if (!customerToUpdate) return;

      setIsUploadingInvoiceFile(true);
      try {
          const url = await uploadImageToServer(file);
          const newInvoiceRecord = {
              id: Date.now(),
              invoiceNo: uploadInvoiceData.eInvoiceNo || '',
              amount: uploadInvoiceData.amount,
              date: uploadInvoiceData.date,
              file: url,
              note: uploadInvoiceData.note || 'Paraşüt E-Fatura'
          };
          const updatedInvoices = [...(customerToUpdate.invoices || []), newInvoiceRecord];

          if (db && firebaseUser) {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), { invoices: updatedInvoices }, { merge: true });
          } else {
              // Önizleme modu: yerel state güncelle
              setCustomers(prev => prev.map(c => c.id === customerToUpdate.id ? { ...c, invoices: updatedInvoices } : c));
          }
      } catch (err) {
          console.error('Fatura Yükleme Hatası:', err);
      } finally {
          setIsUploadingInvoiceFile(false);
          e.target.value = '';
          setUploadInvoiceData(null);
      }
  };

  // YENİ EKLENEN: Yüklenen faturayı müşteriye WhatsApp / Gmail / SMS üzerinden paylaş.
  // shareInvoiceData = { customer, fileUrl, tx } bilgisini taşır.
  const handleShareInvoice = (platform) => {
      if (!shareInvoiceData) return;
      const { customer, fileUrl, tx } = shareInvoiceData;
      const amountStr = Number(tx.amount).toLocaleString('tr-TR', { maximumFractionDigits: 0 });

      // ═══════════════════════════════════════════════════════════════════
      // GÜNCELLENDİ: WHATSAPP MESAJINDA ARTIK BAĞLANTI (LİNK) GÖRÜNMÜYOR
      // İSTEK: Müşteriye WhatsApp'tan fatura paylaşılırken mesajda dosya
      // bağlantısı çıkmasın. Yalnızca WhatsApp kanalı için geçerlidir;
      // Gmail ve SMS mesajları eskisi gibi bağlantı içermeye devam eder
      // (bu kanallarda faturaya ulaşmanın tek yolu bağlantıdır).
      // ═══════════════════════════════════════════════════════════════════
      const bodyTextWithLink = `Merhaba ${customer.name},\n\n${amountStr} TL tutarındaki faturanız ektedir. Faturanıza aşağıdaki bağlantıdan ulaşabilirsiniz:\n${fileUrl}\n\nDepoEvim`;
      const bodyTextNoLink = `Merhaba ${customer.name},\n\n${amountStr} TL tutarındaki faturanız ektedir.\n\nDepoEvim`;

      if (platform === 'whatsapp') {
          const encoded = encodeURIComponent(bodyTextNoLink);
          window.open(`https://wa.me/90${customer.phone}?text=${encoded}`, '_blank');
      } else if (platform === 'gmail') {
          const encoded = encodeURIComponent(bodyTextWithLink);
          const subject = encodeURIComponent(`DepoEvim - Faturanız (${amountStr} TL)`);
          // Gmail web compose penceresini aç (fatura bağlantısı gövdede yer alır)
          window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${customer.email || ''}&su=${subject}&body=${encoded}`, '_blank');
      } else if (platform === 'sms') {
          const encoded = encodeURIComponent(bodyTextWithLink);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          const separator = isIOS ? '&' : '?';
          window.open(`sms:+90${customer.phone}${separator}body=${encoded}`, '_self');
      }
      setShareInvoiceData(null);
  };

const handleAssignPendingPayment = async () => {
      if (!assignData.paymentId || !assignData.customerId) return;
      const paymentToAssign = pendingCollections.find(p => p.id === assignData.paymentId);
      if (!paymentToAssign) return;

      const customerId = assignData.customerId;
      const customerToUpdate = customers.find(c => String(c.id) === String(customerId));

      if (customerToUpdate && db && firebaseUser) {
          try {
              // 1. Cariye tahsilat olarak ekle
              const existingPayments = customerToUpdate.payments || [];
              const atananOdeme = { ...paymentToAssign, id: Date.now(), createdAt: Date.now() }; // Sembol'e de gidecek kayıt
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), {
                  payments: [...existingPayments, atananOdeme]
              }, { merge: true });

              // === SEMBOL KÖPRÜSÜ: Askıdan cariye atanan tahsilat ALBARAKA defterine gider ===
              sembolePaymentAktar(customerToUpdate, atananOdeme);

              // 2. Askıdan (pendingCollections) sil
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(assignData.paymentId)));
          } catch(e) { console.error("Askıdan Cariye Aktarma Hatası:", e); }
      }

      setIsAssignModalOpen(false);
      setAssignData({ paymentId: null, customerId: '' });
  };

const handleSaveEditPending = async () => {
      if (!editPendingData || !editPendingData.amount) return;
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(editPendingData.id)), {
                  amount: Number(editPendingData.amount),
                  date: editPendingData.date,
                  note: editPendingData.note
              }, { merge: true });
          } catch (e) { console.error("Askıdaki Ödeme Güncelleme Hatası:", e); }
      }
      setIsEditPendingModalOpen(false);
      setEditPendingData(null);
  };

  // Aylık faiz oranları tablosunda gösterilen yıl (geçmiş 3 sene + gelecek yıl arası)
  const [interestRateYear, setInterestRateYear] = useState(new Date().getFullYear());

  const handlePrintInvoice = (tx) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const d = new Date(tx.date);
      const dateStr = !isNaN(d.getTime()) ? `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}` : tx.date;

      setPdfFileName(tx.customerName);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>${sanitizePdfName(tx.customerName)}</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm;  @top-left{content:""} @top-center{content:""} @top-right{content:""} @bottom-left{content:""} @bottom-center{content:""} @bottom-right{content:""}}
                  body { font-family: 'Arial', sans-serif; padding: 0; color: #333; margin: 0; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1bc5bd; padding-bottom: 15px; }
                  .header h2 { margin: 0 0 10px 0; color: #1f2937; font-size: 24px; }
                  .info-box { display: flex; justify-content: space-between; background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                  .info-box div { font-size: 14px; margin-bottom: 8px; }
                  .info-box strong { color: #475569; display: inline-block; width: 120px; }
                  .amount-box { text-align: center; font-size: 24px; padding: 20px; background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 8px; font-weight: bold; margin-bottom: 30px;}
                  .details { font-size: 14px; line-height: 1.6; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100pt; font-weight: bold; color: rgba(0, 0, 0, 0.03); z-index: -1; }
              </style>
          </head>
          <body>
              <div class="watermark">Depoevim</div>
              <div class="header">
                  <h2>TAHSİLAT MAKBUZU / FATURA</h2>
              </div>
              <div class="info-box">
                  <div>
                      <div><strong>Müşteri Adı:</strong> ${tx.customerName}</div>
                      <div><strong>Müşteri No:</strong> ${tx.customerNo}</div>
                  </div>
                  <div style="text-align: right;">
                      <div><strong>İşlem Tarihi:</strong> ${dateStr}</div>
                      <div><strong>İşlem No:</strong> ${tx.id}</div>
                  </div>
              </div>
              <div class="amount-box">
                  Tahsil Edilen Tutar: ${tx.amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
              </div>
              <div class="details">
                  <p><strong>Açıklama / Dekont Notu:</strong> ${tx.note}</p>
                  <p style="margin-top: 40px; font-size: 12px; color: #64748b;">Bu belge bilgilendirme amaçlıdır. Tahsilatın ilgili müşteri carisine işlendiğini teyit eder.</p>
              </div>
          </body>
          </html>
      `);
      iframe.contentWindow.document.close();

      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 500);
  };

  const handleViewEInvoice = (tx) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const d = new Date(tx.date);
      const dateStr = !isNaN(d.getTime()) ? `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}` : tx.date;
      const netAmount = (tx.amount / 1.20).toFixed(2);
      const kdvAmount = (tx.amount - netAmount).toFixed(2);
      const invoiceNo = tx.eInvoiceNo || 'MBT' + Math.floor(100000000 + Math.random() * 900000000);

      setPdfFileName(tx.customerName);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>${sanitizePdfName(tx.customerName)}</title>
              <style>
                  @page { size: A4 portrait; margin: 15mm;  @top-left{content:""} @top-center{content:""} @top-right{content:""} @bottom-left{content:""} @bottom-center{content:""} @bottom-right{content:""}}
                  body { font-family: 'Arial', sans-serif; padding: 0; color: #000; margin: 0; font-size: 11px; }
                  .invoice-box { border: 1px solid #ccc; padding: 20px; min-height: 250mm; position: relative;}
                  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                  .title { font-size: 20px; font-weight: bold; text-align: center; margin-top: 10px; letter-spacing: 2px; }
                  .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
                  .box { width: 48%; border: 1px solid #000; padding: 10px; border-radius: 4px; line-height: 1.5; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                  th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                  th { background-color: #f0f0f0; }
                  .totals { width: 40%; margin-left: auto; border: 1px solid #000; border-collapse: collapse; }
                  .totals td { padding: 6px 10px; }
                  .footer { position: absolute; bottom: 20px; left: 20px; right: 20px; text-align: center; font-size: 10px; color: #555; border-top: 1px solid #ccc; padding-top: 10px;}
              </style>
          </head>
          <body>
              <div class="invoice-box">
                  <div class="header">
                      <div style="width: 50%;">
                          <strong style="font-size: 14px;">SEMBOL NAKLİYAT DEPOCULUK TİC. LTD. ŞTİ.</strong><br/>
                          Bahçelievler Mah. Yeni Sk. Ravza Apt. No:5 C Pendik/İSTANBUL<br/>
                          Kartal V.D. - 7600944287
                      </div>
                      <div style="width: 40%; text-align: right; line-height: 1.5;">
                          <strong>Fatura No:</strong> ${invoiceNo}<br/>
                          <strong>Tarih:</strong> ${dateStr}<br/>
                          <strong>Senaryo:</strong> E-Arşiv Fatura
                      </div>
                  </div>
                  <div class="title">e-ARŞİV FATURA</div>
                  <div class="info-section">
                      <div class="box">
                          <strong>SAYIN:</strong><br/>
                          ${tx.customerName}<br/>
                          ${tx.customerNo ? 'Müşteri No: ' + tx.customerNo + '<br/>' : ''}
                          VKN/TCKN: 11111111111<br/>
                          Adres: Muhtelif
                      </div>
                  </div>
                  <table>
                      <thead>
                          <tr>
                              <th>Sıra</th>
                              <th>Mal / Hizmet Cinsi</th>
                              <th>Miktar</th>
                              <th>Birim Fiyat</th>
                              <th>KDV %</th>
                              <th>Tutar</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td>1</td>
                              <td>${tx.note || 'Depolama Hizmet Bedeli'}</td>
                              <td>1 Ay</td>
                              <td>${netAmount}</td>
                              <td>20</td>
                              <td>${netAmount}</td>
                          </tr>
                      </tbody>
                  </table>
                  <table class="totals">
                      <tr>
                          <td><strong>Mal Hizmet Toplam Tutarı</strong></td>
                          <td style="text-align: right;">${netAmount} TL</td>
                      </tr>
                      <tr>
                          <td><strong>Hesaplanan KDV (%20)</strong></td>
                          <td style="text-align: right;">${kdvAmount} TL</td>
                      </tr>
                      <tr>
                          <td><strong>Vergiler Dahil Toplam Tutar</strong></td>
                          <td style="text-align: right; font-weight: bold; font-size: 14px;">${tx.amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                      </tr>
                  </table>
                  <div class="footer">
                      Bu fatura MBT E-Dönüşüm Portalı entegrasyonu simülasyonu ile oluşturulmuştur.<br/>
                      Maliye Bakanlığı E-Arşiv Fatura Uygulaması kapsamında elektronik ortamda düzenlenmiştir.
                  </div>
              </div>
          </body>
          </html>
      `);
      iframe.contentWindow.document.close();

      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 500);
  };

  // YENİ EKLENEN: Askıda Kalan Tahsilatlar sayfasından MANUEL askıda ödeme ekler (pendingCollections'a yazar).
  const handleAddManualPending = async () => {
      const amt = Number(manualPendingData.amount);
      if (!manualPendingData.date || !amt || amt <= 0) { alert('Lütfen geçerli bir tarih ve tutar girin.'); return; }
      const record = {
          id: Date.now(),
          amount: amt,
          date: manualPendingData.date,
          note: (manualPendingData.note || '').trim() || 'Manuel Askıda Tahsilat'
      };
      if (db && firebaseUser) {
          try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(record.id)), record); } catch (e) { console.error("Manuel Askıda Ekleme Hatası:", e); }
      } else {
          setPendingCollections(prev => [record, ...prev]);
      }
      logActivity('Manuel Askıda Tahsilat', `${amt.toLocaleString('tr-TR')} TL tutarında manuel askıda tahsilat eklendi.`);
      setIsAddPendingModalOpen(false);
      setManualPendingData({ date: new Date().toISOString().split('T')[0], amount: '', note: '' });
  };

const handleSaveCollectionNote = async () => {
      if (!collectionNoteData.customerId || !collectionNoteData.text) return;

      // YENİ: Düzenleme modu — mevcut bir notu güncelle (yeni kayıt ekleme). isEdit ile ayrılır.
      if (collectionNoteData.isEdit) {
          const cust = customers.find(c => c.id === collectionNoteData.customerId);
          if (cust) {
              const updatedNotes = (cust.collectionNotes || []).map((n, i) =>
                  ((collectionNoteData.editId != null && Number(n.id) === Number(collectionNoteData.editId)) || (collectionNoteData.editId == null && i === collectionNoteData.editIndex))
                      ? { ...n, text: collectionNoteData.text, promiseDate: collectionNoteData.promiseDate, editedAt: new Date().toLocaleDateString('tr-TR') }
                      : n
              );
              if (db && firebaseUser) {
                  try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(cust.id)), { collectionNotes: updatedNotes }, { merge: true }); } catch(e) { console.error("Firebase Not Güncelleme Hatası:", e); }
              } else {
                  setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, collectionNotes: updatedNotes } : c));
              }
              logActivity('Tahsilat Notu Düzenleme', `${cust.name} - bir tahsilat/ödeme sözü notu güncellendi.`);
          }
          setIsCollectionNoteModalOpen(false);
          setCollectionNoteData({ customerId: null, text: '', promiseDate: '' });
          return;
      }
      
      const newNote = {
          id: Date.now(),
          date: new Date().toLocaleDateString('tr-TR'),
          text: collectionNoteData.text,
          promiseDate: collectionNoteData.promiseDate
      };

      const customerToUpdate = customers.find(c => c.id === collectionNoteData.customerId);
      if (customerToUpdate && db && firebaseUser) {
          try {
              const existingNotes = customerToUpdate.collectionNotes || [];
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(collectionNoteData.customerId)), {
                  collectionNotes: [newNote, ...existingNotes]
              }, { merge: true });
          } catch(e) { console.error("Firebase Not Ekleme Hatası:", e); }
      }

      // YENİ: Ödeme sözü tarihi girildiyse, aynı bilgiyi HATIRLATMALAR takvimine "Ödeme Sözü" olarak da ekle.
      if (collectionNoteData.promiseDate) {
          const _remId = `rem_promise_${newNote.id}`;
          const _custName = customerToUpdate?.name || '';

          // ═══════════════════════════════════════════════════════════════════
          // YENİ EKLENEN: ESKİ ÖDEME SÖZÜ TAKVİMDEN KALDIRILIR
          // SORUN: Müşteri yeni söz verdiğinde eski söz takvimde kalıyor,
          // hatırlatmalarda aynı müşteri için birden fazla açık söz görünüyordu.
          // ÇÖZÜM: Yeni söz kaydedilirken, AYNI MÜŞTERİNİN henüz tamamlanmamış
          // (açık) eski ödeme sözü kayıtları takvimden silinir. Böylece takvimde
          // her müşteri için TEK ve GÜNCEL söz kalır.
          // NOT: Tamamlanmış (completed) sözler ARŞİV olarak korunur, silinmez.
          // ═══════════════════════════════════════════════════════════════════
          const _oldPromises = (reminders || []).filter(r =>
              r && r.type === 'promise' && !r.completed &&
              r.customerName === _custName && String(r.id) !== String(_remId)
          );
          for (const _old of _oldPromises) {
              if (db && firebaseUser) {
                  try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reminders', String(_old.id))); }
                  catch (e) { console.error('Eski ödeme sözü silme hatası:', e); }
              }
          }
          // Yerel listeden de çıkar (anında görünürlük)
          const _oldIds = new Set(_oldPromises.map(o => String(o.id)));
          if (_oldIds.size > 0) setReminders(prev => prev.filter(r => !_oldIds.has(String(r.id))));

          const _remRecord = {
              id: _remId,
              date: collectionNoteData.promiseDate, // YYYY-MM-DD
              time: '',
              title: 'Cari',
              note: collectionNoteData.text || '',
              type: 'promise',
              customerName: _custName,
              files: [],
              completed: false,
              // YENİ: Söz güncelleme notları burada tarihiyle birlikte tutulur
              promiseUpdates: [],
              createdBy: currentUserProfile?.name || '',
              createdAt: Date.now()
          };
          if (db && firebaseUser) {
              try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reminders', String(_remId)), _remRecord, { merge: true }); } catch (e) { console.error('Ödeme sözü hatırlatma ekleme hatası:', e); }
          } else {
              setReminders(prev => [...prev.filter(r => String(r.id) !== String(_remId)), _remRecord]);
          }
      }

      setIsCollectionNoteModalOpen(false);
      setCollectionNoteData({ customerId: null, text: '', promiseDate: '' });
  };

const handleSaveCollectionRates = async () => {
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'rates'), collectionRates);
              alert("Tahsilat oranları başarıyla Firebase'e kaydedildi!");
          } catch(e) { console.error("Oran Kayıt Hatası:", e); }
      }
  };

  const [globalPaymentData, setGlobalPaymentData] = useState({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '', isCreditCard: false, netAmount: '' });
  const [isGlobalPaymentSuccess, setIsGlobalPaymentSuccess] = useState(false);
  const [paymentCustomerSearch, setPaymentCustomerSearch] = useState('');

// --- YENİ EKLENEN: TOPLU ÖDEME STATE'LERİ ---
  const [paymentEntryMode, setPaymentEntryMode] = useState('single'); // 'single' | 'bulk' | 'bankapi'
  // YENİ EKLENEN: Banka Otomatik Hareket Alma (canlı API) state'leri
  const [bankApiConfig, setBankApiConfig] = useState({ bankName: '', apiKey: '', apiSecret: '', iban: '', customerNo: '' });
  const [bankApiConnected, setBankApiConnected] = useState(false); // API bağlandı mı
  const [bankApiFetching, setBankApiFetching] = useState(false);   // "Hesap Hareketlerini Çek" işlemi sürüyor mu
  const [bankApiStatus, setBankApiStatus] = useState('idle');      // idle | connecting | connected | error
  const [bankApiTransactions, setBankApiTransactions] = useState([]); // gelen hareketler
  // YENİ: "Beni Hatırla" — banka/API bilgileri Firestore'a kaydedilir, her açılışta otomatik dolar.
  const [bankApiRemember, setBankApiRemember] = useState(false);
  const bankApiLoadedRef = useRef(false);
  // YENİ: Canlı Banka Hareketleri filtreleri — varsayılan olarak SON 3 GÜN gösterilir.
  const [bankTxFrom, setBankTxFrom] = useState(() => new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]);
  // YENİ: SİLİNEN hareketler — bir daha listede görünmez ve yenilemede tekrar eklenmez.
  const [deletedBankTxIds, setDeletedBankTxIds] = useState([]);
  // YENİ: Manuel eşleştirmelerden ÖĞRENİLEN kurallar — aynı göndericiden gelen sonraki hareketler
  // otomatik olarak aynı cariye eşleşir (askıda kalmaz). { kural_anahtarı: müşteriId }
  const [bankMatchRules, setBankMatchRules] = useState({});
  // YENİ: Öğrenilen "bir daha gösterme" kalıpları (ör. hesaplar arası virman hareketleri)
  const [bankIgnorePatterns, setBankIgnorePatterns] = useState([]);
  // YENİ: Gizlenecek GÖNDERİCİLER (IBAN veya gönderen adı anahtarı). Tutar değişse de gizlenir.
  const [bankIgnoreSenders, setBankIgnoreSenders] = useState([]);
  // YENİ: Aynı gün + aynı tutarlı mükerrer tahsilat uyarısı için bekleyen hareket
  const [dupWarnTx, setDupWarnTx] = useState(null);
  // YENİ: "Eşleşmedi" satırında cari seçme modunda olan hareketin id'si
  const [matchEditTxId, setMatchEditTxId] = useState(null);
  // YENİ: Aynı gün + aynı tutar ödeme tespit edilirse gösterilecek uyarı penceresi
  const [duplicatePayWarn, setDuplicatePayWarn] = useState(null);
  const [bankTxTo, setBankTxTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [bankTxStatusFilter, setBankTxStatusFilter] = useState('all'); // all | tahsilat | askida | matched | unmatched | new

  // YENİ: Kayıtlı banka API bilgilerini bir kez yükle (Beni Hatırla açıksa).
  useEffect(() => {
      if (!db || !firebaseUser || bankApiLoadedRef.current) return;
      bankApiLoadedRef.current = true;
      (async () => {
          try {
              const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bankApi'));
              if (snap.exists()) {
                  const d = snap.data() || {};
                  setBankApiConfig(prev => ({ ...prev, bankName: d.bankName || '', apiKey: d.apiKey || '', apiSecret: d.apiSecret || '', iban: d.iban || '', customerNo: d.customerNo || '' }));
                  setBankApiRemember(true);
              }
          } catch (e) { console.error('Banka API bilgisi yükleme hatası:', e); }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  // YENİ: Beni Hatırla aç/kapa — açıkken bilgileri kaydeder, kapanınca kayıtlı bilgiyi siler.
  const toggleBankApiRemember = async () => {
      const next = !bankApiRemember;
      setBankApiRemember(next);
      if (!db || !firebaseUser) return;
      try {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bankApi');
          if (next) await setDoc(ref, { ...bankApiConfig }, { merge: true });
          else await deleteDoc(ref);
      } catch (e) { console.error('Banka API bilgisi kaydetme hatası:', e); }
  };
  const [bulkProcessResult, setBulkProcessResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkUploadHistory, setBulkUploadHistory] = useState([]);

  // --- YENİ EKLENEN: TOPLU YÜKLEME DETAY MODALI ---
  const [isBulkDetailsModalOpen, setIsBulkDetailsModalOpen] = useState(false);
  const [bulkDetailsData, setBulkDetailsData] = useState(null);

  // --- TAHSİLAT HAREKETLERİ DÜZENLEME STATE'LERİ ---
  const [isEditCollectionModalOpen, setIsEditCollectionModalOpen] = useState(false);
  const [editCollectionData, setEditCollectionData] = useState(null);


  const handleBulkFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);

      try {
          await loadXLSXLibrary();
          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  const data = new Uint8Array(event.target.result);
                  const workbook = window.XLSX.read(data, { type: 'array' });
                  const firstSheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[firstSheetName];
                  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                  processBulkData(rows, file.name);
              } catch (err) {
                  console.error(err);
                  alert("Dosya okunurken bir hata oluştu. Lütfen formatı kontrol edin.");
              } finally {
                  setIsUploading(false);
              }
          };
          reader.readAsArrayBuffer(file);
      } catch (error) {
          alert("Excel kütüphanesi yüklenirken bir hata oluştu.");
          setIsUploading(false);
      }
      
      e.target.value = ''; // Input'u temizle
  };

  const processBulkData = async (rows, fileName) => {
      if (!rows || rows.length <= 1) {
          alert("Dosya boş veya geçersiz format.");
          return;
      }

      let matchedCount = 0;
      let unmatchedCount = 0;
      let totalMatchedAmount = 0;
      let totalUnmatchedAmount = 0;

      const newPendingCollections = [...pendingCollections];
      const customersUpdates = {}; 

      const addedPaymentRecords = [];
      const addedPendingIds = [];

      // 1. Sütun Kuralları ve Dinamik Başlık Tespiti (Gereksiz sütunları otomatik yok sayar)
      let headerRowIndex = -1;
      let dateColIdx = 0, descColIdx = 2, amountColIdx = 3;

      for (let i = 0; i < Math.min(20, rows.length); i++) {
          if (rows[i]) {
              const rowStr = rows[i].map(c => String(c).toLowerCase()).join('|');
              if (rowStr.includes('tarih') && (rowStr.includes('tutar') || rowStr.includes('açıklama') || rowStr.includes('aciklama'))) {
                  headerRowIndex = i;
                  for (let j = 0; j < rows[i].length; j++) {
                      const colName = String(rows[i][j] || '').toLowerCase().trim();
                      if (colName.includes('tarih')) dateColIdx = j;
                      else if (colName.includes('açıklama') || colName.includes('aciklama')) descColIdx = j;
                      else if (colName.includes('tutar')) amountColIdx = j;
                  }
                  break;
              }
          }
      }

      const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;

      for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const dateRaw = row[dateColIdx];
          const amountRaw = row[amountColIdx];
          const descRaw = row[descColIdx];

          if (amountRaw === undefined || amountRaw === null || amountRaw === '') continue;

          // KURAL 1: Başında '-' (eksi) olan işlemleri (Giderleri/Kesintileri) tamamen yoksay
          const amountRawStr = String(amountRaw).trim();
          if (amountRawStr.startsWith('-')) continue;

          let amount = 0;
          if (typeof amountRaw === 'number') {
              amount = amountRaw;
          } else {
              let amountStr = amountRawStr;
              if (amountStr.includes(',') && amountStr.includes('.')) {
                  if (amountStr.lastIndexOf(',') > amountStr.lastIndexOf('.')) {
                      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
                  } else {
                      amountStr = amountStr.replace(/,/g, '');
                  }
              } else if (amountStr.includes(',')) {
                  amountStr = amountStr.replace(',', '.');
              }
              amount = parseFloat(amountStr);
          }

          // Güvenlik amaçlı sıfır veya sıfırdan küçükleri tekrar filtrele
          if (isNaN(amount) || amount <= 0) continue; 

          const descStr = String(descRaw || '').trim();
          const descUpper = descStr.toUpperCase();
          
          // KURAL 2: Sadece Tahsilat Tarihini (Tarih Sütunu) baz al
          let validDate = new Date().toISOString().split('T')[0];
          if (typeof dateRaw === 'number') {
              const excelEpoch = new Date(1899, 11, 30);
              const jsDate = new Date(excelEpoch.getTime() + dateRaw * 86400000);
              if (!isNaN(jsDate)) validDate = jsDate.toISOString().split('T')[0];
          } else if (dateRaw) {
              const dateStrRaw = String(dateRaw).trim();
              const trDateMatch = dateStrRaw.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/);
              if (trDateMatch) {
                  validDate = `${trDateMatch[3]}-${trDateMatch[2]}-${trDateMatch[1]}`;
              } else {
                  const parsedDate = new Date(dateStrRaw);
                  if (!isNaN(parsedDate.getTime())) {
                      validDate = parsedDate.toISOString().split('T')[0];
                  }
              }
          }

          let matchedCustomer = null;

          // KURAL 3: Müşteri Adı ile eşleştirme. Açıklamada birden fazla isim geçse bile veritabanındaki müşteri adını içeriyorsa eşleştirir.
          matchedCustomer = customers.find(c => c.name && descUpper.includes(c.name.toUpperCase()));
          
          if (!matchedCustomer) {
              // KURAL 4: Gelişmiş Oda Eşleştirme (E-518, E_518, E 518, E518 gibi tüm varyasyonları kapsar)
              const possibleRooms = rooms.filter(r => {
                  // Sistemdeki odanın ve açıklamanın içindeki tüm boşlukları, tireleri ve alt çizgileri silip öyle kıyaslar
                  const roomNameClean = r.name.replace(/[\s-_]/g, '').toUpperCase();
                  const descClean = descUpper.replace(/[\s-_]/g, '');
                  
                  // Yanlış eşleşmeleri önlemek için oda adı harf/rakam birleşimi min. 2 karakterse kontrol et
                  if (roomNameClean.length >= 2) {
                      return descClean.includes(roomNameClean);
                  }
                  return false;
              });
              
              // Eşleşen bir oda bulursa ve o odada aktif müşteri varsa carisini bağla
              const activeMatchedRoom = possibleRooms.find(r => r.customerName);
              if (activeMatchedRoom) {
                  matchedCustomer = customers.find(c => c.name === activeMatchedRoom.customerName);
              }
          }

          // Son çare: Müşteri Numarası varsa onunla eşleştir
          if (!matchedCustomer) {
              // YENİ / DÜZELTME: Müşteri no artık TAM SAYI (kelime sınırı) olarak eşleştirilir.
              // Eskiden descUpper.includes(customerNo) idi; bu, SN/FastRef gibi uzun referans
              // numaralarının İÇİNDE müşteri no'yu alt-dize olarak yakalayıp YANLIŞ müşteriye
              // tahsilat işliyordu (örn. "SN:4688393996" içinde "88393" → yanlış eşleşme).
              // Artık müşteri no yalnızca bağımsız bir sayı olarak geçiyorsa eşleşir.
              const descNumberTokens = (descStr.match(/\d+/g) || []);
              matchedCustomer = customers.find(c => c.customerNo && descNumberTokens.includes(String(c.customerNo)));
          }

          if (matchedCustomer) {
              // SADECE TARIH KONTROLU - AYNI GUNE IKINCi BIR TAHSILAT EKLENMESIN
              const existingPayments = matchedCustomer.payments || [];
              const isDuplicate = existingPayments.some(p => p.date === validDate);
              const isDuplicateInUpdates = customersUpdates[matchedCustomer.id]?.some(p => p.date === validDate);

              if (!isDuplicate && !isDuplicateInUpdates) {
                  matchedCount++;
                  totalMatchedAmount += amount;
                  
                  if (!customersUpdates[matchedCustomer.id]) {
                      customersUpdates[matchedCustomer.id] = [];
                  }
                  const pId = Number(Date.now().toString() + Math.floor(Math.random() * 1000).toString());
                  customersUpdates[matchedCustomer.id].push({
                      id: pId,
                      createdAt: Date.now(), // YENİ: sisteme giriş anı (güvenilir sıralama için)
                      amount: amount,
                      date: validDate,
                      note: 'Toplu Banka Tahsilatı: ' + descStr
                  });
                  addedPaymentRecords.push({ customerId: matchedCustomer.id, paymentId: pId });
              }
          } else {
              const isDuplicatePending = newPendingCollections.some(p => p.date === validDate);
              
              if (!isDuplicatePending) {
                  unmatchedCount++;
                  totalUnmatchedAmount += amount;
                  
                  const pId = Number(Date.now().toString() + Math.floor(Math.random() * 1000).toString());
                  newPendingCollections.push({
                      id: pId,
                      amount: amount,
                      date: validDate,
                      note: 'Belirsiz Banka Tahsilatı: ' + descStr
                  });
                  addedPendingIds.push(pId);
              }
          }
      }

      if (Object.keys(customersUpdates).length > 0 && db && firebaseUser) {
          for (const cId of Object.keys(customersUpdates)) {
              const customerToUpdate = customers.find(c => String(c.id) === String(cId));
              if (customerToUpdate) {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(cId)), {
                      payments: [...(customerToUpdate.payments || []), ...customersUpdates[cId]]
                  }, { merge: true });

                  // === SEMBOL KÖPRÜSÜ: Toplu banka yüklemesinde eşleşen her tahsilat ALBARAKA defterine gider ===
                  customersUpdates[cId].forEach(yeniOdeme => sembolePaymentAktar(customerToUpdate, yeniOdeme));
              }
          }
      }

      if (unmatchedCount > 0 && db && firebaseUser) {
          for (const pending of newPendingCollections) {
              if (addedPendingIds.includes(pending.id)) {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(pending.id)), pending, { merge: true });
              }
          }
      }

      // YENİ EKLENEN: Yükleme işlemini Firebase'e kaydet (Tarihçe Raporu İçin)
      const uploadRecordId = Date.now().toString();
      const uploadRecord = {
          id: uploadRecordId,
          timestamp: Date.now(),
          dateStr: new Date().toLocaleString('tr-TR'),
          fileName: fileName || 'Bilinmeyen Dosya',
          matchedCount,
          unmatchedCount,
          totalMatchedAmount,
          totalUnmatchedAmount,
          addedPaymentRecords,
          addedPendingIds
      };
      
      if (db && firebaseUser && (matchedCount > 0 || unmatchedCount > 0)) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bulkUploadHistory', uploadRecordId), uploadRecord);
      }

      setBulkProcessResult(uploadRecord);
  };

  const handleRevertBulkUpload = async (historyRecord) => {
      if (!window.confirm("Bu toplu yüklemeyi ve eklediği tüm tahsilatları sistemden (carilerden ve askıdan) silip geri almak istediğinize emin misiniz?")) return;
      
      setIsUploading(true);
      if (db && firebaseUser) {
          try {
              const customerGroups = {};
              if (historyRecord.addedPaymentRecords) {
                  historyRecord.addedPaymentRecords.forEach(record => {
                      if (!customerGroups[record.customerId]) customerGroups[record.customerId] = [];
                      customerGroups[record.customerId].push(Number(record.paymentId));
                  });
              }

              for (const cId of Object.keys(customerGroups)) {
                  const customer = customers.find(c => String(c.id) === String(cId));
                  if (customer) {
                      const idsToRemove = customerGroups[cId];
                      const cleanedPayments = (customer.payments || []).filter(p => !idsToRemove.includes(Number(p.id)));
                      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(cId)), { payments: cleanedPayments }, { merge: true });

                      // === SEMBOL KÖPRÜSÜ: Geri alınan toplu tahsilatlar ALBARAKA defterinden de silinir ===
                      idsToRemove.forEach(pid => sembolePaymentSil(customer, pid));
                  }
              }

              if (historyRecord.addedPendingIds) {
                  for (const pId of historyRecord.addedPendingIds) {
                      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(pId)));
                  }
              }

              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bulkUploadHistory', String(historyRecord.id)));
              if (bulkProcessResult?.id === historyRecord.id) {
                  setBulkProcessResult(null);
              }
          } catch (e) { console.error("Geri Alma Hatası:", e); }
      }
      setIsUploading(false);
  };

  const handleUndoBulkProcess = async () => {
      setBulkProcessResult(null);
  };

const handleGlobalPayment = async () => {
    if (!globalPaymentData.customerId || !globalPaymentData.amount) return;
    logActivity('Tahsilat', `Tekil tahsilat girişi yapıldı: ${globalPaymentData.amount} TL`);

    const paymentId = Number(Date.now().toString() + Math.floor(Math.random() * 1000).toString());
    // YENİ EKLENEN: Kredi kartıyla tahsilat — cariye brüt, rapora net (kesintili)
    const isCC = globalPaymentData.isCreditCard;
    const gross = Number(globalPaymentData.amount);
    const net = isCC && globalPaymentData.netAmount ? Number(globalPaymentData.netAmount) : gross;
    const ccNote = isCC ? `Kredi Kartıyla Ödeme${globalPaymentData.note ? ' - ' + globalPaymentData.note : ''}` : globalPaymentData.note;
    const newPayment = {
        id: paymentId,
        createdAt: Date.now(), // YENİ: sisteme giriş anı (güvenilir sıralama için)
        amount: gross,
        date: globalPaymentData.date,
        note: ccNote,
        paymentMethod: isCC ? 'creditCard' : 'normal',
        grossAmount: gross,
        netAmount: net
    };

    if (globalPaymentData.customerId === 'askida') {
        if (db && firebaseUser) {
            try {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(paymentId)), newPayment);
            } catch(e) { console.error("Askıda Ödeme Kayıt Hatası:", e); }
        } else {
            setPendingCollections(prev => [...prev, newPayment]);
        }
    } else {
        const customerId = globalPaymentData.customerId;
        const customerToUpdate = customers.find(c => String(c.id) === String(customerId));
        if (customerToUpdate) {
            const existingPayments = customerToUpdate.payments || [];
            // YENİ: Silinmiş veya tarihi değiştirilmiş tahsilatlar o günü "dolu" saymaz
            if (hasActivePaymentOnDate(customerToUpdate, globalPaymentData.date)) {
                alert(`HATA: Bu müşteriye ait aynı günde (${globalPaymentData.date}) zaten bir tahsilat kaydı bulunmaktadır. Aynı güne başka tahsilat girişi yapılamaz!`);
                return;
            }
            if (db && firebaseUser) {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), {
                        payments: [...existingPayments, newPayment]
                    }, { merge: true });

                    // === SEMBOL KÖPRÜSÜ: Tahsilat girişi ALBARAKA defterine gider ===
                    // (Ortak yardımcı kullanılır; sabit kimlik = müşteriId_ödemeId → sonradan
                    //  düzenlenirse Sembol'de aynı kayıt güncellenir, çift kayıt oluşmaz)
                    sembolePaymentAktar(customerToUpdate, newPayment);

                } catch(e) { console.error("Tahsilat İşleme Hatası:", e); }
            } else {
                setCustomers(prev => prev.map(c => String(c.id) === String(customerId) ? { ...c, payments: [...existingPayments, newPayment] } : c));
            }
        }
    }

    setIsGlobalPaymentSuccess(true);
    setGlobalPaymentData({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '', isCreditCard: false, netAmount: '' });
    setTimeout(() => setIsGlobalPaymentSuccess(false), 3000);
  };

  const handleDeleteCollection = async (customerId, paymentId) => {
      if (!window.confirm("Bu tahsilatı silmek istediğinize emin misiniz? İşlem müşterinin cari hesabından silinecektir.")) return;
      const customerToUpdate = customers.find(c => String(c.id) === String(customerId));
      if (!customerToUpdate) return;
      const updatedPayments = (customerToUpdate.payments || []).filter(p => Number(p.id) !== Number(paymentId));
      // YENİ: Yerel state ANINDA güncellenir — böylece silmenin hemen ardından aynı güne
      // yeni tahsilat girilirken eski (silinmiş) kayıt hataya yol açmaz.
      setCustomers(prev => prev.map(c => String(c.id) === String(customerId) ? { ...c, payments: updatedPayments } : c));
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), { payments: updatedPayments }, { merge: true });

              // === SEMBOL KÖPRÜSÜ: Silinen tahsilat ALBARAKA defterinden de kaldırılır ===
              sembolePaymentSil(customerToUpdate, paymentId);
          } catch(e) { console.error("Tahsilat Silme Hatası:", e); }
      }
  };

  // YENİ EKLENEN: Cariye işlenmiş bir tahsilatı geri alıp Askıda Kalan Tahsilatlara gönderir
  const handleSendPaymentToPending = async (customerId, paymentId) => {
      if (!window.confirm("Bu tahsilatı cariden kaldırıp Askıda Kalan Tahsilatlara göndermek istediğinize emin misiniz?")) return;
      const customerToUpdate = customers.find(c => String(c.id) === String(customerId));
      if (!customerToUpdate) return;
      const payment = (customerToUpdate.payments || []).find(p => Number(p.id) === Number(paymentId));
      if (!payment) return;

      const { id: _oldId, ...paymentRest } = payment;
      const newPendingId = Date.now();
      const updatedPayments = (customerToUpdate.payments || []).filter(p => Number(p.id) !== Number(paymentId));

      // ÖNİZLEME MODU: db yoksa yerel state üzerinden aynı işlemi uygula
      if (!db) {
          setCustomers(prev => prev.map(c => String(c.id) === String(customerId) ? { ...c, payments: updatedPayments } : c));
          setPendingCollections(prev => [...prev, { ...paymentRest, id: newPendingId, customerId, customerName: customerToUpdate.name, customerNo: customerToUpdate.customerNo }]);
          return;
      }

      if (!firebaseUser) return;
      try {
          // 1. Cariden kaldır
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), { payments: updatedPayments }, { merge: true });

          // 2. Askıda Kalan Tahsilatlara (pendingCollections) yeni kayıt olarak ekle
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(newPendingId)), { ...paymentRest, id: newPendingId });

          // === SEMBOL KÖPRÜSÜ: Ödeme artık caride değil (askıda) → ALBARAKA defterinden kaldırılır ===
          // (Askıdan tekrar bir cariye atanırsa zaten yeniden gönderilecektir)
          sembolePaymentSil(customerToUpdate, paymentId);
      } catch(e) { console.error("Askıya Gönderme Hatası:", e); }
  };

  const handleSaveEditCollection = async () => {
      if (!editCollectionData || !editCollectionData.amount) return;
      const customerToUpdate = customers.find(c => String(c.id) === String(editCollectionData.customerId));
      
      if (customerToUpdate && db && firebaseUser) {
          const existingPayments = customerToUpdate.payments || [];
          // YENİ: Silinmiş veya tarihi değiştirilmiş tahsilatlar o günü "dolu" saymaz (kendisi hariç)
          if (hasActivePaymentOnDate(customerToUpdate, editCollectionData.date, editCollectionData.id)) {
              alert("Bu müşterinin carisinde seçilen tarihte zaten bir tahsilat kaydı bulunmaktadır. Aynı güne birden fazla tahsilat girilemez.");
              return;
          }
          try {
              const updatedPayments = existingPayments.map(p =>
                  Number(p.id) === Number(editCollectionData.id)
                  ? { ...p, date: editCollectionData.date, note: editCollectionData.note, amount: Number(editCollectionData.amount) }
                  : p
              );
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(editCollectionData.customerId)), { payments: updatedPayments }, { merge: true });

              // === SEMBOL KÖPRÜSÜ: Düzenlenen tahsilat, sabit kimlik sayesinde Sembol'de
              // YENİ satır açmaz; ALBARAKA defterindeki MEVCUT kaydın tutar/tarih/notu güncellenir ===
              const duzenlenenOdeme = updatedPayments.find(p => Number(p.id) === Number(editCollectionData.id));
              if (duzenlenenOdeme) sembolePaymentAktar(customerToUpdate, duzenlenenOdeme);
          } catch(e) { console.error("Tahsilat Düzenleme Hatası:", e); }
      }
      setIsEditCollectionModalOpen(false);
      setEditCollectionData(null);
  };

  // ============================================================================
  // YENİ EKLENEN: BANKA OTOMATİK HAREKET ALMA (CANLI API) ALT YAPISI
  // ============================================================================
  // Bağlantı mantığı: Girilen API bilgileri backend'e (/api/bank/connect) iletilir.
  // Canlı ortamda bu uç, çalışılan bankanın Open Banking / hesap hareketleri API'sine
  // güvenli şekilde bağlanır. Önizleme/backend yokken bağlantı simüle edilir.
  // Bir müşteriyle eşleşen hareket "tahsilat" olarak carisine, eşleşmeyen "askıya" düşer.

  const matchBankTxToCustomer = (description) => {
      if (!description) return null;
      const desc = description.toLocaleLowerCase('tr');
      // 1) Müşteri No ile eşleştir
      // DÜZELTME: Müşteri no artık TAM SAYI (kelime sınırı) olarak eşleştirilir. Eskiden
      // desc.includes(customerNo) idi; bu, SN/FastRef gibi uzun referans numaralarının İÇİNDE
      // müşteri no'yu alt-dize olarak yakalayıp YANLIŞ müşteriye tahsilat işliyordu
      // (örn. "SN:4688393996" içinde "88393"). Artık yalnızca bağımsız bir sayı olarak geçiyorsa eşleşir.
      const descNumberTokens = (String(description).match(/\d+/g) || []);
      let found = customers.find(c => c.customerNo && descNumberTokens.includes(String(c.customerNo)));
      if (found) return found;
      // 2) İsim ile eşleştir
      // DÜZELTME: Türkçe harf farkları ve noktalama/boşluk farkları YOK SAYILIR.
      // Örn. carisi "HACI ALİ OCAK" olan müşteri, açıklamada "HACİ ALİ OCAK" yazsa da eşleşir.
      // (İ/I/ı/i, Ç/C, Ğ/G, Ö/O, Ş/S, Ü/U dönüşümleri + fazla boşluk/noktalama temizliği)
      const foldTr = (s) => String(s)
          .toLocaleLowerCase('tr')
          .replace(/\u0307/g, '')           // İ'nin küçük halindeki birleşik nokta
          .replace(/[ıİI]/g, 'i')
          .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
      const descFold = foldTr(description);
      found = customers.find(c => c.name && foldTr(c.name).length >= 5 && descFold.includes(foldTr(c.name)));
      if (found) return found;
      // 2b) Boşluk farkları da yok sayılır: "TUĞBANUR KOÇ" carisi, açıklamada "TUGBA NUR KOC" yazsa da eşleşir.
      const descTight = descFold.replace(/ /g, '');
      found = customers.find(c => { const n = foldTr(c.name || '').replace(/ /g, ''); return n.length >= 8 && descTight.includes(n); });
      if (found) return found;
      // 3) Oda No ile eşleştir
      // DÜZELTME: Oda adı ile açıklamadaki yazım farkları (boşluk / tire / nokta / alt çizgi / bitişik)
      // artık eşleşir: "H 112" odası, açıklamada "H-112", "H112", "H.112", "h 112" olarak geçse de bulunur.
      // Kelime sınırı korunduğu için "AH1120" gibi yanlış eşleşmeler olmaz.
      const _escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const roomNameMatches = (roomName) => {
          const tokens = String(roomName).match(/[A-Za-zÇĞİÖŞÜçğıöşü]+|\d+/g);
          if (!tokens || tokens.length === 0) return false;
          const pattern = tokens.map(t => _escapeRe(t)).join('[\\s\\-_./]*');
          try { return new RegExp(`(^|[^0-9A-Za-zÇĞİÖŞÜçğıöşü])${pattern}([^0-9A-Za-zÇĞİÖŞÜçğıöşü]|$)`, 'i').test(String(description)); }
          catch (e) { return desc.includes(String(roomName).toLocaleLowerCase('tr')); }
      };
      const room = rooms.find(r => r.name && r.customerName && roomNameMatches(r.name));
      if (room) return customers.find(c => c.name === room.customerName) || null;
      return null;
  };

  // YENİ: Açıklama metninden PARA ÇIKIŞI tespiti (hem çekimde hem ekranda kullanılır).
  const isOutgoingBankDesc = (description) => {
      const d = String(description || '');
      if (!d) return false;
      // a) Açıklamada eksi tutar: "Açk: - 375000.00 TRY", "- 12.500,00 TL"
      if (/(^|[\s:])-\s*\d[\d.,]*\s*(try|tl)\b/i.test(d)) return true;
      // b) Gönderen KENDİ bankamız ise (para bizden çıkmış): "GÖN:ALBARAKA ..."
      const ownBank = String(bankApiConfig.bankName || '').split(' ')[0];
      if (ownBank && ownBank.length >= 4) {
          try {
              const _re = new RegExp(`g[oö]n(?:deren)?\\s*[:\\-]?\\s*${ownBank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
              if (_re.test(d)) return true;
          } catch (e) { /* yoksay */ }
      }
      // c) Alıcı bilgisi içeren gönderim kayıtları (bizden çıkan havale/EFT)
      if (/\bal[iı]c[iı]\s*(banka|hesap|iban|ad)/i.test(d)) return true;
      return false;
  };

  // YENİ: Açıklamadan GÖNDERİCİ anahtarı üretir (öğrenilen eşleştirme kuralları için).
  // Öncelik: IBAN → yoksa gönderen adı. Aynı göndericiden gelen sonraki ödemeler bu anahtarla tanınır.
  const bankTxRuleKey = (description) => {
      const d = String(description || '');
      if (!d) return null;
      const ibanM = d.replace(/\s+/g, '').match(/TR\d{24}/i);
      if (ibanM) return 'iban:' + ibanM[0].toUpperCase();
      const stop = '(?:A[çc][ıi]klama|A[çc]k|G[öo]nBanka|G[öo]n[ŞS]ube|FastRef|Ref\\s*No|M[ÜU][ŞS]TER[İI])';
      let m = d.match(new RegExp(`SN[:\\s]*\\d+\\s+(.+?)(?=\\s*${stop}|$)`, 'i'));
      let name = m ? m[1] : '';
      if (!name) { m = d.match(new RegExp(`^\\s*([A-Za-zÇĞİÖŞÜçğıöşü.\\s]{5,60}?)(?=\\s*${stop}|$)`)); name = m ? m[1] : ''; }
      const folded = String(name)
          .toLocaleLowerCase('tr').replace(/\u0307/g, '')
          .replace(/[ıİI]/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
          .replace(/[^a-z0-9]+/g, ' ').trim();
      return folded.length >= 5 ? 'ad:' + folded : null;
  };

  // YENİ: Müşterinin carisinde AYNI GÜN + AYNI TUTAR ödeme var mı? (mükerrer tahsilat kontrolü)
  const hasSameDayAmountPayment = (customerId, dateISO, amount) => {
      if (!customerId || !dateISO) return false;
      const cust = customers.find(c => String(c.id) === String(customerId));
      if (!cust) return false;
      const amt = Math.round(Number(amount) || 0);
      return (cust.payments || []).some(p => String(p.date) === String(dateISO) && Math.round(Number(p.amount) || 0) === amt);
  };
  const bankTxDateISO = (tx) => { try { return tx.rawDate ? new Date(tx.rawDate).toISOString().split('T')[0] : ''; } catch (e) { return ''; } };

  // YENİ: Müşterinin carisinde AYNI GÜN (tutar fark etmeksizin) ödeme var mı?
  const hasSameDayPayment = (customerId, dateISO) => {
      if (!customerId || !dateISO) return false;
      const cust = customers.find(c => String(c.id) === String(customerId));
      if (!cust) return false;
      return (cust.payments || []).some(p => String(p.date) === String(dateISO));
  };

  // YENİ: "Eşleşmedi" satırına elle cari atama. Seçim ÖĞRENİLİR: aynı göndericiden gelen
  // sonraki hareketler otomatik bu cariye eşleşir (askıya alınmaz).
  const assignBankTxCustomer = (txId, customerId) => {
      const cust = customers.find(c => String(c.id) === String(customerId));
      if (!cust) { setMatchEditTxId(null); return; }
      const tx = bankApiTransactions.find(t => String(t.id) === String(txId));
      setBankApiTransactions(prev => prev.map(t => String(t.id) === String(txId)
          ? { ...t, matchedCustomerId: cust.id, matchedCustomerName: cust.name, status: 'tahsilat' } : t));
      const key = tx ? bankTxRuleKey(tx.description) : null;
      if (key) setBankMatchRules(prev => ({ ...prev, [key]: String(cust.id) }));
      setMatchEditTxId(null);
  };

  // YENİ: HESAPLAR ARASI VİRMAN / kendi hesaplarımız arası transfer + KENDİ ÖDEMELERİMİZ tespiti.
  // Bunlar müşteri ödemesi değildir; listede hiç gösterilmez.
  // Kapsam: virman/hesaplar arası transfer, kredi kartına hesaptan yapılan ödemeler, hesaptan ödeme kayıtları.
  const isTransferDesc = (description) => {
      const d = String(description || '');
      if (!d) return false;
      if (/(virman|hesaplar\s*aras|hesaptan\s*hesaba|kendi\s*hesab)/i.test(d)) return true;
      // "547234******1124 Nolu Kredi Kartına yapılan HESAPTAN ödeme." gibi kendi kredi kartı ödemelerimiz
      if (/(kredi\s*kart[ıi]na\s*yap[ıi]lan|kredi\s*kart[ıi]\s*[öo]deme|hesaptan\s*[öo]deme)/i.test(d)) return true;
      return false;
  };

  // YENİ: Açıklamadan ÖĞRENİLEBİLİR gizleme imzası üretir (rakamlar/noktalama atılır).
  // Örn. "- 25 - 8712889 - 1 Hesaptan Virman" → "hesaptan virman"
  const bankTxIgnoreSignature = (description) => {
      const folded = String(description || '')
          .toLocaleLowerCase('tr').replace(/\u0307/g, '')
          .replace(/[ıİI]/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
          .replace(/[^a-z\s]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const tokens = folded.split(' ').filter(w => w.length >= 3).slice(0, 6);
      return tokens.length >= 2 ? tokens.join(' ') : '';
  };

  // YENİ: Hareket, öğrenilmiş "gösterme" kalıplarından birine uyuyor mu?
  // (a) Açıklama kalıbı, (b) GÖNDERİCİ (IBAN / gönderen adı) — gönderici eşleşmesi TUTARDAN BAĞIMSIZDIR.
  const isLearnedIgnored = (description) => {
      const senderKey = bankTxRuleKey(description);
      if (senderKey && (bankIgnoreSenders || []).includes(senderKey)) return true;
      const sig = bankTxIgnoreSignature(description);
      if (!sig) return false;
      return (bankIgnorePatterns || []).some(p => p && sig.includes(p));
  };

  const handleBankApiConnect = async () => {
      if (!bankApiConfig.bankName || !bankApiConfig.apiKey || !bankApiConfig.apiSecret) {
          alert('Lütfen Banka, API Key ve API Secret alanlarını doldurun.');
          return;
      }
      setBankApiStatus('connecting');
      // ÖNİZLEME/backend yoksa bağlantıyı simüle et
      if (!db) {
          setTimeout(() => { setBankApiConnected(true); setBankApiStatus('connected'); }, 1200);
          return;
      }
      try {
          const res = await fetch('/api/bank/connect', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bankApiConfig)
          });
          const result = await res.json();
          if (!res.ok || !result.success) throw new Error(result.error || 'Bağlantı kurulamadı.');
          setBankApiConnected(true); setBankApiStatus('connected');
          // YENİ: Beni Hatırla açıksa, başarılı bağlantıda güncel bilgileri kaydet.
          if (bankApiRemember) {
              try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bankApi'), { ...bankApiConfig }, { merge: true }); } catch (err) { console.error('Banka API bilgisi kaydetme hatası:', err); }
          }
          // YENİ: "Beni Hatırla" açıksa, bağlanırken kullanılan GÜNCEL bilgileri (değiştirilmiş olabilir) kaydet.
          if (bankApiRemember && firebaseUser) {
              try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bankApi'), { ...bankApiConfig }, { merge: true }); } catch (err) { console.error('Banka API bilgisi kaydetme hatası:', err); }
          }
      } catch (e) {
          console.error('Banka API Bağlantı Hatası:', e);
          setBankApiStatus('error');
      }
  };

  const handleBankApiDisconnect = () => {
      setBankApiConnected(false); setBankApiStatus('idle');
  };

  // Tek seferlik hareket çekme (canlı: backend, önizleme: örnek üretimi yok — yalnızca gerçek veri)
  const fetchBankTransactionsOnce = async () => {
      if (!bankApiConnected) { alert('Önce bankaya bağlanın.'); return; }
      if (bankApiFetching) return; // çift tıklamada mükerrer istek atma
      setBankApiFetching(true);
      if (!db) {
          // Önizleme modunda gerçek banka verisi olmadığından yeni hareket üretilmez.
          setBankApiFetching(false);
          return;
      }
      try {
          const res = await fetch('/api/bank/transactions', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...bankApiConfig, since: bankApiTransactions[0]?.rawDate || null })
          });
          const result = await res.json();
          if (!res.ok || !Array.isArray(result.transactions)) return;
          // GÜNCELLENDİ: YALNIZCA hesaba GİREN hareketler alınır; hesaptan GİDEN paralar
          // (eksi tutar, borç/debit yönlü kayıtlar, "GÖN:<kendi banka>" / "Alıcı Banka" içeren açıklamalar)
          // listeye hiç eklenmez.
          const _delSet = new Set((deletedBankTxIds || []).map(String));
          const incoming = result.transactions.filter(t => {
              const amt = Number(t.amount);
              const dirRaw = String(t.direction || t.type || t.drCr || t.borcAlacak || t.islemTuru || '').toLocaleLowerCase('tr');
              const isOut = (!isNaN(amt) && amt < 0)
                  || (dirRaw && /(out|debit|borc|borç|giden|cikis|çıkış|gider|havale gonderim|^d$)/.test(dirRaw))
                  || isOutgoingBankDesc(t.description);
              // YENİ: Hesaplar arası VİRMAN ve öğrenilmiş "gösterme" kalıpları da alınmaz.
              if (isTransferDesc(t.description) || isLearnedIgnored(t.description)) return false;
              return !isOut;
          }).map(t => {
              const amt = Number(t.amount);
              const dirRaw = String(t.direction || t.type || t.drCr || t.borcAlacak || t.islemTuru || '').toLocaleLowerCase('tr');
              const isOut = (!isNaN(amt) && amt < 0)
                  || (dirRaw && /(out|debit|borc|borç|giden|cikis|çıkış|gider|havale gonderim|^d$)/.test(dirRaw))
                  || isOutgoingBankDesc(t.description);
              // Giden parada müşteri eşleştirmesi YAPILMAZ (yanlış tahsilat oluşmasın).
              let matched = isOut ? null : matchBankTxToCustomer(t.description);
              // YENİ: Otomatik eşleşme yoksa, daha önce ELLE eşleştirdiğimiz göndericiler için
              // öğrenilen kural uygulanır → aynı göndericiden gelen ödeme doğrudan o cariye eşleşir.
              if (!matched && !isOut) {
                  const _k = bankTxRuleKey(t.description);
                  if (_k && bankMatchRules[_k]) matched = customers.find(c => String(c.id) === String(bankMatchRules[_k])) || null;
              }
              return {
                  id: t.id || Date.now() + Math.random(),
                  rawDate: t.date,
                  date: new Date(t.date).toLocaleDateString('tr-TR'),
                  // YENİ: Saat bilgisi — sıralama gün + SAAT'e göre yapılır, tabloda da gösterilir.
                  time: (() => { const _d = new Date(t.date); return isNaN(_d.getTime()) ? '' : _d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); })(),
                  ts: (() => { const _d = new Date(t.date); return isNaN(_d.getTime()) ? 0 : _d.getTime(); })(),
                  amount: Math.abs(Number(t.amount)),
                  // YENİ: Yön — bankadan gelen veriye göre 'in' (hesaba giren) / 'out' (hesaptan giden)
                  direction: isOut ? 'out' : 'in',
                  description: t.description || '',
                  matchedCustomerId: matched?.id || null,
                  matchedCustomerName: matched?.name || null,
                  status: matched ? 'tahsilat' : 'askida', // otomatik öneri
                  processed: false
              };
          });
          // Yeni gelenleri en üste ekle (id bazında tekrar önle; SİLİNENLER tekrar eklenmez)
          setBankApiTransactions(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              // YENİ: seq — bankadan gelen listedeki sıra. Büyük seq = gün içinde DAHA SONRAKİ ödeme.
              // Her yeni parti, mevcut en büyük seq'in üstünden devam eder (sıra karışmaz).
              const _maxSeq = prev.reduce((m, p) => Math.max(m, Number(p.seq) || 0), 0);
              const fresh = incoming.filter(i => !existingIds.has(i.id) && !_delSet.has(String(i.id))).map((i, _k) => ({ ...i, seq: _maxSeq + 1 + _k, isNew: true, addedAt: Date.now() }));
              // YENİ: Her yeni tahsilat için masaüstü bildirimi (izin verilmişse).
              if (fresh.length > 0) {
                  try {
                      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                          fresh.filter(f => f.direction !== 'out').forEach(f => {
                              try { new Notification('Yeni Gelen Ödeme', { body: `+${Number(f.amount).toLocaleString('tr-TR')} TL • ${f.matchedCustomerName || 'Eşleşmedi'}\n${String(f.description).slice(0, 80)}`, tag: String(f.id) }); } catch (err) { /* yoksay */ }
                          });
                      }
                  } catch (err) { /* yoksay */ }
              }
              // YENİ: EN YENİ TARİH EN ÜSTTE olacak şekilde sırala.
              const merged = [...fresh, ...prev];
              // Sıralama gün VE SAAT'e göre (en yeni saat en üstte).
              merged.sort((a, b) => {
                  const ta = Number(a.ts) || new Date(a.rawDate).getTime() || 0;
                  const tb = Number(b.ts) || new Date(b.rawDate).getTime() || 0;
                  if (tb !== ta) return tb - ta;
                  return (b.addedAt || 0) - (a.addedAt || 0);
              });
              return merged;
          });
      } catch (e) { console.error('Banka Hareket Çekme Hatası:', e); }
      finally { setBankApiFetching(false); }
  };

  // NOT: Otomatik/periyodik çekim (setInterval) KALDIRILDI. Fixie kotasını tüketmemek için
  // banka hareketleri YALNIZCA "Hesap Hareketlerini Çek" butonuna basıldığında, tek seferlik çekilir.

  // YENİ: KALICILIK — çekilen banka hareketleri Firestore'a kaydedilir; sayfa yenilenince
  // liste kaybolmaz, kaldığınız yerden devam eder ("Hesap Hareketlerini Çek" sonuçları da kalıcıdır).
  const bankTxLoadedRef = useRef(false);
  const bankTxSaveTimerRef = useRef(null);
  useEffect(() => {
      if (!db || !firebaseUser || bankTxLoadedRef.current) return;
      bankTxLoadedRef.current = true;
      (async () => {
          try {
              const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bankTransactions'));
              if (snap.exists()) {
                  const d = snap.data() || {};
                  if (Array.isArray(d.items) && d.items.length > 0) setBankApiTransactions(d.items);
                  // YENİ: Silinen hareket id'leri de geri yüklenir (bir daha görünmesinler).
                  if (Array.isArray(d.deletedIds)) setDeletedBankTxIds(d.deletedIds.map(String));
                  // YENİ: Öğrenilen eşleştirme kuralları da geri yüklenir.
                  if (d.matchRules && typeof d.matchRules === 'object') setBankMatchRules(d.matchRules);
                  // YENİ: Öğrenilen "gösterme" kalıpları da geri yüklenir.
                  if (Array.isArray(d.ignorePatterns)) setBankIgnorePatterns(d.ignorePatterns.filter(Boolean).map(String));
                  // YENİ: Gizlenen göndericiler de geri yüklenir.
                  if (Array.isArray(d.ignoreSenders)) setBankIgnoreSenders(d.ignoreSenders.filter(Boolean).map(String));
              }
          } catch (e) { console.error('Banka hareketleri yükleme hatası:', e); }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  useEffect(() => {
      if (!db || !firebaseUser || !bankTxLoadedRef.current) return;
      if (bankTxSaveTimerRef.current) clearTimeout(bankTxSaveTimerRef.current);
      // Yazma sayısını azaltmak için kısa gecikmeli (debounce) kaydetme.
      bankTxSaveTimerRef.current = setTimeout(() => {
          (async () => {
              try {
                  // Doküman boyut sınırına takılmamak için en yeni 1500 kayıt saklanır.
                  const items = bankApiTransactions.slice(0, 1500);
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'bankTransactions'), { items, deletedIds: (deletedBankTxIds || []).slice(-3000), matchRules: bankMatchRules || {}, ignorePatterns: bankIgnorePatterns || [], ignoreSenders: bankIgnoreSenders || [], updatedAt: Date.now() }, { merge: true });
              } catch (e) { console.error('Banka hareketleri kaydetme hatası:', e); }
          })();
      }, 1500);
      return () => { if (bankTxSaveTimerRef.current) clearTimeout(bankTxSaveTimerRef.current); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankApiTransactions, deletedBankTxIds, bankMatchRules, bankIgnorePatterns, bankIgnoreSenders, firebaseUser]);

  // YENİ: OTOMATİK BAĞLANTI — kayıtlı API bilgileri varsa uygulama açılışında kendiliğinden
  // bankaya bağlanır ve canlı çekimi başlatır (elle "Bankaya Bağlan" gerekmez).
  const bankAutoConnectRef = useRef(false);
  useEffect(() => {
      if (!db || !firebaseUser || bankAutoConnectRef.current) return;
      if (bankApiConnected) return;
      if (!bankApiConfig.bankName || !bankApiConfig.apiKey || !bankApiConfig.apiSecret) return;
      bankAutoConnectRef.current = true;
      (async () => {
          try {
              // NOT: Yalnızca BAĞLANTI otomatik kurulur. Hareketler KENDİLİĞİNDEN ÇEKİLMEZ;
              // yalnızca "Hesap Hareketlerini Çek" butonuna tıklanınca TEK SEFERLİK çekilir.
              await handleBankApiConnect();
          } catch (e) { console.error('Otomatik banka bağlantısı hatası:', e); }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, bankApiConfig.bankName, bankApiConfig.apiKey, bankApiConfig.apiSecret]);

  // Bir banka hareketini tahsilat/askıya olarak işaretle (kullanıcı düzenlemesi)
  const setBankTxStatus = (txId, status) => {
      setBankApiTransactions(prev => prev.map(t => t.id === txId ? { ...t, status } : t));
  };
  const removeBankTx = (txId) => {
      // YENİ: Onay penceresi + KALICI gizleme (yenilemede bankadan tekrar eklenmez, eşleştirilmez).
      if (!window.confirm('Bu banka hareketini silmek istediğinize emin misiniz?\n\nSilinen hareket bu ekranda bir daha görünmez ve "Hesap Hareketlerini Çek" yapıldığında tekrar eklenmez.')) return;
      const _tx = bankApiTransactions.find(t => String(t.id) === String(txId));
      setDeletedBankTxIds(prev => (prev.includes(String(txId)) ? prev : [...prev, String(txId)]));
      setBankApiTransactions(prev => prev.filter(t => String(t.id) !== String(txId)));
      // YENİ: ÖĞRENME — istenirse bu GÖNDERİCİDEN gelen tüm hareketler (tutar değişse bile)
      // veya aynı açıklama kalıbındaki hareketler bundan sonra hiç gösterilmez.
      const _senderKey = _tx ? bankTxRuleKey(_tx.description) : null;
      if (_senderKey && !(bankIgnoreSenders || []).includes(_senderKey)) {
          const _label = _senderKey.startsWith('iban:') ? _senderKey.slice(5) : _senderKey.slice(3).toLocaleUpperCase('tr');
          if (window.confirm(`Bu GÖNDERİCİDEN gelen hareketler bundan sonra hiç gösterilmesin mi?\n\nGönderici: ${_label}\n\nEvet derseniz TUTAR DEĞİŞSE BİLE bu göndericiden gelen yeni hareketler otomatik gizlenir.`)) {
              setBankIgnoreSenders(prev => [...prev, _senderKey]);
              setBankApiTransactions(prev => prev.filter(t => bankTxRuleKey(t.description) !== _senderKey));
              return;
          }
      }
      const sig = _tx ? bankTxIgnoreSignature(_tx.description) : '';
      if (sig && !(bankIgnorePatterns || []).includes(sig)) {
          if (window.confirm(`Bu TÜRDEKİ hareketler bundan sonra hiç gösterilmesin mi?\n\nKalıp: "${sig}"\n\nEvet derseniz, açıklaması bu kalıba uyan yeni hareketler de otomatik gizlenir.`)) {
              setBankIgnorePatterns(prev => [...prev, sig]);
              setBankApiTransactions(prev => prev.filter(t => !bankTxIgnoreSignature(t.description).includes(sig)));
          }
      }
  };

  // Hareketi kesinleştir: tahsilat ise cariye işle, askıda ise pendingCollections'a ekle
  // YENİ: force=false iken, müşterinin carisinde AYNI GÜN + AYNI TUTAR ödeme varsa işlemez;
  // uyarı penceresi açar. Kullanıcı "Yine de İşle" derse force=true ile tekrar çağrılır.
  const processBankTx = async (txId, force = false) => {
      const tx = bankApiTransactions.find(t => t.id === txId);
      if (!tx) return;
      if (tx.status === 'tahsilat' && tx.matchedCustomerId) {
          const cust = customers.find(c => c.id === tx.matchedCustomerId);
          if (cust) {
              const payDate = tx.rawDate ? new Date(tx.rawDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
              if (!force) {
                  const dup = (cust.payments || []).find(p => String(p.date) === String(payDate) && Math.abs(Number(p.amount) - Number(tx.amount)) < 0.01);
                  if (dup) {
                      setDuplicatePayWarn({ txId, customerName: cust.name, date: payDate, amount: Number(tx.amount), existingNote: dup.note || '' });
                      return; // Uyarı penceresi açılır; direkt işlenmez.
                  }
              }
              const payment = { id: Date.now(), createdAt: Date.now(), amount: tx.amount, date: payDate, note: `Banka Otomatik: ${tx.description}`, hasEInvoice: false };
              const updatedPayments = [...(cust.payments || []), payment];
              if (db && firebaseUser) {
                  try {
                      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(cust.id)), { payments: updatedPayments }, { merge: true });

                      // === SEMBOL KÖPRÜSÜ: Banka API'den cariye işlenen tahsilat ALBARAKA defterine gider ===
                      sembolePaymentAktar(cust, payment);
                  } catch(e){ console.error(e); }
              } else {
                  setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, payments: updatedPayments } : c));
              }
          }
      } else {
          // Askıya al
          const pending = { id: Date.now(), amount: tx.amount, date: tx.rawDate ? new Date(tx.rawDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], note: `Banka Otomatik: ${tx.description}`, customerName: tx.matchedCustomerName || 'Eşleşmedi' };
          if (db && firebaseUser) {
              try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(pending.id)), pending); } catch(e){ console.error(e); }
          } else {
              setPendingCollections(prev => [...prev, pending]);
          }
      }
      setBankApiTransactions(prev => prev.map(t => t.id === txId ? { ...t, processed: true } : t));
  };


  const fetchBulkUploadHistory = async () => {
      if (!db) return;
      try {
          const snap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'bulkUploadHistory'), orderBy('timestamp', 'desc'), limit(50)));
          setBulkUploadHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error("Toplu yükleme geçmişi çekme hatası:", e); }
  };
  useEffect(() => {
      if (!db || !firebaseUser) return;
      if (activeMenu === 'odeme-girisi') fetchBulkUploadHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu, firebaseUser]);


  return (
    <>
      {activeMenu === 'odeme-girisi' && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6"><h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans</h1><h2 className="text-2xl font-bold text-slate-800">Tahsilat Girişi Yap</h2><p className="text-sm text-gray-500 mt-1">Havale/EFT ile gelen müşteri ödemelerini tekil veya toplu olarak hesaplara işleyin.</p></div>
              
              <div className="flex gap-4 border-b border-gray-200 mb-6">
                  <button onClick={() => setPaymentEntryMode('single')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${paymentEntryMode === 'single' ? 'border-[#1bc5bd] text-[#1bc5bd]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Tekil Tahsilat Girişi
                  </button>
                  <button onClick={() => setPaymentEntryMode('bulk')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${paymentEntryMode === 'bulk' ? 'border-[#1bc5bd] text-[#1bc5bd]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Toplu Ödeme Yükle (Excel/CSV)
                  </button>
                  <button onClick={() => setPaymentEntryMode('bankapi')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${paymentEntryMode === 'bankapi' ? 'border-[#1bc5bd] text-[#1bc5bd]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Banka Otomatik Hareket Alma
                  </button>
              </div>

              {paymentEntryMode === 'single' ? (
                  <>
                      {isGlobalPaymentSuccess && (<div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2"><div className="bg-green-100 p-1 rounded-full"><Check size={16} strokeWidth={3}/></div><span className="font-semibold text-sm">Ödeme başarıyla müşterinin cari hesabına işlendi!</span></div>)}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700">Müşteri Cari Hesap Seçimi (Zorunlu)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400" /></div>
                                <input type="text" placeholder="Müşteri Adı, Müşteri No veya Oda Numarası (Örn: L-801) ile Ara..." value={paymentCustomerSearch} onChange={(e) => setPaymentCustomerSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 mb-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 font-medium text-slate-700 bg-white shadow-sm" />
                            </div>
                            <select value={globalPaymentData.customerId} onChange={(e) => setGlobalPaymentData({...globalPaymentData, customerId: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-50 font-medium text-slate-700">
                              <option value="">Lütfen ödeme yapan müşteriyi seçin...</option>
                              <option value="askida" className="font-bold text-orange-600 bg-orange-50">⚠️ ASKIDA KALAN TAHSİLAT (Kime ait olduğu bilinmeyen ödeme)</option>
{customers.filter(c => {
                                  if (!paymentCustomerSearch) return true;
                                  const searchLower = normalizeStr(paymentCustomerSearch);
                                  const matchName = normalizeStr(c.name).includes(searchLower);
                                  const matchNo = c.customerNo && String(c.customerNo).includes(searchLower);
                                  const matchRoom = rooms.some(r => r.customerName === c.name && normalizeStr(r.name).includes(searchLower));
                                  return matchName || matchNo || matchRoom;
                              }).map(c => {
                                  const cRooms = rooms.filter(r => r.customerName === c.name).map(r => r.name).join(', ');
                                  const roomText = cRooms ? ` | Odalar: ${cRooms}` : '';
                                  return (
                                      <option key={c.id} value={c.id}>{c.name} (Müşteri No: {c.customerNo}){roomText}</option>
                                  );
                              })}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            {/* YENİ EKLENEN: Kredi Kartıyla Tahsilat seçeneği */}
                            <label className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer">
                              <input type="checkbox" checked={globalPaymentData.isCreditCard} onChange={(e) => setGlobalPaymentData({...globalPaymentData, isCreditCard: e.target.checked})} className="w-4 h-4 accent-amber-500" />
                              <span className="text-sm font-bold text-amber-700 flex items-center gap-1.5"><CreditCard size={16}/> Kredi Kartıyla Tahsilat</span>
                            </label>
                          </div>
                          <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">{globalPaymentData.isCreditCard ? 'Müşteriden Alınan Tutar (Cariye)' : 'Ödenen Tutar (TL)'}</label><input type="number" value={globalPaymentData.amount} onChange={(e)=>setGlobalPaymentData({...globalPaymentData, amount: e.target.value})} placeholder="Örn: 30000" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-bold text-slate-800 text-lg" /></div>
                          {globalPaymentData.isCreditCard && (
                            <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-amber-700">Kesintili Tutar (Hesaba Geçen Net)</label><input type="number" value={globalPaymentData.netAmount} onChange={(e)=>setGlobalPaymentData({...globalPaymentData, netAmount: e.target.value})} placeholder="Örn: 28450" className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-bold text-slate-800 text-lg bg-amber-50/40" /></div>
                          )}
                          <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">Ödeme Tarihi (Bankaya Geliş)</label><input type="date" value={globalPaymentData.date} onChange={(e)=>setGlobalPaymentData({...globalPaymentData, date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-medium text-slate-700" /></div>
                          <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-sm font-semibold text-gray-700">İşlem Açıklaması / Dekont Notu</label><textarea rows="3" value={globalPaymentData.note} onChange={(e)=>setGlobalPaymentData({...globalPaymentData, note: e.target.value})} placeholder="Örn: Haziran 2026 kirası" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 resize-none font-medium text-slate-700"></textarea></div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                          <button onClick={handleGlobalPayment} disabled={!globalPaymentData.customerId || !globalPaymentData.amount} className="bg-[#1bc5bd] hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/30"><Wallet size={18} /> Ödemeyi Sisteme İşle</button>
                        </div>
                      </div>
                  </>
              ) : paymentEntryMode === 'bulk' ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 md:p-8 animate-in fade-in duration-300">
                      <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><Upload size={20} className="text-[#1bc5bd]" /> Toplu Banka Hareketleri Yükleme</h3>
                      <p className="text-sm text-gray-600 mb-6">Banka hareketlerinizi içeren dosyayı yükleyin. Sistem, açıklama kısmındaki <strong>İsim Soyisim, Müşteri No veya Oda No</strong> bilgilerini tarayarak ödemeleri otomatik olarak ilgili müşterilerin cari hesaplarına işler. Eşleşmeyen ödemeler "Askıda Kalan Tahsilatlar" havuzuna düşer.</p>

                      <label className={`border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-white hover:border-[#1bc5bd] transition-colors cursor-pointer group bg-white shadow-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              {isUploading ? <RefreshCcw size={32} className="text-[#1bc5bd] animate-spin" /> : <Table size={32} className="text-[#1bc5bd]" />}
                          </div>
                          <p className="text-base font-bold text-gray-700 mb-1">
                              <span className="text-[#1bc5bd]">{isUploading ? 'Dosya İşleniyor...' : 'Dosya seçmek için tıklayın'}</span> {!isUploading && 'veya sürükleyip bırakın'}
                          </p>
                          <p className="text-sm text-gray-500 mb-4">Desteklenen formatlar: <strong>.xls, .xlsx, .csv</strong></p>
                          
                          <div className="bg-orange-50 text-orange-700 text-xs font-medium px-4 py-3 rounded-lg flex items-start gap-2 max-w-lg text-left border border-orange-100">
                              <Info size={16} className="shrink-0 mt-0.5" />
                              <span><strong>Format Örneği:</strong> İlk satır başlık olmalıdır. Sütunlar sırasıyla: <em>Tarih, Tutar, Açıklama</em> şeklinde olmalıdır.</span>
                          </div>

                          <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={handleBulkFileUpload} disabled={isUploading} />
                      </label>

                      {bulkProcessResult && (
                          <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Check size={20} className="text-green-500"/> İşlem Sonuç Raporu</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                                          <div className="text-sm text-green-800 font-bold mb-1">Eşleşen ve Cariye İşlenen</div>
                                          <div className="text-2xl font-black text-green-600 mb-1">{bulkProcessResult.matchedCount} <span className="text-sm font-bold">Kayıt</span></div>
                                          <div className="text-xs font-semibold text-green-700">Toplam: {bulkProcessResult.totalMatchedAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                                      </div>
                                      <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                                          <div className="text-sm text-orange-800 font-bold mb-1">Eşleşmeyen (Askıya Alınan)</div>
                                          <div className="text-2xl font-black text-orange-600 mb-1">{bulkProcessResult.unmatchedCount} <span className="text-sm font-bold">Kayıt</span></div>
                                          <div className="text-xs font-semibold text-orange-700">Toplam: {bulkProcessResult.totalUnmatchedAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                                      </div>
                                  </div>
                                  <div className="mt-4 flex justify-end gap-3">
                                      <button onClick={() => { setBulkDetailsData(bulkProcessResult); setIsBulkDetailsModalOpen(true); }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm border border-indigo-100 flex items-center gap-2">
                                          <Search size={16} /> Detayları Gör
                                      </button>
                                      <button onClick={handleUndoBulkProcess} className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm border border-red-100">
                                          <RefreshCcw size={16} /> Geri Al
                                      </button>
                                      <button onClick={() => setBulkProcessResult(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
                                          Sonucu Kapat
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="mt-8 border-t border-gray-200 pt-8">
                          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><History size={20} className="text-[#1bc5bd]"/> Geçmiş Toplu Yüklemeler</h3>
                          <div className="overflow-x-auto border border-gray-200 rounded-xl">
                              <table className="w-full text-left text-sm text-gray-600">
                                  <thead className="bg-slate-50 border-b border-gray-200 font-bold text-gray-700 text-xs uppercase">
                                      <tr>
                                          <th className="p-4">Yükleme Tarihi</th>
                                          <th className="p-4">Dosya Adı</th>
                                          <th className="p-4 text-center">İşlenen (Cari)</th>
                                          <th className="p-4 text-center">Askıya Alınan</th>
                                          <th className="p-4 text-right">Toplam Tutar</th>
                                          <th className="p-4 text-center">İşlem</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                      {bulkUploadHistory.length > 0 ? bulkUploadHistory.map(history => (
                                          <tr key={history.id} className="hover:bg-gray-50">
                                              <td className="p-4 font-bold text-gray-800">{history.dateStr}</td>
                                              <td className="p-4 font-medium text-gray-600">{history.fileName}</td>
                                              <td className="p-4 text-center font-bold text-emerald-600">{history.matchedCount} Kayıt</td>
                                              <td className="p-4 text-center font-bold text-orange-500">{history.unmatchedCount} Kayıt</td>
                                              <td className="p-4 text-right font-black text-[#1bc5bd]">{(history.totalMatchedAmount + history.totalUnmatchedAmount).toLocaleString('tr-TR')} TL</td>
                                              <td className="p-4 text-center">
                                                  <div className="flex items-center justify-center gap-2">
                                                      <button onClick={() => { setBulkDetailsData(history); setIsBulkDetailsModalOpen(true); }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm border border-indigo-100 whitespace-nowrap">
                                                          <Search size={14}/> Detay
                                                      </button>
                                                      <button onClick={() => handleRevertBulkUpload(history)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm border border-red-100 whitespace-nowrap">
                                                          <Trash2 size={14}/> Geri Al / Sil
                                                      </button>
                                                  </div>
                                              </td>
                                          </tr>
                                      )) : (
                                          <tr><td colSpan="6" className="p-8 text-center text-gray-500 font-medium">Henüz kayıtlı toplu yükleme geçmişi bulunmuyor.</td></tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                  </div>
              ) : (
                  /* YENİ EKLENEN: BANKA OTOMATİK HAREKET ALMA (CANLI API) SEKMESİ */
                  <div className="animate-in fade-in duration-300 flex flex-col gap-6">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><RefreshCcw size={20} className="text-[#1bc5bd]" /> Banka Otomatik Hareket Alma (Canlı API)</h3>
                          <p className="text-sm text-gray-500 mb-6">Çalıştığınız bankanın API bilgilerini girerek hesabınıza canlı bağlanın. Sistem, gelen banka hareketlerini açıklamadaki <strong>İsim, Müşteri No veya Oda No</strong> ile eşleştirir; eşleşenleri <strong>tahsilat</strong> olarak carilere, eşleşmeyenleri <strong>askıda</strong> olarak işaretler. Hareketler otomatik çekilmez; yalnızca <strong>"Hesap Hareketlerini Çek"</strong> butonuna bastığınızda tek seferlik alınır.</p>

                          {/* Bağlantı durumu şeridi */}
                          <div className={`mb-6 rounded-xl px-4 py-3 flex items-center justify-between border ${bankApiConnected ? 'bg-emerald-50 border-emerald-200' : bankApiStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${bankApiConnected ? (bankApiFetching ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500') : bankApiStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : bankApiStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                                  <span className="text-sm font-bold text-gray-700">
                                      {bankApiStatus === 'connecting' ? 'Bankaya bağlanılıyor...' : bankApiConnected ? (bankApiFetching ? 'Bağlı • Hareketler çekiliyor...' : 'Bağlı • Hazır') : bankApiStatus === 'error' ? 'Bağlantı hatası' : 'Bağlı değil'}
                                  </span>
                              </div>
                              {bankApiConnected && <span className="text-xs font-semibold text-gray-500">{bankApiConfig.bankName}</span>}
                          </div>

                          {/* API bilgileri formu */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-bold text-gray-600 uppercase">Banka</label>
                                  <select value={bankApiConfig.bankName} onChange={(e) => setBankApiConfig({...bankApiConfig, bankName: e.target.value})} disabled={bankApiConnected} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 font-medium text-slate-700 bg-white disabled:bg-gray-50">
                                      <option value="">Banka Seçin</option>
                                      <option>Albaraka Türk</option><option>Ziraat Bankası</option><option>Garanti BBVA</option><option>İş Bankası</option><option>Yapı Kredi</option><option>QNB</option><option>Enpara</option><option>Akbank</option><option>Halkbank</option><option>Vakıfbank</option><option>Diğer</option>
                                  </select>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-bold text-gray-600 uppercase">Hesap IBAN (İsteğe Bağlı)</label>
                                  <input type="text" value={bankApiConfig.iban} onChange={(e) => setBankApiConfig({...bankApiConfig, iban: e.target.value})} disabled={bankApiConnected} placeholder="TR.. .... .... ...." className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 font-medium text-slate-700 disabled:bg-gray-50" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-bold text-gray-600 uppercase">API Key</label>
                                  <input type="text" value={bankApiConfig.apiKey} onChange={(e) => setBankApiConfig({...bankApiConfig, apiKey: e.target.value})} disabled={bankApiConnected} placeholder="Banka API anahtarınız" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 font-medium text-slate-700 disabled:bg-gray-50" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-bold text-gray-600 uppercase">API Secret</label>
                                  <input type="password" value={bankApiConfig.apiSecret} onChange={(e) => setBankApiConfig({...bankApiConfig, apiSecret: e.target.value})} disabled={bankApiConnected} placeholder="••••••••••••" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 font-medium text-slate-700 disabled:bg-gray-50" />
                              </div>
                          </div>

                          {/* YENİ: Beni Hatırla — banka/API bilgileri kaydedilir, her açılışta otomatik dolar */}
                          <label className="mt-4 flex items-center gap-2 cursor-pointer select-none w-fit">
                              <input type="checkbox" checked={bankApiRemember} onChange={toggleBankApiRemember} className="w-4 h-4 accent-[#1bc5bd] cursor-pointer" />
                              <span className="text-xs font-bold text-slate-700">Beni Hatırla</span>
                              <span className="text-[10px] font-medium text-gray-400">(Banka, IBAN, API Key ve Secret kaydedilir; bir daha girmeniz gerekmez)</span>
                          </label>

                          {/* Kontrol butonları */}
                          <div className="mt-6 flex flex-wrap gap-3">
                              {!bankApiConnected ? (
                                  <button onClick={handleBankApiConnect} disabled={bankApiStatus === 'connecting'} className="bg-[#1bc5bd] hover:bg-teal-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-teal-500/30 transition-colors flex items-center gap-2">
                                      {bankApiStatus === 'connecting' ? <><RefreshCcw size={16} className="animate-spin"/> Bağlanılıyor...</> : <><Key size={16}/> Bankaya Bağlan</>}
                                  </button>
                              ) : (
                                  <>
                                      <button onClick={fetchBankTransactionsOnce} disabled={bankApiFetching} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                                          {bankApiFetching ? <><RefreshCcw size={16} className="animate-spin"/> Çekiliyor...</> : <><RefreshCcw size={16}/> Hesap Hareketlerini Çek</>}
                                      </button>
                                      <button onClick={handleBankApiDisconnect} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors">Bağlantıyı Kes</button>
                                  </>
                              )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-3">Güvenlik: API bilgileriniz yalnızca banka bağlantısı için kullanılır. Canlı ortamda hareketler bankanın resmî API'sinden güvenli sunucu üzerinden çekilir.</p>
                      </div>

                      {/* Canlı hareketler tablosu */}
                      {(() => {
                        // GÜNCELLENDİ: TÜM hareketler (gelen + giden) gösterilir. Varsayılan SON 3 GÜN, en yeni tarih/saat üstte.
                        const _fromT = bankTxFrom ? new Date(bankTxFrom + 'T00:00:00').getTime() : null;
                        const _toT = bankTxTo ? new Date(bankTxTo + 'T23:59:59').getTime() : null;
                        const _delSetView = new Set((deletedBankTxIds || []).map(String));
                        // Yön: kayıtta direction yoksa açıklamadan/tutardan çıkarılır (eski kayıtlar için)
                        const dirOf = (tx) => tx.direction ? tx.direction : ((Number(tx.amount) < 0 || isOutgoingBankDesc(tx.description)) ? 'out' : 'in');
                        // Bankadan gelen orijinal sıra (liste sırası) — aynı gün içinde TERS sıralama için kullanılır.
                        const _idxMap = new Map(bankApiTransactions.map((t, i) => [t.id, i]));
                        const visibleTx = bankApiTransactions
                          .filter(tx => {
                              if (_delSetView.has(String(tx.id))) return false; // silinenler görünmez
                              // YENİ: GİDEN PARA hareketleri listede HİÇ gösterilmez (yalnızca hesaba giren para).
                              // Ek güvence: yön bilgisi hatalı gelse bile EKSİ tutarlı hiçbir satır gösterilmez.
                              if (Number(tx.amount) < 0) return false;
                              if (dirOf(tx) === 'out') return false;
                              // YENİ: Hesaplar arası virman ve öğrenilmiş kalıplar gösterilmez.
                              if (isTransferDesc(tx.description) || isLearnedIgnored(tx.description)) return false;
                              const t = new Date(tx.rawDate).getTime();
                              if (!isNaN(t)) { if (_fromT !== null && t < _fromT) return false; if (_toT !== null && t > _toT) return false; }
                              if (bankTxStatusFilter === 'in') return dirOf(tx) === 'in';
                              if (bankTxStatusFilter === 'out') return dirOf(tx) === 'out';
                              if (bankTxStatusFilter === 'tahsilat') return !tx.processed && tx.status === 'tahsilat';
                              if (bankTxStatusFilter === 'askida') return !tx.processed && tx.status === 'askida';
                              if (bankTxStatusFilter === 'matched') return !!tx.matchedCustomerName;
                              if (bankTxStatusFilter === 'unmatched') return !tx.matchedCustomerName;
                              return true;
                          })
                          .slice()
                          // GÜNCELLENDİ: Gün sırası en yeni tarih üstte; AYNI GÜN içinde ise bankadan gelen
                          // sıralamanın TERSİ uygulanır — yani günün EN SON ödemesi en üstte görünür.
                          .sort((a, b) => {
                              const ta = Number(a.ts) || new Date(a.rawDate).getTime() || 0;
                              const tb = Number(b.ts) || new Date(b.rawDate).getTime() || 0;
                              const da = new Date(ta); const dbb = new Date(tb);
                              const dayA = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime();
                              const dayB = new Date(dbb.getFullYear(), dbb.getMonth(), dbb.getDate()).getTime();
                              if (dayB !== dayA) return dayB - dayA;            // gün: en yeni üstte
                              if (tb !== ta) return tb - ta;                     // aynı gün, gerçek saat varsa geç olan üstte
                              return (_idxMap.get(a.id) ?? 0) - (_idxMap.get(b.id) ?? 0) > 0 ? -1 : 1; // saat eşitse banka sırasının TERSİ
                          });
                        const setRange = (days) => { const to = new Date(); const from = new Date(Date.now() - days * 86400000); setBankTxTo(to.toISOString().split('T')[0]); setBankTxFrom(from.toISOString().split('T')[0]); };
                        return (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="p-5 border-b border-gray-100 flex flex-col gap-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2"><History size={18} className="text-[#1bc5bd]"/> Canlı Banka Hareketleri
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Yalnızca hesaba giren para</span>
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">{visibleTx.length} / {bankApiTransactions.length} hareket</span>
                              </div>
                            </div>
                            {/* YENİ: Filtreleme seçenekleri */}
                            <div className="flex flex-wrap items-end gap-2">
                              <div className="flex flex-col gap-0.5"><label className="text-[9px] font-bold text-gray-400 uppercase">Başlangıç</label>
                                <input type="date" value={bankTxFrom} onChange={(e) => setBankTxFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500" /></div>
                              <div className="flex flex-col gap-0.5"><label className="text-[9px] font-bold text-gray-400 uppercase">Bitiş</label>
                                <input type="date" value={bankTxTo} onChange={(e) => setBankTxTo(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500" /></div>
                              <div className="flex flex-col gap-0.5"><label className="text-[9px] font-bold text-gray-400 uppercase">Durum</label>
                                <select value={bankTxStatusFilter} onChange={(e) => setBankTxStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer">
                                  <option value="all">Tümü</option>
                                  <option value="tahsilat">Tahsilat (Cariye)</option>
                                  <option value="askida">Askıda</option>
                                  <option value="matched">Eşleşenler</option>
                                  <option value="unmatched">Eşleşmeyenler</option>
                                </select></div>
                              <div className="flex items-center gap-1.5 ml-auto">
                                {/* YENİ: Hangi aralık seçiliyse o düğme vurgulanır (varsayılan: Son 7 Gün) */}
                                {(() => {
                                  const _todayStr = new Date().toISOString().split('T')[0];
                                  const _dayStr = (d) => new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
                                  const _yearStart = `${new Date().getFullYear()}-01-01`;
                                  const _is = (d) => bankTxTo === _todayStr && bankTxFrom === _dayStr(d);
                                  const _isYear = bankTxTo === _todayStr && bankTxFrom === _yearStart;
                                  const act = 'text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100';
                                  const idle = 'text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 text-slate-600 hover:bg-gray-50';
                                  return (
                                    <>
                                      <button onClick={() => setRange(3)} className={_is(3) ? act : idle}>Son 3 Gün</button>
                                      <button onClick={() => setRange(7)} className={_is(7) ? act : idle}>Son 7 Gün</button>
                                      <button onClick={() => setRange(30)} className={_is(30) ? act : idle}>Son 30 Gün</button>
                                      <button onClick={() => { setBankTxFrom(_yearStart); setBankTxTo(_todayStr); }} className={_isYear ? act : idle}>Bu Sene</button>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm text-gray-600 min-w-[720px]">
                                  <thead className="bg-slate-50 border-b border-gray-200 font-bold text-gray-700 text-xs uppercase">
                                      <tr><th className="p-4">Tarih</th><th className="p-4">Açıklama</th><th className="p-4 text-right">Tutar</th><th className="p-4 text-center">Eşleşen Müşteri</th><th className="p-4 text-center">Durum</th><th className="p-4 text-center">İşlem</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {visibleTx.length === 0 ? (
                                          <tr><td colSpan="6" className="p-10 text-center text-gray-400 font-medium">{bankApiTransactions.length > 0 ? 'Seçilen filtrede hareket yok. Tarih aralığını genişletin veya "Tümü" deyin.' : (bankApiFetching ? 'Banka hareketleri çekiliyor...' : 'Henüz hareket yok. Bağlanıp "Hesap Hareketlerini Çek" butonuna basın.')}</td></tr>
                                      ) : visibleTx.map((tx, _i) => {
                                          const _dir = dirOf(tx);
                                          const _isOut = _dir === 'out';
                                          // YENİ: GÜN GEÇİŞİ — önceki satırdan farklı bir güne geçildiğinde kalın ayırıcı çizgi
                                          const _prev = _i > 0 ? visibleTx[_i - 1] : null;
                                          const _dayChanged = _prev && _prev.date !== tx.date;
                                          // YENİ: Müşterinin carisinde AYNI GÜN + AYNI TUTAR ödeme var mı?
                                          const _alreadyPaid = !_isOut && tx.matchedCustomerId && hasSameDayAmountPayment(tx.matchedCustomerId, bankTxDateISO(tx), tx.amount);
                                          // YENİ: Aynı gün ödeme var ama TUTAR FARKLI mı? (ör. aynı gün 21.240 TL tahsilat, bu hareket 240 TL)
                                          const _sameDayDifferent = !_alreadyPaid && !_isOut && tx.matchedCustomerId && hasSameDayPayment(tx.matchedCustomerId, bankTxDateISO(tx));
                                          return (
                                          <tr key={tx.id} className={`hover:bg-gray-50 ${tx.processed ? 'opacity-60' : ''} ${_isOut ? 'bg-rose-50/40' : ''} ${_dayChanged ? 'border-t-4 border-slate-300' : ''}`}>
                                              <td className="p-3 font-semibold text-gray-700 whitespace-nowrap text-xs align-top">
                                                  {tx.date}
                                                  {/* YENİ: Bankadan gelen veriye göre yön etiketi */}
                                                  <span className={`block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded w-fit ${_isOut ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>{_isOut ? 'GİDEN PARA' : 'GELEN PARA'}</span>
                                              </td>
                                              {/* YENİ: Açıklama en fazla 4 SATIR gösterilir */}
                                              <td className="p-3 font-medium text-gray-600 align-top" title={tx.description}>
                                                  <span className="block text-[11px] leading-snug break-words" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '320px' }}>{tx.description}</span>
                                              </td>
                                              <td className={`p-3 text-right font-extrabold text-xs whitespace-nowrap align-top ${_isOut ? 'text-rose-600' : 'text-green-600'}`}>{_isOut ? '-' : '+'}{Math.abs(Number(tx.amount)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                                              <td className="p-3 text-center align-top">
                                                  {tx.matchedCustomerName ? (
                                                      <div className="flex items-center justify-center gap-1">
                                                          <span className="text-[11px] font-bold text-gray-800">{tx.matchedCustomerName}</span>
                                                          {!tx.processed && !_isOut && (
                                                              <button onClick={() => setMatchEditTxId(matchEditTxId === tx.id ? null : tx.id)} className="text-indigo-500 hover:text-indigo-700 p-0.5" title="Cariyi değiştir"><Edit size={12}/></button>
                                                          )}
                                                      </div>
                                                  ) : (
                                                      <div className="flex items-center justify-center gap-1">
                                                          <span className="text-[11px] text-gray-400 italic">{_isOut ? '—' : 'Eşleşmedi'}</span>
                                                          {/* YENİ: Eşleşmeyen tahsilata elle cari seçme */}
                                                          {!tx.processed && !_isOut && (
                                                              <button onClick={() => setMatchEditTxId(matchEditTxId === tx.id ? null : tx.id)} className="text-indigo-500 hover:text-indigo-700 p-0.5" title="Cari seç"><Edit size={12}/></button>
                                                          )}
                                                      </div>
                                                  )}
                                                  {matchEditTxId === tx.id && !tx.processed && !_isOut && (
                                                      <select autoFocus defaultValue="" onChange={(e) => assignBankTxCustomer(tx.id, e.target.value)} className="mt-1 w-full max-w-[190px] border-2 border-indigo-200 rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer">
                                                          <option value="">— Cari Seç —</option>
                                                          {[...customers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                      </select>
                                                  )}
                                              </td>
                                              <td className="p-3 text-center align-top">
                                                  {tx.processed ? (
                                                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-500">İŞLENDİ</span>
                                                  ) : (
                                                      <select value={tx.status} onChange={(e) => setBankTxStatus(tx.id, e.target.value)} className={`text-[11px] font-bold rounded-lg px-2 py-1.5 border focus:outline-none ${tx.status === 'tahsilat' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                          <option value="tahsilat">Tahsilat (Cariye)</option>
                                                          <option value="askida">Askıya Al</option>
                                                      </select>
                                                  )}
                                                  {/* YENİ: Tahsilat durumu bildirimi — 3 durum:
                                                      • Aynı gün + AYNI tutar ödeme varsa → "Tahsilat Yapılmış" (yeşil)
                                                      • Aynı gün ödeme var ama TUTAR FARKLI ise → "Farklı Tahsilat Var" (turuncu)
                                                      • O gün hiç ödeme yoksa → "Tahsilat Yapılmamış" (kırmızı) */}
                                                  {!_isOut && tx.status === 'tahsilat' && (
                                                      <span className={`block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mx-auto ${_alreadyPaid ? 'bg-green-100 text-green-700 border border-green-200' : _sameDayDifferent ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                          {_alreadyPaid ? 'Tahsilat Yapılmış' : _sameDayDifferent ? 'Farklı Tahsilat Var' : 'Tahsilat Yapılmamış'}
                                                      </span>
                                                  )}
                                              </td>
                                              <td className="p-3 text-center align-top">
                                                  {!tx.processed ? (
                                                      <div className="flex items-center justify-center gap-1.5">
                                                          <button onClick={() => { if (tx.status === 'tahsilat' && _alreadyPaid) { setDupWarnTx(tx); return; } processBankTx(tx.id); }} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors shadow-sm">İşle</button>
                                                          <button onClick={() => removeBankTx(tx.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors"><Trash2 size={14}/></button>
                                                      </div>
                                                  ) : (
                                                      /* YENİ: İşlendikten SONRA düzenleme — duruma göre cariye/askıya alınabilir veya silinebilir */
                                                      <div className="flex items-center justify-center gap-1.5">
                                                          <button onClick={() => { if(!window.confirm('Bu hareketin işlemini geri alıp yeniden düzenlemek istiyor musunuz?\n\nNot: Daha önce cariye/askıya işlenen kayıt sistemde kalır; gerekiyorsa ilgili ekrandan da düzeltmelisiniz.')) return; setBankApiTransactions(prev => prev.map(t => String(t.id) === String(tx.id) ? { ...t, processed: false } : t)); }} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors" title="Düzenle (işlemi geri al)"><Edit size={14}/></button>
                                                          <button onClick={() => removeBankTx(tx.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors"><Trash2 size={14}/></button>
                                                      </div>
                                                  )}
                                              </td>
                                          </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                        );
                      })()}
                  </div>
              )}
            </div>
      )}

      {activeMenu === 'aylik-odeme' && (
            <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
                <div>
                  <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Tahsilat Panosu</h1>
                  <h2 className="text-2xl font-bold text-slate-800">Aylık Borç Takip</h2>
                  <p className="text-sm text-gray-500 mt-1">Carisinde borcu bulunan müşteriler, gecikme durumları ve ödeme sözü notları.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400" /></div>
                        <input type="text" placeholder="Müşteri Adı Ara..." value={debtSearchTerm} onChange={(e) => setDebtSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50 shadow-sm font-medium" />
                    </div>
                    <select value={debtMonthFilter} onChange={(e) => setDebtMonthFilter(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 font-bold text-slate-700 shadow-sm cursor-pointer">
                        <option value="all">Tüm Aylık Borçlular</option>
                        <option value="m1">1 Aylık Borçlular</option>
                        <option value="m2">2 Aylık Borçlular</option>
                        <option value="m3">3 Aylık Borçlular</option>
                        <option value="m4">4 Aylık Borçlular</option>
                        <option value="m5+">5 Ay ve Üzeri Borçlular</option>
                    </select>
                    {/* YENİ EKLENEN: Tahsilat durumu / Yeni Eklenen filtresi */}
                    <select value={debtPaymentFilter} onChange={(e) => setDebtPaymentFilter(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 font-bold text-slate-700 shadow-sm cursor-pointer">
                        <option value="new">Tüm Tahsilatsızlar</option>
                        <option value="1">1 Aydır Tahsilat Yok</option>
                        <option value="2">2 Aydır Tahsilat Yok</option>
                        <option value="3">3 Aydır Tahsilat Yok</option>
                        <option value="4">4 Aydır Tahsilat Yok</option>
                        <option value="5+">5+ Aydır Tahsilat Yok</option>
                        <option value="none">Hiç Tahsilat Olmayanlar</option>
                    </select>
                    {/* YENİ: Ödeme Sözü Aldıklarım — sadece ödeme sözü verilen müşterileri gösterir/gizler */}
                    <button onClick={() => setShowOnlyPromises(v => !v)} className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5 border ${showOnlyPromises ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-200 text-slate-700 hover:bg-amber-50'}`} title="Sadece ödeme sözü aldıklarımı göster">
                        <Calendar size={15}/> Ödeme Sözü Aldıklarım
                    </button>
                </div>
              </div>

              <div className="flex-1 pb-10">
                 {(() => {
                      const debtors = customers.map(customer => {
                          const customerRooms = rooms.filter(r => r.customerName === customer.name);
                          const { ledger, balance: finalBalance } = getCustomerLedger(customer);

                          // YENİ EKLENDİ: En yüksek kira yerine müşterinin "Toplam Aylık Kirası" baz alınır
                          let totalMonthlyRent = 0;
            
                          customerRooms.forEach(room => {
                              const baseAmt = Number(room.monthlyFee || 0);
                              const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
                              // DÜZELTME: KDV çarpımı float hatası üretiyordu (6600 yerine 6599,99...). Yuvarlıyoruz.
                              const monthlyTotal = Math.round(hasKdv ? baseAmt * 1.20 : baseAmt);
                              totalMonthlyRent += monthlyTotal;
                          });
            
                          // DÜZELTME: Kalan cari borç / güncel aylık kira → EN YAKIN tam aya YUVARLANIR (Math.round),
                          // borç varsa en az 1 ay. (Eski Math.ceil float yüzünden 2 yerine 3 gösteriyordu.)
                          // Örn: 13.200/6.600=2 → 2 ay | 12.000/10.000=1,2 → 1 ay | 20.000/10.000=2 → 2 ay | 4.800/6.000=0,8 → 1 ay.
                          // Tahsilat yapıldıkça kalan bakiyeye göre otomatik revize olur.
                          let monthsOwed = 0;
                          if (finalBalance > 0) {
                              if (totalMonthlyRent > 0) {
                                  monthsOwed = Math.max(1, Math.round(finalBalance / totalMonthlyRent));
                              } else {
                                  // Müşterinin aktif odası yok ama geçmişten kalan borcu varsa
                                  monthsOwed = 1; 
                              }
                          }

                          // YENİ EKLENEN: Faiz durumu — cari hesabında (ledger) faiz hareketi işlenmiş mi?
                          // Faiz işlemi açıldıktan ve müşterinin carisine faiz işlendikten sonra durum "başladı" olur.
                          const interestApplied = Array.isArray(ledger) && ledger.some(tx => tx.isInterest);

                          // YENİ EKLENEN: Kaç aydır tahsilat (ödeme) girişi yapılmadığı hesabı.
                          // Son ödeme tarihinden bugüne kadar geçen ay sayısı. Tahsilat girişi olunca otomatik sıfırlanır.
                          const payments = customer.payments || [];
                          let monthsSincePayment = null; // null = hiç ödeme yok
                          let lastPaymentDateStr = null;
                          if (payments.length > 0) {
                              const lastPaymentTime = Math.max(...payments.map(p => new Date(p.date).getTime()).filter(t => !isNaN(t)));
                              if (isFinite(lastPaymentTime)) {
                                  const lastD = new Date(lastPaymentTime);
                                  lastPaymentDateStr = lastD.toLocaleDateString('tr-TR');
                                  const now = new Date();
                                  monthsSincePayment = (now.getFullYear() - lastD.getFullYear()) * 12 + (now.getMonth() - lastD.getMonth());
                                  if (monthsSincePayment < 0) monthsSincePayment = 0;
                              }
                          }
            
                          // YENİ EKLENEN: "Yeni Eklenen" sıralaması için müşterinin en son borç ekleme zamanı.
                          // Ledger'daki borç (debt) hareketlerinin ve manuel ek borçların en yeni tarihini alır.
                          let lastDebtTime = 0;
                          if (Array.isArray(ledger)) {
                              ledger.forEach(tx => {
                                  if (tx.debt > 0) {
                                      const t = new Date(tx.date).getTime();
                                      if (!isNaN(t) && t > lastDebtTime) lastDebtTime = t;
                                  }
                              });
                          }
                          (customer.extraDebts || []).forEach(d => {
                              const t = new Date(d.date).getTime();
                              if (!isNaN(t) && t > lastDebtTime) lastDebtTime = t;
                          });

                          return {
                              ...customer,
                              totalDebt: finalBalance,
                              totalMonthlyRent,
                              roomsCount: customerRooms.length,
                              monthsOwed,
                              interestApplied,
                              monthsSincePayment,
                              lastPaymentDateStr,
                              lastDebtTime
                          };
                      }).filter(c => c.totalDebt > 0)
                      // YENİ: İcra sürecinde odası olan müşteriler bu listede GÖSTERİLMEZ —
                      // onların borç takibi "İcra Odaları" sayfasından yapılır.
                      .filter(c => !rooms.some(r => r.customerName === c.name && r.isUnderLegalAction));

                      let filteredDebtors = debtors.filter(c => c.name.toLowerCase().includes(debtSearchTerm.toLowerCase()));

                      // YENİ: Aylık borç sayısına (toplam borç / aylık kira) göre filtreleme. Tahsilat yaptıkça revize olur.
                      if (debtMonthFilter === 'm1') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsOwed === 1);
                      } else if (debtMonthFilter === 'm2') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsOwed === 2);
                      } else if (debtMonthFilter === 'm3') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsOwed === 3);
                      } else if (debtMonthFilter === 'm4') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsOwed === 4);
                      } else if (debtMonthFilter === 'm5+') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsOwed >= 5);
                      }
                      // "all" (Tüm Aylık Borçlular) seçiliyken tüm borçlular gösterilir.
                      // YENİ: "Ödeme Sözü Aldıklarım" aktifse yalnızca ödeme sözü (promiseDate'li not) olan müşteriler kalır.
                      if (showOnlyPromises) {
                          filteredDebtors = filteredDebtors.filter(c => Array.isArray(c.collectionNotes) && c.collectionNotes.some(n => n && n.promiseDate));
                      }

                      // YENİ EKLENEN: Kaç aydır tahsilat yok / Yeni Eklenen filtresi
                      if (debtPaymentFilter === '1') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsSincePayment === 1);
                      } else if (debtPaymentFilter === '2') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsSincePayment === 2);
                      } else if (debtPaymentFilter === '3') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsSincePayment === 3);
                      } else if (debtPaymentFilter === '4') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsSincePayment === 4);
                      } else if (debtPaymentFilter === '5+') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsSincePayment !== null && c.monthsSincePayment >= 5);
                      } else if (debtPaymentFilter === 'none') {
                          filteredDebtors = filteredDebtors.filter(c => c.monthsSincePayment === null);
                      }
                      // 'new' (Yeni Eklenen) seçiliyken tüm borçlular kalır, aşağıda en son borç eklenene göre sıralanır.

                      // YENİ EKLENEN: Toplam borcu hesapla
                      const grandTotalDebt = filteredDebtors.reduce((sum, c) => sum + c.totalDebt, 0);
                      const totalDebtorCount = filteredDebtors.length;

                      if (filteredDebtors.length === 0) return (<div className="text-center py-20 w-full"><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 shadow-sm"><Wallet size={32} /></div><h3 className="text-lg font-bold text-gray-600 mb-1">Borçlu Kaydı Bulunmuyor</h3><p className="text-sm text-gray-400 max-w-sm mx-auto">Seçilen kriterlere uygun, cari borcu bulunan bir müşteri bulunamadı.</p></div>);

                      return (
                          <div className="flex flex-col gap-6">
                              {/* YENİ EKLENEN: TOPLAM BORÇ BİLGİ KARTI */}
                              <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between shadow-sm">
                                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm border border-red-100 shrink-0">
                                          <AlertCircle size={28} strokeWidth={2.5}/>
                                      </div>
                                      <div>
                                          <h3 className="text-red-800 font-bold text-lg leading-tight">Toplam Bekleyen Alacak</h3>
                                          <p className="text-red-600/80 text-sm font-medium mt-0.5">Aşağıda listelenen <strong>{totalDebtorCount}</strong> müşterinin toplam cari borcu.</p>
                                      </div>
                                  </div>
                                  <div className="text-3xl sm:text-4xl font-black text-red-600 tracking-tight whitespace-nowrap">
                                      {grandTotalDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-xl font-bold">TL</span>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                  {/* YENİ EKLENEN: "Ödeme Sözü Aldıklarım" aktifken özel sıralama —
                                      1) Bugün sözü olanlar, 2) Süresi geçenler (az günden çok güne), 3) Yaklaşanlar (en yakından en uzağa).
                                      Diğer filtrelerde mevcut sıralama (en yeni borç / en yüksek borç) AYNEN korunur. */}
                                  {(showOnlyPromises ? filteredDebtors.slice().sort((a, b) => {
                                      const _getRank = (cust) => {
                                          const _pDates = [];
                                          (cust.collectionNotes || []).forEach(n => { if (n && n.promiseDate) _pDates.push(String(n.promiseDate)); });
                                          (reminders || []).forEach(r => { if (r && r.type === 'promise' && !r.completed && r.customerName === cust.name && r.date) _pDates.push(String(r.date)); });
                                          if (_pDates.length === 0) return [3, 0]; // söz yok → en sona
                                          const _todayStr = new Date().toISOString().split('T')[0];
                                          const _future = _pDates.filter(d => d >= _todayStr).sort();
                                          const _target = _future.length > 0 ? _future[0] : _pDates.sort().slice(-1)[0];
                                          const _diffDays = Math.round((new Date(_target + 'T00:00:00').getTime() - new Date(_todayStr + 'T00:00:00').getTime()) / 86400000);
                                          if (_diffDays === 0) return [0, 0];                 // Bugün sözü olanlar
                                          if (_diffDays < 0) return [1, -_diffDays];           // Süresi geçenler: az günden çok güne
                                          return [2, _diffDays];                               // Yaklaşanlar: en yakından en uzağa
                                      };
                                      const [ra, va] = _getRank(a);
                                      const [rb, vb] = _getRank(b);
                                      return ra !== rb ? ra - rb : va - vb;
                                  }) : filteredDebtors.sort((a, b) => debtPaymentFilter === 'new' ? (b.lastDebtTime - a.lastDebtTime) : (b.totalDebt - a.totalDebt))).map((customer) => {
                                      // YENİ: Faiz durumu rengi
                                      const interestBadge = customer.interestApplied
                                          ? 'bg-red-500 text-white border-red-600'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                                      // YENİ: Kaç aydır tahsilat yok — renk kademesi (uzun süre → daha koyu uyarı)
                                      let noPayColor = 'bg-slate-100 text-slate-600 border-slate-200';
                                      if (customer.monthsSincePayment === null) {
                                          noPayColor = 'bg-gray-800 text-white border-gray-900';
                                      } else if (customer.monthsSincePayment >= 3) {
                                          noPayColor = 'bg-red-100 text-red-700 border-red-300';
                                      } else if (customer.monthsSincePayment >= 1) {
                                          noPayColor = 'bg-amber-100 text-amber-700 border-amber-300';
                                      } else {
                                          noPayColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                      }

                                      return (
                                          <div key={customer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                                              <div className="p-5 flex-1">
                                                  <h4 className="font-bold text-gray-800 text-lg mb-1 truncate cursor-pointer hover:text-red-500" onClick={() => setSelectedCustomerId(customer.id)}>{customer.name}</h4>
                                                  <div className="text-xs text-gray-500 font-medium mb-4 flex items-center gap-1"><Phone size={12}/> {customer.phone}</div>

                                                  {/* YENİ EKLENEN: Kaç aydır tahsilat girişi yapılmadığı bildirim şeridi */}
                                                  <div className={`mb-3 rounded-xl px-3 py-2 border flex items-center gap-2 ${noPayColor}`}>
                                                      <History size={16} className="shrink-0" />
                                                      <div className="leading-tight">
                                                          {customer.monthsSincePayment === null ? (
                                                              <>
                                                                  <div className="text-[11px] font-black uppercase tracking-wide">Hiç Tahsilat Yok</div>
                                                                  <div className="text-[10px] font-medium opacity-80">Bu müşteriden hiç ödeme alınmamış</div>
                                                              </>
                                                          ) : customer.monthsSincePayment === 0 ? (
                                                              <>
                                                                  <div className="text-[11px] font-black uppercase tracking-wide">Bu Ay Tahsilat Alındı</div>
                                                                  <div className="text-[10px] font-medium opacity-80">Son ödeme: {customer.lastPaymentDateStr}</div>
                                                              </>
                                                          ) : (
                                                              <>
                                                                  <div className="text-[11px] font-black uppercase tracking-wide">{customer.monthsSincePayment} Aydır Tahsilat Yok</div>
                                                                  <div className="text-[10px] font-medium opacity-80">Son ödeme: {customer.lastPaymentDateStr}</div>
                                                              </>
                                                          )}
                                                      </div>
                                                  </div>

                                                  <div className="flex flex-wrap gap-2 mb-4">
                                                      {/* YENİ: "X Ay Gecikme" yerine Faiz Durumu */}
                                                      <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm flex items-center gap-1 ${interestBadge}`}>
                                                          <AlertCircle size={10} /> {customer.interestApplied ? 'Faiz Başladı' : 'Faiz Başlamadı'}
                                                      </span>
                                                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-sm flex items-center gap-1">
                                                          <Box size={10} /> {customer.roomsCount} Oda
                                                      </span>
                                                      {/* YENİ: Kaç AYLIK borcu olduğu (toplam cari borç / aylık kira). Tahsilat yapıldıkça otomatik revize olur. */}
                                                      {customer.monthsOwed > 0 && (
                                                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm flex items-center gap-1">
                                                              <AlertCircle size={10} /> {customer.monthsOwed} Aylık Borcu Var
                                                          </span>
                                                      )}
                                                      {/* YENİ EKLENEN: ÖDEME SÖZÜ SAYACI — notlardaki (Söz) tarihleri ve Hatırlatma
                                                          takvimindeki açık "Ödeme Sözü" kayıtları birlikte taranır. En yakın gelecek
                                                          söz varsa geri sayım; yoksa en son verilen sözün kaç gün geçtiği gösterilir. */}
                                                      {(() => {
                                                          const _pDates = [];
                                                          (customer.collectionNotes || []).forEach(n => { if (n && n.promiseDate) _pDates.push(String(n.promiseDate)); });
                                                          (reminders || []).forEach(r => { if (r && r.type === 'promise' && !r.completed && r.customerName === customer.name && r.date) _pDates.push(String(r.date)); });
                                                          if (_pDates.length === 0) return null;
                                                          const _todayStr = new Date().toISOString().split('T')[0];
                                                          const _future = _pDates.filter(d => d >= _todayStr).sort();
                                                          const _target = _future.length > 0 ? _future[0] : _pDates.sort().slice(-1)[0];
                                                          const _diffDays = Math.round((new Date(_target + 'T00:00:00').getTime() - new Date(_todayStr + 'T00:00:00').getTime()) / 86400000);
                                                          const _lbl = _diffDays > 0 ? `Ödeme sözüne ${_diffDays} gün kaldı` : (_diffDays === 0 ? 'Bugün ödeme sözü var' : `Ödeme sözü ${Math.abs(_diffDays)} gün geçti`);
                                                          // GÜNCELLENDİ: Duruma göre renk + YANIP SÖNEN (animate-pulse) rozet —
                                                          // Söze VAR (kaldı) → PEMBE, söz BUGÜN → SARI, söz GEÇTİ → KIRMIZI.
                                                          const _cls = _diffDays > 0
                                                              ? 'bg-pink-500 text-white border-pink-600 animate-pulse'
                                                              : _diffDays === 0
                                                                  ? 'bg-yellow-400 text-yellow-900 border-yellow-500 animate-pulse'
                                                                  : 'bg-red-600 text-white border-red-700 animate-pulse';
                                                          return (
                                                              <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-md flex items-center gap-1 ${_cls}`} title={`Söz tarihi: ${new Date(_target + 'T00:00:00').toLocaleDateString('tr-TR')}`}>
                                                                  <Clock size={10} /> {_lbl}
                                                              </span>
                                                          );
                                                      })()}
                                                  </div>

                                                  <div className="bg-red-50 rounded-xl p-3 border border-red-100 mb-4">
                                                      <div className="text-[10px] font-bold text-red-400 uppercase mb-0.5">Toplam Cari Borç</div>
                                                      <div className="text-2xl font-black text-red-600">{customer.totalDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-sm font-bold">TL</span></div>
                                                  </div>
                                                  
                                                  {customer.collectionNotes && customer.collectionNotes.length > 0 ? (
                                                      <div className="mb-4">
                                                          <div className="flex justify-between items-center mb-2">
                                                              <h4 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><History size={12}/> Tahsilat Notları</h4>
                                                              <div className="flex items-center gap-1.5">{/* YENİ EKLENEN: Müşteri sözünü tutmayıp YENİ söz verdiğinde tek tıkla yeni tarih + not girilir; kayıt hem kartta hem Hatırlatma takviminde görünür. */}
                                                              <button onClick={() => { setCollectionNoteData({ customerId: customer.id, text: 'Müşteri yeni ödeme sözü verdi.', promiseDate: '' }); setIsCollectionNoteModalOpen(true); }} className="text-amber-700 hover:text-amber-800 p-1 flex items-center gap-1 bg-amber-100 rounded px-2 py-0.5 text-[9px] font-bold border border-amber-300 shadow-sm" title="Yeni Ödeme Sözü Gir (yeni tarih + not)"><Calendar size={10}/> Yeni Söz</button>
                                                              <button onClick={() => { setCollectionNoteData({ customerId: customer.id, text: '', promiseDate: '' }); setIsCollectionNoteModalOpen(true); }} className="text-yellow-600 hover:text-yellow-700 p-1 flex items-center gap-1 bg-yellow-50 rounded px-2 py-0.5 text-[9px] font-bold border border-yellow-200 shadow-sm"><Plus size={10}/> Not Ekle</button></div>
                                                          </div>
                                                          <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                                                              {customer.collectionNotes.map((note, idx) => (
                                                                  <div key={note.id || idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 relative shadow-inner shrink-0">
                                                                      <div className="flex justify-between items-start mb-1">
                                                                          <span className="text-[9px] font-bold text-yellow-700">Not {idx + 1}</span>
                                                                          <div className="flex items-center gap-1.5">
                                                                             <span className="text-[9px] text-gray-400">{note.date}{note.editedAt ? ' • düzenlendi' : ''}</span>
                                                                             {/* YENİ: Notu düzenle — yanlış girilen not sonradan değiştirilebilir */}
                                                                             <button onClick={() => { setCollectionNoteData({ customerId: customer.id, isEdit: true, editId: note.id ?? null, editIndex: idx, text: note.text, promiseDate: note.promiseDate || '' }); setIsCollectionNoteModalOpen(true); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded p-0.5 border border-blue-200 transition-colors" title="Notu Düzenle"><Edit size={10}/></button>
                                                                          </div>
                                                                      </div>
                                                                      <p className="text-xs text-gray-700 italic">"{note.text}"</p>
                                                                      {note.promiseDate && (
                                                                          <div className="mt-1.5 text-[10px] font-bold text-orange-600 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-yellow-200 w-max">
                                                                              <Calendar size={10}/> Söz: {new Date(note.promiseDate).toLocaleDateString('tr-TR')}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  ) : (
                                                      <div className="mb-4">
                                                          <div className="flex justify-between items-center mb-2">
                                                              <h4 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><History size={12}/> Tahsilat Notları</h4>
                                                              <div className="flex items-center gap-1.5">{/* YENİ EKLENEN: Müşteri sözünü tutmayıp YENİ söz verdiğinde tek tıkla yeni tarih + not girilir; kayıt hem kartta hem Hatırlatma takviminde görünür. */}
                                                              <button onClick={() => { setCollectionNoteData({ customerId: customer.id, text: 'Müşteri yeni ödeme sözü verdi.', promiseDate: '' }); setIsCollectionNoteModalOpen(true); }} className="text-amber-700 hover:text-amber-800 p-1 flex items-center gap-1 bg-amber-100 rounded px-2 py-0.5 text-[9px] font-bold border border-amber-300 shadow-sm" title="Yeni Ödeme Sözü Gir (yeni tarih + not)"><Calendar size={10}/> Yeni Söz</button>
                                                              <button onClick={() => { setCollectionNoteData({ customerId: customer.id, text: '', promiseDate: '' }); setIsCollectionNoteModalOpen(true); }} className="text-yellow-600 hover:text-yellow-700 p-1 flex items-center gap-1 bg-yellow-50 rounded px-2 py-0.5 text-[9px] font-bold border border-yellow-200 shadow-sm"><Plus size={10}/> Not Ekle</button></div>
                                                          </div>
                                                          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center opacity-70">
                                                              <p className="text-[10px] text-gray-400 font-medium">Kayıtlı not bulunmuyor.</p>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                              
                                              <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto flex flex-col gap-2">
                                                  <div className="grid grid-cols-2 gap-2">
                                                      <a href={`tel:+90${customer.phone}`} className="bg-white hover:bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-gray-200" title="Telefonla Ara">
                                                          <Phone size={14}/> Ara
                                                      </a>
                                                      <button onClick={() => handleOpenMessageModal(customer, customer.totalDebt, 'reminder')} className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-blue-500/30" title="Ödeme Hatırlat">
                                                          <MessageCircle size={14}/> Hatırlat
                                                      </button>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-2">
                                                      <button onClick={() => handleOpenMessageModal(customer, customer.totalDebt, 'warning')} className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-orange-500/30" title="Uyarı Mesajı At">
                                                          <AlertCircle size={14}/> Uyarı
                                                      </button>
                                                      <button onClick={() => handleOpenMessageModal(customer, customer.totalDebt, 'eviction')} className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm shadow-red-500/30" title="Tahliye İhtarı Çek">
                                                          <Trash2 size={14}/> Tahliye İhtarı
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                 })()}
              </div>
            </div>
      )}

      {activeMenu === 'tahsilat-hareketleri' && (
            <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans</h1>
                  <h2 className="text-2xl font-bold text-slate-800">Tahsilat Hareketleri</h2>
                  <p className="text-sm text-gray-500 mt-1">Müşterilerden alınan tüm ödemelerin ve tahsilatların listesi.</p>
                </div>
              </div>

              {(() => {
                  // Tüm tahsilatları topla
                  let allCollections = [];
                  customers.forEach(c => {
                      if (c.payments && c.payments.length > 0) {
                          c.payments.forEach(p => {
                              allCollections.push({
                                  id: p.id,
                                  createdAt: p.createdAt, // YENİ: sisteme giriş anı (varsa)
                                  customerId: c.id,
                                  customerName: c.name,
                                  customerNo: c.customerNo,
                                  amount: Number(p.amount),
                                  date: p.date,
                                  note: p.note || '-',
                                  hasEInvoice: p.hasEInvoice,
                                  eInvoiceNo: p.eInvoiceNo
                              });
                          });
                      }
                  });
                  
                  // İşlem sırasına (sisteme eklenme zamanı) göre yeniden eskiye sırala.
                  // Öncelik: createdAt (yeni kayıtlarda kesin giriş anı). Yoksa (eski kayıtlar) id'nin
                  // ilk 13 hanesi = Date.now() ms zaman damgasına düşülür; ham id "Date.now()+rastgele"
                  // birleştirmesinden dolayı tek başına güvenilir sıra vermiyordu.
                  const _collTs = (x) => {
                      if (x.createdAt != null && !isNaN(Number(x.createdAt))) return Number(x.createdAt);
                      const s = String(x.id || '');
                      return Number(s.slice(0, 13)) || 0;
                  };
                  allCollections.sort((a, b) => {
                      const t = _collTs(b) - _collTs(a);
                      if (t !== 0) return t;                          // en son giriş en üstte
                      const d = new Date(b.date) - new Date(a.date);  // eşitse tahsilat tarihine göre
                      if (d !== 0) return d;
                      return (Number(String(b.id)) || 0) - (Number(String(a.id)) || 0); // son çare: ham id
                  });

                  // Filtreleri uygula
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const filteredCollections = allCollections.filter(item => {
                      // İsim araması
                      if (collectionSearchTerm && !item.customerName.toLowerCase().includes(collectionSearchTerm.toLowerCase()) && !item.customerNo.includes(collectionSearchTerm)) {
                          return false;
                      }
       
                      // Tarih filtresi
                      if (collectionFilter === 'all') return true;
                      
                      const itemDate = new Date(item.date);
                      itemDate.setHours(0, 0, 0, 0);

                      // YENİ EKLENEN: Son gelenler — bugünden en az 2 ay öncesine kadar olan tahsilatlar
                      if (collectionFilter === 'recent') {
                          const twoMonthsAgo = new Date(today);
                          twoMonthsAgo.setMonth(today.getMonth() - 2);
                          return itemDate >= twoMonthsAgo;
                      }
                      if (collectionFilter === 'today') {
                          return itemDate.getTime() === today.getTime();
                      }
                      if (collectionFilter === 'week') {
                          const weekAgo = new Date(today);
                          weekAgo.setDate(today.getDate() - 7);
                          return itemDate >= weekAgo;
                      }
                      if (collectionFilter === 'month') {
                          return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
                      }
                      if (collectionFilter === 'year') {
                          return itemDate.getFullYear() === today.getFullYear();
                      }
                      return true;
                  });

                  // Toplam tahsilatı hesapla
                  const totalCollected = filteredCollections.reduce((sum, item) => sum + item.amount, 0);

                  return (
                      <>
                          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center">
                              <div className="relative w-full sm:w-64">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400" /></div>
                                  <input type="text" placeholder="Müşteri Adı veya No..." value={collectionSearchTerm} onChange={(e) => setCollectionSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 shadow-sm font-medium" />
                              </div>
<div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm w-full sm:w-auto overflow-x-auto">
                                  <button onClick={() => setCollectionFilter('recent')} className={`px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap ${collectionFilter === 'recent' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Son Tahsilatlar</button>
                                  <button onClick={() => setCollectionFilter('today')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'today' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Bugün</button>
                                  <button onClick={() => setCollectionFilter('week')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'week' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Bu Hafta</button>
                                  <button onClick={() => setCollectionFilter('month')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'month' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Bu Ay</button>
                                  <button onClick={() => setCollectionFilter('year')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'year' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Bu Sene</button>
                              </div>
                          </div>

                          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                              <div className="overflow-x-auto flex-1">
                                  <table className="w-full text-left text-sm text-gray-600 min-w-[800px]">
                                      <thead className="bg-slate-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold sticky top-0">
                                          <tr>
                                              <th className="px-6 py-4">Tarih</th>
                                              <th className="px-6 py-4">Müşteri</th>
                                              <th className="px-6 py-4">Açıklama / Dekont Notu</th>
                                              <th className="px-6 py-4 text-right">Tahsilat Tutarı</th>
                                              <th className="px-6 py-4 text-center">İşlem</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {filteredCollections.length > 0 ? filteredCollections.map((tx) => {
                                              const d = new Date(tx.date);
                                              const dateStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                                              return (
                                                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-700">{dateStr}</td>
                                                      <td className="px-6 py-4">
                                                          <div className="font-bold text-gray-800 cursor-pointer hover:text-[#1bc5bd] hover:underline transition-colors" onClick={() => setSelectedCustomerId(tx.customerId)} title="Müşteri carisine git">{tx.customerName}</div>
                                                          <div className="text-[10px] text-gray-400 mt-0.5">No: {tx.customerNo}</div>
                                                      </td>
                                                      <td className="px-6 py-4 font-medium text-gray-600">{tx.note}</td>
                                                      <td className="px-6 py-4 text-right font-extrabold text-green-600 text-base">{tx.amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                                                      <td className="px-6 py-4 text-center">
                                                          <div className="flex items-center justify-center gap-2">
                                                              {tx.hasEInvoice ? (
                                                                  <div className="flex flex-col items-stretch gap-1">
                                                                      <button onClick={() => {
                                                                          // YENİ: "Faturayı Yükle" ile yüklenmiş bir dosya varsa onu aç (aynı dosya),
                                                                          // yoksa eski davranışa (sentetik e-arşiv görüntüle) geri dön.
                                                                          const cust = customers.find(c => c.id === tx.customerId);
                                                                          const uploaded = cust?.invoices?.find(inv => (tx.eInvoiceNo && inv.invoiceNo === tx.eInvoiceNo) || (inv.amount === tx.amount && inv.date === tx.date));
                                                                          if (uploaded && uploaded.file) { window.open(uploaded.file, '_blank'); }
                                                                          else { handleViewEInvoice(tx); }
                                                                      }} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm" title="Yüklenen faturayı görüntüle">
                                                                          <FileTextIcon size={14}/> Faturayı Gör
                                                                      </button>
                                                                      {/* YENİ EKLENEN: Fatura zaten başlatıldıysa, altında küçük "Faturayı Tekrar Başlat" butonu */}
                                                                      <button onClick={() => { setEInvoiceError(null); setEInvoiceModalData(tx); }} className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-colors flex items-center justify-center gap-1 shadow-sm" title="Fatura bilgilerini Paraşüt'e tekrar aktar">
                                                                          <RefreshCcw size={9}/> Tekrar Başlat
                                                                      </button>
                                                                  </div>
                                                              ) : (
                                                                  <button onClick={() => { setEInvoiceError(null); setEInvoiceModalData(tx); }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm" title="Fatura bilgilerini Paraşüt'e aktar (başlat)">
                                                                      <FileTextIcon size={14}/> Faturayı Başlat
                                                                  </button>
                                                              )}
                                                              {/* YENİ EKLENEN: Fatura yüklenmişse "Faturayı Paylaş", değilse "Faturayı Yükle" */}
                                                              {(() => {
                                                                  const cust = customers.find(c => c.id === tx.customerId);
                                                                  const uploaded = cust?.invoices?.find(inv => (tx.eInvoiceNo && inv.invoiceNo === tx.eInvoiceNo) || (inv.amount === tx.amount && inv.date === tx.date));
                                                                  if (uploaded && uploaded.file) {
                                                                      return (
                                                                          <button onClick={() => setShareInvoiceData({ customer: cust, fileUrl: uploaded.file, tx })} className="bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm" title="Yüklenen faturayı müşteriyle paylaş">
                                                                              <Share2 size={14}/> Faturayı Paylaş
                                                                          </button>
                                                                      );
                                                                  }
                                                                  return (
                                                                      <button onClick={() => setUploadInvoiceData(tx)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm" title="Paraşüt'te kestiğiniz faturayı yükleyip cariye kaydedin">
                                                                          <Upload size={14}/> Faturayı Yükle
                                                                      </button>
                                                                  );
                                                              })()}
                                                              {/* YENİ EKLENEN: Bu tahsilatı cariden kaldırıp Askıda Kalan Tahsilatlara gönder */}
                                                              <button onClick={() => handleSendPaymentToPending(tx.customerId, tx.id)} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm" title="Bu ödemeyi Askıda Kalan Tahsilatlara gönder">
                                                                  <Wallet size={14}/> Askıya Gönder
                                                              </button>
                       <button onClick={() => handlePrintInvoice(tx)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm" title="Tahsilat Makbuzu Yazdır">
                                                                  <Download size={14}/>
                                                              </button>
                                                              <button onClick={() => { if(!checkActionPerm('action-tahsilat-duzenle')) return; setEditCollectionData({...tx}); setIsEditCollectionModalOpen(true); }} className="bg-orange-50 hover:bg-orange-100 text-orange-600 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm" title="Düzenle">
                                                                  <Edit size={14}/>
                                                              </button>
                                                              <button onClick={() => { if(!checkActionPerm('action-tahsilat-sil')) return; handleDeleteCollection(tx.customerId, tx.id); }} className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm" title="Sil">
                                                                  <Trash2 size={14}/>
                                                              </button>
                                                              <button onClick={() => setSelectedCustomerId(tx.customerId)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap">
                                                                  Cariyi Gör
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                              );
                                          }) : (
                                              <tr>
                                                  <td colSpan="5" className="px-6 py-12 text-center">
                                                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><History size={24} className="text-gray-300" /></div>
                                                      <p className="text-gray-500 font-medium">Bu kriterlere uygun herhangi bir tahsilat kaydı bulunamadı.</p>
                                                  </td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </>
                  );
              })()}
            </div>
      )}

      {activeMenu === 'askida-kalan-odemeler' && (
             <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
               <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                   <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans</h1>
                   <h2 className="text-2xl font-bold text-slate-800">Askıda Kalan Tahsilatlar</h2>
                   <p className="text-sm text-gray-500 mt-1">Kime ait olduğu tespit edilemeyen, belirsiz gelen ödemelerin havuzu.</p>
                 </div>
                 {/* YENİ: Manuel askıda ödeme ekle */}
                 <button onClick={() => { setManualPendingData({ date: new Date().toISOString().split('T')[0], amount: '', note: '' }); setIsAddPendingModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-orange-500/30 transition-colors flex items-center gap-2 shrink-0"><Plus size={16}/> Manuel Ödeme Ekle</button>
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                  <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm text-gray-600 min-w-[800px]">
                          <thead className="bg-orange-50 border-b border-orange-100 text-xs uppercase text-orange-800 font-bold sticky top-0">
                              <tr>
                                  <th className="px-6 py-4">Tarih</th>
                                  <th className="px-6 py-4">Açıklama / Dekont Notu</th>
                                  <th className="px-6 py-4 text-right">Tahsilat Tutarı</th>
                                  <th className="px-6 py-4 text-center w-48">İşlem</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {pendingCollections.length > 0 ? pendingCollections.map((tx) => {
                                  const d = new Date(tx.date);
                                  let dateStr = '-';
                                  if (!isNaN(d.getTime())) {
                                      dateStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                                  }
                                  return (
                                      <tr key={tx.id} className="hover:bg-orange-50/30 transition-colors">
                                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-700">{dateStr}</td>
                                          <td className="px-6 py-4 font-medium text-gray-600">{tx.note || '-'}</td>
                                          <td className="px-6 py-4 text-right font-extrabold text-orange-600 text-base">{Number(tx.amount || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                                          <td className="px-6 py-4 text-center">
                                              <div className="flex items-center justify-center gap-2">
                                                  <button onClick={() => {
                                                      setAssignData({ paymentId: tx.id, customerId: '' });
                                                      setIsAssignModalOpen(true);
                                                  }} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">Cariye İşle</button>
                                                  <button onClick={() => {
                                                      if(!checkActionPerm('action-askida-duzenle')) return;
                                                      setEditPendingData({ ...tx });
                                                      setIsEditPendingModalOpen(true);
                                                  }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition-colors" title="Düzenle"><Edit size={16}/></button>
                                                  <button onClick={async () => {
                                                      if(!checkActionPerm('action-askida-sil')) return;
                                                      if (window.confirm('Bu tahsilatı kalıcı olarak silmek istediğinize emin misiniz?')) {
                                                          if (db && firebaseUser) {
                                                              try {
                                                                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(tx.id)));
                                                              } catch(e) { console.error("Askıdan Silme Hatası:", e); }
                                                          } else {
                                                              setPendingCollections(pendingCollections.filter(p => p.id !== tx.id));
                                                          }
                                                      }
                                                  }} className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition-colors" title="Sil"><Trash2 size={16}/></button>
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              }) : (
                                  <tr>
                                      <td colSpan="4" className="px-6 py-12 text-center">
                                          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3"><AlertCircle size={24} className="text-orange-300" /></div>
                                          <p className="text-gray-500 font-medium">Şu anda askıda bekleyen belirsiz bir tahsilat bulunmuyor.</p>
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
               </div>
             </div>
      )}

      {activeMenu === 'tahsilat-oranlari' && (
            <div className="max-w-5xl mx-auto pb-10 animate-in fade-in duration-300">
              <div className="mb-6">
                <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Ayarlar</h1>
                <h2 className="text-2xl font-bold text-slate-800">Tahsilat ve İşlem Oranları</h2>
                <p className="text-sm text-gray-500 mt-1">Sistem genelinde kullanılacak zam, faiz ve işlem ücretlerini buradan belirleyebilirsiniz. Daha sonraki güncellemelerde bu oranlar otomatik olarak cari hesaplamalara dahil edilecektir.</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Oda Zam Oranı */}
                     <div className="flex flex-col gap-2">
                         <label className="text-sm font-bold text-gray-700">Oda Zam Oranı (%)</label>
                         <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">Senesi dolan odalara "Zam Yap" denildiğinde sistemin önereceği varsayılan zam yüzdesi.</p>
                         <div className="relative">
                             <input type="number" value={collectionRates.roomIncreaseRate} onChange={(e) => setCollectionRates({...collectionRates, roomIncreaseRate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-bold text-slate-700" />
                             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                         </div>
                     </div>

                     {/* Oda Mühür Ücreti */}
                     <div className="flex flex-col gap-2">
                         <label className="text-sm font-bold text-gray-700">Oda Mühür Ücreti (TL)</label>
                         <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">Giriş-çıkış işlemlerinde yenilenen mühür için müşterinin cari hesabına yansıtılacak net mühür bedeli (+KDV).</p>
                         <div className="relative">
                             <input type="number" value={collectionRates.sealFee} onChange={(e) => setCollectionRates({...collectionRates, sealFee: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-bold text-slate-700" />
                             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">TL</span>
                         </div>
                         {collectionRates.sealFee && (
                           <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded w-max mt-1">Cariye Yansıyacak: {(Number(collectionRates.sealFee) * 1.20).toFixed(0)} TL (KDV Dahil)</span>
                         )}
                     </div>

                     {/* Cari Aylık Faiz Oranı */}
                     <div className="flex flex-col gap-2 md:col-span-2">
                         <div className="flex justify-between items-center">
                             <label className="text-sm font-bold text-gray-700">Cari Aylık Faiz Oranı (%)</label>
                             <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
                                 <button onClick={() => setCollectionRates({...collectionRates, isInterestActive: true, interestActivationDate: collectionRates.interestActivationDate || Date.now()})} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${collectionRates.isInterestActive ? 'bg-[#1bc5bd] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Aktif</button>
                                 <button onClick={() => setCollectionRates({...collectionRates, isInterestActive: false, interestActivationDate: null})} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!collectionRates.isInterestActive ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Pasif</button>
                             </div>
                         </div>
                         <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">Borcu 1 aydan fazla geciken müşteriler için aylık bazda uygulanacak gecikme faizi oranı. <strong className="text-red-500">ÖNEMLİ:</strong> Aktif edildiğinde faiz, her müşterinin <strong>SON TAHSİLATINDAN</strong> itibaren işler: borcunu tam kapatan müşterinin kapattığı döneme faiz işlemez; eksik/kısmi ödeme yaptıysa kalan bakiyeye son tahsilat tarihinden 30 gün geçtikten sonra, ilgili ayın oranıyla aylık faiz cariye yansır. Hiç tahsilatı yoksa güncel borç döneminin başından itibaren işler. Pasife alındığında ise yansıtılmış tüm faizler cari ekranlardan otomatik düşülür.</p>
                         <div className="relative md:w-1/2 pr-4 mt-2">
                             <input type="number" disabled={!collectionRates.isInterestActive} value={collectionRates.interestRate} onChange={(e) => setCollectionRates({...collectionRates, interestRate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-bold text-slate-700 disabled:bg-gray-100 disabled:opacity-60" />
                             <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                         </div>
                     </div>

                     {/* YENİ: YIL / AY BAZLI FAİZ ORANLARI — 2021'den itibaren her ay için ayrı oran girilebilir.
                         Boş bırakılan aylarda yukarıdaki genel oran kullanılır. Faiz, ilgili ayın oranıyla
                         kalan borç üzerine KDV'siz "ekstra faiz" olarak işlenir. */}
                     <div className="flex flex-col gap-3 md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                        <div>
                           <label className="text-sm font-bold text-gray-700">Yıl / Ay Bazlı Faiz Oranları</label>
                           <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">2021'den itibaren her ay için ayrı faiz oranı girebilirsiniz. Boş bırakılan aylarda yukarıdaki genel oran (%{collectionRates.interestRate}) kullanılır. Faiz, ilgili ayın oranıyla müşterinin <strong>kalan borcu</strong> üzerine <strong className="text-teal-600">KDV'siz (ekstra faiz)</strong> olarak aylık işlenir ve caride ayrı satır olarak gösterilir.</p>
                        </div>
                        {/* Yıl seçimi */}
                        <div className="flex flex-wrap gap-1.5">
                           {Array.from({ length: (new Date().getFullYear() + 1) - 2021 + 1 }, (_, i) => 2021 + i).map(y => (
                              <button key={y} type="button" onClick={() => setInterestRateYear(y)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${interestRateYear === y ? 'bg-[#1bc5bd] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{y}</button>
                           ))}
                        </div>
                        {/* Ay bazlı oran girişleri */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1">
                           {['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].map((mName, mIdx) => {
                              const mKey = `${interestRateYear}-${mIdx}`;
                              const val = (collectionRates.monthlyInterestRates || {})[mKey];
                              return (
                                 <div key={mKey} className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-gray-500">{mName} {interestRateYear}</label>
                                    <div className="relative">
                                       <input type="number" value={val ?? ''} onChange={(e) => setCollectionRates(prev => ({ ...prev, monthlyInterestRates: { ...(prev.monthlyInterestRates || {}), [mKey]: e.target.value } }))} placeholder={String(collectionRates.interestRate)} className="w-full border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-bold text-slate-700" />
                                       <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>

                  </div>
                  <div className="flex justify-end mt-10 border-t border-gray-100 pt-6">
<button onClick={handleSaveCollectionRates} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-teal-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                          <Check size={18} strokeWidth={3} /> Oranları Kaydet
</button>
                  </div>
              </div>
            </div>
      )}

      {/* YENİ EKLENEN: MANUEL ASKIDA ÖDEME EKLE MODALI */}
      {isAddPendingModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center relative">
              <h3 className="text-lg font-bold text-orange-600 mx-auto w-full text-center flex items-center justify-center gap-2"><Plus size={18}/> Manuel Askıda Ödeme Ekle</h3>
              <button onClick={() => setIsAddPendingModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tarih</label>
                <input type="date" value={manualPendingData.date} onChange={(e) => setManualPendingData({...manualPendingData, date: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 font-medium text-slate-700" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tutar (TL)</label>
                <input type="number" value={manualPendingData.amount} onChange={(e) => setManualPendingData({...manualPendingData, amount: e.target.value})} placeholder="Örn: 5000" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 font-medium text-slate-700" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Açıklama / Dekont Notu</label>
                <textarea value={manualPendingData.note} onChange={(e) => setManualPendingData({...manualPendingData, note: e.target.value})} rows={2} placeholder="Örn: Havale geldi, gönderen belirsiz" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 font-medium text-slate-700 resize-none" />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setIsAddPendingModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold">İptal</button>
                <button onClick={handleAddManualPending} disabled={!manualPendingData.amount || !manualPendingData.date} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 flex items-center gap-2"><Check size={16}/> Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YENİ: MÜKERRER ÖDEME UYARISI — aynı gün + aynı tutar kayıt varsa işlemeden önce sorar */}
      {duplicatePayWarn && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setDuplicatePayWarn(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><AlertCircle size={20} /></div>
              <div>
                <h3 className="text-base font-bold text-amber-800">Mükerrer Ödeme Uyarısı</h3>
                <p className="text-[11px] font-medium text-amber-700">Bu tahsilat carisine daha önce işlenmiş olabilir.</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>{duplicatePayWarn.customerName}</strong> adlı müşterinin carisinde
                <strong> {new Date(duplicatePayWarn.date).toLocaleDateString('tr-TR')}</strong> tarihli ve
                <strong> {Number(duplicatePayWarn.amount).toLocaleString('tr-TR')} TL</strong> tutarlı bir ödeme zaten kayıtlı.
              </p>
              {duplicatePayWarn.existingNote ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Mevcut Kayıt Açıklaması</div>
                  <div className="text-[11px] text-slate-600 break-words">{duplicatePayWarn.existingNote}</div>
                </div>
              ) : null}
              <p className="text-[11px] font-medium text-gray-500">Yine de işlemek isterseniz cariye <strong>ikinci bir tahsilat</strong> eklenir.</p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setDuplicatePayWarn(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors">Vazgeç</button>
              <button onClick={() => { const _id = duplicatePayWarn.txId; setDuplicatePayWarn(null); processBankTx(_id, true); }} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-1.5"><Check size={14} /> Yine de İşle</button>
            </div>
          </div>
        </div>
      )}

      {/* YENİ: MÜKERRER TAHSİLAT UYARISI — aynı gün aynı tutarlı ödeme carisinde varsa önce uyarır */}
      {dupWarnTx && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setDupWarnTx(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertCircle size={18}/></div>
              <h3 className="text-base font-bold text-amber-700">Mükerrer Tahsilat Uyarısı</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>{dupWarnTx.matchedCustomerName}</strong> adlı müşterinin carisinde
                <strong> {new Date(dupWarnTx.rawDate).toLocaleDateString('tr-TR')}</strong> tarihinde
                <strong> {Math.abs(Number(dupWarnTx.amount)).toLocaleString('tr-TR')} TL</strong> tutarında bir ödeme zaten kayıtlı.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl p-3">
                Bu hareketi yine de işlerseniz cariye <strong>ikinci kez</strong> aynı tutarda tahsilat eklenir. Emin değilseniz önce müşterinin cari ekstresini kontrol edin.
              </p>
              <div className="text-[11px] text-gray-400 break-words">{dupWarnTx.description}</div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setDupWarnTx(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-gray-200 transition-colors">Vazgeç</button>
              <button onClick={() => { const _t = dupWarnTx; setDupWarnTx(null); processBankTx(_t.id); }} className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm">Yine de İşle</button>
            </div>
          </div>
        </div>
      )}

      {/* TAHSİLAT NOTU EKLEME MODALI */}
      {isCollectionNoteModalOpen && collectionNoteData.customerId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-yellow-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-yellow-700 flex items-center gap-2"><Edit size={18} /> {collectionNoteData.isEdit ? 'Tahsilat Notu Düzenle' : 'Tahsilat Notu / Ödeme Sözü Ekle'}</h3>
                 <button onClick={() => setIsCollectionNoteModalOpen(false)}><X size={20} className="text-yellow-500 hover:text-yellow-700"/></button>
             </div>
             <div className="p-6">
                <p className="text-xs text-gray-500 mb-5">Müşteriyle yaptığınız görüşmenin detaylarını ve verdikleri ödeme sözü tarihini buraya kaydedin. Tüm notlar Aylık Borç Takip panosunda görünecektir.</p>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Görüşme Notu (Zorunlu)</label>
                    <textarea rows="3" value={collectionNoteData.text} onChange={(e) => setCollectionNoteData({...collectionNoteData, text: e.target.value})} placeholder="Örn: Ayın 15'inde maaşı yatınca tamamını kapatacağını söyledi..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 resize-none font-medium text-gray-700 bg-white"></textarea>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">Ödeme Sözü Tarihi <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">(İsteğe Bağlı)</span></label>
                    <input type="date" value={collectionNoteData.promiseDate} onChange={(e) => setCollectionNoteData({...collectionNoteData, promiseDate: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 font-medium text-gray-700" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setIsCollectionNoteModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">İptal</button>
                  <button onClick={handleSaveCollectionNote} disabled={!collectionNoteData.text} className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-yellow-500/30 transition-colors flex items-center gap-2">
                      <Check strokeWidth={3} size={18} /> {collectionNoteData.isEdit ? 'Değişikliği Kaydet' : 'Notu Kaydet'}
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ASKIDAKİ ÖDEMEYİ CARİYE İŞLEME MODALI */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50 rounded-t-xl">
                 <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2"><Wallet size={18} /> Askıdaki Tahsilatı Cariye İşle</h3>
                 <button onClick={() => setIsAssignModalOpen(false)}><X size={20} className="text-orange-500 hover:text-orange-700"/></button>
             </div>
             <div className="p-6 md:p-8">
                 {(() => {
                    const payment = pendingCollections.find(p => p.id === assignData.paymentId);
                    if (!payment) return null;

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700">Müşteri Cari Hesap Seçimi (Zorunlu)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400" /></div>
                                    <input type="text" placeholder="Müşteri Adı, Müşteri No veya Oda Numarası ile Ara..." value={pendingSearchTerm} onChange={(e) => setPendingSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 mb-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-700 bg-white shadow-sm" />
                                </div>
                                <select value={assignData.customerId} onChange={(e) => setAssignData({...assignData, customerId: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-50 font-medium text-slate-700">
                                    <option value="">Lütfen eşleştirilecek müşteriyi seçin...</option>
                                    {customers.filter(c => {
                                        if (!pendingSearchTerm) return true;
                                        const searchLower = normalizeStr(pendingSearchTerm);
                                        const matchName = normalizeStr(c.name).includes(searchLower);
                                        const matchNo = c.customerNo && String(c.customerNo).includes(searchLower);
                                        const matchRoom = rooms.some(r => r.customerName === c.name && normalizeStr(r.name).includes(searchLower));
                                        return matchName || matchNo || matchRoom;
                                    }).map(c => {
                                        const cRooms = rooms.filter(r => r.customerName === c.name).map(r => r.name).join(', ');
                                        const roomText = cRooms ? ` | Odalar: ${cRooms}` : '';
                                        return <option key={c.id} value={c.id}>{c.name} (No: {c.customerNo}){roomText}</option>;
                                    })}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-gray-700">Ödenen Tutar (TL)</label>
                                <input type="number" readOnly value={payment.amount} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 font-bold text-slate-800 text-lg bg-gray-50 cursor-not-allowed" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-gray-700">Ödeme Tarihi</label>
                                <input type="date" readOnly value={payment.date} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-700 bg-gray-50 cursor-not-allowed" />
                            </div>
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700">İşlem Açıklaması / Dekont Notu</label>
                                <textarea rows="3" readOnly value={payment.note} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 resize-none font-medium text-slate-700 bg-gray-50 cursor-not-allowed"></textarea>
                            </div>
                        </div>
                    );
                 })()}
                
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                  <button onClick={() => setIsAssignModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold transition-colors">İptal</button>
                  <button onClick={handleAssignPendingPayment} disabled={!assignData.customerId} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 transition-colors flex items-center gap-2">
                      <Check strokeWidth={3} size={18} /> Cariye İşle
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ASKIDAKİ ÖDEMEYİ DÜZENLEME MODALI */}
      {isEditPendingModalOpen && editPendingData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50 rounded-t-xl">
                 <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2"><Edit size={18} /> Askıdaki Tahsilatı Düzenle</h3>
                 <button onClick={() => setIsEditPendingModalOpen(false)}><X size={20} className="text-blue-500 hover:text-blue-700"/></button>
             </div>
             <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">İşlem Tarihi</label>
                    <input type="date" value={editPendingData.date} onChange={(e) => setEditPendingData({...editPendingData, date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Açıklama / Dekont Notu</label>
                    <textarea rows="3" value={editPendingData.note} onChange={(e) => setEditPendingData({...editPendingData, note: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"></textarea>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Tahsilat Tutarı (TL)</label>
                    <input type="number" value={editPendingData.amount} onChange={(e) => setEditPendingData({...editPendingData, amount: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-bold text-lg" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsEditPendingModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">İptal</button>
                  <button onClick={handleSaveEditPending} disabled={!editPendingData.amount} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm">Değişiklikleri Kaydet</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MBT E-FATURA OLUŞTURMA MODALI */}
      {eInvoiceModalData && (() => {
          const customer = customers.find(c => c.id === eInvoiceModalData.customerId);
          // Net ve KDV hesaplama örneği (KDV %20 varsayılmıştır)
          const totalAmount = eInvoiceModalData.amount;
          const netAmount = (totalAmount / 1.20).toFixed(2);
          const kdvAmount = (totalAmount - netAmount).toFixed(2);
          
          return (
            <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in overflow-hidden flex flex-col">
                 <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                     <div className="flex flex-col">
                         <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                             <FileTextIcon size={18} /> Faturayı Başlat
                         </h3>
                         <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">PARAŞÜT E-FATURA ENTEGRASYONU</span>
                     </div>
                     <button onClick={() => !isSendingEInvoice && setEInvoiceModalData(null)} disabled={isSendingEInvoice} className="text-blue-400 hover:text-blue-700 p-1 bg-white rounded-full shadow-sm"><X size={20} /></button>
                 </div>
                 
                 <div className="p-6">
                    {eInvoiceSuccess ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">E-Arşiv Fatura Oluşturuldu!</h3>
                            <p className="text-sm text-gray-500 font-medium max-w-sm">Faturanız başarıyla GİB'e iletildi ve MBT Portalında resmileşti. Müşteriye SMS/Mail olarak gönderilecektir.</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 mb-5">
                                <div className="grid grid-cols-2 gap-y-3 text-sm">
                                    <div className="text-gray-500 font-medium">Müşteri Ünvanı:</div>
                                    <div className="font-bold text-gray-800 text-right">{customer?.name}</div>
                                    
                                    <div className="text-gray-500 font-medium">TCKN / VKN:</div>
                                    <div className="font-bold text-gray-800 text-right">{customer?.tc || <span className="text-red-500 text-xs font-normal">(Eksik Bilgi)</span>}</div>
                                    
                                    <div className="text-gray-500 font-medium">İl / İlçe / Adres:</div>
                                    <div className="font-bold text-gray-800 text-right truncate" title={customer?.address}>{customer?.address || 'Muhtelif'}</div>
                                    
                                    <div className="col-span-2 border-t border-gray-200 my-1"></div>
                                    
                                    <div className="text-gray-500 font-medium">Hizmet/Ürün Açıklaması:</div>
                                    <div className="font-bold text-gray-800 text-right">{eInvoiceModalData.note || 'Depolama Hizmet Bedeli'}</div>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-blue-600">Net Tutar</span>
                                    <span className="font-semibold text-gray-700">{netAmount} TL</span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-blue-600">Hesaplanan KDV (%20)</span>
                                    <span className="font-semibold text-gray-700">{kdvAmount} TL</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-blue-200 pt-3 mt-1">
                                    <span className="text-sm font-black text-blue-900 uppercase">Genel Toplam</span>
                                    <span className="text-xl font-black text-blue-700">{totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>
                                </div>
                            </div>
                            
                            {!customer?.tc && (
                                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>Uyarı: Müşterinin TCKN/VKN bilgisi eksik görünüyor. Paraşüt'e aktarım için 11111111111 olarak varsayılan atanacaktır.</span>
                                </div>
                            )}

                            {eInvoiceError && (
                                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{eInvoiceError}</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setEInvoiceModalData(null)} disabled={isSendingEInvoice} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                                    İptal
                                </button>
                                <button onClick={handleSendEInvoice} disabled={isSendingEInvoice} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-colors flex items-center gap-2">
                                    {isSendingEInvoice ? (
                                        <><RefreshCcw size={16} className="animate-spin" /> Paraşüt'e Aktarılıyor...</>
                                    ) : (
                                        <><Check strokeWidth={3} size={18} /> Paraşüt'e Aktar</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                 </div>
              </div>
            </div>
          );
      })()}

      {/* YENİ EKLENEN: PARAŞÜT'E AKTARILDI BİLGİLENDİRME PENCERESİ */}
      {eInvoiceStartedInfo && (
        <div className="fixed inset-0 bg-black/60 z-[75] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in overflow-hidden">
             <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-500 flex justify-center">
                 <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                     <Check size={40} className="text-emerald-600" strokeWidth={3} />
                 </div>
             </div>
             <div className="p-8 text-center">
                 <h3 className="text-xl font-black text-gray-800 mb-3 tracking-tight">Fatura Bilgileri Paraşüt'e Aktarıldı</h3>
                 <p className="text-sm text-gray-600 mb-4 font-medium leading-relaxed">
                     <strong>{eInvoiceStartedInfo.customerName}</strong> müşterisinin <strong>{eInvoiceStartedInfo.amount?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong> tutarındaki fatura bilgileri Paraşüt uygulamasına başarıyla aktarıldı.
                 </p>
                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left flex items-start gap-2">
                     <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                     <p className="text-[13px] text-blue-700 font-medium leading-relaxed">
                         Faturanın <strong>orijinalini Paraşüt uygulamasından</strong> onaylayıp indirebilir, dilerseniz üzerinde iyileştirme (düzenleme) yapabilirsiniz. Onayladıktan sonra "Faturayı Yükle" butonuyla kesilen faturayı müşterinin cari profiline kaydedebilirsiniz.
                     </p>
                 </div>
                 <button onClick={() => setEInvoiceStartedInfo(null)} className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3.5 rounded-xl font-bold transition-colors">Anladım, Kapat</button>
             </div>
          </div>
        </div>
      )}

      {/* YENİ EKLENEN: FATURAYI YÜKLE MODALI (Paraşüt'te kesilen faturayı cariye kaydet) */}
      {uploadInvoiceData && (
        <div className="fixed inset-0 bg-black/60 z-[75] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2"><Upload size={20} /> Faturayı Yükle</h3>
                 <button onClick={() => !isUploadingInvoiceFile && setUploadInvoiceData(null)} disabled={isUploadingInvoiceFile} className="text-indigo-400 hover:text-indigo-600 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6">
                <p className="text-sm text-gray-500 mb-5">Paraşüt'te onaylayıp indirdiğiniz faturayı buradan seçin. Dosya, <strong>{uploadInvoiceData.customerName}</strong> müşterisinin cari profilindeki <strong>Faturalar</strong> bölümüne kaydedilecektir.</p>
                
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 mb-5 grid grid-cols-2 gap-y-2 text-sm">
                    <div className="text-gray-500 font-medium">Müşteri:</div>
                    <div className="font-bold text-gray-800 text-right">{uploadInvoiceData.customerName}</div>
                    <div className="text-gray-500 font-medium">Tutar:</div>
                    <div className="font-bold text-green-600 text-right">{uploadInvoiceData.amount?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                    {uploadInvoiceData.eInvoiceNo && (<><div className="text-gray-500 font-medium">Fatura No:</div><div className="font-bold text-gray-800 text-right">{uploadInvoiceData.eInvoiceNo}</div></>)}
                </div>

                <label className={`border-2 border-dashed border-indigo-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-indigo-50 hover:border-indigo-400 transition-colors cursor-pointer bg-white group ${isUploadingInvoiceFile ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="w-14 h-14 bg-indigo-50 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        {isUploadingInvoiceFile ? <RefreshCcw size={24} className="text-indigo-500 animate-spin" /> : <Upload size={24} className="text-indigo-500" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-1 font-medium"><span className="text-indigo-600">{isUploadingInvoiceFile ? 'Yükleniyor...' : 'Fatura dosyası seçin'}</span></p>
                    <p className="text-xs text-gray-400">PDF, PNG veya JPG</p>
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadInvoiceFile} disabled={isUploadingInvoiceFile} />
                </label>

                <div className="mt-6 flex justify-end">
                    <button onClick={() => setUploadInvoiceData(null)} disabled={isUploadingInvoiceFile} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">İptal</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* YENİ EKLENEN: FATURAYI PAYLAŞ SEÇENEKLERİ MODALI */}
      {shareInvoiceData && (
        <div className="fixed inset-0 bg-black/60 z-[75] flex items-center justify-center p-4" onClick={() => setShareInvoiceData(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in" onClick={(e) => e.stopPropagation()}>
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-green-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-green-700 flex items-center gap-2"><Share2 size={20} /> Faturayı Paylaş</h3>
                 <button onClick={() => setShareInvoiceData(null)} className="text-green-400 hover:text-green-600 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6">
                <p className="text-sm text-gray-500 mb-5"><strong>{shareInvoiceData.customer?.name}</strong> müşterisine yüklenen faturayı hangi kanaldan göndermek istersiniz?</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => handleShareInvoice('whatsapp')} className="w-full flex items-center gap-3 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-3.5 rounded-xl font-bold transition-colors">
                        <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0"><MessageCircle size={20} /></div>
                        <div className="text-left">
                            <div className="text-sm">WhatsApp</div>
                            <div className="text-[11px] text-gray-500 font-medium">{shareInvoiceData.customer?.phone ? `0${shareInvoiceData.customer.phone}` : 'Numara yok'}</div>
                        </div>
                    </button>
                    <button onClick={() => handleShareInvoice('gmail')} className="w-full flex items-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3.5 rounded-xl font-bold transition-colors">
                        <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0"><Mail size={20} /></div>
                        <div className="text-left">
                            <div className="text-sm">Gmail</div>
                            <div className="text-[11px] text-gray-500 font-medium">{shareInvoiceData.customer?.email || 'E-posta yok'}</div>
                        </div>
                    </button>
                    <button onClick={() => handleShareInvoice('sms')} className="w-full flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-3.5 rounded-xl font-bold transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0"><Phone size={20} /></div>
                        <div className="text-left">
                            <div className="text-sm">Mesaj (SMS)</div>
                            <div className="text-[11px] text-gray-500 font-medium">{shareInvoiceData.customer?.phone ? `0${shareInvoiceData.customer.phone}` : 'Numara yok'}</div>
                        </div>
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TAHSİLAT HAREKETİ DÜZENLEME MODALI */}
      {isEditCollectionModalOpen && editCollectionData && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50 rounded-t-xl">
                 <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2"><Edit size={18} /> Tahsilatı Düzenle</h3>
                 <button onClick={() => setIsEditCollectionModalOpen(false)}><X size={20} className="text-orange-500 hover:text-orange-700"/></button>
             </div>
             <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3 text-center mb-2">
                     <span className="text-xs font-bold text-gray-500 block mb-1">Müşteri</span>
                     <span className="text-sm font-bold text-gray-800">{editCollectionData.customerName}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Ödenen Tutar (TL)</label>
                    <input type="number" value={editCollectionData.amount} onChange={(e) => setEditCollectionData({...editCollectionData, amount: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-bold text-lg text-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Ödeme Tarihi</label>
                    <input type="date" value={editCollectionData.date} onChange={(e) => setEditCollectionData({...editCollectionData, date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Açıklama / Dekont Notu</label>
                    <textarea value={editCollectionData.note} onChange={(e) => setEditCollectionData({...editCollectionData, note: e.target.value})} rows="3" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none"></textarea>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsEditCollectionModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">İptal</button>
                  <button onClick={handleSaveEditCollection} disabled={!editCollectionData.amount || !editCollectionData.date} className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><Check size={16} strokeWidth={3}/> Kaydet</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TOPLU YÜKLEME DETAYLARI MODALI */}
      {isBulkDetailsModalOpen && bulkDetailsData && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl shrink-0">
                   <div className="flex flex-col gap-1">
                       <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                           <FileTextIcon size={20} /> Excel Yükleme Detayları
                       </h3>
                       <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{bulkDetailsData.dateStr || 'Güncel Yükleme Sonucu'} | {bulkDetailsData.fileName}</span>
                   </div>
                   <button onClick={() => setIsBulkDetailsModalOpen(false)} className="bg-white p-1.5 rounded-full shadow-sm text-indigo-400 hover:text-red-500 transition-colors"><X size={20} /></button>
               </div>
               
               <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex flex-col gap-6">
                  
                  {/* EŞLEŞEN İŞLEMLER */}
                  <div>
                      <h4 className="font-bold text-emerald-700 flex items-center gap-2 mb-3"><Check size={18} /> Cariye İşlenen Tahsilatlar ({bulkDetailsData.matchedCount})</h4>
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-left text-sm text-gray-600">
                              <thead className="bg-emerald-50/50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
                                  <tr>
                                      <th className="px-4 py-3 w-10">#</th>
                                      <th className="px-4 py-3">Müşteri</th>
                                      <th className="px-4 py-3 text-center">Tarih</th>
                                      <th className="px-4 py-3">Açıklama (Dekont)</th>
                                      <th className="px-4 py-3 text-right">Tutar</th>
                                      <th className="px-4 py-3 text-center w-64">İşlem</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {bulkDetailsData.addedPaymentRecords && bulkDetailsData.addedPaymentRecords.length > 0 ? (
                                      bulkDetailsData.addedPaymentRecords.map((record, idx) => {
                                          const cust = customers.find(c => String(c.id) === String(record.customerId));
                                          const payment = cust?.payments?.find(p => String(p.id) === String(record.paymentId));
                                          const goToCari = () => {
                                              setSelectedCustomerId(cust.id);
                                              setIsBulkDetailsModalOpen(false);
                                              setActiveMenu('tum-musteriler');
                                          };
                                          return (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="px-4 py-3 text-gray-400 font-bold">{idx + 1}</td>
                                                  <td className="px-4 py-3 font-bold text-gray-800">
                                                      {cust ? (
                                                          <button onClick={goToCari} className="hover:text-emerald-600 hover:underline transition-colors text-left">{cust.name}</button>
                                                      ) : (
                                                          <span className="text-red-400">Silinmiş Müşteri</span>
                                                      )}
                                                  </td>
                                                  <td className="px-4 py-3 text-center">{payment ? new Date(payment.date).toLocaleDateString('tr-TR') : '-'}</td>
                                                  <td className="px-4 py-3 text-xs opacity-80 truncate max-w-[200px]" title={payment?.note}>{payment ? payment.note : '-'}</td>
                                                  <td className="px-4 py-3 text-right font-black text-emerald-600">{payment ? payment.amount.toLocaleString('tr-TR') + ' TL' : 'Kayıt Bulunamadı'}</td>
                                                  <td className="px-4 py-3 text-center">
                                                      {cust && payment && (
                                                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                              <button onClick={() => { setEditCollectionData({ ...payment, customerId: cust.id }); setIsBulkDetailsModalOpen(false); setIsEditCollectionModalOpen(true); }} className="text-[10px] bg-orange-50 hover:bg-orange-100 text-orange-600 px-2.5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1" title="Cariyi Düzenle"><Edit size={12}/> Düzenle</button>
                                                              <button onClick={() => handleSendPaymentToPending(cust.id, payment.id)} className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1" title="Askıda Kalan Tahsilatlara Gönder"><Upload size={12}/> Askıya Gönder</button>
                                                              <button onClick={() => handleDeleteCollection(cust.id, payment.id)} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1" title="Cariden Kaldır"><Trash2 size={12}/> Cariden Kaldır</button>
                                                          </div>
                                                      )}
                                                  </td>
                                              </tr>
                                          );
                                      })
                                  ) : (
                                      <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500 font-medium">Bu yüklemede cariyle eşleşen bir işlem bulunmuyor.</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* ASKIDA KALAN İŞLEMLER */}
                  <div>
                      <h4 className="font-bold text-orange-700 flex items-center gap-2 mb-3"><AlertCircle size={18} /> Eşleşmeyen (Askıda Kalan) İşlemler ({bulkDetailsData.unmatchedCount})</h4>
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-left text-sm text-gray-600">
                              <thead className="bg-orange-50/50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
                                  <tr>
                                      <th className="px-4 py-3 w-10">#</th>
                                      <th className="px-4 py-3 text-center">Tarih</th>
                                      <th className="px-4 py-3">Açıklama (Dekont)</th>
                                      <th className="px-4 py-3 text-right">Tutar</th>
                                      <th className="px-4 py-3 text-center w-48">İşlem</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {bulkDetailsData.addedPendingIds && bulkDetailsData.addedPendingIds.length > 0 ? (
                                      bulkDetailsData.addedPendingIds.map((pId, idx) => {
                                          const pending = pendingCollections.find(p => String(p.id) === String(pId));
                                          return (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="px-4 py-3 text-gray-400 font-bold">{idx + 1}</td>
                                                  <td className="px-4 py-3 text-center">{pending ? new Date(pending.date).toLocaleDateString('tr-TR') : '-'}</td>
                                                  <td className="px-4 py-3 text-xs opacity-80">{pending ? pending.note : <span className="text-gray-400">Sistemden silinmiş veya sonradan bir cariye işlenmiş.</span>}</td>
                                                  <td className="px-4 py-3 text-right font-black text-orange-600">{pending ? pending.amount.toLocaleString('tr-TR') + ' TL' : '-'}</td>
                                                  <td className="px-4 py-3 text-center">
                                                      {pending && (
                                                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                              <button onClick={() => {
                                                                  setAssignData({ paymentId: pending.id, customerId: '' });
                                                                  setIsAssignModalOpen(true);
                                                              }} className="text-[10px] bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1"><Wallet size={12}/> Cariye İşle</button>
                                                              <button onClick={async () => {
                                                                  if (!window.confirm('Bu tahsilatı Askıda Kalan Tahsilatlardan kalıcı olarak silmek istediğinize emin misiniz?')) return;
                                                                  if (db && firebaseUser) {
                                                                      try {
                                                                          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(pending.id)));
                                                                      } catch(e) { console.error("Askıdan Silme Hatası:", e); }
                                                                  } else {
                                                                      setPendingCollections(pendingCollections.filter(p => p.id !== pending.id));
                                                                  }
                                                              }} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1" title="Askıda İşlemlerden Sil"><Trash2 size={12}/> Sil</button>
                                                          </div>
                                                      )}
                                                  </td>
                                              </tr>
                                          );
                                      })
                                  ) : (
                                      <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-500 font-medium">Bu yüklemede eşleşmeyip askıya düşen bir kayıt bulunmuyor.</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>

               </div>
           </div>
        </div>
      )}
    </>
  );
}