// ============================================================================
// SEMBOL CRM KÖPRÜSÜ — Depoevim CRM projesine eklenecek dosya
// ============================================================================
// AMAÇ: Depoevim CRM'de bir TAHSİLAT kaydedildiğinde, aynı tahsilatı Sembol
// CRM'in Firebase'ine (Depoevim bloğundaki ALBARAKA BANK defterine) otomatik
// GELİR olarak yazmak. Sembol CRM defterleri canlı dinlediği için kayıt
// saniyeler içinde orada görünür.
//
// NASIL ÇALIŞIR:
//   • Bu dosya, Depoevim uygulamasının İÇİNDE ikinci bir Firebase bağlantısı
//     açar (Sembol'ün projesine). İki uygulama AYRI Firebase projesi kullansa
//     bile çalışır; AYNI projeyi kullanıyorsanız da sorun çıkarmaz.
//   • Çift kayıt İMKÂNSIZDIR: her tahsilat, Sembol tarafında
//     "depoevim_{tahsilatId}" sabit kimliğiyle yazılır (setDoc). Aynı tahsilat
//     iki kez gönderilse bile tek kayıt oluşur/üzerine yazılır.
//   • Köprü hata verirse tahsilatınız Depoevim'de yine kaydedilir; yalnızca
//     Sembol'e aktarım konsola uyarı düşer (kullanıcı akışı bozulmaz).
//
// KURULUM (3 ADIM):
//   1) Bu dosyayı Depoevim projesinde src/ altına "sembolKoprusu.js" adıyla
//      kaydedin ve aşağıdaki AYAR bölümünü doldurun.
//   2) SEMBOL_FIREBASE_CONFIG: Sembol projesindeki shared.tsx dosyasının en
//      üstündeki firebaseConfig nesnesini OLDUĞU GİBİ kopyalayın.
//      SEMBOL_APP_ID ve HEDEF_DEFTER_ID: Sembol CRM > Finans > Defter >
//      ALBARAKA BANK defterini DÜZENLE'ye basın; açılan penceredeki
//      "Depoevim CRM Entegrasyonu" panelinden Kopyala düğmeleriyle alın.
//   3) Depoevim'de tahsilatı Firestore'a kaydeden fonksiyonun İÇİNE, kayıt
//      başarıyla yazıldıktan hemen sonra şu tek satırı ekleyin:
//
//        import { sembolTahsilatGonder } from './sembolKoprusu';
//        ...
//        await sembolTahsilatGonder({
//          tahsilatId: yeniKayitRef.id,          // Depoevim'deki tahsilat belge kimliği
//          musteriAdi: form.musteriAdi,          // örn: "GÖKÇE SENA KÖKCE"
//          musteriNo:  form.musteriNo || '',     // örn: "34583"
//          tutar:      Number(form.tutar),       // örn: 36000
//          tarih:      form.tarih,               // "YYYY-AA-GG" (örn "2026-08-26")
//          aciklama:   form.dekontNotu || '',    // örn: "5+1 kampanyası"
//          kaydeden:   aktifKullaniciAdi || '',  // örn: "Mustafa Beşinci"
//        });
//
// GÜVENLİK NOTU: Bu köprü, Sembol projesine ANONİM oturumla yazar (Sembol'ün
// kendi uygulamasıyla aynı yöntem). Firebase config'i istemcide zaten herkese
// açıktır; asıl koruma Firestore kurallarınızdadır. İleride sıkılaştırmak
// isterseniz Cloud Functions'lı sunucu tarafı bir uç nokta kurulabilir —
// bu dosya o güne kadar iki uygulamayı sorunsuz konuşturur.
// ============================================================================

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// ============================== AYARLAR =====================================
// 1) Sembol projesinin firebaseConfig'i (shared.tsx'in en üstünden kopyalayın)
const defaultFirebaseConfig = {
    apiKey: "AIzaSyD8ofu_2rZwJeHWftmr6STilgF_qjO3LVI",
    authDomain: "sembol-operasyon-merkezi.firebaseapp.com",
    projectId: "sembol-operasyon-merkezi",
    storageBucket: "sembol-operasyon-merkezi.firebasestorage.app",
    messagingSenderId: "1054049299174",
    appId: "1:1054049299174:web:2193f916a3501543d92927"
  };

// 2) Sembol CRM > ALBARAKA BANK defteri Düzenle > Entegrasyon panelinden kopyalayın
const SEMBOL_APP_ID = 'sembol-crm-lokal';      // panelde "Uygulama ID (SEMBOL_APP_ID)"
const HEDEF_DEFTER_ID = 'appTS8SDGHo027PBLLWr';      // panelde "Defter ID (HEDEF_DEFTER_ID)"
// ============================================================================

// Sembol'e ikinci (adlandırılmış) Firebase bağlantısı — Depoevim'in kendi
// bağlantısına DOKUNMAZ. Aynı isimle ikinci kez başlatmayı da engeller.
const sembolApp = getApps().find(a => a.name === 'sembol')
  || initializeApp(SEMBOL_FIREBASE_CONFIG, 'sembol');
const sembolDb = getFirestore(sembolApp);
const sembolAuth = getAuth(sembolApp);

// Sembol tarafına anonim oturum (Sembol uygulamasının kendi yöntemiyle aynı).
// Bir kez açılır; sonraki çağrılar mevcut oturumu kullanır.
let oturumSozu = null;
const oturumuGarantiEt = () => {
  if (sembolAuth.currentUser) return Promise.resolve();
  if (!oturumSozu) oturumSozu = signInAnonymously(sembolAuth).catch(e => { oturumSozu = null; throw e; });
  return oturumSozu;
};

/**
 * Depoevim tahsilatını Sembol CRM'in ALBARAKA defterine GELİR olarak yazar.
 * Çift kayıt oluşturmaz (sabit belge kimliği). Hata durumunda fırlatmaz;
 * false döner ve konsola uyarı yazar — Depoevim akışı asla bozulmaz.
 *
 * @param {Object} t
 * @param {string} t.tahsilatId  Depoevim'deki tahsilat belge kimliği (ZORUNLU)
 * @param {string} t.musteriAdi  Müşteri adı
 * @param {string} [t.musteriNo] Müşteri/oda numarası
 * @param {number} t.tutar       Tahsilat tutarı (TL)
 * @param {string} t.tarih       'YYYY-AA-GG' biçiminde tarih
 * @param {string} [t.aciklama]  Dekont notu / açıklama
 * @param {string} [t.kaydeden]  İşlemi yapan kullanıcı adı
 * @returns {Promise<boolean>}   true = Sembol'e yazıldı, false = yazılamadı
 */
export async function sembolTahsilatGonder(t) {
  try {
    // --- Basit doğrulamalar: eksik veriyle Sembol'e çöp kayıt gitmesin ---
    if (!t || !t.tahsilatId) { console.warn('[SembolKöprüsü] tahsilatId zorunlu — gönderilmedi.'); return false; }
    const tutar = Number(t.tutar);
    if (!(tutar > 0)) { console.warn('[SembolKöprüsü] Geçersiz tutar — gönderilmedi:', t.tutar); return false; }
    const tarih = /^\d{4}-\d{2}-\d{2}$/.test(t.tarih || '')
      ? t.tarih
      : new Date().toISOString().slice(0, 10); // tarih bozuksa bugünü kullan

    await oturumuGarantiEt();

    // SABİT KİMLİK = çift kayıt koruması. Aynı tahsilat tekrar gönderilirse
    // yeni satır AÇILMAZ, mevcut kayıt güncellenir.
    const belgeKimligi = `depoevim_${t.tahsilatId}`;
    const hedef = doc(sembolDb, 'artifacts', SEMBOL_APP_ID, 'public', 'data', 'defterIslemleri', belgeKimligi);

    // Sembol CRM'in beklediği işlem biçimi (Finans.tsx ile birebir uyumlu):
    await setDoc(hedef, {
      defterId: HEDEF_DEFTER_ID,
      tip: 'giris',                                   // tahsilat = GELİR
      tutar,
      tarih,
      kategori: 'Tahsilat',
      etiketler: ['Depoevim'],
      odemeYontemi: 'banka',
      aciklama: `${t.musteriAdi || 'Müşteri'}${t.musteriNo ? ` (No: ${t.musteriNo})` : ''} — Depoevim tahsilatı${t.aciklama ? ` • ${t.aciklama}` : ''}`,
      kaynak: 'Depoevim CRM',                         // Sembol'de mor rozet olarak görünür
      depoevimTahsilatId: t.tahsilatId,               // izlenebilirlik
      createdAt: new Date().toISOString(),
      by: t.kaydeden || 'Depoevim CRM',
    }, { merge: true });

    console.log('[SembolKöprüsü] Tahsilat Sembol CRM\'e aktarıldı:', belgeKimligi);
    return true;
  } catch (e) {
    // Köprü hatası Depoevim'i ASLA durdurmaz — yalnızca uyarı bırakır.
    console.warn('[SembolKöprüsü] Sembol\'e aktarılamadı (Depoevim kaydınız güvende):', e);
    return false;
  }
}
