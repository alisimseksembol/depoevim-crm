import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Calendar, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  Box, 
  Table, 
  FolderOpen, 
  Settings, 
  UserCog, 
  Shield,
  Menu,
  Search,
  Bell,
  ChevronDown,
  Calculator,
  X,
  Plus,
  Upload,
  Trash2,
  Edit,
  Home,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Wallet,
  LogOut,
  TrendingUp,
  RefreshCcw,
  MessageCircle,
  Phone,
  FileText as FileTextIcon,
History,
  Download,
  Info,
  Key,
  Check,
  Gift,
  Database,
  MapPin,
  Lock
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, deleteDoc } from 'firebase/firestore';

// ============================================================================
// 🗄️ FIREBASE ENTEGRASYON HAZIRLIĞI VE YAPILANDIRMASI
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAK-4baYcG60nDIryh_ia_bJ5bsnVdIsaA",
    authDomain: "depoevim-crm.firebaseapp.com",
    projectId: "depoevim-crm",
    storageBucket: "depoevim-crm.firebasestorage.app",
    messagingSenderId: "805423278855",
    appId: "1:805423278855:web:e16e8131eff6dc5e1eb3a2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// appId Canvas / Önizleme ortamına uygun şekilde dinamik hale getirildi.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'depoevim-crm';
// ============================================================================

// --- YARDIMCI FONKSİYONLAR ---
const normalizeStr = (str) => {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
};

// Mini grafik bileşeni
// ============================================================================

// --- RESİM/DOSYA YÜKLEME YARDIMCI FONKSİYONU ---
const uploadImageToServer = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        // İstenen yükleme adresi (Sunucudaki upload.php endpoint'iniz)
        const response = await fetch('https://www.depoevim.com/crm/upload.php', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            if (data.url) {
                // YENİ EKLENEN: Eğer PHP dosyası sadece "uploads/resim.jpg" gibi yarım bir link dönüyorsa başına site adresini ekle
                return data.url.startsWith('http') ? data.url : `https://www.depoevim.com/crm/${data.url}`;
            }
        }
    } catch (error) {
        console.warn('Sunucuya yüklenemedi (API yok veya CORS hatası), Base64 olarak devam ediliyor.', error);
    }
    
    // Sunucu başarısız olursa veya henüz PHP hazır değilse çökmeyi engellemek için Base64'e çevir
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
};

// Mini grafik bileşeni
const Sparkline = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 100;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  }).join(' L ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// --- YENİ EKLENEN: Gelişmiş Finans Alan Grafiği Bileşeni ---
const FinansAreaChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.gelen, d.gelecek, 10000))) * 1.1; // Biraz üst boşluk bırak
  const width = 800;
  const height = 300;
  const paddingX = 40;
  const paddingY = 40;
  
  const getX = (index) => paddingX + (index * ((width - paddingX * 2) / (Math.max(data.length - 1, 1))));
  const getY = (val) => height - paddingY - ((val / maxVal) * (height - paddingY * 2));

  // Gelen (Pembe/Kırmızı) Çizgi ve Alan
  const gelenPoints = data.map((d, i) => `${getX(i)},${getY(d.gelen)}`).join(' L ');
  const gelenArea = `M ${getX(0)},${height - paddingY} L ${gelenPoints} L ${getX(data.length - 1)},${height - paddingY} Z`;

  // Gelecek (Mavi) Çizgi ve Alan
  const gelecekPoints = data.map((d, i) => `${getX(i)},${getY(d.gelecek)}`).join(' L ');
  const gelecekArea = `M ${getX(0)},${height - paddingY} L ${gelecekPoints} L ${getX(data.length - 1)},${height - paddingY} Z`;

  // Y ekseni çizgileri (Grid)
  const gridLines = [];
  for (let i = 0; i <= 5; i++) {
      const y = height - paddingY - (i * ((height - paddingY * 2) / 5));
      const val = (maxVal / 5) * i;
      gridLines.push(
          <g key={`grid-${i}`}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={paddingX - 10} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{val >= 1000000 ? (val/1000000).toFixed(1) + 'M' : val >= 1000 ? (val/1000).toFixed(0) + 'B' : val}</text>
          </g>
      );
  }

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden" style={{ minHeight: '350px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full min-w-[600px]">
            <defs>
                <linearGradient id="gelenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01"/>
                </linearGradient>
                <linearGradient id="gelecekGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01"/>
                </linearGradient>
            </defs>
            
            {gridLines}
            
            {/* Alanlar */}
            <path d={gelecekArea} fill="url(#gelecekGradient)" />
            <path d={gelenArea} fill="url(#gelenGradient)" />
            
            {/* Çizgiler */}
            <path d={`M ${gelecekPoints}`} fill="none" stroke="#3b82f6" strokeWidth="2" />
            <path d={`M ${gelenPoints}`} fill="none" stroke="#f43f5e" strokeWidth="2" />

            {/* Noktalar ve X Ekseni Metinleri */}
            {data.map((d, i) => {
                const x = getX(i);
                const yGelen = getY(d.gelen);
                const yGelecek = getY(d.gelecek);
                return (
                    <g key={`point-${i}`}>
                        <text x={x} y={height - paddingY + 20} fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="bold">{d.label}</text>
                        {d.gelecek > 0 && <circle cx={x} cy={yGelecek} r="4" fill="#white" stroke="#3b82f6" strokeWidth="2" />}
                        {d.gelen > 0 && <circle cx={x} cy={yGelen} r="4" fill="white" stroke="#f43f5e" strokeWidth="2" />}
                    </g>
                );
            })}
        </svg>
    </div>
  );
};
// --- SON ---

// Dinamik olarak SheetJS (Excel) kütüphanesini yükleyen yardımcı fonksiyon
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

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

// --- YENİ EKLENEN: MOBİL UYUMLULUK VE TAM EKRAN (VIEWPORT) AYARI ---
  useEffect(() => {
      // Tarayıcıya uygulamanın mobil cihazın kendi çözünürlüğünde çalışması gerektiğini söylüyoruz
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'viewport';
          document.head.appendChild(meta);
      }
      // initial-scale=1.0 ve user-scalable=0 ile uzaklaştırma/yakınlaştırma ihtiyacını ortadan kaldırır
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
      
      // --- YENİ EKLENEN: Hotlink (Referrer) Korumasını Aşmak İçin ---
      // Resimler link olarak açılıp uygulama içinde görünmüyorsa bu ayar onu çözer.
      let metaReferrer = document.querySelector('meta[name="referrer"]');
      if (!metaReferrer) {
          metaReferrer = document.createElement('meta');
          metaReferrer.name = 'referrer';
          document.head.appendChild(metaReferrer);
      }
      metaReferrer.content = 'no-referrer';
      // --------------------------------------------------------------

      // Yatay kaymaları tamamen engellemek için genel stiller
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
      
      return () => {
          document.body.style.overflowX = '';
          document.documentElement.style.overflowX = '';
      };
  }, []);
  // ------------------------------------------------------------------

  // ============================================================================
  // 🗄️ FIREBASE VERİ SENKRONİZASYONU (DATA STORE)
  // ============================================================================
  // Firebase'e bağlandığında, burası tüm uygulamanın verilerinin çekildiği ve 
  // dinlendiği ana merkez olacaktır. Data eklemeye / eşleştirmeye buradan başlayabilirsiniz.
  
const [firebaseUser, setFirebaseUser] = useState(null);

  // 1. Firebase Kimlik Doğrulama
  useEffect(() => {

      if (!auth) return;
      const initAuth = async () => {
          try {
              if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                  await signInWithCustomToken(auth, __initial_auth_token);
              } else {
                  await signInAnonymously(auth);
              }
          } catch (error) {
              console.error("Firebase Auth Hatası:", error);
          }
      };
      initAuth();
      const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
      return () => unsubscribe();
  }, []);

// 2. Firebase Canlı Veri Dinleme (Tüm Modüller Dahil)
  useEffect(() => {
      if (!firebaseUser || !db) return;
      
      const unsubCustomers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'customers'), (snapshot) => { const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); if (fetchedData.length > 0) setCustomers(fetchedData); }, (error) => console.error("Hata:", error));
      const unsubWarehouses = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'warehouses'), (snapshot) => { const fetchedData = snapshot.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...doc.data() })).sort((a,b) => (a.orderIndex ?? a.id) - (b.orderIndex ?? b.id)); setWarehouses(fetchedData); }, (error) => console.error("Hata:", error));
      const unsubBlocks = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'blocks'), (snapshot) => { const fetchedData = snapshot.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...doc.data() })).sort((a,b) => (a.orderIndex ?? a.id) - (b.orderIndex ?? b.id)); setBlocks(fetchedData); }, (error) => console.error("Hata:", error));
      const unsubRooms = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rooms'), (snapshot) => { const fetchedData = snapshot.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...doc.data() })).sort((a,b) => (a.orderIndex ?? a.id) - (b.orderIndex ?? b.id)); setRooms(fetchedData); }, (error) => console.error("Hata:", error));
      const unsubPendingCollections = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'pendingCollections'), (snapshot) => { const fetchedData = snapshot.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...doc.data() })); setPendingCollections(fetchedData); }, (error) => console.error("Hata:", error));
      const unsubSystemUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'systemUsers'), (snapshot) => { const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); if (fetchedData.length > 0) { setSystemUsers(fetchedData); } else { setSystemUsers([{ id: '1', username: 'admin', password: 'admin', name: 'Sistem Yöneticisi', role: 'Yönetici' }]); } }, (error) => console.error("Hata:", error));
      const unsubAppointments = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), (snapshot) => { const fetchedData = snapshot.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...doc.data() })); setAppointments(fetchedData); }, (error) => console.error("Hata:", error));
      
      // 👇 SİSTEM AYARLARINI (SÖZLEŞME VE ORANLAR) FİREBASE'DEN ÇEKME 👇
      const unsubSettings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), (snapshot) => {
          snapshot.docs.forEach(doc => {
              if (doc.id === 'contract') setContractSettings(doc.data());
              if (doc.id === 'rates') setCollectionRates(doc.data());
          });
      }, (error) => console.error("Ayar Çekme Hatası:", error));

      return () => { 
          unsubCustomers(); unsubWarehouses(); unsubBlocks(); unsubRooms(); unsubPendingCollections(); unsubSystemUsers(); unsubAppointments(); 
          unsubSettings(); // 👈 Ayar telsizini kapat
      };
  }, [firebaseUser]);
  // ============================================================================

  // --- YENİ: AUTH VE KULLANICI STATE'LERİ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [systemUsers, setSystemUsers] = useState([{ id: '1', username: 'admin', password: 'admin', name: 'Sistem Yöneticisi', role: 'Yönetici' }]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ username: '', password: '', name: '', role: 'Personel', email: '', phone: '' });

  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserData, setEditUserData] = useState(null);

  // --- KULLANICI ROLLERİ STATE'LERİ ---
  const availablePermissions = {
      mainMenus: [
          { id: 'menu-dashboard', label: 'Anasayfa' },
          { id: 'menu-takvim', label: 'Takvim' },
          { id: 'menu-musteri-listesi', label: 'Müşteri Listesi' },
          { id: 'menu-odeme-islemleri', label: 'Ödeme İşlemleri' },
          { id: 'menu-depo', label: 'Depo Listesi' },
          { id: 'menu-finans-yonetimi', label: 'Finans Yönetimi' },
          { id: 'menu-sistem-hesaplari', label: 'Sistem Hesapları' },
          { id: 'menu-sistem-ayarlari', label: 'Sistem Ayarları' }
      ],
      pages: [
          { id: 'page-musteri-ekle', label: 'Yeni Müşteri Ekle' },
          { id: 'page-mevcut-musteriler', label: 'Mevcut Müşteriler' },
          { id: 'page-tum-musteriler', label: 'Tüm Müşteriler' },
          { id: 'page-odeme-girisi', label: 'Tahsilat Girişi Yap' },
          { id: 'page-askida-kalan-odemeler', label: 'Askıda Kalan Tahsilatlar' },
          { id: 'page-tahsilat-hareketleri', label: 'Tahsilat Hareketleri' },
          { id: 'page-gunu-gelen-odalar', label: 'Günü Gelen Odalar' },
          { id: 'page-senesi-dolan-odalar', label: 'Senesi Dolan Odalar' },
          { id: 'page-aylik-odeme', label: 'Aylık Borç Takip' },
          { id: 'page-finans-rapor', label: 'Finans Rapor' },
          { id: 'page-depo-rapor', label: 'Depo Rapor' },
          { id: 'page-panel-kullanicilari', label: 'Panel Kullanıcıları' },
          { id: 'page-kullanici-rolleri', label: 'Kullanıcı Rolleri' },
          { id: 'page-pdf-sozlesme', label: 'PDF & Sözleşme Ayarları' },
          { id: 'page-tahsilat-oranlari', label: 'Tahsilat Oranları' }
      ],
      actions: [
          { id: 'action-yeni-musteri', label: 'Yeni Müşteri Ekleme' },
          { id: 'action-yeni-oda', label: 'Yeni Oda' },
          { id: 'action-oda-duzenle', label: 'Oda Düzenleme' },
          { id: 'action-musteri-duzenle', label: 'Müşteri Düzenleme' },
          { id: 'action-hediye-ay', label: 'Hediye Ay Etme' },
          { id: 'action-ucretsiz-oda', label: 'Ücretsiz Oda Etme' },
          { id: 'action-cari-duzenle', label: 'Cari İşlemleri Düzenleme' },
          { id: 'action-cari-sil', label: 'Cari Silme' },
          { id: 'action-musteri-sil', label: 'Müşteri Silme' },
          { id: 'action-yeni-randevu', label: 'Yeni Randevu Ekleme' },
          { id: 'action-sube-sil', label: 'Depo Listesinden Şube Silme' },
          { id: 'action-blok-sil', label: 'Depo Listesinden Blok Silme' },
          { id: 'action-oda-sil', label: 'Depo Listesinden Oda Silme' },
          { id: 'action-oda-degistir', label: 'Oda Değiştirme' },
          { id: 'action-giris-cikis', label: 'Giriş Çıkış İşlemleri' },
          { id: 'action-depodan-cikis', label: 'Depodan Çıkış Yapma' },
          { id: 'action-tahsilat-girisi', label: 'Tahsilat Girişi Yapma' }
      ]
  };

  const [userRoles, setUserRoles] = useState([
      { id: 'yonetici', name: 'Yönetici', code: 'yonetici', isSuper: true, permissions: { mainMenus: [], pages: [], actions: [] } },
      { id: 'personel', name: 'Personel', code: 'personel', isSuper: false, permissions: { mainMenus: ['menu-dashboard', 'menu-depo', 'menu-musteri-listesi'], pages: ['page-aylik-odeme', 'page-mevcut-musteriler'], actions: [] } },
      { id: 'muhasebe', name: 'Muhasebe', code: 'muhasebe', isSuper: false, permissions: { mainMenus: ['menu-odeme-islemleri', 'menu-finans-yonetimi'], pages: ['page-aylik-odeme', 'page-tahsilat-hareketleri'], actions: [] } }
  ]);

  const [newRoleInput, setNewRoleInput] = useState({ name: '', code: '', copyFrom: '' });

  const handleAddRole = () => {
      if (!newRoleInput.name) return;
      // Kodları otomatik temizle (Türkçe karakterleri ve boşlukları at)
      const code = newRoleInput.name.toLowerCase().replace(/[^a-z0-9]/gi, '').replace(/\s+/g, '_');
      
      const newRole = {
          id: 'role_' + Date.now(),
          name: newRoleInput.name,
          code: code,
          isSuper: false,
          permissions: { mainMenus: [], pages: [], actions: [] }
      };
      setUserRoles([...userRoles, newRole]);
      setNewRoleInput({ name: '', code: '', copyFrom: '' });
  };

  const handleDeleteRole = (roleId) => {
      const role = userRoles.find(r => r.id === roleId);
      if(role?.isSuper) return alert("Süper yönetici rolü silinemez.");
      
      // Eğer bu rolde kullanıcı varsa silmeyi engelle
      if(systemUsers.some(u => u.role === role.name)) {
          return alert("Bu role atanmış aktif kullanıcılar var. Rolü silmeden önce kullanıcı listesinden bu kişilerin rolünü değiştirmelisiniz.");
      }
      setUserRoles(userRoles.filter(r => r.id !== roleId));
  };

  const handleTogglePermission = (roleId, type, permId) => {
      setUserRoles(userRoles.map(role => {
          if (role.id === roleId) {
              const currentPerms = role.permissions[type] || [];
              const hasPerm = currentPerms.includes(permId);
              const newPermsList = hasPerm 
                  ? currentPerms.filter(p => p !== permId)
                  : [...currentPerms, permId];
              
              return {
                  ...role,
                  permissions: { ...role.permissions, [type]: newPermsList }
              };
          }
          return role;
      }));
  };

  // --- MÜŞTERİ YÖNETİMİ STATE'LERİ ---
  const [openSubMenus, setOpenSubMenus] = useState({'musteri-listesi': true});
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerType, setCustomerType] = useState('bireysel'); 
  
  const [newCustomer, setNewCustomer] = useState({
      name: '', tc: '', phone: '', altPhone: '', address: '', notes: '',
      hasProxy: false, proxyName: '', proxyTc: '', proxyPhone: '', proxyAltPhone: '', proxyAddress: '', proxyDocumentPhoto: null,
      documentPhotoFront: null, documentPhotoBack: null
  });
  const [customerSaveError, setCustomerSaveError] = useState('');

  // --- YENİ EKLENEN STATE'LER (Fatura ve Silme Modalları İçin) ---
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], file: null });
  const [isDeleteCustomerModalOpen, setIsDeleteCustomerModalOpen] = useState(false);
  const [customerToDeleteId, setCustomerToDeleteId] = useState(null);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState(null);

  // --- YENİ: CARİ DÜZENLEME STATE'LERİ ---
  const [isEditLedgerListModalOpen, setIsEditLedgerListModalOpen] = useState(false);
  const [editingLedgerItem, setEditingLedgerItem] = useState(null);

  // --- MANUEL CARİ İŞLEM STATE'LERİ ---
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [newDebtData, setNewDebtData] = useState({ desc: '', amount: '', date: new Date().toISOString().split('T')[0], hasKdv: true });
  
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });

  const [debtMonthFilter, setDebtMonthFilter] = useState('all');
  const [debtSearchTerm, setDebtSearchTerm] = useState('');
  const [ledgerFilterYear, setLedgerFilterYear] = useState(new Date().getFullYear().toString());

  // --- TAHSİLAT HAREKETLERİ STATE'LERİ ---
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');

  // --- SENESİ DOLAN ODALAR STATE'LERİ ---
  const [anniversaryMonth, setAnniversaryMonth] = useState((new Date().getMonth() + 1).toString());
  const [anniversaryYear, setAnniversaryYear] = useState(new Date().getFullYear().toString());
  const [anniversarySearchTerm, setAnniversarySearchTerm] = useState('');

  // --- GÜNÜ GELEN ODALAR STATE'LERİ ---
  const [dueRoomsDate, setDueRoomsDate] = useState(new Date().toISOString().split('T')[0]);

  // --- TAHSİLAT NOTU STATE'LERİ ---
  const [isCollectionNoteModalOpen, setIsCollectionNoteModalOpen] = useState(false);
  const [collectionNoteData, setCollectionNoteData] = useState({ customerId: null, text: '', promiseDate: '' });

  // --- MESAJ GÖNDERİM STATE'İ ---
  const [messageModalData, setMessageModalData] = useState(null);

  // --- RANDEVU VE TAKVİM STATE'LERİ ---
  const [appointments, setAppointments] = useState([]);
  const [appointmentData, setAppointmentData] = useState({
    customerType: 'registered',
    customerId: '',
    unregisteredName: '',
    unregisteredPhone: '',
    warehouseId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 - 11:00',
    purpose: 'giris-cikis'
  });
const [apptCustomerSearch, setApptCustomerSearch] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0]);
  
  // --- RANDEVU DÜZENLEME/SİLME STATE'LERİ ---
  const [isEditApptModalOpen, setIsEditApptModalOpen] = useState(false);
  const [editApptData, setEditApptData] = useState(null);

  // --- ASKIDA KALAN TAHSİLATLAR STATE'LERİ ---

  // --- ASKIDA KALAN TAHSİLATLAR STATE'LERİ ---
  const [pendingCollections, setPendingCollections] = useState([]);
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

  // --- YENİ EKLENEN: DEPO ÖDEMELERİ GÜNCELLEME STATE'LERİ ---
  const [isUpdateAllModalOpen, setIsUpdateAllModalOpen] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [updateAllStats, setUpdateAllStats] = useState(null);

  // --- FİNANS RAPOR STATE'LERİ ---
  const [finansReportFilter, setFinansReportFilter] = useState('year'); // today, week, month, year
  const [branchPaymentFilter, setBranchPaymentFilter] = useState('1'); // 1, 3, 6, 12, all
  const [avgRevenueBranchFilter, setAvgRevenueBranchFilter] = useState('all');
  const [avgRevenueYearFilter, setAvgRevenueYearFilter] = useState(new Date().getFullYear().toString());
  
  // --- YENİ: DEPO HAREKET RAPORU STATE'LERİ ---
  const [depoReportTimeFilter, setDepoReportTimeFilter] = useState('aylik');
  const [depoReportWhFilter, setDepoReportWhFilter] = useState('all');

  // --- GENEL ARAMA STATE'LERİ ---
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);

  // --- PROFİL VE KULLANICI STATE'LERİ ---
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState({
      id: 1,
      name: 'Mustafa Beşinci',
      role: 'Yönetici',
      email: 'mustafa@depoevim.com',
      phone: '0533 201 06 10',
      avatar: null,
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
  });

  // --- YENİ EKLENEN: GİRİŞ VE KULLANICI FONKSİYONLARI ---
  const handleLogin = (e) => {
      e.preventDefault();
      const user = systemUsers.find(u => u.username === loginData.username && u.password === loginData.password);
      if (user) {
          setCurrentUserProfile({...user, oldPassword: '', newPassword: '', confirmPassword: ''});
          setIsAuthenticated(true);
          setLoginError('');
      } else {
          setLoginError('Kullanıcı adı veya şifre hatalı!');
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setLoginData({ username: '', password: '' });
      setIsProfileDropdownOpen(false);
  };

const handleAddSystemUser = async () => {
      if(!newUserData.username || !newUserData.password || !newUserData.name) return;
      if(systemUsers.some(u => u.username === newUserData.username)) {
          alert("Bu kullanıcı adı zaten mevcut.");
          return;
      }
      
      const newId = String(Date.now());
      const newUser = { id: newId, ...newUserData, avatar: null };

      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'systemUsers', newId), newUser);
          } catch(e) { console.error("Kullanıcı Kayıt Hatası:", e); }
      }
      
      setIsAddUserModalOpen(false);
      setNewUserData({ username: '', password: '', name: '', role: 'Personel', email: '', phone: '' });
  };

const handleDeleteSystemUser = async (id) => {
      if(systemUsers.length === 1) return alert("Sistemde en az 1 kullanıcı kalmalıdır.");
      if(currentUserProfile.id === id) return alert("Kendi hesabınızı silemezsiniz.");

      if (db && firebaseUser) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'systemUsers', String(id)));
          } catch(e) { console.error("Kullanıcı Silme Hatası:", e); }
      }
  };

const handleUpdateSystemUser = async () => {
      if(!editUserData.username || !editUserData.password || !editUserData.name) return;
      // Aynı kullanıcı adı başkasında var mı kontrolü
      if(systemUsers.some(u => u.username === editUserData.username && String(u.id) !== String(editUserData.id))) {
          alert("Bu kullanıcı adı başka bir hesap tarafından kullanılıyor.");
          return;
      }

      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'systemUsers', String(editUserData.id)), editUserData, { merge: true });
          } catch(e) { console.error("Kullanıcı Güncelleme Hatası:", e); }
      }

      // Düzenlenen kullanıcı 'kendi' oturumumuz ise profili de anında güncelle
      if(currentUserProfile.id === editUserData.id) {
          setCurrentUserProfile({...currentUserProfile, name: editUserData.name, role: editUserData.role, email: editUserData.email, phone: editUserData.phone});
      }
      
      setIsEditUserModalOpen(false);
      setEditUserData(null);
  };

const handleSendEInvoice = () => {
      setIsSendingEInvoice(true);
      setTimeout(async () => {
          setIsSendingEInvoice(false);
          setEInvoiceSuccess(true);
          
          const customerToUpdate = customers.find(c => c.id === eInvoiceModalData.customerId);
          if (customerToUpdate && db && firebaseUser) {
              const updatedPayments = (customerToUpdate.payments || []).map(p => 
                  p.id === eInvoiceModalData.id 
                  ? { ...p, hasEInvoice: true, eInvoiceNo: 'MBT' + Math.floor(100000000 + Math.random() * 900000000) } 
                  : p
              );
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), { payments: updatedPayments }, { merge: true });
          }
          setTimeout(() => { setEInvoiceSuccess(false); setEInvoiceModalData(null); }, 3000);
      }, 2000);
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
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), {
                  payments: [...existingPayments, { ...paymentToAssign, id: Date.now() }]
              }, { merge: true });

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

  // --- SÖZLEŞME VE PDF STATE'LERİ ---
  const [activeSettingsTab, setActiveSettingsTab] = useState('iban');
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractCustomer, setContractCustomer] = useState(null);
  const [contractRooms, setContractRooms] = useState([]);
  
  // --- SİSTEM AYARLARI: TAHSİLAT ORANLARI ---
  const [collectionRates, setCollectionRates] = useState({
      roomIncreaseRate: '50',
      sealFee: '200',
      interestRate: '4',
      isInterestActive: true
  });

  const [contractSettings, setContractSettings] = useState({
      iban: 'TR90 0020 3000 0871 2889 0000 34',
      accountHolder: 'Sembol Nakliyat Depoculuk Tic. Ltd. Şti',
      bankShortName: 'Albaraka',
      bankFullName: 'Albaraka Türk Katılım Bankası',
      ibanWarning: 'Ödeme yaparken açıklama kısmına oda numaranızı yazmayı unutmayınız.',
      clauses: [
          { id: 'm1', title: 'Madde 1 - TARAFLAR', content: 'Eşya Depolama Sözleşmesi\n\nİşbu eşya depolama sözleşmesi (bundan böyle "Sözleşme" olarak anılacaktır) aşağıda belirtilen taraflar arasında imzalanmıştır:\n\nHizmet Veren Adres: BAHÇELİEVLER MAH. YENİ SK. RAVZA APT. NO: 5 C PENDİK/İSTANBUL adresinde mukim.\n\nHizmet Veren Ad Soyad / Ünvan: Sembol Nakliyat Depoculuk Tic. Ltd. Şti.\n\nKartal Vergi Dairesi - Vergi No: 7600944287\n\nDepolatan Kişinin Ad Soyad / Ünvan: {{MUSTERI_AD}}\n\nT.C. Kimlik No / Vergi No: {{MUSTERI_TC}}\n\nDepolatan Kişinin İletişim Numarası: {{MUSTERI_TELEFON}}\n\nDepolatan Kişinin Yedek İletişim Numarası: {{MUSTERI_ALT_TELEFON}}\n\nDepolatan Kişinin Müşteri Numarası: {{MUSTERI_NUMARASI}}\n\nDepolatan Kişinin Adres: {{MUSTERI_ADRES}}\n\nBundan sonra "Depolatan kişi" olarak bahsedilecektir.' },
          { id: 'm2', title: 'Madde 2 - TANIMLAR', content: 'Depo: Hizmet Veren ile Depolatan Kişi arasında imzalanan bu sözleşmede Depolatan kişinin eşyalarının Hizmet Veren tarafından depolandığı yeri ifade eder.\n\nDepolama Hizmetinin Başlangıç Tarihi: {{GIRIS_TARIHI}}\n\nDepolanan alanın aylık ücreti KDV dahil {{AYLIK_UCRET}} TLdir.' },
          { id: 'm3', title: 'Madde 3 - SÖZLEŞMENİN KONUSU', content: 'Bu Sözleşme, Türk Borçlar Kanunu ve ilgili mevzuat hükümlerine tabi olarak, sözleşmedeki şartlar çerçevesinde Hizmet Veren ile Depolatan Kişi arasında kabul ve imza edilen, tarafların hak ve yükümlülüklerini gösteren aşağıda adresi belirtilen mülkte Hizmet Veren tarafından Depolatan Kişi\'ye ait eşyaların depolanma hizmetine İlişkin sözleşmedir.\n\nDepo Adresi:\nSapanbağları Mahallesi Düzova Sokak No:9\n\nEşyaların bulunduğu adresten olası bir zorunlu tahliye işleminde eşyaların başka bir depo adresine taşınması durumunda depolayan kişiye sözlü ve ya yazılı olarak bildirilecektir.' },
          { id: 'm4', title: 'Madde 4 - SÖZLEŞMENİN SÜRESİ', content: 'İşbu sözleşme belirtilen tarihten itibaren geçerli sayılacaktır.\n\nDepolama sözleşmesi depolayan kişinin giriş tarihinden çıkış tarihine kadar geçerlidir. Herhangi bir taahhüt zorunluluğu yoktur. Depolayan kişi istediği zaman tüm borçlarını ödeyip tüm eşyasını teslim alıp sözleşmeyi fesih edebilir.' },
          { id: 'm5', title: 'Madde 5 - DEPO ÜCRETİ', content: 'Sözleşmeye göre depolayan kişinin aylık depolama bedeli her ay giriş tarihinden itibaren düzenli olarak hizmet veren kişinin IBAN\'ına ödeme yapacaktır. Depo ücretine KDV dahildir.\n\nDepolayan kişi depo ücretini en geç giriş tarihinden 5 gün sonra yatırabilir. Depo ücretinin ödenmemesi durumunda olabilecek gecikme faizi yansıtılacaktır. Aylık ödeme kredi kartı ile yapılamaz. Hizmet veren firmanın kampanya durumu olmadığı müddetçe ödemenin IBAN yoluyla sağlanması gerekmektedir.\n\nC- Eşya Sahibi, Depo ücretini aşağıda belirtilen banka hesaba yatıracaktır.\n\nBanka Adı: {{BANKA_TAM_ADI}}\nIban: {{IBAN}}\nHesap Sahibi: {{HESAP_SAHIBI}}\n\n{{IBAN_UYARI}}' },
          { id: 'm6', title: 'Madde 6 - DEPO SORUMLULUK', content: 'Depolanacak eşyalar depoya indirilirken kısmen fotoğraf veya video kayıt altına alınacaktır. Depolanacak eşyaların içine konan eşyaların ne olduğu kaç adet olduğu ya da ne kadar değerli olduğu firmanın hizmet konusu değildir. Hizmet veren sadece depolanacak alanın güvenliğini ve depolayan kişi haricinden başka birinin girmemesini korumaktadır.\n\nHizmet Veren eşyaları Depo içinde zarar görmeyecek uygun şartlar altında saklamakla sorumludur. Ayrıca olası risklere karşı sigorta ile teminat altına almakla yükümlüdür.\n\nOlası yangın, hırsızlık, deprem gibi eşyanın uğrayacağı hasar ve kayıp rizikolarına karşı sigorta poliçesi hazırlanmamışsa Hizmet Veren zararları karşılamakla sorumludur.\n\nHizmet Veren eşyalarda meydana gelebilecek doğal eskime ve yıpranmalardan sorumlu tutulamaz.\n\nDepolatan kişi hizmet verene en az 3 gün önceden bilgi vermek koşulu ile herhangi bir depo borcu olmaksızın mesai saatleri içinde depo ziyareti yapabilir ve dilerse eşyalarının bir kısmını teslim alabilir. Depolayan kişi depoya giriş yapmadan önce Giriş - Çıkış tutanağı imzalaması gerekmektedir.\n\nHizmet veren tarafından verilen nakliyat hizmetleri ayrıca fiyatlandırılacaktır. Depolatan kişi depo ücretini veya birikmiş ödemelerini yapmadan eşyaları teslim alamaz.\n\nDepolanacak eşyalar depoya koyulduktan sonra kapılara mühür koyulup kayıt altına alınacaktır.\n\nDepolatan kişi aylık kira süresi dolduktan sonra 1 gün bile geçse bir sonraki ayın ödemesinin tamamını yapmayı taahhüt eder.\n\nHizmet veren firma depolatan kişinin kendine ait kiraladığı odaya koyduğu eşyaların içeriğini bilmediğinden dolayı gayri resmi yasal olmayan depolama içeriklerinden sorumlu değildir. Depolatan kişi tüm sorumluluğu kendi üzerine almıştır.\n\nDepo içerisinden eşya alımı için depolatan kişi kendi imkanlarıyla alır ve eski haline getirmesi gerekir. Aksi halde eski haline getirildikten sonra işçilik maaliyeti yansıtılacaktır.\n\nKapılara atılan mühürler tek kullanımlıktır. Mühür yenileme ücreti 200 TL+KDVdir.\n\nDepolanacak eşyaların içinde herhangi bir gıda malzemesi bulunmaması gerekmektedir. Bu sebepten dolayı oluşabilecek hasardan depolatan kişi sorumludur.\n\nDepolanacak eşyaların içinde bulunan döviz, hisse senedi, para, silah, ziynet eşyası ve değerli eşyalardan firmamız mesul değildir.' },
          { id: 'm7', title: 'Madde 7 - SÖZLEŞME FESHİ', content: 'Depolatan kişi depolanan eşyanın teslimi için hizmet veren firmaya en az 7 gün öncesinden bilgi vermesi halinde istediği tarihte eşyalarının nakliyesini isteyebilir.\n\nDepolatan kişi depo ücretini birbirini takip eden üç aylık ödeme döneminde ödemez ise Hizmet veren eşyaları tahliye etme hakkına sahip olacaktır. Tahliye sırasında oluşabilecek eksik ve hasarlı eşyalar hizmet veren firmanın sorumluluğunda değildir. Tahliye işleminde oluşan nakliye masrafları depolatan kişiye yansıtılacaktır.\n\nDepolatan kişi tahliyeden sonraki 3 ay boyunca güncel depo bedeli ve eklenmiş tahliye masraflarını ödemekle yükümlüdür. Ödenmemiş 3 aylık ödeme dönemi ve 3 aylık tahliye süreci tamamlanınca eşyaların duyuru yapılmaksızın ihale ile satışa sunulacaktır.\n\nSüre bitiminden önce taraflardan biri sözleşmeyi yenilemeyeceğini karşı tarafa yazılı olarak bildirmezse sözleşme aynı şartlarla hizmet bedeli bir önceki yılın fiyatının TEFE-TÜFE artış oranı dikkate alınmak suretiyle yeni kira bedeli belirlenerek otomatik yenilenecektir.\n\nToplu ödemelerde yapılan indirim kampanyası belirlenen süre için geçerlidir. Bu süreden önce eşyaların teslim alınması halinde hediye tutarı geri iade edilmeyecektir. Hediye ayları çıkarıldığında kalan ayların iadesi yapılacaktır. Kredi kartı ile yapılan toplu ödemelerde kesintiler hesaplanıp iadesi alınacaktır.\n\nNakliye hizmeti hizmet veren firmadan alınmamış ise hizmet veren firmanın kalıcı ambalajının (pat pat) eşyalar depodan çıkarken iadesinin alınması mecburidir.' },
          { id: 'm8', title: 'Madde 8 - TEBLİGAT ADRESLERİ', content: 'Hizmet verenin ve depolatan kişinin yukarda yazılı olan adresleri geçerli tebligat adresleridir. Tarafların tebligat adresinde olabilecek değişiklikler, değişimi takip eden 3 (üç) gün içerisinde diğer tarafa internet üzerinden veya yazılı olarak bildirilecektir. Bildirmediği takdirde sözleşmedeki adreslere yapılacak tebligatlar taraflara yapılmış olarak kabul edilecektir.' },
          { id: 'm9', title: 'Madde 9 - YETKİLİ MAHKEME VE İCRA DAİRESİ', content: 'İşbu Sözleşmenin, eklerinin, tadillerinin uygulanmasından veya yorumundan doğabilecek ihtilaflarda Türk Kanunları uygulanır ve taraflarca aksine bir hüküm kararlaştırılmadıkça HMK kuralları doğrultusunda yetkili mahkeme ve icra daireleri belirlenir.' },
          { id: 'm10', title: 'Madde 10 - YÜRÜRLÜK', content: 'İşbu Sözleşme taraflarca imzalandığı tarihte yürürlüğe girer ve daha erken feshedilmedikçe Sözleşmede belirtilen şekilde sona erer.\n\nİşbu Sözleşme 4 (dört) sayfadan oluşmaktadır. Sözleşmede yer almayan hususlar hakkında 6098 sayılı Borçlar Kanunu hükümleri geçerlidir.\n\nİşbu sözleşme, taraflarca tüm hususlarda mutabık kalınarak 2 nüsha olmak üzere belirtilen tarihte birlikte imza altına alınmıştır. Depolatan kişinin depolama günü depo adresine gelmediği takdirde sözleşme tarafına internet yoluyla iletilecektir ve kabul ettiği varsayılacaktır.' }
      ]
  });

  const handleClauseContentChange = (id, newContent) => {
      setContractSettings(prev => ({
          ...prev,
          clauses: prev.clauses.map(c => c.id === id ? { ...c, content: newContent } : c)
      }));
  };

  const handleOpenContract = (customer) => {
      const custRooms = rooms.filter(r => r.customerName === customer.name);
      setContractCustomer(customer);
      setContractRooms(custRooms);
      setIsContractModalOpen(true);
  };

  const renderClauseWithData = (content) => {
      let text = content;
      const roomNames = contractRooms.map(r => r.name).join(', ') || 'Belirtilmemiş';
      const entryDates = contractRooms.map(r => r.entryDate).join(', ') || 'Belirtilmemiş';
      
      let totalFee = 0;
      contractRooms.forEach(r => {
          const base = Number(r.monthlyFee || 0);
          const hasKdv = r.hasKdv !== undefined ? r.hasKdv : true;
          totalFee += hasKdv ? base * 1.20 : base;
      });

      text = text.replace(/{{MUSTERI_AD}}/g, contractCustomer?.name || '');
      text = text.replace(/{{MUSTERI_TC}}/g, contractCustomer?.tc || 'Belirtilmemiş');
      text = text.replace(/{{MUSTERI_TELEFON}}/g, contractCustomer?.phone || 'Belirtilmemiş');
      text = text.replace(/{{MUSTERI_ALT_TELEFON}}/g, contractCustomer?.altPhone || '-');
      text = text.replace(/{{MUSTERI_ADRES}}/g, contractCustomer?.address || 'Adres Girilmemiş');
      text = text.replace(/{{ODA_NUMARASI}}/g, roomNames);
      text = text.replace(/{{MUSTERI_NUMARASI}}/g, contractCustomer?.customerNo || 'Belirtilmemiş');
      text = text.replace(/{{GIRIS_TARIHI}}/g, entryDates);
      text = text.replace(/{{AYLIK_UCRET}}/g, totalFee > 0 ? totalFee : 'Belirtilmemiş');
      text = text.replace(/{{BANKA_TAM_ADI}}/g, contractSettings.bankFullName);
      text = text.replace(/{{IBAN}}/g, contractSettings.iban);
      text = text.replace(/{{HESAP_SAHIBI}}/g, contractSettings.accountHolder);
      text = text.replace(/{{IBAN_UYARI}}/g, contractSettings.ibanWarning);

      return text;
  };

  const handlePrintContract = () => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const roomNames = contractRooms.map(r => r.name).join(', ') || 'Belirtilmemiş';
      const entryDates = contractRooms.map(r => r.entryDate).join(', ') || 'Belirtilmemiş';
      
      let totalFee = 0;
      contractRooms.forEach(r => {
          const base = Number(r.monthlyFee || 0);
          const hasKdv = r.hasKdv !== undefined ? r.hasKdv : true;
          totalFee += hasKdv ? base * 1.20 : base;
      });

      const processedClauses = contractSettings.clauses.map(clause => {
          let text = clause.content;
          text = text.replace(/{{MUSTERI_AD}}/g, contractCustomer?.name || '');
          text = text.replace(/{{MUSTERI_TC}}/g, contractCustomer?.tc || 'Belirtilmemiş');
          text = text.replace(/{{MUSTERI_TELEFON}}/g, contractCustomer?.phone || 'Belirtilmemiş');
          text = text.replace(/{{MUSTERI_ALT_TELEFON}}/g, contractCustomer?.altPhone || '-');
          text = text.replace(/{{MUSTERI_ADRES}}/g, contractCustomer?.address || 'Adres Girilmemiş');
          text = text.replace(/{{ODA_NUMARASI}}/g, roomNames);
          text = text.replace(/{{MUSTERI_NUMARASI}}/g, contractCustomer?.customerNo || 'Belirtilmemiş');
          text = text.replace(/{{GIRIS_TARIHI}}/g, entryDates);
          text = text.replace(/{{AYLIK_UCRET}}/g, totalFee > 0 ? totalFee : 'Belirtilmemiş');
          text = text.replace(/{{BANKA_TAM_ADI}}/g, contractSettings.bankFullName);
          text = text.replace(/{{IBAN}}/g, contractSettings.iban);
          text = text.replace(/{{HESAP_SAHIBI}}/g, contractSettings.accountHolder);
          text = text.replace(/{{IBAN_UYARI}}/g, contractSettings.ibanWarning);
          return { ...clause, content: text };
      });

      // Madde içeriklerini Hamdi sözleşmesi gibi bold satırlar + normal paragraflar olarak render et
      const clausesHtml = processedClauses.map(clause => {
          const lines = clause.content.split('\n');
          const linesHtml = lines.map(line => {
              const trimmed = line.trim();
              if (!trimmed) return '<br/>';
              // "Anahtar: Değer" formatındaki satırlar: anahtar kısmı bold
              const colonIdx = trimmed.indexOf(':');
              if (colonIdx > 0 && colonIdx < 60) {
                  const key = trimmed.substring(0, colonIdx);
                  const val = trimmed.substring(colonIdx + 1).trim();
                  // Sadece kısa anahtar kelimeler için bold uygula (uzun cümleler değil)
                  if (key.split(' ').length <= 8) {
                      return val
                          ? `<p><strong>${key}:</strong> ${val}</p>`
                          : `<p><strong>${key}:</strong></p>`;
                  }
              }
              return `<p>${trimmed}</p>`;
          }).join('');
          return `
              <div class="clause">
                  <h3>${clause.title}</h3>
                  ${linesHtml}
              </div>
          `;
      }).join('');

      // Footer: tfoot tekniği ile her sayfada tekrar eder
const footerHtml = `
          <div style="padding: 0 24px;">
          <table style="width:100%; border-collapse:collapse; border:none; font-family:Arial,sans-serif; font-size:9pt;">
              <tr>
                  <td style="width:33%; vertical-align:bottom; padding:0; border:none;">
                      <div style="line-height:1.7;">
                          <div style="font-weight:bold;">HİZMET VEREN</div>
                          <div><strong>Ad Soyad / Ünvan:</strong> ${contractSettings.accountHolder}</div>
                          <div><strong>İmza Yetkili Kişi Ad Soyad:</strong></div>
                          <div><strong>İmza:</strong></div>
                          <div style="margin-top:6px;">
                              <img src="https://www.sembolevdeneve.com/crm/uploads/ka%C5%9Fe.jpg" style="width:110px; mix-blend-mode:multiply; opacity:0.95;" /><br/><br/>
                          </div>
                      </div>
                  </td>
                  <td style="width:34%; vertical-align:bottom; text-align:center; padding-bottom:4px; border:none;">
                      <img src="https://www.depoevim.com/wp-content/uploads/2025/07/cropped-logo.webp" alt="Depoevim" style="height:40px; object-fit:contain;" /><br/><br/>
                  </td>
                  <td style="width:33%; vertical-align:bottom; padding:0; border:none;">
                      <div style="line-height:1.7;">
                          <div style="font-weight:bold;">DEPOLATAN KİŞİ</div>
                          <div><strong>Ad Soyad / Ünvan:</strong> ${contractCustomer?.name}</div>
                          <div><strong>İmza Yetkili Kişi Ad Soyad:</strong></div>
                          <div><strong>İmza:</strong><br/><br/><br/><br/><br/><br/></div>
                      </div>
                  </td>
              </tr>
          </table>
          </div>
      `;

iframe.contentWindow.document.open();
      
      const fileName = contractCustomer?.name ? normalizeStr(contractCustomer.name).replace(/\s+/g, '-') : 'musteri';
      
      iframe.contentWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>musteri_${fileName}_sozlesme</title>
              <style>
                  @page { size: A4 portrait; margin: 15mm 15mm 55mm 15mm; }

                  /* Temel font — Hamdi sözleşmesiyle aynı */
                  body {
                      font-family: Arial, sans-serif;
                      font-size: 10pt;
                      color: #333;
                      line-height: 1.55;
                      margin: 0;
                      padding: 0;
                  }

                  /* Dış çerçeve kutusu — Hamdi sözleşmesindeki beyaz kart görünümü */
                  .page-box {
                      border: 1px solid #d0d0d0;
                      border-radius: 4px;
                      padding: 22px 24px;
                      background: #fff;
                  }

                  /* Büyük başlık */
                  .doc-title {
                      text-align: center;
                      font-size: 15pt;
                      font-weight: bold;
                      margin-bottom: 20px;
                      color: #111;
                  }

                  /* Madde başlıkları — bold, siyah */
                  .clause { margin-bottom: 16px; page-break-inside: avoid; }
                  .clause h3 {
                      font-size: 10.5pt;
                      font-weight: bold;
                      color: #111;
                      margin: 0 0 5px 0;
                      padding: 0;
                  }

                  /* Normal paragraflar */
                  .clause p {
                      margin: 0 0 3px 0;
                      text-align: justify;
                      color: #333;
                  }

                  /* Bold anahtar + değer satırları */
                  .clause p strong {
                      color: #111;
                      font-weight: bold;
                  }

                  /* Filigran */
                  .watermark {
                      position: fixed;
                      top: 50%; left: 50%;
                      transform: translate(-50%, -50%) rotate(-45deg);
                      font-size: 72pt;
                      font-weight: bold;
                      color: rgba(0,0,0,0.03);
                      z-index: -1;
                      white-space: nowrap;
                      pointer-events: none;
                  }

                  /* tfoot her sayfada tekrar eder */
                  table.page-table { width: 100%; border-collapse: collapse; }
                  table.page-table > thead > tr > td,
                  table.page-table > tbody > tr > td,
                  table.page-table > tfoot > tr > td { border: none; padding: 0; vertical-align: top; }

tfoot.repeat-footer > tr > td {
                      padding-top: 25px;
                      padding-bottom: 25px;
                      border-top: 1px solid #bbb;
                  }
              </style>
          </head>
          <body>
              <div class="watermark">Depoevim</div>

              <table class="page-table">
                  <thead><tr><td style="height:0;padding:0;"></td></tr></thead>
                  <tfoot class="repeat-footer">
                      <tr><td>${footerHtml}</td></tr>
                  </tfoot>
                  <tbody>
                      <tr>
                          <td>
                              <div class="page-box">
                                  <div class="doc-title">Eşya Depolama Sözleşmesi</div>
                                  ${clausesHtml}
                              </div>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </body>
          </html>
      `);
      iframe.contentWindow.document.close();
      
setTimeout(() => {
          // Yazdırma anında sayfa başlığını değiştirip PDF ismini ayarlıyoruz
          const originalTitle = document.title;
          const fileName = contractCustomer?.name ? normalizeStr(contractCustomer.name).replace(/\s+/g, '-') : 'musteri';
          document.title = `musteri_${fileName}_sozlesme`;
          
          iframe.contentWindow.focus();
          iframe.contentWindow.print(); // PDF olarak kaydetme ekranını doğrudan tetikler
          
          // Yazdırma penceresi açıldıktan sonra orijinal başlığı geri al
          document.title = originalTitle;
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 500);
};

  const handlePrintLedger = (customer, ledgerTransactions, finalBalance, periodStr = 'all') => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const tableRows = ledgerTransactions.map(tx => `
          <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${tx.dateStr}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${tx.desc}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626; font-weight: bold;">${tx.debt > 0 ? (tx.baseDebt || 0).toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' TL' : '-'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #f97316; font-weight: bold;">${tx.debt > 0 ? (tx.kdvDebt || 0).toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' TL' : '-'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #16a34a; font-weight: bold;">${tx.credit > 0 ? tx.credit.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' TL' : '-'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #1f2937;">${tx.balance.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL</td>
          </tr>
      `).join('');

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>${customer.name} - Cari Hesap Dökümü</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm; }
                  body { font-family: 'Arial', sans-serif; padding: 0; color: #333; margin: 0; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1bc5bd; padding-bottom: 15px; }
                  .header h2 { margin: 0 0 10px 0; color: #1f2937; font-size: 24px; }
                  .info-box { display: flex; justify-content: space-between; background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                  .info-box div { font-size: 14px; }
                  .info-box strong { color: #475569; display: inline-block; width: 120px; }
                  table { width: 100%; border-collapse: collapse; font-size: 13px; }
                  th { background-color: #f1f5f9; padding: 12px 10px; text-align: left; color: #475569; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
                  .total-row td { background-color: #f8fafc; padding: 15px 10px; border-top: 2px solid #cbd5e1; font-weight: bold; font-size: 14px; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100pt; font-weight: bold; color: rgba(0, 0, 0, 0.03); z-index: -1; }
              </style>
          </head>
          <body>
              <div class="watermark">Depoevim</div>
              <div class="header">
                  <h2>MÜŞTERİ CARİ HESAP DÖKÜMÜ (EKSTRE) ${periodStr !== 'all' ? `- ${periodStr} YILI` : ''}</h2>
              </div>
              <div class="info-box">
                  <div>
                      <div style="margin-bottom: 8px;"><strong>Müşteri Adı:</strong> ${customer.name}</div>
                      <div style="margin-bottom: 8px;"><strong>Müşteri No:</strong> ${customer.customerNo}</div>
                      <div><strong>Telefon:</strong> ${customer.phone}</div>
                  </div>
                  <div style="text-align: right;">
                      <div style="margin-bottom: 8px;"><strong>Belge Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</div>
                      <div><strong>Güncel Bakiye:</strong> <span style="color: ${finalBalance > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold; font-size: 16px;">${finalBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span></div>
                  </div>
              </div>
              <table>
                  <thead>
                      <tr>
                          <th>Tarih</th>
                          <th>İşlem Açıklaması</th>
                          <th style="text-align: right;">Borç (Tahakkuk)</th>
                          <th style="text-align: right;">+ KDV %20 Tutarı</th>
                          <th style="text-align: right;">Alacak (Ödenen)</th>
                          <th style="text-align: right;">Bakiye</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${tableRows}
                      <tr class="total-row">
                          <td colspan="2" style="text-align: right; color: #475569;">DÖNEM TOPLAMI / GÜNCEL BAKİYE:</td>
                          <td style="text-align: right; color: #dc2626;">${ledgerTransactions.reduce((sum, tx) => sum + (tx.baseDebt || 0), 0).toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL</td>
                          <td style="text-align: right; color: #f97316;">${ledgerTransactions.reduce((sum, tx) => sum + (tx.kdvDebt || 0), 0).toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL</td>
                          <td style="text-align: right; color: #16a34a;">${ledgerTransactions.reduce((sum, tx) => sum + tx.credit, 0).toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL</td>
                          <td style="text-align: right; color: ${finalBalance > 0 ? '#dc2626' : '#16a34a'}; font-size: 16px;">${finalBalance.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL</td>
                      </tr>
                  </tbody>
              </table>
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

  const handlePrintInvoice = (tx) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const d = new Date(tx.date);
      const dateStr = !isNaN(d.getTime()) ? `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}` : tx.date;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>Tahsilat Makbuzu - ${tx.customerName}</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm; }
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

  const handleCustomerSelfPickupNotification = () => {
      setIsTutanakDropdownOpen(false);
      const room = selectedRoomDetail;
      const customer = customers.find(c => c.name === room?.customerName);
      
      if (!room || !customer) {
          alert("Oda veya müşteri bilgisi bulunamadı!");
          return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const d = new Date();
      const todayStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
      
      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Müşteri Kendi Alma Bilgilendirme - ${customer.name}</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm; }
                  body { font-family: 'Arial', sans-serif; line-height: 1.6; font-size: 11pt; color: #000; margin: 0; padding: 0; }
                  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1bc5bd; padding-bottom: 10px; }
                  .logo { font-size: 36px; font-weight: 900; margin-bottom: 5px; }
                  .logo .black { color: #1f2937; }
                  .logo .blue { color: #0ea5e9; }
                  .subtitle { font-size: 11pt; color: #64748b; font-weight: bold; letter-spacing: 2px; margin-bottom: 10px; }
                  .title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 20px; text-decoration: underline; }
                  .info-box { border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 25px; border-radius: 8px; background-color: #f8fafc; }
                  .content-list { margin-bottom: 30px; padding-left: 20px; }
                  .content-list li { margin-bottom: 10px; text-align: justify; }
                  .price-list { margin-top: 5px; font-weight: bold; }
                  .footer { display: flex; justify-content: flex-end; margin-top: 30px; }
                  .signature-box { text-align: center; width: 250px; }
                  .sig-title { font-weight: bold; margin-bottom: 10px; }
                  .sig-name { margin-top: 10px; font-size: 11pt; }
                  .sig-line { border-bottom: 1px solid #000; margin-top: 40px; width: 80%; margin-left: auto; margin-right: auto; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; font-weight: bold; color: rgba(0, 0, 0, 0.03); z-index: -1; }
              </style>
          </head>
          <body>
              <div class="watermark">Depoevim</div>
              <div class="header">
                  <div class="logo"><span class="black">Depo</span><span class="blue">evim</span></div>
                  <div class="subtitle">EŞYA DEPOLAMA</div>
              </div>
              
              <div class="title">FARKLI FİRMA VEYA MÜŞTERİ TARAFINDAN DEPO ÇIKIŞLARI<br/>Talimatlar & Kurallar</div>
              
              <div class="info-box">
                  <strong>Müşteri Adı Soyadı:</strong> ${customer.name}<br/>
                  <strong>Müşteri No / Telefon:</strong> ${customer.customerNo} / ${customer.phone}<br/>
                  <strong>Oda Numarası:</strong> ${room.name} <br/>
                  <strong>Tarih:</strong> ${todayStr}
              </div>

              <ol class="content-list">
                  <li>Depolayan kişinin depo borcunun tamamı ödenmiş olması gerekmektedir.</li>
                  <li>Depolayan kişinin eşya teslim sırasında bulunması gerekmektedir.</li>
                  <li>Eşyalar depodan çıkış yapmadan depolayan kişi teslim tutanağını ıslak imza ile imzalaması gerekmektedir.</li>
                  <li>Depo sorumluluğumuz yalnızca depoyu açma ve kapama işlemi yapmaktır.</li>
                  <li>Depolayan kişi başka nakliye hizmeti için minimum 48 saat öncesinden haber verip randevu alması gerekmektedir.</li>
                  <li>Depolayan kişi, Sembol Nakliyat dışında başka bir firmadan hizmet alır ise, deposu açıldığı andan itibaren oluşabilecek hasar, eksik eşya veya fazla eşya alınması vb. durumlarda depolayan kişi sorumludur.</li>
                  <li>Ümraniye, Kartal ve Çekmeköy depolar fabrikada bulunduğundan dolayı dışarıdan gelen nakliye personelinin sigortalı olması zorunludur.</li>
                  <li>Ümraniye, Kartal ve Çekmeköy deposundan çıkarılacak eşyalar için dışarıdan gelen nakliyeci 1 gün öncesinden gelecek personellerin sigorta giriş belgelerini firmamıza iletmesi gerekmektedir.</li>
                  <li>Depo çalışma saatleri: 10.00-17.00. Pazar günleri kapalıdır.</li>
                  <li>Depodan eşyaların alınma süresi maksimum 2 saattir. Bu sürenin uzaması durumunda mesai ücreti alınması gerekmektedir.</li>
                  <li>Eşyanın tamamı alınmadığı süre zarfında çıkış işlemi yapılmayacaktır.</li>
                  <li>Taşıma sırasında oluşabilecek iş güvenliği ve depoya hasar durumlarından depolayan kişi sorumludur.</li>
                  <li>Depolayan kişi daha önce nakliye hizmetini depo firmasından almış ise kalıcı ambalaj iadesi ya da ücretini ödemek mecburidir.</li>
                  <li>Kalıcı Ambalaj Ücretleri:
                      <ul class="price-list">
                          <li>15 m³ - 2.000 TL + KDV</li>
                          <li>22 m³ - 3.000 TL + KDV</li>
                          <li>30 m³ - 4.000 TL + KDV</li>
                      </ul>
                  </li>
              </ol>

              <div class="footer">
                  <div class="signature-box">
                      <div class="sig-title">Depolayan Kişinin Ad Soyad ve İmzası</div>
                      <div class="sig-name">${customer.name}</div>
                      <div class="sig-line"></div>
                  </div>
              </div>
          </body>
          </html>
      `;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(htmlContent);
      iframe.contentWindow.document.close();

      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
          
          const text = `Sayın ${customer.name},\n\n*${room.name}* numaralı odanız için "Farklı Firma veya Müşteri Tarafından Depo Çıkışları - Talimatlar ve Kurallar" belgesi oluşturulmuştur.\n\nİlgili PDF belgesi sistemimiz üzerinden hazırlanmış olup tarafınıza iletilmek üzere kaydedilmiştir. Lütfen belgeyi inceleyip onaylayınız.\n\nİyi günler dileriz.`;
          const encodedText = encodeURIComponent(text);
          let waPhone = customer.phone.replace(/\D/g, '');
          if (waPhone.length === 10) waPhone = '90' + waPhone;
          else if (waPhone.length === 11 && waPhone.startsWith('0')) waPhone = '90' + waPhone.substring(1);
          
          window.open(`https://wa.me/${waPhone}?text=${encodedText}`, '_blank');
      }, 500);
  };

  const handleExternalTransportEntry = () => {
      setIsTutanakDropdownOpen(false);
      const room = selectedRoomDetail;
      const customer = customers.find(c => c.name === room?.customerName);
      
      if (!room || !customer) {
          alert("Oda veya müşteri bilgisi bulunamadı!");
          return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const d = new Date();
      const todayStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
      
      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Farklı Firma İle Giriş Tutanağı - ${customer.name}</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm; }
                  body { font-family: 'Arial', sans-serif; line-height: 1.6; font-size: 11pt; color: #000; margin: 0; padding: 0; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1bc5bd; padding-bottom: 15px; }
                  .logo { font-size: 36px; font-weight: 900; margin-bottom: 5px; }
                  .logo .black { color: #1f2937; }
                  .logo .blue { color: #0ea5e9; }
                  .subtitle { font-size: 11pt; color: #64748b; font-weight: bold; letter-spacing: 2px; margin-bottom: 15px; }
                  .title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 25px; text-decoration: underline; }
                  .info-box { border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 25px; border-radius: 8px; background-color: #f8fafc; }
                  .content-list { margin-bottom: 40px; padding-left: 20px; }
                  .content-list li { margin-bottom: 12px; text-align: justify; }
                  .footer { display: flex; justify-content: flex-end; margin-top: 40px; }
                  .signature-box { text-align: center; width: 250px; }
                  .sig-title { font-weight: bold; margin-bottom: 10px; }
                  .sig-name { margin-top: 10px; font-size: 11pt; }
                  .sig-line { border-bottom: 1px solid #000; margin-top: 40px; width: 80%; margin-left: auto; margin-right: auto; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; font-weight: bold; color: rgba(0, 0, 0, 0.03); z-index: -1; }
              </style>
          </head>
          <body>
              <div class="watermark">Depoevim</div>
              <div class="header">
                  <div class="logo"><span class="black">Depo</span><span class="blue">evim</span></div>
                  <div class="subtitle">EŞYA DEPOLAMA</div>
              </div>
              
              <div class="title">DEPOEVİM FARKLI FİRMA İLE DEPOYA EŞYA GİRİŞ TUTANAĞI</div>
              
              <div class="info-box">
                  <strong>Müşteri Adı Soyadı:</strong> ${customer.name}<br/>
                  <strong>Müşteri No / Telefon:</strong> ${customer.customerNo} / ${customer.phone}<br/>
                  <strong>Oda Numarası:</strong> ${room.name} <br/>
                  <strong>Tarih:</strong> ${todayStr}
              </div>

              <ol class="content-list">
                  <li>Depolayan kişi deponun ilk ayını ödemesini eşya depoya yerleşmeden yapmalıdır.</li>
                  <li>Depolayan kişinin eşya yerleştirme sırasında bulunması gerekmektedir.</li>
                  <li>Eşyalar depodan giriş yapmadan depolayan kişi sözleşmeyi imzalaması gerekmektedir.</li>
                  <li>Depo sorumlumuz yalnızca depoyu açma ve kapama işlemi yapmaktadır.</li>
                  <li>Depolayan kişi başka nakliye hizmeti için minimum 48 saat öncesinden haber ve randevu alması gerekmektedir.</li>
                  <li>Depolayan kişi, Sembol Nakliyat dışında başka bir firmadan hizmet alır ise, deposu açıldığı andan itibaren oluşabilecek hasar, eksik eşya veya fazla eşya alınması vb. durumlarında depolayan kişi sorumludur.</li>
                  <li>Ümraniye ve Kartal ve Çekmeköy’deki depolar fabrika olduğundan dolayı dışardan gelen nakliye personelinin sigortalı olması zorunludur.</li>
                  <li>Ümraniye ve Kartal ve Çekmeköy deposuna getirilecek eşyalar için dışardan gelen nakliyeci 1 gün öncesinden gelecek personellerin sigorta giriş belgelerini firmamıza iletmesi gerekmektedir.</li>
                  <li>Depo çalışma saatleri: 10:00 – 17:00 saatleri arasındadır. Pazar günleri kapalıdır.</li>
                  <li>Depoya eşyaların yerleştirme süresi maksimum 2 saattir. Bu sürenin uzaması durumunda mesai ücreti alınması gerekmektedir.</li>
                  <li>Taşıma sırasında oluşabilecek iş güvenliği, asansör hasarı ve depoya hasar durumlarından depoyu kiralayan kişi sorumludur.</li>
              </ol>

              <div class="footer">
                  <div class="signature-box">
                      <div class="sig-title">Depolayan Kişinin Ad Soyad ve İmzası</div>
                      <div class="sig-name">${customer.name}</div>
                      <div class="sig-line"></div>
                  </div>
              </div>
          </body>
          </html>
      `;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(htmlContent);
      iframe.contentWindow.document.close();

      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
          
          const text = `Sayın ${customer.name},\n\n*${room.name}* numaralı odanız için "Farklı Firma İle Depoya Eşya Giriş Tutanağı" oluşturulmuştur. \n\nİlgili PDF belgesi sistemimiz üzerinden hazırlanmış olup tarafınıza iletilmek üzere kaydedilmiştir. Lütfen belgeyi inceleyip onaylayınız.\n\nİyi günler dileriz.`;
          const encodedText = encodeURIComponent(text);
          let waPhone = customer.phone.replace(/\D/g, '');
          if (waPhone.length === 10) waPhone = '90' + waPhone;
          else if (waPhone.length === 11 && waPhone.startsWith('0')) waPhone = '90' + waPhone.substring(1);
          
          window.open(`https://wa.me/${waPhone}?text=${encodedText}`, '_blank');
      }, 500);
  };

  const handleDamageReportDocument = () => {
      setIsTutanakDropdownOpen(false);
      const room = selectedRoomDetail;
      const customer = customers.find(c => c.name === room?.customerName);
      
      if (!room || !customer) {
          alert("Oda veya müşteri bilgisi bulunamadı!");
          return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Nakliye Hasar Tutanağı - ${customer.name}</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm; }
                  body { font-family: 'Arial', sans-serif; line-height: 1.8; font-size: 13pt; color: #000; margin: 0; padding: 0; position: relative; min-height: 250mm; }
                  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e30a17; padding-bottom: 15px; }
                  .logo-text { color: #e30a17; font-size: 36px; font-weight: 900; margin: 0 0 5px 0; letter-spacing: 1px; }
                  .subtitle { font-size: 14pt; color: #000; font-weight: bold; margin: 0; }
                  .title { font-size: 16pt; font-weight: bold; text-align: center; margin: 40px 0; text-decoration: underline; }
                  .content { text-align: justify; margin-bottom: 50px; font-size: 14pt; line-height: 2; }
                  .form-group { margin-bottom: 20px; font-weight: bold; }
                  .flex-line { display: flex; align-items: flex-end; }
                  .footer { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 11pt; border-top: 1px solid #ccc; padding-top: 15px; color: #333; line-height: 1.5; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; font-weight: bold; color: rgba(0, 0, 0, 0.03); z-index: -1; }
              </style>
          </head>
          <body>
              <div class="watermark">Sembol Nakliyat</div>
              <div class="header">
                  <h1 class="logo-text">SEMBOL NAKLİYAT</h1>
                  <h3 class="subtitle">EVDEN EVE - ASANSÖRLÜ TAŞIMA - DEPOLAMA</h3>
              </div>
              
              <div class="title">DEPOEVİM NAKLİYE HASAR TUTANAĞI</div>
              
              <div class="content">
                  <p>
                      Depoevim firmasının deposunda bulunan <strong>${room.name}</strong> oda numaralı <strong>${customer.name}</strong> adlı müşteriye ait olan eşyaları teslim alırken taşıma sırasında deponun içinde ve çevresinde oluşabilecek tüm hasarlardan sorumlu olduğumu taahhüt ederim.
                  </p>
                  
                  <div style="margin-top: 60px;">
                      <div class="form-group flex-line">
                          <span style="white-space: nowrap;">Nakliye Firması Ünvanı:</span> <span style="flex: 1; border-bottom: 1px dotted #000; margin-left: 10px;">&nbsp;</span>
                      </div>
                      <div class="form-group flex-line">
                          <span style="white-space: nowrap;">Nakliye Firması VKN:</span> <span style="flex: 1; border-bottom: 1px dotted #000; margin-left: 10px;">&nbsp;</span>
                      </div>
                      <div class="form-group flex-line" style="margin-top: 40px;">
                          <span style="white-space: nowrap;">Nakliye Firması Yetkili Kişi İsim Soyisim İmza:</span> <span style="flex: 1; border-bottom: 1px dotted #000; margin-left: 10px;">&nbsp;</span>
                      </div>
                  </div>
              </div>

              <div class="footer">
                  <strong>SEMBOL NAKLİYAT DEPOCULUK TİC.LTD.ŞTİ.</strong><br/>
                  Bahçelievler mah. Yeni sokak No 5 C Pendik / İstanbul<br/>
                  0(216) 390 89 99 / 0(554) 726 16 61<br/>
                  www.sembolevdeneve.com
              </div>
          </body>
          </html>
      `;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(htmlContent);
      iframe.contentWindow.document.close();

      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
          
          const text = `Sayın ${customer.name},\n\n*${room.name}* numaralı odanız için "Nakliye Hasar Tutanağı" oluşturulmuştur.\n\nİlgili PDF belgesi sistemimiz üzerinden hazırlanmış olup tarafınıza iletilmek üzere kaydedilmiştir. Lütfen belgeyi inceleyip nakliye firmasına imzalattığınızdan emin olunuz.\n\nİyi günler dileriz.`;
          const encodedText = encodeURIComponent(text);
          let waPhone = customer.phone.replace(/\D/g, '');
          if (waPhone.length === 10) waPhone = '90' + waPhone;
          else if (waPhone.length === 11 && waPhone.startsWith('0')) waPhone = '90' + waPhone.substring(1);
          
          window.open(`https://wa.me/${waPhone}?text=${encodedText}`, '_blank');
      }, 500);
  };

  const handleProxyDocument = () => {
      setIsTutanakDropdownOpen(false);
      const room = selectedRoomDetail;
      const customer = customers.find(c => c.name === room?.customerName);
      
      if (!room || !customer) {
          alert("Oda veya müşteri bilgisi bulunamadı!");
          return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const d = new Date();
      const todayStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
      
      // Müşterinin vekili varsa ismini yaz, yoksa noktalı boşluk bırak
      const proxyName = customer.proxyName || '......................................................';
      const proxyTc = customer.proxyTc || '...........................';

      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Vekalet Tutanağı - ${customer.name}</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm; }
                  body { font-family: 'Arial', sans-serif; line-height: 1.8; font-size: 13pt; color: #000; margin: 0; padding: 0; position: relative; min-height: 250mm; }
                  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e30a17; padding-bottom: 15px; }
                  .logo-text { color: #e30a17; font-size: 36px; font-weight: 900; margin: 0 0 5px 0; letter-spacing: 1px; }
                  .subtitle { font-size: 14pt; color: #000; font-weight: bold; margin: 0; }
                  .title { font-size: 16pt; font-weight: bold; text-align: center; margin: 40px 0; text-decoration: underline; }
                  .content { text-align: justify; margin-bottom: 50px; font-size: 14pt; line-height: 2; }
                  .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
                  .sig-box { text-align: center; width: 40%; }
                  .sig-title { font-weight: bold; margin-bottom: 10px; font-size: 12pt; }
                  .sig-name { margin-bottom: 40px; font-size: 12pt; }
                  .sig-line { border-bottom: 1px solid #000; width: 80%; margin: 0 auto; }
                  .footer { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 11pt; border-top: 1px solid #ccc; padding-top: 15px; color: #333; line-height: 1.5; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; font-weight: bold; color: rgba(0, 0, 0, 0.03); z-index: -1; }
              </style>
          </head>
          <body>
              <div class="watermark">Sembol Nakliyat</div>
              <div class="header">
                  <h1 class="logo-text">SEMBOL NAKLİYAT</h1>
                  <h3 class="subtitle">EVDEN EVE - ASANSÖRLÜ TAŞIMA - DEPOLAMA</h3>
              </div>
              
              <div class="title">DEPOEVİM DEPO GİRİŞ TUTANAĞI</div>
              
              <div class="content">
                  <p>
                      SEMBOL NAKLİYAT firmasının deposunda bulunan <strong>${customer.name}</strong> isimli, <strong>${room.name}</strong> oda numaralı depoya benim adıma <strong>${proxyName}</strong> (TC: ${proxyTc}) isimli kişi benim nezaretim olmadan giriş yapabilir.
                  </p>
                  <p style="margin-top: 30px;">
                      Tarih: ${todayStr}
                  </p>
              </div>

              <div class="signatures">
                  <div class="sig-box">
                      <div class="sig-title">Müşteri İsim Soyisim</div>
                      <div class="sig-name">${customer.name}</div>
                      <div class="sig-title">İmza</div>
                      <div class="sig-line"></div>
                  </div>
                  <div class="sig-box">
                      <div class="sig-title">Vekil İsim Soyisim</div>
                      <div class="sig-name">${proxyName}</div>
                      <div class="sig-title">İmza</div>
                      <div class="sig-line"></div>
                  </div>
              </div>

              <div class="footer">
                  <strong>SEMBOL NAKLİYAT DEPOCULUK TİC.LTD.ŞTİ.</strong><br/>
                  Bahçelievler mah. Yeni sokak No 5 C Pendik / İstanbul<br/>
                  0(216) 390 89 99 / 0(554) 726 16 61<br/>
                  www.sembolevdeneve.com
              </div>
          </body>
          </html>
      `;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(htmlContent);
      iframe.contentWindow.document.close();

      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
          
          let proxyText = customer.proxyName ? customer.proxyName : 'belirttiğiniz kişi';
          const text = `Sayın ${customer.name},\n\n*${room.name}* numaralı odanız için "Vekalet ve Depo Giriş Tutanağı" oluşturulmuştur.\n\nSistemimize vekiliniz olarak ${proxyText} tanımlanmıştır. İlgili PDF belgesi sistemimiz üzerinden hazırlanmış olup tarafınıza iletilmek üzere kaydedilmiştir. Lütfen belgeyi inceleyip imzalayınız.\n\nİyi günler dileriz.`;
          const encodedText = encodeURIComponent(text);
          let waPhone = customer.phone.replace(/\D/g, '');
          if (waPhone.length === 10) waPhone = '90' + waPhone;
          else if (waPhone.length === 11 && waPhone.startsWith('0')) waPhone = '90' + waPhone.substring(1);
          
          window.open(`https://wa.me/${waPhone}?text=${encodedText}`, '_blank');
      }, 500);
  };

  const handleRoomEntryExitDocument = () => {
      setIsTutanakDropdownOpen(false);
      const room = selectedRoomDetail;
      const customer = customers.find(c => c.name === room?.customerName);
      
      if (!room || !customer) {
          alert("Oda veya müşteri bilgisi bulunamadı!");
          return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const d = new Date();
      const todayStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
      const currentTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Depo Giriş Çıkış Tutanağı - ${customer.name}</title>
              <style>
                  @page { size: A4 portrait; margin: 20mm; }
                  body { font-family: 'Arial', sans-serif; line-height: 1.8; font-size: 13pt; color: #000; margin: 0; padding: 0; position: relative; min-height: 250mm; }
                  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e30a17; padding-bottom: 15px; }
                  .logo-text { color: #e30a17; font-size: 36px; font-weight: 900; margin: 0 0 5px 0; letter-spacing: 1px; }
                  .subtitle { font-size: 14pt; color: #000; font-weight: bold; margin: 0; }
                  .title { font-size: 16pt; font-weight: bold; text-align: center; margin: 40px 0; text-decoration: underline; }
                  .content { text-align: justify; margin-bottom: 30px; font-size: 14pt; line-height: 2; }
                  .input-line { display: inline-block; border-bottom: 1px dotted #000; width: 100px; }
                  .warning-box { border: 2px solid #e30a17; padding: 15px; text-align: center; font-weight: bold; margin-top: 30px; margin-bottom: 40px; font-size: 12pt; color: #e30a17; }
                  .signatures { display: flex; justify-content: flex-end; margin-top: 60px; }
                  .sig-box { text-align: center; width: 40%; }
                  .sig-title { font-weight: bold; margin-bottom: 10px; font-size: 12pt; }
                  .sig-name { margin-bottom: 40px; font-size: 12pt; }
                  .sig-line { border-bottom: 1px solid #000; width: 80%; margin: 0 auto; }
                  .footer { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 11pt; border-top: 1px solid #ccc; padding-top: 15px; color: #333; line-height: 1.5; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; font-weight: bold; color: rgba(0, 0, 0, 0.03); z-index: -1; }
              </style>
          </head>
          <body>
              <div class="watermark">Sembol Nakliyat</div>
              <div class="header">
                  <h1 class="logo-text">SEMBOL NAKLİYAT</h1>
                  <h3 class="subtitle">EVDEN EVE - ASANSÖRLÜ TAŞIMA - DEPOLAMA</h3>
              </div>
              
              <div class="title">DEPOEVİM DEPO GİRİŞ ÇIKIŞ TUTANAĞI</div>
              
              <div class="content">
                  <p>
                      SEMBOL NAKLİYAT firmasının deposunda bulunan <strong>${customer.name}</strong> isimli, <strong>${room.name}</strong> oda numaralı depoya giriş yapmış olup olabilecek tüm hasarların ve eksik eşyaların sorumluluğu şahsıma aittir.
                  </p>
                  
                  <div style="margin-top: 40px; display: flex; flex-direction: column; gap: 15px; font-weight: bold;">
                      <div>GİRİŞ TARİHİ : ${todayStr}</div>
                      <div>SAAT : ${currentTime}</div>
                      <div style="margin-top: 20px;">GİRİŞ <span class="input-line"></span> / ÇIKIŞ <span class="input-line"></span></div>
                  </div>
              </div>

              <div class="warning-box">
                  MÜHÜR DEĞİŞTİRME ÜCRETİ ${collectionRates.sealFee} TL + KDV FATURANIZA EKLENECEKTİR. (1 SAATLİK ÜCRETTİR.)
              </div>

              <div class="signatures">
                  <div class="sig-box">
                      <div class="sig-title">Müşteri İsim Soyisim</div>
                      <div class="sig-name">${customer.name}</div>
                      <div class="sig-title">İmza</div>
                      <div class="sig-line"></div>
                  </div>
              </div>

              <div class="footer">
                  <strong>SEMBOL NAKLİYAT DEPOCULUK TİC.LTD.ŞTİ.</strong><br/>
                  Bahçelievler mah. Yeni sokak No 5 C Pendik / İstanbul<br/>
                  0(216) 390 89 99 / 0(554) 726 16 61<br/>
                  www.sembolevdeneve.com
              </div>
          </body>
          </html>
      `;

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(htmlContent);
      iframe.contentWindow.document.close();

      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 1000);
          
          const text = `Sayın ${customer.name},\n\n*${room.name}* numaralı odanız için "Depo Giriş Çıkış Tutanağı" oluşturulmuştur.\n\nİlgili PDF belgesi sistemimiz üzerinden hazırlanmış olup tarafınıza iletilmek üzere kaydedilmiştir. Lütfen belgeyi inceleyip imzalayınız.\n\nİyi günler dileriz.`;
          const encodedText = encodeURIComponent(text);
          let waPhone = customer.phone.replace(/\D/g, '');
          if (waPhone.length === 10) waPhone = '90' + waPhone;
          else if (waPhone.length === 11 && waPhone.startsWith('0')) waPhone = '90' + waPhone.substring(1);
          
          window.open(`https://wa.me/${waPhone}?text=${encodedText}`, '_blank');
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

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>E-Fatura - ${tx.customerName}</title>
              <style>
                  @page { size: A4 portrait; margin: 15mm; }
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

  const handleOpenMessageModal = (customer, balance, type) => {
      setMessageModalData({ customer, balance, type });
  };

  const generateMessageText = (customer, balance, type) => {
      const iban = contractSettings.iban;
      const bank = contractSettings.bankFullName;
      const owner = contractSettings.accountHolder;
      const formattedBalance = balance.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
      
      let text = "";
      if (type === 'reminder') {
          text = `Merhaba ${customer.name},\n\nSistemimizde güncel cari hesabınıza ait toplam *${formattedBalance} TL* ödemeniz bulunmaktadır. Herhangi bir gecikme faizi işlememesi adına en kısa sürede ödemenizi gerçekleştirmenizi rica ederiz. İşlemlerinizin kesintisiz devam etmesi bizim için önemlidir.\n\n🏦 *Ödeme Bilgileri*\nBanka: ${bank}\nAlıcı: ${owner}\nIBAN: ${iban}\n\n⚠️ *ÖNEMLİ:* Ödemenizi gerçekleştirirken açıklama kısmına mutlaka *${customer.customerNo}* numaralı Müşteri Numaranızı yazmayı unutmayınız.\n\nİyi günler dileriz.`;
      } else if (type === 'warning') {
          text = `Sayın ${customer.name},\n\nSistem kayıtlarımıza göre ödenmemiş *${formattedBalance} TL* tutarında cari borcunuz bulunmaktadır. \n\nGecikme faizlerinin daha fazla artmaması ve hakkınızda yasal sürecin başlamaması adına en kısa sürede ödemenizi tamamlamanız gerekmektedir. Ödeme yapılmadığı takdirde sözleşmeden doğan haklarımız kullanılacaktır.\n\n🏦 *Hesap Bilgileri*\nBanka: ${bank}\nAlıcı: ${owner}\nIBAN: ${iban}\n\n⚠️ Lütfen ödeme açıklamasına *${customer.customerNo}* Müşteri Numaranızı ekleyiniz.\n\nBilgilerinize önemle sunarız.`;
      } else if (type === 'eviction') {
          text = `Sayın ${customer.name},\n\nBirikmiş olan *${formattedBalance} TL* borcunuz nedeniyle deponuzun *TAHLİYE* süreci başlatılma aşamasına gelmiştir.\n\nTahliye işlemi gerçekleştiği takdirde, oluşabilecek nakliye masrafları, eşya taşınırken doğabilecek hasar riskleri ve sürecin avukata intikaliyle eklenecek yasal takip masraflarından / faizlerden tamamen tarafınız sorumlu olacaktır. \n\nSüreci acilen durdurmak ve eşyalarınızın güvenliğini sağlamak için lütfen ödemenizi derhal gerçekleştiriniz.\n\n🏦 *Acil Ödeme Bilgileri*\nBanka: ${bank}\nAlıcı: ${owner}\nIBAN: ${iban}\n\n⚠️ Açıklama kısmına Müşteri Numaranızı (*${customer.customerNo}*) yazmanız zorunludur.`;
      }
      return text;
  };

  const handleSendMessage = (platform) => {
      if (!messageModalData) return;
      const { customer, balance, type } = messageModalData;
      const text = generateMessageText(customer, balance, type);
      const encodedText = encodeURIComponent(text);
      
      if (platform === 'whatsapp') {
          window.open(`https://wa.me/90${customer.phone}?text=${encodedText}`, '_blank');
      } else if (platform === 'sms') {
          // iOS ve Android cihazlar için SMS ayırıcı farklılıkları
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          const separator = isIOS ? '&' : '?';
          window.open(`sms:+90${customer.phone}${separator}body=${encodedText}`, '_self');
      }
      setMessageModalData(null);
  };

const handleAddExtraDocument = async (e, customerId) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      const customerToUpdate = customers.find(c => c.id === customerId);
      if (!customerToUpdate || !db || !firebaseUser) return;

      const promises = files.map(file => {
          return new Promise(async (resolve) => {
              const url = await uploadImageToServer(file);
              resolve({ id: Date.now() + Math.random(), url: url, name: file.name });
          });
      });

      const newFiles = await Promise.all(promises);
      const updatedDocs = [...(customerToUpdate.extraDocuments || []), ...newFiles];

      try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), { extraDocuments: updatedDocs }, { merge: true });
      } catch (err) { console.error(err); }
      e.target.value = '';
  };

  const handleDeleteExtraDocument = async (customerId, docId) => {
      const customerToUpdate = customers.find(c => c.id === customerId);
      if (!customerToUpdate || !db || !firebaseUser) return;
      const updatedDocs = (customerToUpdate.extraDocuments || []).filter(d => d.id !== docId);
      try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), { extraDocuments: updatedDocs }, { merge: true });
      } catch (err) { console.error(err); }
  };

  const [customers, setCustomers] = useState([]);

const handleSaveCustomer = async () => {
      if (!newCustomer.name || !newCustomer.tc || !newCustomer.phone) return;

      // YENİ EKLENEN KONTROL: Aynı TC/VKN sistemde kayıtlı mı kontrolü
      const existingCust = customers.find(c => c.tc && c.tc.trim() === newCustomer.tc.trim());
      if (existingCust) {
          setCustomerSaveError(`Girdiğiniz TC/Vergi Numarası sistemde halihazırda "${existingCust.name}" adına kayıtlıdır. Lütfen bilgileri kontrol ediniz.`);
          setTimeout(() => setCustomerSaveError(''), 6000); // 6 saniye sonra uyarı gizlenir
          return; // Kaydetme işlemini iptal et
      }

      let newNo = '';
      let isUnique = false;
      while (!isUnique) {
          newNo = Math.floor(10000 + Math.random() * 90000).toString();
          if (!customers.some(c => c.customerNo === newNo)) isUnique = true;
      }

      const custId = 'cust_' + Date.now();
const cust = {
              id: custId,
              customerNo: newNo,
              name: newCustomer.name.toUpperCase(),
              tc: newCustomer.tc,
              phone: newCustomer.phone,
              altPhone: newCustomer.altPhone,
              address: newCustomer.address,
              notes: newCustomer.notes,
              hasProxy: newCustomer.hasProxy,
              proxyName: newCustomer.hasProxy ? newCustomer.proxyName.toUpperCase() : '',
              proxyTc: newCustomer.hasProxy ? newCustomer.proxyTc : '',
              proxyPhone: newCustomer.hasProxy ? newCustomer.proxyPhone : '',
              proxyAltPhone: newCustomer.hasProxy ? newCustomer.proxyAltPhone : '',
              proxyAddress: newCustomer.hasProxy ? newCustomer.proxyAddress : '',
              proxyDocumentPhoto: newCustomer.hasProxy ? newCustomer.proxyDocumentPhoto : null,
              type: customerType,
              createdAt: new Date().toLocaleDateString('tr-TR'),
              invoices: [],
              documentPhoto: newCustomer.documentPhotoFront || null,
              documentPhotoFront: newCustomer.documentPhotoFront || null,
              documentPhotoBack: newCustomer.documentPhotoBack || null,
              payments: [], extraDebts: [], ledgerOverrides: []
          };

      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', custId), cust);
          } catch (e) { console.error("Firebase Kayıt Hatası:", e); }
      }
      
      setCustomerSaveError('');
      setNewCustomer({ name: '', tc: '', phone: '', altPhone: '', address: '', notes: '', documentPhotoFront: null, documentPhotoBack: null, hasProxy: false, proxyName: '', proxyTc: '', proxyPhone: '', proxyAltPhone: '', proxyAddress: '', proxyDocumentPhoto: null });
      setActiveMenu('tum-musteriler');
  };

const handleDeleteCustomer = async (customerId) => {
      const customerToDelete = customers.find(c => c.id === customerId);
      
      if (db && firebaseUser) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)));
              
              // Müşterinin odalarını da eşzamanlı olarak boşalt
              if (customerToDelete) {
                  const custRooms = rooms.filter(r => r.customerName === customerToDelete.name);
                  for (const r of custRooms) {
                      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(r.id)), {
                          customerName: null, phone: null, tc: null, paidMonths: []
                      }, { merge: true });
                  }
              }
          } catch (e) { console.error("Firebase Silme Hatası:", e); }
      }
      setIsDeleteCustomerModalOpen(false);
      if (selectedCustomerId === customerId) {
          setSelectedCustomerId(null);
      }
      setCustomerToDeleteId(null);
  };

const handleUpdateCustomer = async () => {
      if (!editCustomerData.name) return;
      const newName = editCustomerData.name.toUpperCase();
      const oldCustomer = customers.find(c => c.id === editCustomerData.id);
      
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(editCustomerData.id)), {
                  ...editCustomerData,
                  name: newName
              }, { merge: true });

              // İsim değiştiyse odalardaki ismi de otomatik güncelle
              if (oldCustomer && oldCustomer.name !== newName) {
                  const custRooms = rooms.filter(r => r.customerName === oldCustomer.name);
                  for (const r of custRooms) {
                      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(r.id)), {
                          customerName: newName
                      }, { merge: true });
                  }
              }
          } catch (e) { console.error("Firebase Güncelleme Hatası:", e); }
      }
      
      setIsEditCustomerModalOpen(false);
      setEditCustomerData(null);
  };

const handleDeleteLedgerItem = async (txId) => {
    const customerToUpdate = customers.find(c => c.id === selectedCustomerId);
    
    if (customerToUpdate && db && firebaseUser) {
        try {
            let updatePayload = {};

            if (txId.startsWith('debt-extra-')) {
                const debtId = parseInt(txId.replace('debt-extra-', ''));
                updatePayload = { extraDebts: (customerToUpdate.extraDebts || []).filter(d => d.id !== debtId) };
            } else if (txId.startsWith('credit-global-')) {
                const payId = parseInt(txId.replace('credit-global-', ''));
                updatePayload = { payments: (customerToUpdate.payments || []).filter(p => p.id !== payId) };
            } else {
                updatePayload = { 
                    ledgerOverrides: [
                        ...(customerToUpdate.ledgerOverrides || []).filter(o => o.txId !== txId),
                        { txId, isDeleted: true }
                    ]
                };
            }

            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(selectedCustomerId)), updatePayload, { merge: true });
        } catch(e) { console.error("Cari Silme Hatası:", e); }
    }
  };

const handleSaveLedgerEdit = async () => {
    if (!editingLedgerItem) return;
    const { id: txId, editDate, editDesc, editAmount, isDebt } = editingLedgerItem;
    const newAmount = Number(editAmount);
    const customerToUpdate = customers.find(c => c.id === selectedCustomerId);

    if (customerToUpdate && db && firebaseUser) {
        try {
            let updatePayload = {};

            if (txId.startsWith('debt-extra-')) {
                const debtId = parseInt(txId.replace('debt-extra-', ''));
                const updatedDebts = (customerToUpdate.extraDebts || []).map(d => d.id === debtId ? { ...d, date: editDate, desc: editDesc, amount: newAmount } : d);
                updatePayload = { extraDebts: updatedDebts };
            } else if (txId.startsWith('credit-global-')) {
                const payId = parseInt(txId.replace('credit-global-', ''));
                const updatedPayments = (customerToUpdate.payments || []).map(p => p.id === payId ? { ...p, date: editDate, note: editDesc, amount: newAmount } : p);
                updatePayload = { payments: updatedPayments };
            } else {
                // Otomatik hesaplanan oda kiralarına müdahale (Override)
                const updatedOverrides = [
                    ...(customerToUpdate.ledgerOverrides || []).filter(o => o.txId !== txId),
                    { txId, desc: editDesc, date: editDate, debt: isDebt ? newAmount : 0, credit: !isDebt ? newAmount : 0 }
                ];
                updatePayload = { ledgerOverrides: updatedOverrides };
            }

            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(selectedCustomerId)), updatePayload, { merge: true });
        } catch(e) { console.error("Cari Düzenleme Kayıt Hatası:", e); }
    }
    setEditingLedgerItem(null);
  };

const handleManualAddDebt = async () => {
    if (!newDebtData.desc || !newDebtData.amount) return;
    const baseAmount = Number(newDebtData.amount);
    const finalAmount = newDebtData.hasKdv ? baseAmount * 1.20 : baseAmount;
    
    const newDebt = {
        id: Date.now(),
        type: 'manual_debt',
        date: newDebtData.date,
        amount: finalAmount,
        hasKdv: newDebtData.hasKdv,
        desc: newDebtData.desc
    };

    const customerToUpdate = customers.find(c => c.id === selectedCustomerId);
    if (customerToUpdate && db && firebaseUser) {
        try {
            const existingDebts = customerToUpdate.extraDebts || [];
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(selectedCustomerId)), {
                extraDebts: [...existingDebts, newDebt]
            }, { merge: true });
        } catch(e) { console.error("Manuel Borç Ekleme Hatası:", e); }
    }

    setIsAddDebtModalOpen(false);
    setNewDebtData({ desc: '', amount: '', date: new Date().toISOString().split('T')[0], hasKdv: true });
  };

const handleManualAddPayment = async () => {
    if (!newPaymentData.amount) return;
    const newPayment = {
        id: Date.now(),
        amount: Number(newPaymentData.amount),
        date: newPaymentData.date,
        note: newPaymentData.note
    };

    const customerToUpdate = customers.find(c => c.id === selectedCustomerId);
    if (customerToUpdate && db && firebaseUser) {
        try {
            const existingPayments = customerToUpdate.payments || [];
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(selectedCustomerId)), {
                payments: [...existingPayments, newPayment]
            }, { merge: true });
        } catch(e) { console.error("Manuel Ödeme Ekleme Hatası:", e); }
    }

    setIsAddPaymentModalOpen(false);
    setNewPaymentData({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  };

const handleSaveCollectionNote = async () => {
      if (!collectionNoteData.customerId || !collectionNoteData.text) return;
      
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

      setIsCollectionNoteModalOpen(false);
      setCollectionNoteData({ customerId: null, text: '', promiseDate: '' });
  };

const handleSaveContractSettings = async () => {
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'contract'), contractSettings);
              alert("Ayarlar başarıyla Firebase'e kaydedildi!");
          } catch(e) { console.error("Ayar Kayıt Hatası:", e); }
      }
  };

const handleSaveCollectionRates = async () => {
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'rates'), collectionRates);
              alert("Tahsilat oranları başarıyla Firebase'e kaydedildi!");
          } catch(e) { console.error("Oran Kayıt Hatası:", e); }
      }
  };

const handleAddInvoice = async () => {
      if (!newInvoice.date || !newInvoice.file || !selectedCustomerId) return;
      const inv = { id: Date.now(), ...newInvoice };
      const customerToUpdate = customers.find(c => c.id === selectedCustomerId);
      if (customerToUpdate && db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(selectedCustomerId)), {
                  invoices: [...(customerToUpdate.invoices || []), inv]
              }, { merge: true });
          } catch (e) { console.error("Fatura Ekleme Hatası:", e); }
      }
      setNewInvoice({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], file: null });
  };

  const handleDeleteInvoice = async (invId) => {
      const customerToUpdate = customers.find(c => c.id === selectedCustomerId);
      if (customerToUpdate && db && firebaseUser) {
          try {
              const updatedInvoices = (customerToUpdate.invoices || []).filter(i => i.id !== invId);
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(selectedCustomerId)), {
                  invoices: updatedInvoices
              }, { merge: true });
          } catch (e) { console.error("Fatura Silme Hatası:", e); }
      }
  };

  // --- DEPO LİSTESİ STATE'LERİ ---
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [newDepoName, setNewDepoName] = useState('');
  const [newDepoM3, setNewDepoM3] = useState('');
  const [newDepoAddress, setNewDepoAddress] = useState('');
  
  const [isEditWarehouseModalOpen, setIsEditWarehouseModalOpen] = useState(false);
  const [editWarehouseData, setEditWarehouseData] = useState(null);

  const [isDeleteWarehouseModalOpen, setIsDeleteWarehouseModalOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);

  const [warehouses, setWarehouses] = useState([]);

  const handleAddWarehouse = async () => {
      if (!newDepoName) return;
      const newWarehouse = { id: Date.now(), name: newDepoName, m3: newDepoM3 || 0, address: newDepoAddress, orderIndex: warehouses.length };
      if (db && firebaseUser) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'warehouses', String(newWarehouse.id)), newWarehouse);
      setIsAddWarehouseModalOpen(false); setNewDepoName(''); setNewDepoM3(''); setNewDepoAddress('');
  };

  const handleEditWarehouse = async () => {
      if (!editWarehouseData?.name) return;
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'warehouses', String(editWarehouseData.id)), { name: editWarehouseData.name, m3: editWarehouseData.m3, address: editWarehouseData.address || '' }, { merge: true });
          } catch (e) { console.error("Firebase Depo Güncelleme Hatası:", e); }
      }
      setIsEditWarehouseModalOpen(false); setEditWarehouseData(null);
  };

  const handleDeleteWarehouseClick = (e, id) => {
      e.stopPropagation();
      setWarehouseToDelete(id);
      setIsDeleteWarehouseModalOpen(true);
  };

  const confirmDeleteWarehouse = async () => {
      if (!warehouseToDelete) return;
      if (db && firebaseUser) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'warehouses', String(warehouseToDelete)));
          } catch (e) { console.error("Firebase Depo Silme Hatası:", e); }
      } else {
          setWarehouses(warehouses.filter(w => w.id !== warehouseToDelete));
      }
      setIsDeleteWarehouseModalOpen(false);
      setWarehouseToDelete(null);
  };

  const moveWarehouseUp = async (index, e) => {
    e.stopPropagation(); if (index === 0) return;
    const newWarehouses = [...warehouses];
    const temp = newWarehouses[index - 1];
    newWarehouses[index - 1] = newWarehouses[index];
    newWarehouses[index] = temp; 
    setWarehouses(newWarehouses);
    if (db && firebaseUser) {
        for (let i = 0; i < newWarehouses.length; i++) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'warehouses', String(newWarehouses[i].id)), { orderIndex: i }, { merge: true });
        }
    }
  };

  const moveWarehouseDown = async (index, e) => {
    e.stopPropagation(); if (index === warehouses.length - 1) return;
    const newWarehouses = [...warehouses];
    const temp = newWarehouses[index + 1];
    newWarehouses[index + 1] = newWarehouses[index];
    newWarehouses[index] = temp; 
    setWarehouses(newWarehouses);
    if (db && firebaseUser) {
        for (let i = 0; i < newWarehouses.length; i++) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'warehouses', String(newWarehouses[i].id)), { orderIndex: i }, { merge: true });
        }
    }
  };

  // --- BLOK LİSTESİ STATE'LERİ ---
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockM3, setNewBlockM3] = useState('');
  
  const [isDeleteBlockModalOpen, setIsDeleteBlockModalOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);

  const [blocks, setBlocks] = useState([]);

  const handleAddBlock = async () => {
      if (!newBlockName || !selectedWarehouseId) return;
      const currentBlocks = blocks.filter(b => b.warehouseId === selectedWarehouseId);
      const newBlock = { id: Date.now(), warehouseId: selectedWarehouseId, name: newBlockName, m3: newBlockM3 || 0, orderIndex: currentBlocks.length };
      if (db && firebaseUser) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocks', String(newBlock.id)), newBlock);
      setIsAddBlockModalOpen(false); setNewBlockName(''); setNewBlockM3('');
  };

  const [isEditBlockModalOpen, setIsEditBlockModalOpen] = useState(false);
  const [editBlockData, setEditBlockData] = useState(null);

  const handleEditBlock = async () => {
      if (!editBlockData?.name) return;
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocks', String(editBlockData.id)), { name: editBlockData.name, m3: editBlockData.m3 }, { merge: true });
          } catch (e) { console.error("Firebase Blok Güncelleme Hatası:", e); }
      }
      setIsEditBlockModalOpen(false); setEditBlockData(null);
  };

  const handleDeleteBlockClick = (e, id) => {
      e.stopPropagation();
      setBlockToDelete(id);
      setIsDeleteBlockModalOpen(true);
  };

  const confirmDeleteBlock = async () => {
      if (!blockToDelete) return;
      if (db && firebaseUser) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocks', String(blockToDelete)));
          } catch (e) { console.error("Firebase Blok Silme Hatası:", e); }
      } else {
          setBlocks(blocks.filter(b => b.id !== blockToDelete));
      }
      setIsDeleteBlockModalOpen(false);
      setBlockToDelete(null);
  };

  const moveBlockUp = async (index, filteredList, e) => {
    e.stopPropagation(); if (index === 0) return;
    const newBlocks = [...blocks];
    const id1 = filteredList[index - 1].id; const id2 = filteredList[index].id;
    const idx1 = newBlocks.findIndex(b => b.id === id1); const idx2 = newBlocks.findIndex(b => b.id === id2);
    const temp = newBlocks[idx1]; newBlocks[idx1] = newBlocks[idx2]; newBlocks[idx2] = temp;
    setBlocks(newBlocks);
    
    const newFilteredList = [...filteredList];
    const tempF = newFilteredList[index - 1];
    newFilteredList[index - 1] = newFilteredList[index];
    newFilteredList[index] = tempF;
    
    if (db && firebaseUser) {
        for (let i = 0; i < newFilteredList.length; i++) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocks', String(newFilteredList[i].id)), { orderIndex: i }, { merge: true });
        }
    }
  };

  const moveBlockDown = async (index, filteredList, e) => {
    e.stopPropagation(); if (index === filteredList.length - 1) return;
    const newBlocks = [...blocks];
    const id1 = filteredList[index].id; const id2 = filteredList[index + 1].id;
    const idx1 = newBlocks.findIndex(b => b.id === id1); const idx2 = newBlocks.findIndex(b => b.id === id2);
    const temp = newBlocks[idx1]; newBlocks[idx1] = newBlocks[idx2]; newBlocks[idx2] = temp;
    setBlocks(newBlocks);
    
    const newFilteredList = [...filteredList];
    const tempF = newFilteredList[index + 1];
    newFilteredList[index + 1] = newFilteredList[index];
    newFilteredList[index] = tempF;

    if (db && firebaseUser) {
        for (let i = 0; i < newFilteredList.length; i++) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocks', String(newFilteredList[i].id)), { orderIndex: i }, { merge: true });
        }
    }
  };

  // --- ODA LİSTESİ STATE'LERİ ---
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomM3, setNewRoomM3] = useState('');
  
  const [isDeleteRoomModalOpen, setIsDeleteRoomModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  const [rooms, setRooms] = useState([]);

  const handleAddRoom = async () => {
      if (!newRoomName || !selectedBlockId) return;
      const currentRooms = rooms.filter(r => r.blockId === selectedBlockId);
      const newRoom = { id: Date.now(), blockId: selectedBlockId, name: newRoomName, customerName: null, m3: newRoomM3 || 0, isReserved: false, paidMonths: [], orderIndex: currentRooms.length };
      if (db && firebaseUser) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(newRoom.id)), newRoom);
      setIsAddRoomModalOpen(false); setNewRoomName(''); setNewRoomM3('');
  };

  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [editRoomData, setEditRoomData] = useState(null);

  const handleEditRoom = async () => {
      if (!editRoomData?.name) return;
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(editRoomData.id)), { name: editRoomData.name, m3: editRoomData.m3 }, { merge: true });
          } catch (e) { console.error("Firebase Oda Güncelleme Hatası:", e); }
      }
      setIsEditRoomModalOpen(false); setEditRoomData(null);
  };

  const handleDeleteRoomClick = (e, id) => {
      e.stopPropagation();
      setRoomToDelete(id);
      setIsDeleteRoomModalOpen(true);
  };

  const confirmDeleteRoom = async () => {
      if (!roomToDelete) return;
      if (db && firebaseUser) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(roomToDelete)));
          } catch (e) { console.error("Firebase Oda Silme Hatası:", e); }
      } else {
          setRooms(rooms.filter(r => r.id !== roomToDelete));
      }
      setIsDeleteRoomModalOpen(false);
      setRoomToDelete(null);
  };

  const moveRoomUp = async (index, filteredList, e) => {
    e.stopPropagation(); if (index === 0) return;
    const newRooms = [...rooms];
    const id1 = filteredList[index - 1].id; const id2 = filteredList[index].id;
    const idx1 = newRooms.findIndex(r => r.id === id1); const idx2 = newRooms.findIndex(r => r.id === id2);
    const temp = newRooms[idx1]; newRooms[idx1] = newRooms[idx2]; newRooms[idx2] = temp; setRooms(newRooms);
    
    const newFilteredList = [...filteredList];
    const tempF = newFilteredList[index - 1];
    newFilteredList[index - 1] = newFilteredList[index];
    newFilteredList[index] = tempF;
    
    if (db && firebaseUser) {
        for (let i = 0; i < newFilteredList.length; i++) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(newFilteredList[i].id)), { orderIndex: i }, { merge: true });
        }
    }
  };

  const moveRoomDown = async (index, filteredList, e) => {
    e.stopPropagation(); if (index === filteredList.length - 1) return;
    const newRooms = [...rooms];
    const id1 = filteredList[index].id; const id2 = filteredList[index + 1].id;
    const idx1 = newRooms.findIndex(r => r.id === id1); const idx2 = newRooms.findIndex(r => r.id === id2);
    const temp = newRooms[idx1]; newRooms[idx1] = newRooms[idx2]; newRooms[idx2] = temp; setRooms(newRooms);

    const newFilteredList = [...filteredList];
    const tempF = newFilteredList[index + 1];
    newFilteredList[index + 1] = newFilteredList[index];
    newFilteredList[index] = tempF;
    
    if (db && firebaseUser) {
        for (let i = 0; i < newFilteredList.length; i++) {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(newFilteredList[i].id)), { orderIndex: i }, { merge: true });
        }
    }
  };

  // --- ODA DETAY MODALLARI ---
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [detailYear, setDetailYear] = useState(2026);

  const [activeSizeFilter, setActiveSizeFilter] = useState(null);
  const [isSizeFilterDropdownOpen, setIsSizeFilterDropdownOpen] = useState(false);
  const sizeFilters = [
      { id: '1+0', label: '1+0 (0 - 12 m³)', min: 0, max: 12 },
      { id: '1+1', label: '1+1 (13 - 18 m³)', min: 13, max: 18 },
      { id: '2+1', label: '2+1 (19 - 27 m³)', min: 19, max: 27 },
      { id: '3+1', label: '3+1 (28 - 37 m³)', min: 28, max: 37 },
      { id: '4+1', label: '4+1 ( 38+ m3 )', min: 38, max: Infinity }
  ];

  const [isEndRentModalOpen, setIsEndRentModalOpen] = useState(false);
  const [endRentData, setEndRentData] = useState({ exitDate: new Date().toISOString().split('T')[0], photo: null });
  
  const [isApplyIncreaseModalOpen, setIsApplyIncreaseModalOpen] = useState(false);
  const [increaseModalData, setIncreaseModalData] = useState(null);
  const [increaseMode, setIncreaseMode] = useState('percentage');
  const [increasePercentage, setIncreasePercentage] = useState('');
  const [newRentAmount, setNewRentAmount] = useState('');
  
const [isPastIncreaseModalOpen, setIsPastIncreaseModalOpen] = useState(false);
  const [pastIncreaseData, setPastIncreaseData] = useState({ date: new Date().toISOString().split('T')[0], amount: '', isKdvIncluded: true });

  const [isEditSpecificMonthModalOpen, setIsEditSpecificMonthModalOpen] = useState(false);
  const [specificMonthEditData, setSpecificMonthEditData] = useState(null);

  const [isChangeRoomModalOpen, setIsChangeRoomModalOpen] = useState(false);
  const [changeRoomWarehouseId, setChangeRoomWarehouseId] = useState('');
  const [changeRoomBlockId, setChangeRoomBlockId] = useState('');
  const [changeRoomTargetRoomId, setChangeRoomTargetRoomId] = useState('');
  const [isPriceHistoryModalOpen, setIsPriceHistoryModalOpen] = useState(false);
  const [isRoomHistoryModalOpen, setIsRoomHistoryModalOpen] = useState(false);
  const [isEditRentModalOpen, setIsEditRentModalOpen] = useState(false);
  const [editRentData, setEditRentData] = useState({ customerName: '', entryDate: '', paymentDate: '', monthlyFee: '', hasKdv: true, sealNo: '', broughtBy: 'kendisi', teamList: '' });

  const [isTutanakDropdownOpen, setIsTutanakDropdownOpen] = useState(false);

  // --- HEDİYE AY STATE'LERİ ---
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftMonthValue, setGiftMonthValue] = useState(1);

  // --- ÜCRETSİZ ODA STATE'LERİ ---
  const [isFreeRoomModalOpen, setIsFreeRoomModalOpen] = useState(false);
  const [freeRoomReasonInput, setFreeRoomReasonInput] = useState('');

  // --- GİRİŞ-ÇIKIŞ STATE'LERİ ---
  const [isEntryExitModalOpen, setIsEntryExitModalOpen] = useState(false);
  const [entryExitData, setEntryExitData] = useState({ newSealNo: '', protocolPhoto: null, finalPhoto: null });

const handleEntryExitSave = async () => {
      if (!entryExitData.newSealNo) return;
      
      const sealFeeTotal = Number(collectionRates.sealFee) * 1.20; // Mühür ücreti + %20 KDV
      const customerToUpdate = customers.find(c => c.name === selectedRoomDetail.customerName);
      const roomToUpdate = rooms.find(r => r.id === selectedRoomId);

      if (db && firebaseUser) {
          try {
              // 1. Müşteri Carisine Mühür Ücreti Ekle
              if (customerToUpdate) {
                  const newDebt = {
                      id: Date.now(),
                      type: 'seal_fee',
                      date: new Date().toISOString().split('T')[0],
                      amount: sealFeeTotal,
                      hasKdv: true,
                      desc: `Giriş-Çıkış Yeni Mühür Ücreti`
                  };
                  const existingDebts = customerToUpdate.extraDebts || [];
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), {
                      extraDebts: [...existingDebts, newDebt]
                  }, { merge: true });
              }

              // 2. Oda Bilgilerini Güncelle (Mühür ve Arşiv)
              if (roomToUpdate) {
                  const newHistoryItem = {
                      id: Date.now(),
                      date: new Date().toLocaleDateString('tr-TR'),
                      sealNo: entryExitData.newSealNo,
                      protocolPhoto: entryExitData.protocolPhoto,
                      finalPhoto: entryExitData.finalPhoto
                  };
                  const existingHistory = roomToUpdate.entryExitHistory || [];
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), {
                      sealNo: entryExitData.newSealNo,
                      protocolPhoto: entryExitData.protocolPhoto,
                      finalPhoto: entryExitData.finalPhoto,
                      entryExitHistory: [newHistoryItem, ...existingHistory]
                  }, { merge: true });
              }
          } catch(e) { console.error("Firebase Giriş Çıkış Hatası:", e); }
      }

      setIsEntryExitModalOpen(false);
      setEntryExitData({ newSealNo: '', protocolPhoto: null, finalPhoto: null });
  };

 const handleSetGiftMonths = async (months) => {
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), { giftMonths: months }, { merge: true });
          } catch(e) { console.error("Firebase Hediye Ay Hatası:", e); }
      }
      setIsGiftModalOpen(false);
  };

  const handleSetFreeRoom = async () => {
      if (!freeRoomReasonInput) return;
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), { isFreeRoom: true, freeRoomReason: freeRoomReasonInput }, { merge: true });
          } catch(e) { console.error("Firebase Ücretsiz Oda Hatası:", e); }
      }
      setIsFreeRoomModalOpen(false);
      setFreeRoomReasonInput('');
  };

  const handleRemoveFreeRoom = async () => {
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), { isFreeRoom: false, freeRoomReason: null }, { merge: true });
          } catch(e) { console.error("Firebase Ücretsiz Oda Kaldırma Hatası:", e); }
      }
  };

  // --- YENİ REZERVE STATE'LERİ ---
  const [isReserveRoomModalOpen, setIsReserveRoomModalOpen] = useState(false);
  const [reserveData, setReserveData] = useState({ name: '', phone: '', days: 10 });

const handleReserveRoom = async () => {
    if (!reserveData.name || !reserveData.phone) return;
    const today = new Date();
    const expiryDate = new Date(today); 
    expiryDate.setDate(expiryDate.getDate() + parseInt(reserveData.days));
    
    if (db && firebaseUser) {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), {
                isReserved: true, 
                reservedName: reserveData.name, 
                reservedPhone: reserveData.phone, 
                reserveExpiry: expiryDate.toLocaleDateString('tr-TR'), 
                reserveExpiryTimestamp: expiryDate.getTime()
            }, { merge: true });
        } catch(e) { console.error("Firebase Rezerve Hatası:", e); }
    }
    
    setIsReserveRoomModalOpen(false); 
    setReserveData({ name: '', phone: '', days: 10 });
  };

const handleCancelReservation = async () => {
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), {
                  isReserved: false, reservedName: null, reservedPhone: null, reserveExpiry: null, reserveExpiryTimestamp: null
              }, { merge: true });
          } catch(e) { console.error("Rezerve İptal Hatası:", e); }
      }
  };

  // --- YENİ KİRALAMA VE ÖDEME STATE'LERİ ---
  const [isRentRoomModalOpen, setIsRentRoomModalOpen] = useState(false);
  const [isRentSuccessModalOpen, setIsRentSuccessModalOpen] = useState(false);
  const [rentCustomerSearch, setRentCustomerSearch] = useState('');
  const [rentData, setRentData] = useState({ customerName: '', entryDate: new Date().toISOString().split('T')[0], paymentDate: new Date().toISOString().split('T')[0], monthlyFee: '', hasKdv: true, sealNo: '', broughtBy: 'kendisi', teamList: '', hasDamage: false, damageDescription: '', transportPrice: '', transportHasKdv: false, entryPhoto: null });

  const [globalPaymentData, setGlobalPaymentData] = useState({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [isGlobalPaymentSuccess, setIsGlobalPaymentSuccess] = useState(false);
  const [paymentCustomerSearch, setPaymentCustomerSearch] = useState('');

  // --- YENİ EKLENEN: TOPLU ÖDEME STATE'LERİ ---
  const [paymentEntryMode, setPaymentEntryMode] = useState('single'); // 'single' | 'bulk'
  const [bulkProcessResult, setBulkProcessResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- YENİ EKLENEN: TOPLU MÜŞTERİ İÇE AKTARMA STATE'LERİ ---
  const [isCustomerUploading, setIsCustomerUploading] = useState(false);
  const [customerImportResult, setCustomerImportResult] = useState(null);

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
                  processBulkData(rows);
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

  const processBulkData = async (rows) => {
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

      const addedPaymentIds = [];
      const addedPendingIds = [];

      for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Boş satırları atla
          if (!row || row.length === 0 || (!row[0] && !row[1] && !row[2])) continue;

          const dateRaw = row[0];
          const amountRaw = row[1];
          const descRaw = row[2];

          if (!amountRaw) continue;

          // Tutar (Amount) çözümleme
          let amount = 0;
          if (typeof amountRaw === 'number') {
              amount = amountRaw;
          } else {
              let amountStr = String(amountRaw).trim();
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

          if (isNaN(amount) || amount <= 0) continue;

          // Açıklama çözümleme
          const descStr = String(descRaw || '').trim();
          const descUpper = descStr.toUpperCase();
          
          // Tarih çözümleme
          let validDate = new Date().toISOString().split('T')[0];
          if (typeof dateRaw === 'number') {
              const excelEpoch = new Date(1899, 11, 30);
              const jsDate = new Date(excelEpoch.getTime() + dateRaw * 86400000);
              if (!isNaN(jsDate)) validDate = jsDate.toISOString().split('T')[0];
          } else if (dateRaw) {
              // GG.AA.YYYY formatı kontrolü
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

          // 1. Eşleştirme: Müşteri Numarası
          matchedCustomer = customers.find(c => c.customerNo && descUpper.includes(c.customerNo));
          
          // 2. Eşleştirme: Ad Soyad
          if (!matchedCustomer) {
              matchedCustomer = customers.find(c => c.name && descUpper.includes(c.name));
          }

          // 3. Eşleştirme: Oda Numarası
          if (!matchedCustomer) {
              const matchedRoom = rooms.find(r => r.customerName && r.name && descUpper.includes(r.name));
              if (matchedRoom) {
                  matchedCustomer = customers.find(c => c.name === matchedRoom.customerName);
              }
          }

          if (matchedCustomer) {
              matchedCount++;
              totalMatchedAmount += amount;
              
              if (!customersUpdates[matchedCustomer.id]) {
                  customersUpdates[matchedCustomer.id] = [];
              }
              const pId = Date.now() + Math.random();
              customersUpdates[matchedCustomer.id].push({
                  id: pId,
                  amount: amount,
                  date: validDate,
                  note: 'Toplu Banka Yüklemesi: ' + descStr
              });
              addedPaymentIds.push(pId);
          } else {
              unmatchedCount++;
              totalUnmatchedAmount += amount;
              
              const pId = Date.now() + Math.random();
              newPendingCollections.push({
                  id: pId,
                  amount: amount,
                  date: validDate,
                  note: 'Toplu Banka Yüklemesi: ' + descStr
              });
              addedPendingIds.push(pId);
          }
      }

  if (Object.keys(customersUpdates).length > 0 && db && firebaseUser) {
          for (const cId of Object.keys(customersUpdates)) {
              const customerToUpdate = customers.find(c => String(c.id) === String(cId));
              if (customerToUpdate) {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(cId)), {
                      payments: [...(customerToUpdate.payments || []), ...customersUpdates[cId]]
                  }, { merge: true });
              }
          }
      }

if (unmatchedCount > 0 && db && firebaseUser) {
          for (const pending of newPendingCollections) {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(pending.id)), pending, { merge: true });
          }
      }

      setBulkProcessResult({
          matchedCount,
          unmatchedCount,
          totalMatchedAmount,
          totalUnmatchedAmount,
          addedPaymentIds,
          addedPendingIds
      });
  };

  const handleUndoBulkProcess = async () => {
      if (!bulkProcessResult) return;
      const { addedPaymentIds, addedPendingIds } = bulkProcessResult;
      
      if (addedPaymentIds && addedPaymentIds.length > 0 && db && firebaseUser) {
          for (const c of customers) {
              const hasAddedPayment = c.payments?.some(p => addedPaymentIds.includes(p.id));
              if (hasAddedPayment) {
                  const cleanedPayments = c.payments.filter(p => !addedPaymentIds.includes(p.id));
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(c.id)), { payments: cleanedPayments }, { merge: true });
              }
          }
      }
      
      if (addedPendingIds && addedPendingIds.length > 0 && db && firebaseUser) {
          for (const pId of addedPendingIds) {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(pId)));
          }
      }
      setBulkProcessResult(null);
  };

  const handleBulkCustomerUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsCustomerUploading(true);

      try {
          await loadXLSXLibrary();
const reader = new FileReader();
          reader.onload = async (event) => {
              try {
                  const data = new Uint8Array(event.target.result);
                  // Excel'deki tarihleri düzgün alabilmek için cellDates: true
                  const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
                  const firstSheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[firstSheetName];
                  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                  
                  let importedCustomerCount = 0;
                  let updatedRoomCount = 0;

                  const newCustomers = [];
                  const roomUpdates = {};

                  // Satırları tarama (1. satırın başlık olduğu varsayılır, bu yüzden i=1)
                  for (let i = 1; i < rows.length; i++) {
                      const row = rows[i];
                      if (!row || row.length === 0) continue;

                      let nameRaw = '';
                      let phoneRaw = '';
                      let roomsRaw = [];
                      let validDate = new Date().toISOString().split('T')[0];
                      let maxRent = 0;

                      for (let j = 0; j < row.length; j++) {
                          const cell = row[j];
                          if (cell === undefined || cell === null || cell === '') continue;

                          // 1. Tarih Kontrolü (Date Objesi)
                          if (cell instanceof Date) {
                              validDate = cell.toISOString().split('T')[0];
                              continue;
                          }

                          const cellStr = String(cell).trim();
                          const cellUpper = cellStr.toUpperCase();

                          // 2. Oda Kontrolü (Olası boşluk ve tireleri temizleyerek eşleştirme)
                          const possibleRooms = cellUpper.split(/[,/]/).map(s => s.trim());
                          let foundRoomInCell = false;
                          possibleRooms.forEach(pr => {
                              const matchedRoom = rooms.find(r => r.name.toUpperCase().replace(/[\s-]/g, '') === pr.replace(/[\s-]/g, ''));
                              if (matchedRoom) {
                                  if (!roomsRaw.includes(matchedRoom.name)) roomsRaw.push(matchedRoom.name);
                                  foundRoomInCell = true;
                              }
                          });
                          if (foundRoomInCell) continue;

                          // Tarih Kontrolü (String formatında - DD.MM.YYYY)
                          const trDateMatch = cellStr.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/);
                          if (trDateMatch) {
                              validDate = `${trDateMatch[3]}-${trDateMatch[2]}-${trDateMatch[1]}`;
                              continue;
                          }

                          // 3. Telefon / Müşteri No Kontrolü (10-13 Haneli)
                          const numericOnly = cellStr.replace(/\D/g, '');
                          if (numericOnly.length >= 10 && numericOnly.length <= 13 && (numericOnly.startsWith('5') || numericOnly.startsWith('05') || numericOnly.startsWith('905'))) {
                              if (!phoneRaw) phoneRaw = numericOnly;
                              continue;
                          }

                          // 4. Kira Tutarı (Dört Haneli ve Üzeri Rakamların En Büyüğü)
                          if (typeof cell === 'number') {
                              if (cell >= 1000 && cell <= 999999) {
                                  if (cell > maxRent) maxRent = cell;
                              }
                              continue;
                          } else {
                              const numVal = parseFloat(cellStr.replace(/,/g, '.').replace(/[^\d.-]/g, ''));
                              if (!isNaN(numVal) && numVal >= 1000 && numVal <= 999999) {
                                  if (numVal > maxRent) maxRent = numVal;
                                  continue;
                              }
                          }

                          // 5. Ad Soyad Kontrolü (Harf barındıran en olası string)
                          if (cellStr.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/) && cellStr.length > 3 && !nameRaw) {
                              // Rastgele oda kodlarına benzemiyorsa isimdir
                              if (!cellUpper.match(/^[A-Z]\s*[-_]?\s*\d{1,4}$/)) {
                                  nameRaw = cellUpper;
                              }
                          }
                      }

                      if (!nameRaw && roomsRaw.length === 0) continue; // Geçersiz veya boş satır

                      // Exceldeki Telefon Numarası = Sistemdeki Müşteri Numarası Yapılır
                      let customerNo = phoneRaw || Math.floor(10000 + Math.random() * 90000).toString();
                      
                      let existingCust = customers.find(c => (phoneRaw && c.phone === phoneRaw) || c.name === nameRaw) || newCustomers.find(c => (phoneRaw && c.phone === phoneRaw) || c.name === nameRaw);

                      if (!existingCust && nameRaw) {
                          existingCust = {
                              id: Date.now() + Math.random(),
                              customerNo: customerNo,
                              name: nameRaw,
                              tc: '',
                              phone: phoneRaw,
                              altPhone: '', address: '', notes: 'Excel ile otomatik aktarıldı.',
                              hasProxy: false, proxyName: '', proxyTc: '', proxyPhone: '', proxyAltPhone: '', proxyAddress: '', proxyDocumentPhoto: null,
                              type: 'bireysel',
                              createdAt: new Date().toLocaleDateString('tr-TR'),
                              createdBy: currentUserProfile.name,
                              invoices: [], documentPhoto: null, payments: [], extraDebts: [], ledgerOverrides: []
                          };
                          newCustomers.push(existingCust);
                          importedCustomerCount++;
                      }

                      // Müşterinin odalarını eşleştirip kiralamayı başlat
                      if (roomsRaw.length > 0 && existingCust) {
                          roomsRaw.forEach(rName => {
                              roomUpdates[rName] = {
                                  customerName: existingCust.name,
                                  entryDate: validDate,
                                  paymentDate: validDate,
                                  monthlyFee: maxRent > 0 ? maxRent : 0, // En büyük sayıyı kiraya aktar
                                  hasKdv: true, // Varsayılan KDV ile
                                  paidMonths: [],
                                  rentedBy: currentUserProfile.name
                              };
                              updatedRoomCount++;
                          });
                      }
                  }

      if (newCustomers.length > 0 && db && firebaseUser) {
                      for (const cust of newCustomers) {
                          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(cust.id)), cust);
                      }
                  }

                  if (Object.keys(roomUpdates).length > 0 && db && firebaseUser) {
                      for (const rName of Object.keys(roomUpdates)) {
                          const roomToUpdate = rooms.find(r => r.name === rName);
                          if (roomToUpdate) {
                              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(roomToUpdate.id)), roomUpdates[rName], { merge: true });
                          }
                      }
                  }

                  setCustomerImportResult({ importedCustomerCount, updatedRoomCount });

              } catch (err) {
                  console.error(err);
                  alert("Dosya okunurken bir hata oluştu. Lütfen formatı kontrol edin.");
              } finally {
                  setIsCustomerUploading(false);
              }
          };
          reader.readAsArrayBuffer(file);
      } catch (error) {
          alert("Excel kütüphanesi yüklenirken bir hata oluştu.");
          setIsCustomerUploading(false);
      }
      e.target.value = '';
  };

const handleRentRoom = async () => {
      if (!rentData.customerName || !rentData.monthlyFee) return;

      // 1. Gün Farkı (Kıstelyevm) Bedeli Hesaplaması
      let proratedDebtAmount = 0;
      const eDate = new Date(rentData.entryDate);
      const pDate = new Date(rentData.paymentDate);
      const timeDiff = pDate.getTime() - eDate.getTime();
      const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (dayDiff > 0) {
          let dailyRate = Number(rentData.monthlyFee) / 30;
          proratedDebtAmount = dailyRate * dayDiff;
          if (rentData.hasKdv) proratedDebtAmount = proratedDebtAmount * 1.20;
      }

      // 2. Nakliye Bedeli Cari Hesaplaması
      let transportDebtAmount = 0;
      if (rentData.broughtBy === 'sembol' && rentData.transportPrice) {
          transportDebtAmount = Number(rentData.transportPrice);
          if (rentData.transportHasKdv) {
              transportDebtAmount = transportDebtAmount * 1.20;
          }
      }

      // 3. FİREBASE CARİ HESAP GÜNCELLEMESİ (Müşteri)
      const customerToUpdate = customers.find(c => c.name === rentData.customerName);
      if (customerToUpdate && (transportDebtAmount > 0 || proratedDebtAmount > 0)) {
          let existingDebts = customerToUpdate.extraDebts || [];
          let existingPayments = customerToUpdate.payments || []; 
          
          if (transportDebtAmount > 0) {
              const hasSameDayTransport = existingDebts.some(d => d.type === 'transport' && d.date === rentData.entryDate);
              if (!hasSameDayTransport) {
                  existingDebts = [...existingDebts, { id: Date.now() + 1, type: 'transport', date: rentData.entryDate, amount: transportDebtAmount, desc: 'Sembol Nakliyat Taşıma Bedeli' }];
                  existingPayments = [...existingPayments, { id: Date.now() + 3, amount: transportDebtAmount, date: rentData.entryDate, note: 'Sembol Nakliyat Taşıma Tahsilatı (Otomatik)' }];
              }
          }
          if (proratedDebtAmount > 0) {
              existingDebts = [...existingDebts, { id: Date.now() + 2, type: 'prorated', date: rentData.entryDate, amount: proratedDebtAmount, desc: `Gün Farkı Bedeli (${dayDiff} Gün)` }];
          }

          if (db && firebaseUser) {
              try {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), {
                      extraDebts: existingDebts,
                      payments: existingPayments
                  }, { merge: true });
              } catch(e) { console.error("Firebase Cari Güncelleme Hatası:", e); }
          }
      }

      // 4. FİREBASE ODA GÜNCELLEMESİ
      const roomUpdates = {
          customerName: rentData.customerName, 
          entryDate: rentData.entryDate, 
          paymentDate: rentData.paymentDate, 
          monthlyFee: rentData.monthlyFee, 
          hasKdv: rentData.hasKdv, 
          sealNo: rentData.sealNo,
          broughtBy: rentData.broughtBy,
          teamList: rentData.teamList,
          hasDamage: rentData.hasDamage,
          damageDescription: rentData.damageDescription,
          transportPrice: rentData.transportPrice,
          transportHasKdv: rentData.transportHasKdv,
          entryPhoto: rentData.entryPhoto,
          paidMonths: [],
          rentedBy: currentUserProfile.name,
          isReserved: false, // Varsa rezerveyi iptal et
          reservedName: null,
          reservedPhone: null,
          reserveExpiry: null,
          reserveExpiryTimestamp: null
      };

      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), roomUpdates, { merge: true });
          } catch(e) { console.error("Firebase Oda Kiralama Hatası:", e); }
      }

      // 5. EKRAN DURUMLARINI SIFIRLAMA
      setIsRentRoomModalOpen(false); 
      setIsRentSuccessModalOpen(true);
      setRentData({ customerName: '', entryDate: new Date().toISOString().split('T')[0], paymentDate: new Date().toISOString().split('T')[0], monthlyFee: '', hasKdv: true, sealNo: '', broughtBy: 'kendisi', teamList: '', hasDamage: false, damageDescription: '', transportPrice: '', transportHasKdv: false, entryPhoto: null });
      setRentCustomerSearch('');
  };

const handleGlobalPayment = async () => {
    if (!globalPaymentData.customerId || !globalPaymentData.amount) return;

    const paymentId = Date.now();
    const newPayment = {
        id: paymentId,
        amount: Number(globalPaymentData.amount),
        date: globalPaymentData.date,
        note: globalPaymentData.note
    };

    if (globalPaymentData.customerId === 'askida') {
        if (db && firebaseUser) {
            try {
                // Askıdaki ödemeleri 'pendingCollections' tablosuna kaydet
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pendingCollections', String(paymentId)), newPayment);
            } catch(e) { console.error("Askıda Ödeme Kayıt Hatası:", e); }
        }
    } else {
        const customerId = globalPaymentData.customerId;
        const customerToUpdate = customers.find(c => String(c.id) === String(customerId));
        if (customerToUpdate && db && firebaseUser) {
            try {
                const existingPayments = customerToUpdate.payments || [];
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerId)), {
                    payments: [...existingPayments, newPayment]
                }, { merge: true });
            } catch(e) { console.error("Tahsilat İşleme Hatası:", e); }
        }
    }

    setIsGlobalPaymentSuccess(true);
    setGlobalPaymentData({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
    setTimeout(() => setIsGlobalPaymentSuccess(false), 3000);
  };

const handleSaveEditRent = async () => {
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), {
                  customerName: editRentData.customerName,
                  entryDate: editRentData.entryDate,
                  paymentDate: editRentData.paymentDate,
                  monthlyFee: editRentData.monthlyFee,
                  hasKdv: editRentData.hasKdv,
                  sealNo: editRentData.sealNo
              }, { merge: true });
          } catch (e) { console.error("Firebase Oda Düzenleme Hatası:", e); }
      }
      setIsEditRentModalOpen(false);
  };

const handleEndRentConfirm = async () => {
      const room = rooms.find(r => String(r.id) === String(selectedRoomId));
      if (!room) return;
      
      const customerToUpdate = customers.find(c => c.name === room.customerName);
      let pendingDebtsToTransfer = [];

      // 1. Odaya ait ödenmemiş borçları hesapla ve kalıcı borca çevir
      if (customerToUpdate) {
          const entryDate = parseDateLocal(room.entryDate || '2026-01-01');
          const paymentAnchorDate = room.paymentDate && room.paymentDate.includes('-') ? parseDateLocal(room.paymentDate) : entryDate;
          const today = new Date(); today.setHours(23, 59, 59, 999);
          
          const baseAmt = Number(room.monthlyFee || 0);
          const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
          const monthlyTotal = hasKdv ? baseAmt * 1.20 : baseAmt;
          const overrides = customerToUpdate.ledgerOverrides || [];
          
          let loopDate = new Date(paymentAnchorDate);
          let monthCounter = 0;

          while (loopDate <= today) {
              const key = `${loopDate.getFullYear()}-${loopDate.getMonth()}`;
              const txId = `debt-${room.id}-${key}`;
              
              let currentMonthlyTotal = monthlyTotal;
              const override = overrides.find(o => o.txId === txId);
              if (override && !override.isDeleted && override.debt !== undefined) currentMonthlyTotal = override.debt;

              const isGifted = room.giftMonths && monthCounter < room.giftMonths;
              const isFree = room.isFreeRoom;
              
              if (!room.paidMonths?.includes(key) && !isGifted && !isFree) {
                  pendingDebtsToTransfer.push({
                      id: Date.now() + Math.random(),
                      type: 'manual_debt',
                      date: new Date(loopDate).toISOString().split('T')[0],
                      amount: currentMonthlyTotal,
                      hasKdv: false, // Tutar zaten hesaplanmış
                      desc: `${room.name} Odası Eski Kira Borcu (Çıkış Yapılan)`
                  });
              }
              const targetDay = room.paymentDate && !room.paymentDate.includes('-') ? parseInt(room.paymentDate) : paymentAnchorDate.getDate();
              let nMonth = loopDate.getMonth() + 1;
              let nYear = loopDate.getFullYear();
              if (nMonth > 11) { nMonth = 0; nYear++; }
              let maxDayInNextMonth = new Date(nYear, nMonth + 1, 0).getDate();
              loopDate = new Date(nYear, nMonth, Math.min(targetDay, maxDayInNextMonth));
              monthCounter++;
          }
      }

      // 2. Çıkış İşlemlerini Hazırla
      const entryD = new Date(room.entryDate || Date.now()); 
      const exitD = new Date(endRentData.exitDate);
      const diffTime = Math.abs(exitD - entryD); 
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30); 
      const durationStr = months > 0 ? `${months} Ay` : `${diffDays} Gün`;
      
      const historyRecord = { 
          id: Date.now(), 
          customerName: room.customerName || null, 
          entryDate: room.entryDate || null, 
          exitDate: endRentData.exitDate || null, 
          duration: durationStr, 
          monthlyFee: room.monthlyFee || null, 
          status: 'Çıkış Yaptı', 
          photo: endRentData.photo || null, 
          entryPhoto: room.entryPhoto || null, 
          entryExitHistory: room.entryExitHistory || null 
      };

      const roomUpdates = {
          customerName: null, entryDate: null, paymentDate: null, monthlyFee: null, sealNo: null, broughtBy: 'kendisi', teamList: null, hasDamage: false, damageDescription: null, transportPrice: null, transportHasKdv: false, entryPhoto: null, entryExitHistory: null, movedFrom: null, paidMonths: [], isFreeRoom: false, freeRoomReason: null, giftMonths: 0, 
          history: [historyRecord, ...(room.history || [])]
      };

      if (db && firebaseUser) {
          try {
              // Borçları Cariye İşle
              if (customerToUpdate && pendingDebtsToTransfer.length > 0) {
                  const existingDebts = customerToUpdate.extraDebts || [];
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), {
                      extraDebts: [...existingDebts, ...pendingDebtsToTransfer]
                  }, { merge: true });
              }
              // Odayı Boşalt
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), roomUpdates, { merge: true });
          } catch(e) { console.error("Firebase Çıkış Yapma Hatası:", e); }
      }

      setIsEndRentModalOpen(false); 
      setEndRentData({ exitDate: new Date().toISOString().split('T')[0], photo: null });
  };

const handleChangeRoomConfirm = async () => {
    if(!changeRoomTargetRoomId) return;
    const oldRoom = rooms.find(r => String(r.id) === String(selectedRoomId));
    const newRoom = rooms.find(r => String(r.id) === String(changeRoomTargetRoomId));
    if(!oldRoom || !newRoom) return;

    const entryD = new Date(oldRoom.entryDate || Date.now());
    const exitD = new Date();
    const diffTime = Math.abs(exitD - entryD);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const durationStr = months > 0 ? `${months} Ay` : `${diffDays} Gün`;

    const historyRecord = {
        id: Date.now(), 
        customerName: oldRoom.customerName || null, 
        entryDate: oldRoom.entryDate || null, 
        exitDate: exitD.toLocaleDateString('tr-TR'),
        duration: durationStr, 
        monthlyFee: oldRoom.monthlyFee || null, 
        status: `${newRoom.name} Odasına Taşındı`, 
        photo: null,
        entryPhoto: oldRoom.entryPhoto || null, 
        entryExitHistory: oldRoom.entryExitHistory || null
    };

    if (db && firebaseUser) {
        try {
            // 1. Eski odayı boşalt ve geçmişe ekle
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(oldRoom.id)), {
                customerName: null, entryDate: null, paymentDate: null, monthlyFee: null, sealNo: null,
                broughtBy: 'kendisi', teamList: null, hasDamage: false, damageDescription: null, transportPrice: null, transportHasKdv: false, entryPhoto: null, entryExitHistory: null, movedFrom: null,
                paidMonths: [], isFreeRoom: false, freeRoomReason: null, giftMonths: 0, 
                history: [historyRecord, ...(oldRoom.history || [])]
            }, { merge: true });

            // 2. Yeni odaya müşterinin tüm verilerini taşı
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(newRoom.id)), {
                customerName: oldRoom.customerName || null, 
                entryDate: oldRoom.entryDate || null, 
                paymentDate: oldRoom.paymentDate || null,
                monthlyFee: oldRoom.monthlyFee || null, 
                hasKdv: oldRoom.hasKdv !== undefined ? oldRoom.hasKdv : true, 
                sealNo: oldRoom.sealNo || null,
                broughtBy: oldRoom.broughtBy || 'kendisi', 
                teamList: oldRoom.teamList || null, 
                hasDamage: oldRoom.hasDamage || false,
                damageDescription: oldRoom.damageDescription || null, 
                transportPrice: oldRoom.transportPrice || null,
                transportHasKdv: oldRoom.transportHasKdv || false, 
                entryPhoto: oldRoom.entryPhoto || null,
                entryExitHistory: oldRoom.entryExitHistory || null, 
                paidMonths: oldRoom.paidMonths || [],
                rentedBy: oldRoom.rentedBy || currentUserProfile.name,
                movedFrom: oldRoom.name || null, 
                isReserved: false, reservedName: null, reservedPhone: null, reserveExpiry: null, reserveExpiryTimestamp: null,
                isFreeRoom: oldRoom.isFreeRoom || false, 
                freeRoomReason: oldRoom.freeRoomReason || null, 
                giftMonths: oldRoom.giftMonths || 0
            }, { merge: true });

        } catch (e) { console.error("Firebase Oda Değiştirme Hatası:", e); }
    }

    setIsChangeRoomModalOpen(false);
    setChangeRoomWarehouseId('');
    setChangeRoomBlockId('');
    setChangeRoomTargetRoomId('');
    
    const targetBlock = blocks.find(b => b.id === newRoom.blockId);
    if (targetBlock) {
        setSelectedWarehouseId(targetBlock.warehouseId);
        setSelectedBlockId(newRoom.blockId);
        setSelectedRoomId(newRoom.id);
    }
  };

  const handleOpenApplyIncreaseModal = (room, year) => {
      const base = Number(room.monthlyFee || 0);
      const rate = Number(collectionRates.roomIncreaseRate || 50);
      const defaultNew = Math.round(base + (base * rate / 100));
      
      setIncreaseModalData({ ...room, targetYear: parseInt(year) });
      setIncreaseMode('percentage');
      setIncreasePercentage(rate.toString());
      setNewRentAmount(defaultNew.toString());
      setIsApplyIncreaseModalOpen(true);
  };

  const handlePercentageInput = (val) => {
      setIncreasePercentage(val);
      const base = Number(increaseModalData?.monthlyFee || 0);
      setNewRentAmount(Math.round(base + (base * Number(val) / 100)).toString());
  };

  const handleAmountInput = (val) => {
      setNewRentAmount(val);
      const base = Number(increaseModalData?.monthlyFee || 0);
      const perc = base > 0 ? ((Number(val) - base) / base * 100).toFixed(1) : 0;
      setIncreasePercentage(perc.toString());
  };

  const handleConfirmIncrease = async () => {
      if (!increaseModalData || !newRentAmount) return;

      const newFee = Number(newRentAmount);
      const oldFee = Number(increaseModalData.monthlyFee);
      const percentage = Number(increasePercentage);

      const historyEntry = {
          id: Date.now(),
          date: new Date().toLocaleDateString('tr-TR'),
          oldFee: oldFee,
          newFee: newFee,
          percentage: percentage,
          anniversaryYear: increaseModalData.targetYear,
          yearsPassed: increaseModalData.yearsPassed
      };

      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(increaseModalData.id)), {
                  monthlyFee: newRentAmount,
                  priceHistory: [...(increaseModalData.priceHistory || []), historyEntry]
              }, { merge: true });
          } catch(e) { console.error("Firebase Zam Kayıt Hatası:", e); }
      }

      setIsApplyIncreaseModalOpen(false);
      setIncreaseModalData(null);
  };

const handleSavePastIncrease = async () => {
      if (!pastIncreaseData.date || !pastIncreaseData.amount) return;
      
const startDate = new Date(pastIncreaseData.date);
      const amountInput = Number(pastIncreaseData.amount);
      const hasKdv = selectedRoomDetail.hasKdv !== false;
      
      let monthlyTotal, amount;
      if (pastIncreaseData.isKdvIncluded && hasKdv) {
          monthlyTotal = amountInput;
          amount = amountInput / 1.20; // KDV hariç hali
      } else {
          amount = amountInput;
          monthlyTotal = hasKdv ? amount * 1.20 : amount;
      }

      const newOverrides = [];
      let loopDate = new Date(startDate);
      // 12 ay (1 yıl) boyunca üstüne yazma kuralı ekle
      for(let i = 0; i < 12; i++) {
          const key = `${loopDate.getFullYear()}-${loopDate.getMonth()}`;
          const txId = `debt-${selectedRoomId}-${key}`;
          const monthName = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][loopDate.getMonth()];
newOverrides.push({
              txId, 
              date: new Date(loopDate).getTime(), // Firebase timestamp uyumluluğu
              desc: `${selectedRoomDetail.name} Odası - Geçmiş Zamlı Kira (${monthName} ${loopDate.getFullYear()})`,
              debt: monthlyTotal, 
              baseDebt: amount, 
              kdvDebt: hasKdv ? amount * 0.20 : 0, 
              credit: 0
          });
          
          const targetDay = startDate.getDate();
          let nMonth = loopDate.getMonth() + 1;
          let nYear = loopDate.getFullYear();
          if (nMonth > 11) { nMonth = 0; nYear++; }
          let maxDayInNextMonth = new Date(nYear, nMonth + 1, 0).getDate();
          loopDate = new Date(nYear, nMonth, Math.min(targetDay, maxDayInNextMonth));
      }

      const customerToUpdate = customers.find(c => c.name === selectedRoomDetail.customerName);
      
      if (db && firebaseUser) {
          try {
              // Cari hesap üzerine yazılanları kaydet
              if (customerToUpdate) {
                  const existingOverrides = customerToUpdate.ledgerOverrides || [];
                  const filtered = existingOverrides.filter(o => !newOverrides.some(n => n.txId === o.txId));
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), {
                      ledgerOverrides: [...filtered, ...newOverrides]
                  }, { merge: true });
              }

              // Oda fiyat geçmişine kaydet
              const historyEntry = {
                  id: Date.now(), date: startDate.toLocaleDateString('tr-TR'), oldFee: 'Manuel Düzenleme', newFee: amount,
                  percentage: 'Geçmiş Zam', anniversaryYear: startDate.getFullYear(), yearsPassed: 'Manuel'
              };
              const roomToUpdate = rooms.find(r => r.id === selectedRoomId);
              if (roomToUpdate) {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(selectedRoomId)), {
                      priceHistory: [...(roomToUpdate.priceHistory || []), historyEntry]
                  }, { merge: true });
              }
          } catch(e) { console.error("Firebase Geçmiş Zam Hatası:", e); }
      }

      setIsPastIncreaseModalOpen(false);
      setPastIncreaseData({ date: new Date().toISOString().split('T')[0], amount: '' });
  };

const handleSaveSpecificMonthEdit = async () => {
      if (!specificMonthEditData || !specificMonthEditData.newAmount) return;
      
      const amount = Number(specificMonthEditData.newAmount);
      const hasKdv = selectedRoomDetail.hasKdv !== false;
      const baseDebt = hasKdv ? amount / 1.20 : amount;
      const kdvDebt = hasKdv ? amount - baseDebt : 0;
      
      const customerToUpdate = customers.find(c => c.name === selectedRoomDetail.customerName);

      if (customerToUpdate && db && firebaseUser) {
          try {
              const existingOverrides = customerToUpdate.ledgerOverrides || [];
              const filtered = existingOverrides.filter(o => o.txId !== specificMonthEditData.txId);
              
              const newOverride = {
                  txId: specificMonthEditData.txId,
                  date: specificMonthEditData.date ? new Date(specificMonthEditData.date).getTime() : Date.now(),
                  desc: specificMonthEditData.desc,
                  debt: amount, baseDebt: baseDebt, kdvDebt: kdvDebt, credit: 0
              };
              
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), {
                  ledgerOverrides: [...filtered, newOverride]
              }, { merge: true });
          } catch(e) { console.error("Firebase Aylık Kira Düzenleme Hatası:", e); }
      }

      setIsEditSpecificMonthModalOpen(false);
      setSpecificMonthEditData(null);
  };

const handleGiftSpecificMonth = async () => {
      if (!specificMonthEditData) return;
      
      const customerToUpdate = customers.find(c => c.name === selectedRoomDetail.customerName);

      if (customerToUpdate && db && firebaseUser) {
          try {
              const existingOverrides = customerToUpdate.ledgerOverrides || [];
              const filtered = existingOverrides.filter(o => o.txId !== specificMonthEditData.txId);
              
              const newOverride = {
                  txId: specificMonthEditData.txId,
                  date: specificMonthEditData.date ? new Date(specificMonthEditData.date).getTime() : Date.now(),
                  desc: `${selectedRoomDetail.name} Odası - Bu Ay Hediye Edildi`,
                  debt: 0, baseDebt: 0, kdvDebt: 0, credit: 0,
                  isSpecificGift: true
              };
              
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', String(customerToUpdate.id)), {
                  ledgerOverrides: [...filtered, newOverride]
              }, { merge: true });
          } catch(e) { console.error("Firebase Özel Hediye Ay Düzenleme Hatası:", e); }
      }

      setIsEditSpecificMonthModalOpen(false);
      setSpecificMonthEditData(null);
  };

  // --- TÜMÜNÜ SIFIRLAMA ---
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
const handleResetAll = async () => {
      if (db && firebaseUser) {
          try {
              for (const r of rooms) {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', String(r.id)), {
                      customerName: null, isReserved: false, paidMonths: []
                  }, { merge: true });
              }
          } catch (e) { console.error("Sıfırlama Hatası:", e); }
      }
      setIsResetModalOpen(false);
  };

const handleSaveAppointment = async () => {
    if (appointmentData.customerType === 'registered' && !appointmentData.customerId) return;
    if (appointmentData.customerType === 'unregistered' && (!appointmentData.unregisteredName || !appointmentData.unregisteredPhone)) return;
    if (!appointmentData.warehouseId || !appointmentData.date || !appointmentData.time) return;

    let customerName = appointmentData.unregisteredName.toUpperCase();
    let customerPhone = appointmentData.unregisteredPhone;
    let cId = null;

    if (appointmentData.customerType === 'registered') {
        // String veya Number ID eşleşme garantisi
        const cust = customers.find(c => String(c.id) === String(appointmentData.customerId));
        if (cust) {
            customerName = cust.name;
            customerPhone = cust.phone;
            cId = cust.id;
        }
    }

    const newAppt = {
        id: Date.now(),
        customerType: appointmentData.customerType,
        customerId: cId,
        customerName,
        customerPhone,
        warehouseId: parseInt(appointmentData.warehouseId),
        date: appointmentData.date,
        time: appointmentData.time,
        purpose: appointmentData.purpose
    };

// FİREBASE'E KAYIT İŞLEMİ
    if (db && firebaseUser) {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', String(newAppt.id)), newAppt);
        } catch(e) { console.error("Firebase Randevu Kayıt Hatası:", e); }
    }

    // EKSİK OLAN KISIM BURASIYDI
    setAppointmentData({
        customerType: 'registered',
        customerId: '',
        unregisteredName: '',
        unregisteredPhone: '',
        warehouseId: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00 - 11:00',
        purpose: 'giris-cikis'
    });
    setSelectedCalendarDate(appointmentData.date);
    const d = new Date(appointmentData.date);
    setCalendarMonth(d.getMonth());
    setCalendarYear(d.getFullYear());
    setActiveMenu('takvim');
}; 
// KAPANIS PARANTEZI BURADA BITIYOR

const handleDeleteAppointment = async (id) => {
      if (!editApptData) return;
      if (db && firebaseUser) {
          try {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', String(editApptData.id)), editApptData, { merge: true });
          } catch(e) { console.error("Randevu Güncelleme Hatası:", e); }
      }
      setIsEditApptModalOpen(false);
      setEditApptData(null);
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => {
      let day = new Date(year, month, 1).getDay();
      return day === 0 ? 6 : day - 1; // Pzt=0, Paz=6 yapıyoruz
  };

  const handleUpdateAllLedgers = () => {
      setIsUpdateAllModalOpen(true);
      setIsUpdatingAll(true);

      // Tarama hissi yaratmak için küçük bir gecikme ekliyoruz
      setTimeout(() => {
          let totalUnpaid = 0;
          let affectedCustomers = 0;

          customers.forEach(c => {
              // Sistem girdiği gün ile bugünün tarihi arasını zaten dinamik tarar
              const { balance } = getCustomerLedger(c);
              if (balance > 0) {
                  totalUnpaid += balance;
                  affectedCustomers++;
              }
          });

          // Uygulamadaki tüm state'i güncellemek (force re-render) için spread kullanıyoruz
          setCustomers([...customers]);
          setRooms([...rooms]);

          setUpdateAllStats({
              totalUnpaid,
              affectedCustomers,
              date: new Date().toLocaleDateString('tr-TR')
          });
          setIsUpdatingAll(false);
      }, 2000);
  };

  const appointmentPurposes = {
      'giris-cikis': { label: 'Depoya Giriş - Çıkış', color: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200', bgLight: 'bg-blue-50' },
      'ziyaret': { label: 'Yeni Müşteri Adayı Ziyaret', color: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200', bgLight: 'bg-purple-50' },
      'esya-getirme': { label: 'Yeni Müşteri Eşya Getiriyor', color: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', bgLight: 'bg-emerald-50' },
      'tahliye': { label: 'Depodan Tüm Eşyaları Kendisi Çıkartıcak', color: 'bg-red-500', text: 'text-red-700', border: 'border-red-200', bgLight: 'bg-red-50' },
      'temizlik': { label: 'Depo Temizlik', color: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', bgLight: 'bg-orange-50' },
  };

  const menuItems = [
    { id: 'dashboard', label: 'Anasayfa', icon: LayoutDashboard },
    { id: 'takvim', label: 'Takvim', icon: Calendar },
    { id: 'musteri-listesi', label: 'Müşteri Listesi', icon: Users, subItems: [{ id: 'musteri-ekle', label: 'Yeni Müşteri Ekle' }, { id: 'mevcut-musteriler', label: 'Mevcut Müşteriler' }, { id: 'tum-musteriler', label: 'Tüm Müşteriler' }] },
    { id: 'odeme-islemleri', label: 'Ödeme İşlemleri', icon: Wallet, subItems: [
        { id: 'odeme-girisi', label: 'Tahsilat Girişi Yap' }, 
        { id: 'askida-kalan-odemeler', label: 'Askıda Kalan Tahsilatlar' },
        { id: 'tahsilat-hareketleri', label: 'Tahsilat Hareketleri' },
        { id: 'gunu-gelen-odalar', label: 'Günü Gelen Odalar' },
        { id: 'senesi-dolan-odalar', label: 'Senesi Dolan Odalar' },
        { id: 'aylik-odeme', label: 'Aylık Borç Takip' },
        { id: 'depo-odemeleri-guncelle', label: 'Depo Ödemeleri', action: handleUpdateAllLedgers }
    ] },
    { id: 'depo', label: 'Depo Listesi', icon: Box },
    { id: 'finans-yonetimi', label: 'Finans Yönetimi', icon: TrendingUp, subItems: [
        { id: 'finans-rapor', label: 'Finans Rapor' },
        { id: 'depo-rapor', label: 'Depo Rapor' }
    ] },
    { id: 'sistem-hesaplari', label: 'Sistem Hesapları', icon: UserCog, subItems: [
        { id: 'panel-kullanicilari', label: 'Panel Kullanıcıları' },
        { id: 'kullanici-rolleri', label: 'Kullanıcı Rolleri' }
    ] },
{ id: 'sistem-ayarlari', label: 'Sistem Ayarları', icon: Settings, 
    subItems: [
        { id: 'pdf-sozlesme', label: 'PDF & Sözleşme Ayarları' },
        { id: 'tahsilat-oranlari', label: 'Tahsilat Oranları' },
        { id: 'sistem-yedekleme', label: 'Sistem Yedekleme' }
    ] },
  ]; // <-- İŞTE EKSİK OLAN KAPANIŞ PARANTEZİ BU!

  const selectedRoomDetail = rooms.find(r => r.id === selectedRoomId);

  const parseDateLocal = (dateString) => {
    if (!dateString) return new Date();
    const parts = dateString.split('-');
    if(parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    return new Date(dateString);
  };

  // --- DİNAMİK GÖSTERGE PANELİ (DASHBOARD) VERİLERİ ---
  const totalCustomersCount = customers.length;
  const activeRentalsList = rooms.filter(r => r.customerName);
  const activeRentalsCount = activeRentalsList.length;
  const uniqueTenantsCount = new Set(activeRentalsList.map(r => r.customerName)).size;
  const activeTenantPercentage = totalCustomersCount > 0 ? ((uniqueTenantsCount / totalCustomersCount) * 100).toFixed(1) : 0;
  const roomCapacityPercentage = rooms.length > 0 ? ((activeRentalsCount / rooms.length) * 100).toFixed(1) : 0;

  const todayObj = new Date();
  const todayDay = todayObj.getDate();
  let next7DaysList = [];
  for(let i=1; i<=7; i++) {
      let d = new Date(todayObj);
      d.setDate(todayObj.getDate() + i);
      next7DaysList.push(d.getDate());
  }

  const dueTodayCount = activeRentalsList.filter(r => {
      const d = parseDateLocal(r.paymentDate || r.entryDate || '2026-01-01');
      return d.getDate() === todayDay;
  }).length;
  const dueTodayPercentage = activeRentalsCount > 0 ? ((dueTodayCount / activeRentalsCount) * 100).toFixed(1) : 0;

  const dueNext7Count = activeRentalsList.filter(r => {
      const d = parseDateLocal(r.paymentDate || r.entryDate || '2026-01-01');
      return next7DaysList.includes(d.getDate());
  }).length;
  const dueNext7Percentage = activeRentalsCount > 0 ? ((dueNext7Count / activeRentalsCount) * 100).toFixed(1) : 0;

  // Yeni Kartların Hesaplamaları
  const totalRoomsCount = rooms.length;
  const emptyRoomsCount = totalRoomsCount - activeRentalsCount;
  const emptyRoomPercentage = totalRoomsCount > 0 ? ((emptyRoomsCount / totalRoomsCount) * 100).toFixed(1) : 0;

  const overdueCount = activeRentalsList.filter(r => {
      const entryD = parseDateLocal(r.entryDate || '2026-01-01');
      const paymentAnchorD = r.paymentDate && r.paymentDate.includes('-') ? parseDateLocal(r.paymentDate) : entryD;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Sadece geçmiş günleri al (bugün hariç)
      
      let loopDate = new Date(paymentAnchorD);
      let hasOverdue = false;
      let monthCounter = 0;
      
      while (loopDate < today) {
          const key = `${loopDate.getFullYear()}-${loopDate.getMonth()}`;
          const isGifted = r.giftMonths && monthCounter < r.giftMonths;
          const isFree = r.isFreeRoom;
          
if (!r.paidMonths?.includes(key) && !isGifted && !isFree) {
              hasOverdue = true;
              break;
          }
          const targetDay = r.paymentDate && !r.paymentDate.includes('-') ? parseInt(r.paymentDate) : paymentAnchorD.getDate();
          let nMonth = loopDate.getMonth() + 1;
          let nYear = loopDate.getFullYear();
          if (nMonth > 11) { nMonth = 0; nYear++; }
          let maxDayInNextMonth = new Date(nYear, nMonth + 1, 0).getDate();
          loopDate = new Date(nYear, nMonth, Math.min(targetDay, maxDayInNextMonth));
          
          monthCounter++;
      }
      return hasOverdue;
  }).length;
  const overduePercentage = activeRentalsCount > 0 ? ((overdueCount / activeRentalsCount) * 100).toFixed(1) : 0;

  const dashboardCards = [
    { id: 1, title: 'TOPLAM MÜŞTERİ', value: totalCustomersCount.toString(), desc: 'Sistemdeki tüm müşteri kayıtları', tag: `Aktif kiracı %${activeTenantPercentage}`, tagColor: 'text-green-700 bg-green-100', borderColor: 'border-blue-500', iconColor: 'text-blue-500 bg-blue-50', icon: Users, chartData: [10, 15, 12, 20, 18, 25, 30], chartColor: '#3b82f6' },
    { id: 2, title: 'AKTİF KİRALAMA', value: activeRentalsCount.toString(), desc: 'Şu anki dolu oda sayısı', tag: `Oda kapasitesi %${roomCapacityPercentage}`, tagColor: 'text-orange-700 bg-orange-100', borderColor: 'border-orange-400', iconColor: 'text-orange-500 bg-orange-50', icon: Box, chartData: [20, 22, 25, 23, 28, 30, 32], chartColor: '#f97316' },
    { id: 3, title: 'BUGÜN VADESİ OLAN', value: dueTodayCount.toString(), desc: 'Planlı ödeme günü bugün olanlar', tag: `Aktif kiranın %${dueTodayPercentage} payı`, tagColor: 'text-gray-600 bg-gray-100', borderColor: 'border-teal-400', iconColor: 'text-teal-500 bg-teal-50', icon: Calendar, chartData: [5, 10, 8, 15, 10, 18, 25], chartColor: '#14b8a6' },
    { id: 4, title: 'ÖNÜMÜZDEKİ 7 GÜN VADE', value: dueNext7Count.toString(), desc: 'Yarın ve +7 gün arası vadesi gelen', tag: `Aktif kiranın %${dueNext7Percentage} payı`, tagColor: 'text-gray-600 bg-gray-100', borderColor: 'border-blue-400', iconColor: 'text-blue-500 bg-blue-50', icon: Calendar, chartData: [10, 12, 15, 10, 20, 25, 20], chartColor: '#3b82f6' },
    { id: 5, title: 'VADESİ GEÇMİŞ (ÖDENMEDİ)', value: overdueCount.toString(), desc: 'Bu yıl • vade geçti • ödeme tarihi yok', tag: `Aktif kiranın %${overduePercentage} payı`, tagColor: 'text-red-700 bg-red-100', borderColor: 'border-red-500', iconColor: 'text-red-500 bg-red-50', icon: AlertCircle, chartData: [30, 25, 28, 20, 15, 10, 5], chartColor: '#ef4444' },
    { id: 6, title: 'TOPLAM DEPO', value: warehouses.length.toString(), desc: `${totalRoomsCount} oda kapasitesi (tüm depolar)`, tag: `Genel doluluk %${roomCapacityPercentage}`, tagColor: 'text-purple-700 bg-purple-100', borderColor: 'border-purple-500', iconColor: 'text-purple-500 bg-purple-50', icon: Home, chartData: [10, 10, 10, 10, 10, 10, 10], chartColor: '#a855f7' },
    { id: 7, title: 'DOLU ODA', value: activeRentalsCount.toString(), desc: 'Hesaba bağlı oda sayısı', tag: `Tüm odaların %${roomCapacityPercentage} payı`, tagColor: 'text-green-700 bg-green-100', borderColor: 'border-green-500', iconColor: 'text-green-500 bg-green-50', icon: Box, chartData: [10, 20, 30, 40, 50, 60, 70], chartColor: '#22c55e' },
    { id: 8, title: 'BOŞ ODA', value: emptyRoomsCount.toString(), desc: 'Kiraya hazır kapasite', tag: `Tüm odaların %${emptyRoomPercentage} payı`, tagColor: 'text-gray-600 bg-gray-100', borderColor: 'border-slate-500', iconColor: 'text-slate-500 bg-slate-50', icon: Box, chartData: [50, 40, 30, 20, 10, 5, 2], chartColor: '#64748b' },
  ];

  const renderYearlyPayments = () => {
    if (!selectedRoomDetail) return [];
    const monthsStr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    const entryDate = parseDateLocal(selectedRoomDetail.entryDate || '2026-01-01');
    const paymentAnchorDate = selectedRoomDetail.paymentDate && selectedRoomDetail.paymentDate.includes('-') 
      ? parseDateLocal(selectedRoomDetail.paymentDate) 
      : entryDate;
      
    const baseAmount = Number(selectedRoomDetail.monthlyFee || 0);
    const hasKdv = selectedRoomDetail.hasKdv !== undefined ? selectedRoomDetail.hasKdv : true;
    const kdvAmount = hasKdv ? baseAmount * 0.20 : 0;
    const totalAmount = baseAmount + kdvAmount;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const customer = customers.find(c => c.name === selectedRoomDetail.customerName);
    const overrides = customer?.ledgerOverrides || [];

    const periods = [];
    let loopDate = new Date(paymentAnchorDate);
    let payIdCounter = 0;
    let monthCounter = 0;
    
    while (loopDate.getFullYear() <= detailYear) {
      if (loopDate.getFullYear() === detailYear) {
        if (loopDate <= today) {
const start = new Date(loopDate);
          
          const targetDay = selectedRoomDetail.paymentDate && !selectedRoomDetail.paymentDate.includes('-') ? parseInt(selectedRoomDetail.paymentDate) : paymentAnchorDate.getDate();
          let nMonth = start.getMonth() + 1;
          let nYear = start.getFullYear();
          if (nMonth > 11) { nMonth = 0; nYear++; }
          let maxDayInNextMonth = new Date(nYear, nMonth + 1, 0).getDate();
          const end = new Date(nYear, nMonth, Math.min(targetDay, maxDayInNextMonth));

          const paymentKey = `${start.getFullYear()}-${start.getMonth()}`;
          const txId = `debt-${selectedRoomDetail.id}-${paymentKey}`;
          
          let displayTotalAmount = totalAmount;
          let displayBaseAmount = baseAmount;
          let displayKdvAmount = kdvAmount;
          let isSpecificGift = false;

          const override = overrides.find(o => o.txId === txId);
          if (override && !override.isDeleted && override.debt !== undefined) {
              displayTotalAmount = override.debt;
              displayBaseAmount = override.baseDebt !== undefined ? override.baseDebt : (hasKdv ? displayTotalAmount / 1.20 : displayTotalAmount);
              displayKdvAmount = override.kdvDebt !== undefined ? override.kdvDebt : (hasKdv ? displayTotalAmount - displayBaseAmount : 0);
              if (override.isSpecificGift) isSpecificGift = true;
          }

          const isPaid = selectedRoomDetail.paidMonths?.includes(paymentKey);
          const isGifted = selectedRoomDetail.giftMonths && monthCounter < selectedRoomDetail.giftMonths;
          const isFree = selectedRoomDetail.isFreeRoom;

          let stat = isPaid ? 'Ödeme Yapıldı' : (isFree ? 'Ücretsiz Oda' : ((isGifted || isSpecificGift) ? 'Hediye Edildi' : 'Bekliyor'));
          let statColor = isPaid ? 'text-green-600 bg-green-50 border-green-200' : (isFree ? 'text-cyan-600 bg-cyan-50 border-cyan-200' : ((isGifted || isSpecificGift) ? 'text-purple-600 bg-purple-50 border-purple-200' : 'text-orange-600 bg-orange-50 border-orange-200'));

          periods.push({
            id: payIdCounter,
            month: monthsStr[start.getMonth()],
            year: start.getFullYear(),
            amount: (isGifted || isFree || isSpecificGift) ? 0 : displayTotalAmount,
            baseAmount: (isGifted || isFree || isSpecificGift) ? 0 : displayBaseAmount,
            kdvAmount: (isGifted || isFree || isSpecificGift) ? 0 : displayKdvAmount,
            hasKdv: hasKdv,
            status: stat,
            color: statColor,
            title: `${start.getDate()} ${monthsStr[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${monthsStr[end.getMonth()]} ${end.getFullYear()} Arası Kira Bedeli`,
            payDay: start.getDate(),
            paymentKey: paymentKey,
            txId: txId,
            dateObj: start,
            isGifted: isGifted || isSpecificGift,
            isFree: isFree,
            isPaid: isPaid
          });
        }
      }
const targetDay = selectedRoomDetail.paymentDate && !selectedRoomDetail.paymentDate.includes('-') ? parseInt(selectedRoomDetail.paymentDate) : paymentAnchorDate.getDate();
      let nMonth = loopDate.getMonth() + 1;
      let nYear = loopDate.getFullYear();
      if (nMonth > 11) { nMonth = 0; nYear++; }
      let maxDayInNextMonth = new Date(nYear, nMonth + 1, 0).getDate();
      loopDate = new Date(nYear, nMonth, Math.min(targetDay, maxDayInNextMonth));

      payIdCounter++;
      monthCounter++;
    }
    return periods;
  };

  const currentPaymentsList = renderYearlyPayments();

  const calculateTotalDebt = () => {
    if (!selectedRoomDetail) return 0;
    const entryDate = parseDateLocal(selectedRoomDetail.entryDate || '2026-01-01');
    const paymentAnchorDate = selectedRoomDetail.paymentDate && selectedRoomDetail.paymentDate.includes('-') 
      ? parseDateLocal(selectedRoomDetail.paymentDate) 
      : entryDate;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let totalUnpaid = 0;
    let loopDate = new Date(paymentAnchorDate);
    let monthCounter = 0;
    
    const baseAmount = Number(selectedRoomDetail.monthlyFee || 0);
    const hasKdv = selectedRoomDetail.hasKdv !== undefined ? selectedRoomDetail.hasKdv : true;
    const monthlyTotal = hasKdv ? baseAmount * 1.20 : baseAmount;

    const customer = customers.find(c => c.name === selectedRoomDetail.customerName);
    const overrides = customer?.ledgerOverrides || [];

    while (loopDate <= today) {
      const key = `${loopDate.getFullYear()}-${loopDate.getMonth()}`;
      const txId = `debt-${selectedRoomDetail.id}-${key}`;
      
      let currentMonthlyTotal = monthlyTotal;
      const override = overrides.find(o => o.txId === txId);
      if (override && !override.isDeleted && override.debt !== undefined) {
          currentMonthlyTotal = override.debt;
      }

      const isGifted = selectedRoomDetail.giftMonths && monthCounter < selectedRoomDetail.giftMonths;
      const isFree = selectedRoomDetail.isFreeRoom;
      
if (!selectedRoomDetail.paidMonths?.includes(key) && !isGifted && !isFree) {
        totalUnpaid += currentMonthlyTotal;
      }
      const targetDay = selectedRoomDetail.paymentDate && !selectedRoomDetail.paymentDate.includes('-') ? parseInt(selectedRoomDetail.paymentDate) : paymentAnchorDate.getDate();
      let nMonth = loopDate.getMonth() + 1;
      let nYear = loopDate.getFullYear();
      if (nMonth > 11) { nMonth = 0; nYear++; }
      let maxDayInNextMonth = new Date(nYear, nMonth + 1, 0).getDate();
      loopDate = new Date(nYear, nMonth, Math.min(targetDay, maxDayInNextMonth));
      
      monthCounter++;
    }
    return totalUnpaid;
  };

  const totalDebt = calculateTotalDebt();

  // --- YENİ EKLENEN: OTOMATİK GECİKME FAİZİ VE CARİ HESAP OLUŞTURUCU ---
  const getCustomerLedger = (customer) => {
      const customerRooms = rooms.filter(r => r.customerName === customer.name);
      const ledgerTransactions = [];
      const monthsStr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

      // 1. Oda Kiraları
      customerRooms.forEach(room => {
          const entryD = parseDateLocal(room.entryDate || '2026-01-01');
          let paymentAnchorD = room.paymentDate && room.paymentDate.includes('-') ? parseDateLocal(room.paymentDate) : entryD;
          const baseAmt = Number(room.monthlyFee || 0);
          const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
          const monthlyTotal = hasKdv ? baseAmt * 1.20 : baseAmt;

          // Ödeme gününü (day) sabitle, aylar eklendikçe değişmesin
          const targetDay = room.paymentDate && !room.paymentDate.includes('-') ? parseInt(room.paymentDate) : paymentAnchorD.getDate();

          let loopDate = new Date(paymentAnchorD.getFullYear(), paymentAnchorD.getMonth(), 1); // Ayın başına sabitle (overflow'u engellemek için)
          let monthCounter = 0;
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          
          // Bugüne kadar olan ayları tara (Yıl ve Ay kıyası)
          while (loopDate.getFullYear() < today.getFullYear() || (loopDate.getFullYear() === today.getFullYear() && loopDate.getMonth() <= today.getMonth())) {
              const year = loopDate.getFullYear();
              const month = loopDate.getMonth();
              const key = `${year}-${month}`;
              
              // O ayki borcun vadesi geldi mi kontrolü (Örn: Bugün 15'i, kira 20'si ise bu ayın borcunu daha yazma)
              let maxDayInMonth = new Date(year, month + 1, 0).getDate(); // O ayın son günü
              let actualPayDay = Math.min(targetDay, maxDayInMonth); // Eğer hedef gün 31 ise ve ay 28 çekiyorsa 28'ine çek
              let txDate = new Date(year, month, actualPayDay);

              if (txDate <= today) {
                  const isGifted = room.giftMonths && monthCounter < room.giftMonths;
                  const isFree = room.isFreeRoom;
                  const appliedMonthlyTotal = (isGifted || isFree) ? 0 : monthlyTotal;
                  const appliedBaseAmt = (isGifted || isFree) ? 0 : baseAmt;
                  const appliedKdvDebt = (isGifted || isFree) ? 0 : (hasKdv ? baseAmt * 0.20 : 0);

                  ledgerTransactions.push({
                      id: `debt-${room.id}-${key}`,
                      date: txDate,
                      dateStr: `${actualPayDay.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`,
                      desc: `${room.name} Odası - ${monthsStr[month]} ${year} Kirası${isFree ? ' (ÜCRETSİZ)' : (isGifted ? ' (HEDİYE)' : '')}`,
                      debt: appliedMonthlyTotal,
                      baseDebt: appliedBaseAmt,
                      kdvDebt: appliedKdvDebt,
                      credit: 0
                  });

                  const isPaid = room.paidMonths?.includes(key);

                  if (isPaid && !isGifted && !isFree) {
                      ledgerTransactions.push({
                          id: `credit-${room.id}-${key}`,
                          date: new Date(txDate.getTime() + 1000),
                          dateStr: `${actualPayDay.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`,
                          desc: `${room.name} Odası - ${monthsStr[month]} ${year} Tahsilatı`,
                          debt: 0,
                          baseDebt: 0,
                          kdvDebt: 0,
                          credit: monthlyTotal
                      });
                  }
                  monthCounter++;
              }
              // Bir sonraki aya geç
              loopDate.setMonth(loopDate.getMonth() + 1);
          }
      });

      // 2. Global Ödemeler
      if (customer.payments) {
          customer.payments.forEach(pay => {
              const pDate = new Date(pay.date);
              ledgerTransactions.push({
                  id: `credit-global-${pay.id}`,
                  date: pDate,
                  dateStr: `${pDate.getDate().toString().padStart(2, '0')}.${(pDate.getMonth() + 1).toString().padStart(2, '0')}.${pDate.getFullYear()}`,
                  desc: `Cari Tahsilat ${pay.note ? '- ' + pay.note : ''}`,
                  debt: 0,
                  baseDebt: 0,
                  kdvDebt: 0,
                  credit: Number(pay.amount)
              });
          });
      }

      // 3. Ekstra Borçlar
      if (customer.extraDebts) {
          customer.extraDebts.forEach(debt => {
              const dDate = new Date(debt.date);
              const amount = Number(debt.amount);
              const hasKdv = debt.hasKdv !== false; // Eğer özellik yoksa KDV'li varsay (geçmişe dönük destek)
              const baseDebt = hasKdv ? amount / 1.2 : amount;
              const kdvDebt = hasKdv ? amount - baseDebt : 0;
              
              ledgerTransactions.push({
                  id: `debt-extra-${debt.id}`,
                  date: dDate,
                  dateStr: `${dDate.getDate().toString().padStart(2, '0')}.${(dDate.getMonth() + 1).toString().padStart(2, '0')}.${dDate.getFullYear()}`,
                  desc: debt.desc,
                  debt: amount,
                  baseDebt: baseDebt,
                  kdvDebt: kdvDebt,
                  credit: 0
              });
          });
      }

      // 4. Override (Düzenleme) Mantığı
      let modifiedLedger = [];
      ledgerTransactions.forEach(tx => {
          const override = customer.ledgerOverrides?.find(o => o.txId === tx.id);
          if (override && override.isDeleted) return;
          if (override) {
              const oDate = override.date ? new Date(override.date) : tx.date;
              const finalDebt = override.debt !== undefined ? override.debt : tx.debt;
              const ratio = tx.debt > 0 ? finalDebt / tx.debt : 0;
              modifiedLedger.push({
                  ...tx,
                  desc: override.desc || tx.desc,
                  debt: finalDebt,
                  baseDebt: tx.baseDebt * ratio || 0,
                  kdvDebt: tx.kdvDebt * ratio || 0,
                  credit: override.credit !== undefined ? override.credit : tx.credit,
                  date: oDate,
                  dateStr: `${oDate.getDate().toString().padStart(2, '0')}.${(oDate.getMonth() + 1).toString().padStart(2, '0')}.${oDate.getFullYear()}`
              });
          } else {
              modifiedLedger.push(tx);
          }
      });

      // 5. Tarihe Göre Sırala
      modifiedLedger.sort((a, b) => a.date - b.date);

      // 6. Gecikme Faizi ve Bakiye (Chronological Loop)
      let finalLedger = [];
      let runningBalance = 0;
      let lastInterestAppliedDate = null;
      const interestRate = Number(collectionRates.interestRate) / 100;
      const addDays = (d, days) => new Date(d.getTime() + days * 86400000);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const baseTransactions = [...modifiedLedger];
      // Bugüne kadar olan faizleri tetiklemek için dummy bir hareket ekliyoruz.
      baseTransactions.push({ id: 'dummy-today', date: today, debt: 0, credit: 0, isDummy: true });

      baseTransactions.forEach(tx => {
          // Eğer borç varsa ve üzerinden zaman geçmişse faizi uygula (VE AYARLARDAN AKTİF EDİLDİYSE)
          if (collectionRates.isInterestActive && runningBalance > 0 && lastInterestAppliedDate) {
              let nextInterestDate = addDays(lastInterestAppliedDate, 30);
              
              while (nextInterestDate <= tx.date) {
                  const interestAmount = runningBalance * interestRate;
                  const totalInterest = interestAmount * 1.20; // + %20 KDV
                  
                  runningBalance += totalInterest;
                  
                  finalLedger.push({
                      id: `interest-${nextInterestDate.getTime()}`,
                      date: new Date(nextInterestDate),
                      dateStr: `${nextInterestDate.getDate().toString().padStart(2, '0')}.${(nextInterestDate.getMonth() + 1).toString().padStart(2, '0')}.${nextInterestDate.getFullYear()}`,
                      desc: `1 Aylık Gecikme Faiz Ücreti`,
                      debt: totalInterest,
                      baseDebt: interestAmount,
                      kdvDebt: interestAmount * 0.20,
                      credit: 0,
                      balance: runningBalance,
                      isInterest: true
                  });
                  
                  lastInterestAppliedDate = new Date(nextInterestDate);
                  nextInterestDate = addDays(lastInterestAppliedDate, 30);
              }
          }

          // Asıl hareketi (işlemi) uygula
          if (!tx.isDummy) {
              runningBalance += (tx.debt - tx.credit);
              
              if (runningBalance > 0) {
                  // Eğer bakiye pozitifse ve daha önce faiz başlangıç tarihi yoksa yeni tarihi ata
                  if (!lastInterestAppliedDate) {
                      lastInterestAppliedDate = new Date(tx.date);
                  }
              } else {
                  // Borç sıfırlandıysa veya alacaklıysa faiz döngüsünü sıfırla
                  lastInterestAppliedDate = null;
              }
              
              finalLedger.push({ ...tx, balance: runningBalance });
          }
      });

      return { ledger: finalLedger, balance: runningBalance };
  };

  let customerTotalBalance = 0;
  if (selectedRoomDetail?.customerName) {
      const customer = customers.find(c => c.name === selectedRoomDetail.customerName);
      if (customer) {
          const { balance } = getCustomerLedger(customer);
          customerTotalBalance = balance;
      }
  }

  const getRoomStats = (blockId) => {
    const blockRooms = rooms.filter(r => r.blockId === blockId);
    let empty = 0; let full = 0; let reserved = 0;
    blockRooms.forEach(oda => {
      const isValidReservation = oda.isReserved && (!oda.reserveExpiryTimestamp || oda.reserveExpiryTimestamp > Date.now());
      if (oda.customerName) full++;
      else if (isValidReservation) reserved++;
      else empty++;
    });
    return { empty, full, reserved };
  };

  const getWarehouseStats = (warehouseId) => {
    const whBlocks = blocks.filter(b => b.warehouseId === warehouseId);
    let empty = 0; let full = 0; let reserved = 0;
    whBlocks.forEach(b => {
      const stats = getRoomStats(b.id);
      empty += stats.empty; full += stats.full; reserved += stats.reserved;
    });
    return { empty, full, reserved };
  };

  const getBlockCapacityM3 = (blockId) => rooms.filter(r => r.blockId === blockId).reduce((sum, room) => sum + Number(room.m3 || 0), 0);
  const getWarehouseCapacityM3 = (warehouseId) => {
    const whBlockIds = blocks.filter(b => b.warehouseId === warehouseId).map(b => b.id);
    return rooms.filter(r => whBlockIds.includes(r.blockId)).reduce((sum, room) => sum + Number(room.m3 || 0), 0);
  };
  const getBlockOccupiedM3 = (blockId) => rooms.filter(r => r.blockId === blockId && (r.customerName || (r.isReserved && (!r.reserveExpiryTimestamp || r.reserveExpiryTimestamp > Date.now())))).reduce((sum, room) => sum + Number(room.m3 || 0), 0);
const getWarehouseOccupiedM3 = (warehouseId) => {
    const whBlockIds = blocks.filter(b => b.warehouseId === warehouseId).map(b => b.id);
    return rooms.filter(r => whBlockIds.includes(r.blockId) && (r.customerName || (r.isReserved && (!r.reserveExpiryTimestamp || r.reserveExpiryTimestamp > Date.now())))).reduce((sum, room) => sum + Number(room.m3 || 0), 0);
  };

  // ==========================================
  // YEDEKLEME FONKSİYONLARI
  // ==========================================
  const handleExportJSON = () => {
    const backupData = { customers, warehouses, blocks, rooms };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `depoevim_yedek_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        console.log("İçe aktarılacak veriler:", importedData);
        alert("Dosya başarıyla okundu! Yüklenen veriler konsolda görünüyor.");
      } catch (error) {
        alert("Geçersiz JSON dosyası!");
      }
    };
    reader.readAsText(file);
  };
  // ==========================================

  if (!isAuthenticated) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 sm:p-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
                  {/* Top Color Accents */}
                  <div className="absolute top-0 left-0 right-0 flex h-1.5">
                      <div className="w-1/2 bg-orange-500"></div>
                      <div className="w-1/2 bg-blue-500"></div>
                  </div>
                  
                  <div className="text-center mb-10 mt-2">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 mb-4 shadow-sm border border-gray-100">
                          <Box size={32} className="text-orange-500" />
                      </div>
                      <div className="text-3xl font-black text-slate-800 tracking-tight"><span className="text-orange-500">Depo</span><span className="text-blue-500">evim</span><span className="text-sm text-gray-400 font-bold ml-2 uppercase tracking-widest align-middle">CRM</span></div>
                      <p className="text-sm text-gray-500 mt-2 font-medium">Yönetim paneline hoş geldiniz, lütfen giriş yapın.</p>
                  </div>

                  <form onSubmit={handleLogin} className="flex flex-col gap-5">
                      {loginError && (
                          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 animate-pulse">
                              <AlertCircle size={16} /> {loginError}
                          </div>
                      )}
<div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-1">Kullanıcı Adı</label>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><UserCog size={18} className="text-gray-400" /></div>
                              <input type="text" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} placeholder="admin" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-50 transition-all font-semibold text-slate-700" required />
                          </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider pl-1">Şifre</label>                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                              </div>
                              <input type="password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} placeholder="••••••••" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-50 transition-all font-semibold text-slate-700" required />
                          </div>
                      </div>
                      <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white w-full py-3.5 rounded-xl font-bold text-base shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                          Sisteme Giriş Yap
                      </button>
                  </form>
                  
                  <div className="mt-8 pt-6 border-t border-gray-100 text-center flex flex-col items-center gap-1">
                      <p className="text-[11px] text-gray-400 font-medium">Depoevim CRM Sistemi © {new Date().getFullYear()}</p>
                      <p className="text-[10px] text-gray-400">Gizlilik & Güvenlik Politikası</p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 flex bg-slate-50 font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-gray-800/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:relative h-full`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800"><span className="text-orange-500">Depo</span><span className="text-blue-500">evim</span><span className="text-xs text-gray-400 font-normal ml-1">CRM</span></div>
          <button className="ml-auto lg:hidden p-1" onClick={() => setIsSidebarOpen(false)}><X size={24} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin min-h-0">
          <nav className="space-y-2 px-3 pb-8">
            {menuItems.map((item) => {
              const hasActiveSub = item.subItems?.some(sub => sub.id === activeMenu);

              return item.subItems ? (
                <div key={item.id} className={`w-full border rounded-xl shadow-sm transition-all ${hasActiveSub ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200 bg-white'} p-1`}>
                  <button onClick={() => {
                    // Sadece menüyü aç/kapat (sayfa değiştirmeden)
                    setOpenSubMenus(prev => ({...prev, [item.id]: !prev[item.id]}));
                  }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${hasActiveSub ? 'text-orange-700 hover:bg-orange-100/50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <div className="flex items-center gap-3"><item.icon size={18} className={hasActiveSub ? 'text-orange-600' : 'text-gray-400'} />{item.label}</div>
                    <ChevronDown size={16} className={`${hasActiveSub ? 'text-orange-600' : 'text-gray-400'} transition-transform ${openSubMenus[item.id] ? 'rotate-180' : ''}`} />
                  </button>
                  {openSubMenus[item.id] && (
                    <div className="mt-1 mb-1 space-y-1">
                      {item.subItems.map(sub => {
                        const isSubActive = sub.id === activeMenu;
                        
                        let buttonClass = '';
                        let layoutClass = 'w-full pl-10 pr-3 py-2 rounded-lg text-sm';
                        
                        if (sub.id === 'odeme-girisi') {
                            // Butonun genişliğini, yüksekliğini ve padding'ini küçültüyoruz
                            layoutClass = 'w-[85%] ml-auto mr-3 pl-3 pr-2 py-1.5 rounded-md text-[13px] my-1';
                            buttonClass = isSubActive 
                                ? 'bg-[#1bc5bd] text-white shadow-md font-bold' 
                                : 'bg-teal-50/50 text-teal-700 border border-teal-200 hover:bg-teal-100/50 hover:border-teal-300 font-bold shadow-sm';
                        } else if (sub.id === 'depo-odemeleri-guncelle') {
                            layoutClass = 'w-[85%] ml-auto mr-3 pl-3 pr-2 py-2 rounded-md text-[13px] mt-3 mb-1';
                            buttonClass = 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 font-bold hover:from-purple-700 hover:to-indigo-700 transition-all';
                        } else {
                            buttonClass = isSubActive 
                                ? 'bg-orange-50 text-orange-600' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900';
                        }

                        return (
                          <button key={sub.id} onClick={() => { if (sub.action) { sub.action(); } else { setActiveMenu(sub.id); setSelectedCustomerId(null); setIsSidebarOpen(false); } }} className={`flex items-center justify-between text-left transition-colors font-medium ${layoutClass} ${buttonClass}`}>
                            {sub.label}
                            {sub.id === 'odeme-girisi' && <Plus size={14} className={isSubActive ? 'text-white' : 'text-teal-600'} />}
                            {sub.id === 'depo-odemeleri-guncelle' && <RefreshCcw size={14} className="text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <button key={item.id} onClick={() => { 
                    setActiveMenu(item.id); 
                    setSelectedCustomerId(null); 
                    setIsSidebarOpen(false); 
                    if (item.id === 'depo') {
                      // Depo menüsüne (veya alt menüsüz ana öğelere) tıklandığında alt seçimleri sıfırlayarak ana bölüme dön
                      setSelectedWarehouseId(null);
                      setSelectedBlockId(null);
                      setSelectedRoomId(null);
                    }
                }} className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-xl shadow-sm transition-colors text-sm font-medium ${activeMenu === item.id && !selectedCustomerId ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <item.icon size={18} className={activeMenu === item.id ? 'text-orange-500' : 'text-gray-400'} />{item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 z-30 relative gap-2 sm:gap-4">
          <div className="flex items-center shrink-0 lg:hidden">
            <button className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={() => setIsSidebarOpen(true)}><Menu size={22} /></button>
          </div>
          
          <div className="flex-1 max-w-md w-full relative z-40 flex items-center justify-center">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400" /></div>
              <input 
                 type="text" 
                 placeholder="Ara: Ad, No, Oda..." 
                 value={globalSearchTerm}
                 onChange={(e) => {
                     setGlobalSearchTerm(e.target.value);
                     setShowGlobalSearchResults(e.target.value.length > 0);
                 }}
                 onFocus={() => {
                     if (globalSearchTerm.length > 0) setShowGlobalSearchResults(true);
                 }}
                 className="block w-full pl-8 sm:pl-10 pr-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 relative z-50"
              />
              
              {showGlobalSearchResults && (
                 <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowGlobalSearchResults(false)}></div>
                    <div className="absolute top-full left-0 sm:left-0 lg:left-0 mt-2 w-[85vw] sm:w-[500px] max-w-full max-h-[400px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl z-50">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 sticky top-0 flex justify-between items-center z-10">
                            <span className="text-xs font-bold text-gray-500 uppercase">Arama Sonuçları</span>
                            <button onClick={() => setShowGlobalSearchResults(false)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                        </div>
{(() => {
                            const term = normalizeStr(globalSearchTerm);
                            const results = customers.map(c => {
                                const cRooms = rooms.filter(r => r.customerName === c.name);
                                return { customer: c, rooms: cRooms };
                            }).filter(item => {
                                const matchName = normalizeStr(item.customer.name).includes(term);
                                const matchNo = item.customer.customerNo?.includes(term);
                                const matchPhone = item.customer.phone?.includes(term);
                                const matchRoom = item.rooms.some(r => normalizeStr(r.name).includes(term));
                                return matchName || matchNo || matchPhone || matchRoom;
                            });

                            if (results.length === 0) return <div className="p-6 text-center text-sm text-gray-500 font-medium">Aranan kriterlere uygun müşteri bulunamadı.</div>;

                            return (
                                <ul className="divide-y divide-gray-100">
                                    {results.map((item, idx) => (
                                        <li key={idx} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
                                            <div className="flex-1 min-w-0 w-full">
                                                <div className="font-bold text-gray-800 text-sm truncate">{item.customer.name}</div>
                                                <div className="text-[10px] text-gray-500 flex flex-wrap gap-2 mt-1">
                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-semibold text-gray-600">No: {item.customer.customerNo}</span>
                                                    <span className="flex items-center gap-0.5 font-medium"><Phone size={10}/> {item.customer.phone}</span>
                                                    {item.rooms.length > 0 && (
                                                        <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 truncate">
                                                            Oda: {item.rooms.map(r=>r.name).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex sm:flex-col gap-1.5 shrink-0 w-full sm:w-28 mt-2 sm:mt-0">
                                                <button onClick={() => {
                                                    setSelectedCustomerId(item.customer.id);
                                                    setActiveMenu('tum-musteriler');
                                                    setShowGlobalSearchResults(false);
                                                    setGlobalSearchTerm('');
                                                }} className="text-[10px] bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm flex-1 sm:w-full">
                                                    <Settings size={12}/> Cariye Git
                                                </button>
                                                
                                                {item.rooms.length > 0 && (
                                                    <button onClick={() => {
                                                        const firstRoom = item.rooms[0];
                                                        const block = blocks.find(b => b.id === firstRoom.blockId);
                                                        if (block) {
                                                            setSelectedWarehouseId(block.warehouseId);
                                                            setSelectedBlockId(firstRoom.blockId);
                                                            setSelectedRoomId(firstRoom.id);
                                                            setSelectedCustomerId(null);
                                                            setActiveMenu('depo');
                                                            setShowGlobalSearchResults(false);
                                                            setGlobalSearchTerm('');
                                                        }
                                                    }} className="text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm flex-1 sm:w-full">
                                                        <Box size={12}/> Odasına Git
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            );
                        })()}
                    </div>
                 </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <button className="p-1 sm:p-2 text-gray-400 hover:text-gray-500 relative hidden sm:block"><Bell size={18} /><span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" /></button>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            
            <div className="relative">
                <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center gap-2 hover:bg-gray-50 p-1 sm:p-1.5 rounded-lg transition-colors">
                  {currentUserProfile.avatar ? (
                      <img src={currentUserProfile.avatar} alt="Profile" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover border border-gray-200 shadow-sm" />
                  ) : (
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm">
                          {currentUserProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                  )}
                  <div className="hidden md:block text-left"><p className="text-sm font-medium text-gray-700 leading-none">{currentUserProfile.name}</p><p className="text-xs text-gray-500 mt-1">{currentUserProfile.role}</p></div>
                  <ChevronDown size={16} className={`text-gray-400 hidden sm:block transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isProfileDropdownOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 border-b border-gray-50 md:hidden bg-gray-50/50">
                                <p className="text-sm font-bold text-gray-800">{currentUserProfile.name}</p>
                                <p className="text-xs font-semibold text-orange-600 mt-0.5">{currentUserProfile.role}</p>
                            </div>
                            <button onClick={() => { setIsProfileModalOpen(true); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1bc5bd] flex items-center gap-2 font-bold transition-colors">
                                <UserCog size={16} className="text-gray-400"/> Profil Ayarları
                            </button>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold transition-colors border-t border-gray-50">
                                <LogOut size={16} className="text-red-400"/> Çıkış Yap
                            </button>
                        </div>
                    </>
                )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 w-full block scroll-smooth relative">
          {activeMenu === 'dashboard' ? (
             <div className="max-w-7xl mx-auto">
              <div className="mb-6"><h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Özet</h1><h2 className="text-2xl font-bold text-gray-800">Gösterge Paneli</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {dashboardCards.map((card) => (
                  <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${card.borderColor}`}></div>
                    <div className="p-5 pl-6">
                      <div className="flex justify-between items-start mb-4"><div className={`p-2 rounded-lg ${card.iconColor}`}><card.icon size={20} /></div><Sparkline data={card.chartData} color={card.chartColor} /></div>
                      <div><h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-1">{card.title}</h3><div className="text-3xl font-bold text-gray-800 mb-1">{card.value}</div><p className="text-xs text-gray-400 mb-4 h-4">{card.desc}</p></div>
                      <div><span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${card.tagColor}`}>{card.tag}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeMenu === 'randevu-olustur' ? (
             <div className="max-w-4xl mx-auto pb-10 animate-in fade-in duration-300">
                 <div className="mb-6">
                    <button onClick={() => setActiveMenu('takvim')} className="text-[10px] font-bold text-gray-400 hover:text-indigo-500 tracking-widest uppercase mb-1.5 flex items-center gap-1 transition-colors"><ArrowLeft size={12} /> Takvime Dön</button>
                    <h2 className="text-2xl font-bold text-slate-800">Randevu Oluştur</h2>
                    <p className="text-sm text-gray-500 mt-1">Mevcut veya yeni müşteriler için depo ziyareti / işlem randevusu planlayın.</p>
                 </div>
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    
                    <div className="mb-8">
                       <h4 className="text-sm font-bold text-gray-700 mb-4 border-b border-gray-100 pb-2">1. Müşteri Bilgileri</h4>
                       <div className="flex gap-6 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer group">
                             <input type="radio" name="apptCustomerType" value="registered" checked={appointmentData.customerType === 'registered'} onChange={() => setAppointmentData({...appointmentData, customerType: 'registered'})} className="w-5 h-5 text-indigo-500 border-gray-300 focus:ring-indigo-500"/>
                             <span className={`text-sm font-bold transition-colors ${appointmentData.customerType === 'registered' ? 'text-slate-800' : 'text-gray-500'}`}>Mevcut Sistem Müşterisi</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                             <input type="radio" name="apptCustomerType" value="unregistered" checked={appointmentData.customerType === 'unregistered'} onChange={() => setAppointmentData({...appointmentData, customerType: 'unregistered'})} className="w-5 h-5 text-indigo-500 border-gray-300 focus:ring-indigo-500"/>
                             <span className={`text-sm font-bold transition-colors ${appointmentData.customerType === 'unregistered' ? 'text-slate-800' : 'text-gray-500'}`}>Kayıtsız / Yeni Müşteri</span>
                          </label>
                       </div>
                       
{appointmentData.customerType === 'registered' ? (
                           <div className="flex flex-col gap-1.5">
                               <label className="text-xs font-semibold text-gray-600">Müşteri Seçin (Zorunlu)</label>
                               
                               {/* ARAMA BARI BAŞLANGICI */}
                               <div className="relative">
                                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                       <Search size={16} className="text-gray-400" />
                                   </div>
                                   <input 
                                       type="text" 
                                       placeholder="Müşteri Adı veya No ile Ara..." 
                                       value={apptCustomerSearch} 
                                       onChange={(e) => setApptCustomerSearch(e.target.value)} 
                                       className="w-full pl-10 pr-4 py-2 mb-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-white shadow-sm" 
                                   />
                               </div>
                               {/* ARAMA BARI BİTİŞİ */}

                               <select value={appointmentData.customerId} onChange={(e) => setAppointmentData({...appointmentData, customerId: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-white">
                                   <option value="">Lütfen listeden müşteri seçin...</option>
                                   {customers.filter(c => {
                                       if (!apptCustomerSearch) return true;
                                       const searchLower = normalizeStr(apptCustomerSearch);
                                       const matchName = normalizeStr(c.name).includes(searchLower);
                                       const matchNo = c.customerNo && String(c.customerNo).includes(searchLower);
                                       return matchName || matchNo;
                                   }).map(c => (
                                       <option key={c.id} value={c.id}>{c.name} (No: {c.customerNo} - {c.phone})</option>
                                   ))}
                               </select>
                           </div>
                       ) : (
                        
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="flex flex-col gap-1.5">
                                   <label className="text-xs font-semibold text-gray-600">Ad Soyad (Zorunlu)</label>
                                   <input type="text" value={appointmentData.unregisteredName} onChange={(e) => setAppointmentData({...appointmentData, unregisteredName: e.target.value})} placeholder="Örn: AHMET YILMAZ" className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700" />
                               </div>
                               <div className="flex flex-col gap-1.5">
                                   <label className="text-xs font-semibold text-gray-600">Telefon (Zorunlu)</label>
                                   <input type="text" value={appointmentData.unregisteredPhone} onChange={(e) => setAppointmentData({...appointmentData, unregisteredPhone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700" />
                               </div>
                           </div>
                       )}
                    </div>

                    <div className="mb-8">
                       <h4 className="text-sm font-bold text-gray-700 mb-4 border-b border-gray-100 pb-2">2. Randevu Detayları</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                           <div className="flex flex-col gap-1.5">
                               <label className="text-xs font-semibold text-gray-600">Tarih (Zorunlu)</label>
                               <input type="date" value={appointmentData.date} onChange={(e) => setAppointmentData({...appointmentData, date: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700" />
                           </div>
                           <div className="flex flex-col gap-1.5">
                               <label className="text-xs font-semibold text-gray-600">Saat Aralığı (Zorunlu)</label>
                               <select value={appointmentData.time} onChange={(e) => setAppointmentData({...appointmentData, time: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-white">
                                   <option value="09:00 - 10:00">09:00 - 10:00</option>
                                   <option value="10:00 - 11:00">10:00 - 11:00</option>
                                   <option value="11:00 - 12:00">11:00 - 12:00</option>
                                   <option value="12:00 - 13:00">12:00 - 13:00</option>
                                   <option value="13:00 - 14:00">13:00 - 14:00</option>
                                   <option value="14:00 - 15:00">14:00 - 15:00</option>
                                   <option value="15:00 - 16:00">15:00 - 16:00</option>
                                   <option value="16:00 - 17:00">16:00 - 17:00</option>
                                   <option value="17:00 - 18:00">17:00 - 18:00</option>
                               </select>
                           </div>
                           <div className="flex flex-col gap-1.5 md:col-span-2">
                               <label className="text-xs font-semibold text-gray-600">Depo Şubesi (Zorunlu)</label>
                               <select value={appointmentData.warehouseId} onChange={(e) => setAppointmentData({...appointmentData, warehouseId: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-white">
                                   <option value="">Lütfen Şube Seçin...</option>
                                   {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                               </select>
                           </div>
                       </div>
                       
                       <div className="flex flex-col gap-1.5">
                           <label className="text-xs font-semibold text-gray-600 mb-2">Depoya Gelme Amacı (Zorunlu)</label>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               {Object.entries(appointmentPurposes).map(([key, data]) => (
                                   <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${appointmentData.purpose === key ? `border-indigo-400 bg-indigo-50/30` : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
                                       <input type="radio" name="apptPurpose" value={key} checked={appointmentData.purpose === key} onChange={() => setAppointmentData({...appointmentData, purpose: key})} className="w-4 h-4 text-indigo-500 focus:ring-indigo-500"/>
                                       <div className="flex items-center gap-2">
                                          <div className={`w-3 h-3 rounded-full ${data.color}`}></div>
                                          <span className={`font-bold text-sm ${appointmentData.purpose === key ? 'text-indigo-800' : 'text-gray-600'}`}>{data.label}</span>
                                       </div>
                                   </label>
                               ))}
                           </div>
                       </div>
                    </div>
                    
                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                       <button onClick={handleSaveAppointment} disabled={
                           (appointmentData.customerType === 'registered' && !appointmentData.customerId) ||
                           (appointmentData.customerType === 'unregistered' && (!appointmentData.unregisteredName || !appointmentData.unregisteredPhone)) ||
                           !appointmentData.warehouseId || !appointmentData.date
                       } className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/30">
                           <Check strokeWidth={3} size={20} /> Randevuyu Kaydet
                       </button>
                    </div>

                 </div>
             </div>
          ) : activeMenu === 'randevu-takvimi' || activeMenu === 'takvim' ? (
             <div className="max-w-5xl mx-auto pb-10 animate-in fade-in duration-300">
                 <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="shrink-0">
                        <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Takvim</h1>
                        <h2 className="text-2xl font-bold text-slate-800">Randevu Takvimi</h2>
                    </div>

                    <button onClick={() => setActiveMenu('randevu-olustur')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 shrink-0 transition-colors">
                        <Plus size={16} /> Yeni Randevu Ekle
                    </button>
                 </div>

                 <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                         <div className="flex items-center gap-4 bg-gray-50/50 p-2 rounded-2xl border border-gray-100 shadow-sm">
                             <button onClick={() => {
                                 if(calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
                                 else { setCalendarMonth(calendarMonth - 1); }
                             }} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"><ArrowLeft size={18} /></button>
                             <h3 className="text-lg sm:text-xl font-bold text-gray-800 w-32 sm:w-40 text-center tracking-wide">
                                 {['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][calendarMonth]} {calendarYear}
                             </h3>
                             <button onClick={() => {
                                 if(calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
                                 else { setCalendarMonth(calendarMonth + 1); }
                             }} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"><ArrowLeft size={18} className="rotate-180" /></button>
                         </div>
                         
                         <div className="flex flex-col items-end gap-3 text-[10px] sm:text-xs font-bold">
                             <div className="flex flex-wrap justify-end items-center gap-4">
                                 {Object.entries(appointmentPurposes).slice(0, 3).map(([key, data]) => (
                                     <div key={key} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${data.color}`}></div><span className="text-gray-600">{data.label.split(' ')[0]}</span></div>
                                 ))}
                             </div>
                             <div className="flex flex-wrap justify-end items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border border-gray-300 bg-white"></div><span className="text-gray-500">Boş (0)</span></div>
                                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border border-gray-200 bg-gray-50"></div><span className="text-gray-600">Müsait (1-3)</span></div>
                                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-50 border border-red-200"></div><span className="text-gray-800">Yoğun (4)</span></div>
                                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-black"></div><span className="text-black">Dolu (5+)</span></div>
                             </div>
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
                         {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                             <div key={d} className="text-center text-xs font-bold text-gray-400 pb-2">{d}</div>
                         ))}
                         
                         {(() => {
                             const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
                             const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
                             const cells = [];
                             
                             for(let i=0; i<firstDay; i++) {
                                 cells.push(<div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[90px] rounded-2xl bg-transparent"></div>);
                             }
                             
                             for(let i=1; i<=daysInMonth; i++) {
                                 const currentDateStr = `${calendarYear}-${(calendarMonth+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
                                 const isSelected = selectedCalendarDate === currentDateStr;
                                 const dayAppts = appointments.filter(a => a.date === currentDateStr);
                                 const count = dayAppts.length;
                                 
                                 let cellBg = 'bg-white border-gray-200 text-gray-800';
                                 let countText = 'text-gray-400';
                                 let dayText = 'text-gray-800';

                                 if (count === 0) {
                                     cellBg = 'bg-white border-gray-200 hover:border-gray-300';
                                 } else if (count >= 1 && count <= 3) {
                                     cellBg = 'bg-gray-50 border-gray-100 hover:bg-gray-200';
                                 } else if (count === 4) {
                                     cellBg = 'bg-[#fff4f4] border-red-100 hover:bg-red-50';
                                     countText = 'text-red-400';
                                     dayText = 'text-red-900';
                                 } else if (count >= 5) {
                                     cellBg = 'bg-black border-black hover:bg-gray-900';
                                     dayText = 'text-white';
                                     countText = 'text-gray-400';
                                 }

                                 if (isSelected) {
                                     cellBg += ' ring-2 ring-red-500 ring-offset-2 border-transparent';
                                 }
                                 
                                 cells.push(
                                     <div key={i} onClick={() => setSelectedCalendarDate(currentDateStr)} className={`min-h-[70px] sm:min-h-[90px] p-2 sm:p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all shadow-sm ${cellBg}`}>
                                         <div className="flex justify-between items-start">
                                             <span className={`text-sm sm:text-base font-bold ${dayText}`}>{i}</span>
                                             {count > 0 && <span className={`text-[9px] sm:text-[10px] font-bold ${countText}`}>{count} İş</span>}
                                         </div>
                                         <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 content-start">
                                             {dayAppts.map(a => (
                                                 <div key={a.id} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${appointmentPurposes[a.purpose].color} shadow-sm`} title={appointmentPurposes[a.purpose].label}></div>
                                             ))}
                                         </div>
                                     </div>
                                 );
                             }
                             return cells;
                         })()}
                     </div>
                 </div>

                 {/* Seçili Günün Detayları */}
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                     <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                         <Calendar size={20} className="text-indigo-600" />
                         {(() => {
                             const d = new Date(selectedCalendarDate);
                             return `${d.getDate()} ${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][d.getMonth()]} ${d.getFullYear()} - Randevu Listesi`;
                         })()}
                     </h3>

                     {(() => {
                         const dayAppts = appointments.filter(a => a.date === selectedCalendarDate).sort((a,b) => a.time.localeCompare(b.time));
                         
                         if(dayAppts.length === 0) {
                             return (
                                 <div className="text-center py-10">
                                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><Clock size={24} className="text-gray-300" /></div>
                                     <p className="text-sm font-medium text-gray-500">Bu güne ait herhangi bir randevu kaydı bulunmamaktadır.</p>
                                 </div>
                             );
                         }

                         return (
                             <div className="flex flex-col gap-4">
                                 {dayAppts.map(appt => {
                                     const pData = appointmentPurposes[appt.purpose];
                                     const warehouseName = warehouses.find(w => w.id === appt.warehouseId)?.name;
                                     return (
                                         <div key={appt.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${pData.border} ${pData.bgLight} transition-shadow hover:shadow-md`}>
                                             <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                                 <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white ${pData.color} shadow-sm`}>
                                                     <Clock size={20} />
                                                 </div>
                                                 <div>
                                                     <div className="flex flex-wrap items-center gap-2 mb-1">
                                                         <h4 className="font-bold text-gray-800 text-[15px]">{appt.customerName}</h4>
                                                         {appt.customerType === 'unregistered' && <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Kayıtsız Müşteri</span>}
                                                     </div>
                                                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-600">
                                                         <span className="flex items-center gap-1 text-gray-500"><Phone size={12}/> {appt.customerPhone}</span>
                                                         <span className="flex items-center gap-1 text-gray-500"><Home size={12}/> {warehouseName}</span>
                                                     </div>
                                                 </div>
                                             </div>
<div className="flex flex-col items-start sm:items-end gap-2 sm:pl-4 sm:border-l border-white/50">
                                                 <span className={`text-xs font-bold px-2 py-1 rounded bg-white shadow-sm ${pData.text}`}>{pData.label}</span>
                                                 <div className="flex items-center gap-2">
                                                     <span className="font-black text-gray-800 bg-white/50 px-2 py-0.5 rounded text-sm">{appt.time}</span>
                                                     <button onClick={() => { setEditApptData({...appt}); setIsEditApptModalOpen(true); }} className="bg-white hover:bg-indigo-50 text-indigo-600 p-1.5 rounded-lg transition-colors shadow-sm border border-indigo-100" title="Randevuyu Düzenle"><Edit size={14}/></button>
                                                     <button onClick={() => { if(window.confirm('Bu randevuyu silmek istediğinize emin misiniz?')) handleDeleteAppointment(appt.id); }} className="bg-white hover:bg-red-50 text-red-600 p-1.5 rounded-lg transition-colors shadow-sm border border-red-100" title="Randevuyu Sil"><Trash2 size={14}/></button>
                                                 </div>
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         );
                     })()}
                 </div>

             </div>
          ) : activeMenu === 'musteri-ekle' ? (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6"><h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Müşteri Yönetimi</h1><h2 className="text-2xl font-bold text-slate-800">Yeni Müşteri Ekle</h2><p className="text-sm text-gray-500 mt-1">Sisteme yeni bir bireysel veya kurumsal müşteri tanımlayın.</p></div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                {customerSaveError && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <div className="bg-red-100 p-1.5 rounded-full shrink-0"><AlertCircle size={18} className="text-red-600"/></div>
                        <span className="font-bold text-sm leading-relaxed">{customerSaveError}</span>
                    </div>
                )}
                <div className="flex gap-6 mb-8 pb-4 border-b border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer group"><input type="radio" name="customerType" value="bireysel" checked={customerType === 'bireysel'} onChange={() => setCustomerType('bireysel')} className="w-5 h-5 text-red-500 border-gray-300 focus:ring-red-500"/><span className={`text-sm font-bold transition-colors ${customerType === 'bireysel' ? 'text-slate-800' : 'text-gray-500'}`}>Bireysel Müşteri</span></label>
                  <label className="flex items-center gap-2 cursor-pointer group"><input type="radio" name="customerType" value="kurumsal" checked={customerType === 'kurumsal'} onChange={() => setCustomerType('kurumsal')} className="w-5 h-5 text-red-500 border-gray-300 focus:ring-red-500"/><span className={`text-sm font-bold transition-colors ${customerType === 'kurumsal' ? 'text-slate-800' : 'text-gray-500'}`}>Kurumsal Müşteri</span></label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#1bc5bd] uppercase tracking-wider">Müşteri Numarası (Sistem Ataması)</label>
                    <input type="text" readOnly value="Kayıt tamamlandığında otomatik olarak 5 haneli benzersiz numara atanacaktır." className="border-2 border-[#1bc5bd]/20 bg-teal-50/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-semibold text-teal-700 cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{customerType === 'bireysel' ? 'Ad Soyad (Zorunlu)' : 'Firma Adı / Yetkili Kişi (Zorunlu)'}</label><input type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} placeholder={customerType === 'bireysel' ? 'Ad Soyad' : 'Firma Adı'} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{customerType === 'bireysel' ? 'TC Kimlik Numarası (Zorunlu)' : 'Vergi Numarası / Dairesi (Zorunlu)'}</label><input type="text" value={newCustomer.tc} onChange={(e) => setNewCustomer({...newCustomer, tc: e.target.value})} placeholder={customerType === 'bireysel' ? 'TC Kimlik No' : 'Vergi No'} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telefon Numarası (Zorunlu)</label><input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Alternatif Telefon (İsteğe Bağlı)</label><input type="text" value={newCustomer.altPhone} onChange={(e) => setNewCustomer({...newCustomer, altPhone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Müşteri Adresi</label><input type="text" value={newCustomer.address} onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Tam Adres" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700" /></div>
<div className="flex flex-col gap-1.5 md:col-span-2 mt-2">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{customerType === 'bireysel' ? 'Kimlik Fotoğrafı (İsteğe Bağlı)' : 'Kurumsal Belgeler (İsteğe Bağlı)'}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* ÖN YÜZ */}
                          <label className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer bg-slate-50 group h-full">
                            {newCustomer.documentPhotoFront ? (
                               <div className="flex flex-col items-center">
                                  <Check size={32} className="text-green-500 mb-2" />
                                  <span className="text-sm font-bold text-green-600">Ön Yüz Eklendi</span>
                                  <img src={newCustomer.documentPhotoFront} alt="Ön Yüz" className="mt-4 h-24 object-contain rounded border border-gray-200" />
                               </div>
                            ) : (
                               <>
                                 <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Upload size={20} className="text-red-400" /></div>
<p className="text-sm text-gray-600 mb-1 font-medium"><span className="text-red-500">{customerType === 'bireysel' ? 'Ön Yüz Seç' : 'Belge 1 Seç'}</span></p>    
           <p className="text-xs text-gray-400">PNG, JPG, PDF</p>
                               </>
                            )}
                            <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setNewCustomer({...newCustomer, documentPhotoFront: url}); } }} />
                          </label>

                          {/* ARKA YÜZ */}
                          <label className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer bg-slate-50 group h-full">
                            {newCustomer.documentPhotoBack ? (
                               <div className="flex flex-col items-center">
                                  <Check size={32} className="text-green-500 mb-2" />
                                  <span className="text-sm font-bold text-green-600">Arka Yüz Eklendi</span>
                                  <img src={newCustomer.documentPhotoBack} alt="Arka Yüz" className="mt-4 h-24 object-contain rounded border border-gray-200" />
                               </div>
                            ) : (
                               <>
                                 <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Upload size={20} className="text-red-400" /></div>
                                 <p className="text-sm text-gray-600 mb-1 font-medium"><span className="text-red-500">{customerType === 'bireysel' ? 'Arka Yüz' : 'Belge 2 (Opsiyonel)'} Seç</span></p>
                                 <p className="text-xs text-gray-400">PNG, JPG, PDF</p>
                               </>
                            )}
                            <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setNewCustomer({...newCustomer, documentPhotoBack: url}); } }} />
                          </label>
                      </div>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Özel Notlar</label><textarea value={newCustomer.notes} onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})} rows="3" placeholder="Müşteri hakkında eklemek istediğiniz notlar..." className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 resize-none font-medium text-slate-700"></textarea></div>
                  
                  {/* YENİ EKLENEN: VEKALET BİLGİLERİ */}
                  <div className="md:col-span-2 mt-4 border-t border-gray-100 pt-6">
                      <label className="flex items-center gap-3 cursor-pointer w-max group">
                          <div className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${newCustomer.hasProxy ? 'bg-[#1bc5bd]' : 'bg-gray-300'}`} onClick={() => setNewCustomer({...newCustomer, hasProxy: !newCustomer.hasProxy})}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${newCustomer.hasProxy ? 'translate-x-6' : ''}`}></div>
                          </div>
                          <span className="font-bold text-gray-700 group-hover:text-[#1bc5bd] transition-colors">Vekalet Eden Bilgilerini Ekle (Opsiyonel)</span>
                      </label>
                  </div>
                  
                  {newCustomer.hasProxy && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 md:col-span-2 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mt-2 animate-in fade-in slide-in-from-top-4">
                          <h4 className="md:col-span-2 font-bold text-indigo-800 border-b border-indigo-100 pb-3 flex items-center gap-2"><Shield size={18}/> Vekalet Eden Kişinin Bilgileri</h4>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Ad Soyad</label><input type="text" value={newCustomer.proxyName} onChange={(e) => setNewCustomer({...newCustomer, proxyName: e.target.value})} placeholder="Vekil Ad Soyad" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">TC Kimlik Numarası</label><input type="text" value={newCustomer.proxyTc} onChange={(e) => setNewCustomer({...newCustomer, proxyTc: e.target.value})} placeholder="Vekil TC Kimlik No" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Telefon Numarası</label><input type="text" value={newCustomer.proxyPhone} onChange={(e) => setNewCustomer({...newCustomer, proxyPhone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Yedek Telefon (İsteğe Bağlı)</label><input type="text" value={newCustomer.proxyAltPhone} onChange={(e) => setNewCustomer({...newCustomer, proxyAltPhone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Adres</label><input type="text" value={newCustomer.proxyAddress} onChange={(e) => setNewCustomer({...newCustomer, proxyAddress: e.target.value})} placeholder="Tam Adres" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          
                          <div className="flex flex-col gap-1.5 md:col-span-2 mt-2">
                              <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Vekil Kimlik Fotoğrafı / Belgesi Yükle</label>
                              <label className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-indigo-50 hover:border-indigo-400 transition-colors cursor-pointer bg-white group">
                                {newCustomer.proxyDocumentPhoto ? (
                                   <div className="flex flex-col items-center">
                                      <Check size={32} className="text-indigo-500 mb-2" />
                                      <span className="text-sm font-bold text-indigo-600">Vekalet Belgesi Eklendi</span>
                                      <img src={newCustomer.proxyDocumentPhoto} alt="Belge" className="mt-4 h-24 object-contain rounded border border-gray-200" />
                                   </div>
                                ) : (
                                   <>
                                     <div className="w-12 h-12 bg-indigo-50 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Upload size={20} className="text-indigo-500" /></div>
                                     <p className="text-sm text-gray-600 mb-1 font-medium"><span className="text-indigo-600">Dosya seçmek için tıklayın</span> veya sürükleyip bırakın</p>
                                     <p className="text-xs text-gray-400">PNG, JPG veya PDF formatında yükleyebilirsiniz</p>
                                   </>
                                )}
    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setNewCustomer({...newCustomer, proxyDocumentPhoto: url}); } }} />                              </label>
                          </div>
                      </div>
                  )}

                </div>
                <div className="mt-8 flex justify-end gap-4 border-t border-gray-100 pt-6">
                  <button onClick={handleSaveCustomer} disabled={!newCustomer.name || !newCustomer.tc || !newCustomer.phone} className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-red-500/30">Kişiyi Kaydet</button>
                </div>
              </div>
            </div>
          ) : (activeMenu === 'mevcut-musteriler' || activeMenu === 'tum-musteriler') && !selectedCustomerId ? (
            <div className="max-w-7xl mx-auto flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-2xl font-bold text-slate-800">{activeMenu === 'mevcut-musteriler' ? 'Mevcut Müşteriler' : 'Tüm Müşteriler'}</h2><p className="text-sm text-gray-500 mt-1">{activeMenu === 'mevcut-musteriler' ? 'Şu anda depolarda aktif odası bulunan müşteriler.' : 'Sisteme kayıtlı geçmiş ve mevcut tüm müşteriler.'}</p></div>
                <div className="flex gap-2">
                    <label className={`bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2 ${isCustomerUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Otomatik Taramalı Excel Aktarımı">
                        {isCustomerUploading ? <RefreshCcw size={16} className="animate-spin" /> : <Upload size={16} />}
                        <span className="hidden sm:inline">Excel'den Müşteri Aktar</span>
                        <span className="sm:hidden">Aktar</span>
                        <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={handleBulkCustomerUpload} disabled={isCustomerUploading} />
                    </label>
                </div>
              </div>

              {customerImportResult && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-1.5 rounded-full shrink-0"><Check size={16} className="text-emerald-600" strokeWidth={3}/></div>
                        <span className="font-medium text-sm">İşlem Tamamlandı: <strong>{customerImportResult.importedCustomerCount}</strong> yeni müşteri eklendi, <strong>{customerImportResult.updatedRoomCount}</strong> oda müşterilere başarıyla kiralandı.</span>
                    </div>
                    <button onClick={() => setCustomerImportResult(null)} className="text-emerald-500 hover:text-emerald-700 shrink-0"><X size={16}/></button>
                </div>
              )}

              <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2"><span>Show</span><select className="border border-gray-300 rounded p-1 outline-none focus:border-cyan-400"><option>10</option><option>25</option><option>50</option></select><span>entries</span></div>
                <div className="flex items-center gap-2"><span>Search:</span><input type="text" value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} className="border border-gray-300 rounded p-1.5 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 w-48 lg:w-64" /></div>
              </div>
<div className="overflow-x-auto border border-gray-200 rounded-lg flex-1 bg-slate-50 w-full block">
                 {(() => {
                    const displayedCustomers = activeMenu === 'mevcut-musteriler' ? customers.filter(c => rooms.some(r => r.customerName === c.name)) : customers;
                    const term = normalizeStr(customerSearchTerm);
                    const finalFiltered = displayedCustomers.filter(c => normalizeStr(c.name).includes(term));
                      if (finalFiltered.length === 0) return (<div className="flex flex-col items-center justify-center text-center py-20 w-full min-h-[300px]"><div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Users size={32} /></div><h3 className="text-lg font-bold text-gray-600 mb-1">Müşteri Kaydı Bulunmuyor</h3><p className="text-sm text-gray-400 max-w-sm mx-auto">Bu listede gösterilecek müşteri bulunamadı. Soldaki menüden "Yeni Müşteri Ekle" diyerek ekleme yapabilirsiniz.</p></div>);

                    return (
                      <table className="w-full text-sm text-left text-gray-600 min-w-[800px] h-full self-start">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold w-12">#</th>
                            <th className="px-4 py-3 font-semibold">Müşteri No</th>
                            <th className="px-4 py-3 font-semibold">İsim</th>
                            <th className="px-4 py-3 font-semibold">TC / VKN</th>
                            <th className="px-4 py-3 font-semibold">Telefon</th>
                            <th className="px-4 py-3 font-semibold text-center w-32">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {finalFiltered.map((customer, index) => (
                            <tr key={customer.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3">{index + 1}</td>
                              <td className="px-4 py-3 font-bold text-[#1bc5bd] tracking-wider">{customer.customerNo}</td>
                              <td className="px-4 py-3 font-bold text-gray-800 cursor-pointer hover:text-[#1bc5bd] hover:underline transition-all" onClick={() => setSelectedCustomerId(customer.id)} title="Müşteri Profilini Görüntüle">{customer.name}</td>
                              <td className="px-4 py-3">{customer.tc}</td>
                              <td className="px-4 py-3">{customer.phone}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center gap-1.5 justify-center">
                                  <button onClick={() => setSelectedCustomerId(customer.id)} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-[11px] font-medium shadow-sm transition-colors flex-1">Cari Hesap</button>
                                  <button onClick={(e) => { e.stopPropagation(); setCustomerToDeleteId(customer.id); setIsDeleteCustomerModalOpen(true); }} className="bg-[#f64e60] hover:bg-red-600 text-white px-3 py-1.5 rounded text-[11px] font-medium shadow-sm transition-colors flex-1" title="Kalıcı Olarak Sil">Sil</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                 })()}
              </div>
            </div>
          ) : selectedCustomerId ? (
            <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
               <div className="mb-6 flex items-center justify-between">
                 <div>
                   <button onClick={() => setSelectedCustomerId(null)} className="text-[10px] font-bold text-gray-400 hover:text-[#1bc5bd] tracking-widest uppercase mb-1.5 flex items-center gap-1 transition-colors"><ArrowLeft size={12} /> Listeye Geri Dön</button>
                   <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">Cari Hesap Profili</h2>
                 </div>
               </div>
               {(() => {
                  const customer = customers.find(c => c.id === selectedCustomerId);
                  if(!customer) return <div>Müşteri Bulunamadı.</div>;
                  const customerRooms = rooms.filter(r => r.customerName === customer.name);

                  // --- Cari Ledger (Ekstre) Hesaplama ---
                  const { ledger: fullLedger, balance: runningBalance } = getCustomerLedger(customer);
                  
                  const availableYears = [...new Set(fullLedger.map(tx => {
                      const d = new Date(tx.date);
                      return !isNaN(d.getTime()) ? d.getFullYear() : null;
                  }).filter(y => y !== null))].sort((a, b) => b - a);
                  
                  if (!availableYears.includes(new Date().getFullYear())) {
                      availableYears.push(new Date().getFullYear());
                      availableYears.sort((a, b) => b - a);
                  }

                  const filteredLedger = ledgerFilterYear === 'all' 
                      ? fullLedger 
                      : fullLedger.filter(tx => {
                          const d = new Date(tx.date);
                          return !isNaN(d.getTime()) && d.getFullYear().toString() === ledgerFilterYear;
                      });

                  return (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col gap-6">
                         <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-b border-gray-100 pb-6">
                           <div className="flex items-center gap-5">
                              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-2xl shadow-inner">{customer.name.charAt(0)}</div>
                              <div>
                                 <h3 className="text-xl font-bold text-gray-800 mb-1 flex items-center">
                                     {customer.name} 
                                     <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold ml-3 border border-gray-200 shadow-sm flex items-center gap-1">
                                         Kayıt: {customer.createdAt || '01.01.2026'}
                                         <button onClick={() => { setEditCustomerData({...customer}); setIsEditCustomerModalOpen(true); }} className="hover:text-[#1bc5bd] transition-colors bg-white p-0.5 rounded shadow-sm border border-gray-200" title="Müşteri Bilgilerini Düzenle"><Edit size={10} /></button>
                                     </span>
                                 </h3>
                                 <p className="text-sm font-medium text-[#1bc5bd]">Müşteri No: {customer.customerNo}</p>
                                 <div className="flex gap-4 mt-2 text-xs text-gray-500 font-medium">
                                   <span className="flex items-center gap-1"><Phone size={12}/> {customer.phone}</span>
                                   <span className="flex items-center gap-1"><FileTextIcon size={12}/> {customer.tc || 'TC/VKN Yok'}</span>
                                   {customer.createdBy && <span className="flex items-center gap-1"><UserCog size={12}/> Ekleyen: {customer.createdBy}</span>}
                                 </div>
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-2 justify-end">
                              <a href={`tel:+90${customer.phone}`} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"><Phone size={14}/> Ara</a>
                              <a href={`https://wa.me/90${customer.phone}`} target="_blank" rel="noreferrer" className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-teal-500/30"><MessageCircle size={14}/> WhatsApp</a>
                              <button onClick={() => handleOpenContract(customer)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-500/30"><Download size={14}/> Sözleşme İndir</button>
                              <button onClick={() => setIsInvoiceModalOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/30"><FileTextIcon size={14}/> Faturalar</button>
                              <button onClick={() => { setCustomerToDeleteId(customer.id); setIsDeleteCustomerModalOpen(true); }} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm border border-red-100"><Trash2 size={14}/> Kalıcı Sil</button>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 bg-slate-50 p-5 rounded-xl border border-gray-100">
                            <div className="flex flex-col gap-1.5"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alternatif Telefon</span><span className="text-sm font-semibold text-gray-700">{customer.altPhone || '-'}</span></div>
                            <div className="flex flex-col gap-1.5"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Müşteri Tipi</span><span className="text-sm font-semibold text-gray-700 capitalize">{customer.type || 'Bireysel'}</span></div>
                            <div className="flex flex-col gap-1.5"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TC / Vergi No</span><span className="text-sm font-semibold text-gray-700">{customer.tc || '-'}</span></div>
                            <div className="flex flex-col gap-1.5 md:col-span-3"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Açık Adres</span><span className="text-sm font-semibold text-gray-700">{customer.address || 'Adres bilgisi girilmemiş.'}</span></div>
                            <div className="flex flex-col gap-1.5 md:col-span-3"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Özel Notlar</span><span className="text-sm font-semibold text-gray-700">{customer.notes || 'Not eklenmemiş.'}</span></div>
                            
                            {/* VEKALET EDEN BİLGİLERİ GÖRÜNÜMÜ */}
                            {customer.hasProxy && (
                                <div className="md:col-span-3 mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
                                    <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2 mb-4 border-b border-indigo-100 pb-3"><Shield size={18}/> Vekalet Eden Kişi (Vekil) Bilgileri</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
                                        <div className="flex flex-col gap-1.5"><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Ad Soyad</span><span className="text-sm font-semibold text-indigo-900">{customer.proxyName || '-'}</span></div>
                                        <div className="flex flex-col gap-1.5"><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">TC Kimlik No</span><span className="text-sm font-semibold text-indigo-900">{customer.proxyTc || '-'}</span></div>
                                        <div className="flex flex-col gap-1.5"><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Telefon</span><span className="text-sm font-semibold text-indigo-900">{customer.proxyPhone || '-'}</span></div>
                                        <div className="flex flex-col gap-1.5"><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Yedek Telefon</span><span className="text-sm font-semibold text-indigo-900">{customer.proxyAltPhone || '-'}</span></div>
                                        <div className="flex flex-col gap-1.5 md:col-span-2"><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Adres</span><span className="text-sm font-semibold text-indigo-900">{customer.proxyAddress || '-'}</span></div>
                                        {customer.proxyDocumentPhoto && (
                                            <div className="flex flex-col gap-1.5 md:col-span-3 mt-2">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Vekil Kimlik Belgesi</span>
                                                <div className="border border-indigo-200 rounded p-2 bg-white w-max shadow-sm">
                                                    <a href={customer.proxyDocumentPhoto} target="_blank" rel="noreferrer">
                                                        <img src={customer.proxyDocumentPhoto} alt="Vekil Belge" className="h-24 object-contain rounded" />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {}
                            <div className="flex flex-col gap-4 md:col-span-3 mt-2 pt-4 border-t border-gray-200">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   {/* Kimlik / Vergi Levhası Alanı */}
                                   <div className="flex flex-col gap-2">
                                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                          {customer.type === 'bireysel' ? 'Kimlik Belgesi (Ön ve Arka)' : 'Vergi Levhası / Ek Belgeler'}
                                       </span>
                                       <div className="flex flex-wrap gap-4">
                                           {(customer.documentPhotoFront || customer.documentPhoto) ? (
                                               <div className="border border-gray-200 rounded p-2 bg-white w-max relative group shadow-sm hover:shadow transition-shadow">
                                                   <a href={customer.documentPhotoFront || customer.documentPhoto} target="_blank" rel="noreferrer">
                                                       <img src={customer.documentPhotoFront || customer.documentPhoto} alt="Ön Yüz" className="h-32 object-contain rounded" />
                                                   </a>
                                                   <div className="text-[10px] text-center text-gray-500 mt-1 font-medium">Ön Yüz</div>
                                               </div>
                                           ) : (
                                               <div className="border border-dashed border-gray-300 rounded p-4 bg-gray-50 flex flex-col items-center justify-center h-36 w-32 shadow-inner">
                                                   <span className="text-xs text-gray-400 font-medium text-center px-2">Ön Yüz Yok</span>
                                               </div>
                                           )}
                                           
                                           {customer.documentPhotoBack ? (
                                               <div className="border border-gray-200 rounded p-2 bg-white w-max relative group shadow-sm hover:shadow transition-shadow">
                                                   <a href={customer.documentPhotoBack} target="_blank" rel="noreferrer">
                                                       <img src={customer.documentPhotoBack} alt="Arka Yüz" className="h-32 object-contain rounded" />
                                                   </a>
                                                   <div className="text-[10px] text-center text-gray-500 mt-1 font-medium">Arka Yüz</div>
                                               </div>
                                           ) : (
                                               <div className="border border-dashed border-gray-300 rounded p-4 bg-gray-50 flex flex-col items-center justify-center h-36 w-32 shadow-inner">
                                                   <span className="text-xs text-gray-400 font-medium text-center px-2">Arka Yüz Yok</span>
                                               </div>
                                           )}
                                       </div>
                                   </div>
                                   
                                   {/* Ek Belgeler / Arşiv Belgeleri Alanı */}
                                   <div className="flex flex-col gap-2">
                                       <div className="flex items-center justify-between">
                                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Arşiv Belgeleri / Ek Belgeler</span>
                                           <label className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-2 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm hover:shadow-md">
                                               <Plus size={12} /> Ekle
                                               <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={(e) => handleAddExtraDocument(e, customer.id)} />
                                           </label>
                                       </div>
                                       
                                       <div className="border border-gray-200 rounded-xl p-3 bg-white min-h-[9rem] flex flex-wrap gap-3 items-start content-start shadow-inner">
                                           {(!customer.extraDocuments || customer.extraDocuments.length === 0) ? (
                                               <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 opacity-70 mt-4">
                                                   <FolderOpen size={24} className="mb-1 text-gray-300" />
                                                   <span className="text-[10px] font-medium text-gray-400">Henüz ek belge bulunmuyor</span>
                                               </div>
                                           ) : (
                                               customer.extraDocuments.map((doc, idx) => (
                                                   <div key={idx} className="relative group border border-gray-200 rounded-lg p-1 bg-gray-50 flex flex-col items-center gap-1.5 w-20 sm:w-24 shadow-sm hover:shadow-md transition-all">
                                                       <a href={doc.url} target="_blank" rel="noreferrer" className="w-full h-14 sm:h-16 flex items-center justify-center bg-white border border-gray-100 rounded-md overflow-hidden">
                                                           {doc.url.includes('pdf') || doc.url.startsWith('data:application/pdf') ? (
                                                               <FileTextIcon size={24} className="text-red-500" />
                                                           ) : (
                                                               <img src={doc.url} alt={`Ek Belge ${idx+1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                           )}
                                                       </a>
                                                       <span className="text-[9px] text-gray-500 font-medium truncate w-full text-center px-1" title={doc.name}>{doc.name || `Belge ${idx+1}`}</span>
                                                       <button onClick={() => handleDeleteExtraDocument(customer.id, doc.id)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Belgeyi Sil">
                                                           <X size={10} strokeWidth={3} />
                                                       </button>
                                                   </div>
                                               ))
                                           )}
                                       </div>
                                   </div>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* CARİ HESAP EKSTRESİ YUKARIYA TAŞINDI */}
                      <div className="mt-2 mb-2">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                             <div className="flex items-center gap-4">
                                 <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><History size={16} /> Detaylı Cari Hesap Dökümü (Ekstre)</h4>
                                 <select value={ledgerFilterYear} onChange={(e) => setLedgerFilterYear(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-600 focus:outline-none focus:border-indigo-400 cursor-pointer bg-white">
                                     <option value="all">Tüm Zamanlar</option>
                                     {availableYears.map(y => <option key={y} value={y.toString()}>{y} Yılı</option>)}
                                 </select>
                             </div>
                             <div className="flex flex-wrap items-center gap-2">
                                 <button onClick={() => setIsEditLedgerListModalOpen(true)} className="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                                     <Settings size={14}/> Cari Düzenleme
                                 </button>
                                 <button onClick={() => setIsAddDebtModalOpen(true)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                                     <Plus size={14}/> Cari Ödeme (Borç) Ekle
                                 </button>
                                 <button onClick={() => setIsAddPaymentModalOpen(true)} className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                                     <Wallet size={14}/> Cari Ödeme Yap
                                 </button>
                             </div>
                         </div>
                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                               <table className="w-full text-left text-sm text-gray-600">
                                  <thead className="bg-slate-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
                                     <tr>
                                        <th className="px-6 py-4">Tarih</th>
                                        <th className="px-6 py-4">İşlem Açıklaması</th>
<th className="px-6 py-4 text-right">Borç (Tahakkuk)</th>
                                        <th className="px-6 py-4 text-right">+ KDV %20 Tutarı</th>
                                        <th className="px-6 py-4 text-right">KDV Dahil Tutar</th>
                                        <th className="px-6 py-4 text-right">Alacak (Ödenen)</th>
                                        <th className="px-6 py-4 text-right">Bakiye</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                     {filteredLedger.length > 0 ? filteredLedger.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                           <td className="px-6 py-3 whitespace-nowrap font-medium">{tx.dateStr}</td>
                                           <td className="px-6 py-3">{tx.desc}</td>
<td className="px-6 py-3 text-right font-semibold text-red-500">{tx.debt > 0 ? `${(tx.baseDebt || 0).toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL` : '-'}</td>
                                           <td className="px-6 py-3 text-right font-semibold text-orange-500">{tx.debt > 0 ? `${(tx.kdvDebt || 0).toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL` : '-'}</td>
                                           <td className="px-6 py-3 text-right font-black text-indigo-600">{tx.debt > 0 ? `${tx.debt.toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL` : '-'}</td>
                                           <td className="px-6 py-3 text-right font-semibold text-green-600">{tx.credit > 0 ? `${tx.credit.toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL` : '-'}</td>                                           <td className="px-6 py-3 text-right">
                                               <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-black border shadow-sm ${tx.balance > 0 ? 'bg-red-50 text-red-700 border-red-200' : tx.balance < 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                   {tx.balance.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL
                                               </span>
                                           </td>
                                        </tr>
                                     )) : (
                                        <tr>
                                           <td colSpan="6" className="px-6 py-8 text-center text-gray-400 font-medium">Bu döneme ait herhangi bir hesap hareketi bulunamadı.</td>
                                        </tr>
                                     )}
                                  </tbody>
                                  {filteredLedger.length > 0 && (
                                     <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-gray-800">
                                        <tr>
                                           <td colSpan="2" className="px-6 py-4 text-right">DÖNEM TOPLAMI / GÜNCEL BAKİYE:</td>
<td className="px-6 py-4 text-right text-red-600">{filteredLedger.reduce((sum, tx) => sum + (tx.baseDebt || 0), 0).toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL</td>
                                           <td className="px-6 py-4 text-right text-orange-600">{filteredLedger.reduce((sum, tx) => sum + (tx.kdvDebt || 0), 0).toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL</td>
                                           <td className="px-6 py-4 text-right font-black text-indigo-700">{filteredLedger.reduce((sum, tx) => sum + (tx.debt || 0), 0).toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL</td>
                                           <td className="px-6 py-4 text-right text-green-600">{filteredLedger.reduce((sum, tx) => sum + tx.credit, 0).toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL</td>                                           <td className="px-6 py-4 text-right">
                                               <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-black text-white shadow-md ${runningBalance > 0 ? 'bg-red-500 shadow-red-500/30' : runningBalance < 0 ? 'bg-green-500 shadow-green-500/30' : 'bg-slate-600 shadow-slate-500/30'}`}>
                                                   {runningBalance.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL
                                               </span>
                                           </td>
                                        </tr>
                                     </tfoot>
                                  )}
                               </table>
                            </div>
                            
                            {/* YENİ EKLENEN İŞLEM BUTONLARI */}
                            {filteredLedger.length > 0 && (
                                <div className="bg-white border-t border-gray-200 p-4 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <button onClick={() => handlePrintLedger(customer, filteredLedger, runningBalance, ledgerFilterYear)} className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                        <Download size={18} /> Dökümü PDF İndir / Paylaş
                                    </button>
                                    
                                    <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                                        <button onClick={() => handleOpenMessageModal(customer, runningBalance, 'reminder')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/30 flex-1 sm:flex-none justify-center">
                                            <MessageCircle size={16} /> Ödeme Hatırlat
                                        </button>
                                        <button onClick={() => handleOpenMessageModal(customer, runningBalance, 'warning')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm shadow-orange-500/30 flex-1 sm:flex-none justify-center">
                                            <AlertCircle size={16} /> Uyarı
                                        </button>
                                        <button onClick={() => handleOpenMessageModal(customer, runningBalance, 'eviction')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm shadow-red-500/30 w-full sm:w-auto justify-center mt-1 sm:mt-0">
                                            <Trash2 size={16} /> Tahliye İhtarı
                                        </button>
                                    </div>
                                </div>
                            )}

                         </div>
                      </div>

                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-4">Aktif Kiralama ve Depolar</h4>
                      
                      {customerRooms.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           {customerRooms.map((room) => {
                             const customer = customers.find(c => c.name === room.customerName);
                             const overrides = customer?.ledgerOverrides || [];

const entryDate = parseDateLocal(room.entryDate || '2026-01-01');
                             const paymentAnchorDate = room.paymentDate && room.paymentDate.includes('-') ? parseDateLocal(room.paymentDate) : entryDate;
                             const today = new Date(); today.setHours(23, 59, 59, 999);
                             const baseAmount = Number(room.monthlyFee || 0);
                             const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
                             let monthlyTotal = hasKdv ? baseAmount * 1.20 : baseAmount;

                             // Madde 16: Varsa mevcut ayın güncel override (zam) tutarını al
                             const currentKey = `${today.getFullYear()}-${today.getMonth()}`;
                             const txId = `debt-${room.id}-${currentKey}`;
                             const currentOverride = overrides.find(o => o.txId === txId && !o.isDeleted);
                             if (currentOverride && currentOverride.debt !== undefined) {
                                 monthlyTotal = currentOverride.debt;
                             }

                             return (
                               <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
                                  <div className="absolute top-0 right-0 p-3"><span className="bg-cyan-50 text-cyan-600 px-3 py-1 rounded-full text-[10px] font-bold border border-cyan-100 uppercase">Aktif Kiralama</span></div>
                                  <div className="flex items-center gap-3 mb-4">
                                     <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><Box size={20}/></div>
                                     <div><h5 className="font-bold text-gray-800 text-lg">{room.name}</h5><p className="text-xs text-gray-500 font-medium">Giriş: {room.entryDate} • {room.m3} m³</p></div>
                                  </div>
                                  <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 flex flex-col gap-2">
                                     <div className="flex justify-between items-center"><span className="text-xs text-gray-500 font-semibold">Aylık Kira Bedeli:</span><span className="text-sm font-bold text-gray-700">{monthlyTotal} TL {hasKdv && <span className="text-[9px] text-gray-400 font-normal">(KDV Dahil)</span>}</span></div>
                                  </div>
                                  <div className="flex items-center justify-end pt-2 mt-auto">
                                     <button onClick={() => { setActiveMenu('depo'); setSelectedWarehouseId(blocks.find(b => b.id === room.blockId)?.warehouseId); setSelectedBlockId(room.blockId); setSelectedRoomId(room.id); setSelectedCustomerId(null); }} className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5">Odaya Git &rarr;</button>
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><Box size={24} className="text-gray-300" /></div>
                           <h3 className="text-base font-bold text-gray-700 mb-1">Aktif Kiralama Yok</h3>
                           <p className="font-medium text-sm text-gray-400">Bu müşterinin şu anda üzerine kayıtlı herhangi bir deposu/odası bulunmuyor.</p>
                        </div>
                      )}

                    </div>
                  );
               })()}
            </div>
          ) : activeMenu === 'odeme-girisi' ? (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6"><h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans</h1><h2 className="text-2xl font-bold text-slate-800">Tahsilat Girişi Yap</h2><p className="text-sm text-gray-500 mt-1">Havale/EFT ile gelen müşteri ödemelerini tekil veya toplu olarak hesaplara işleyin.</p></div>
              
              <div className="flex gap-4 border-b border-gray-200 mb-6">
                  <button onClick={() => setPaymentEntryMode('single')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${paymentEntryMode === 'single' ? 'border-[#1bc5bd] text-[#1bc5bd]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Tekil Tahsilat Girişi
                  </button>
                  <button onClick={() => setPaymentEntryMode('bulk')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${paymentEntryMode === 'bulk' ? 'border-[#1bc5bd] text-[#1bc5bd]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Toplu Ödeme Yükle (Excel/CSV)
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
                          <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">Ödenen Tutar (TL)</label><input type="number" value={globalPaymentData.amount} onChange={(e)=>setGlobalPaymentData({...globalPaymentData, amount: e.target.value})} placeholder="Örn: 6600" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-bold text-slate-800 text-lg" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">Ödeme Tarihi (Bankaya Geliş)</label><input type="date" value={globalPaymentData.date} onChange={(e)=>setGlobalPaymentData({...globalPaymentData, date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-medium text-slate-700" /></div>
                          <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-sm font-semibold text-gray-700">İşlem Açıklaması / Dekont Notu</label><textarea rows="3" value={globalPaymentData.note} onChange={(e)=>setGlobalPaymentData({...globalPaymentData, note: e.target.value})} placeholder="Örn: Haziran 2026 kirası" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 resize-none font-medium text-slate-700"></textarea></div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                          <button onClick={handleGlobalPayment} disabled={!globalPaymentData.customerId || !globalPaymentData.amount} className="bg-[#1bc5bd] hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/30"><Wallet size={18} /> Ödemeyi Sisteme İşle</button>
                        </div>
                      </div>
                  </>
              ) : (
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
                  </div>
              )}
            </div>
          ) : activeMenu === 'aylik-odeme' ? (
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
                        <option value="all">Tüm Borçlular</option>
                        <option value="1">1 Ay Gecikenler</option>
                        <option value="2">2 Ay Gecikenler</option>
                        <option value="3">3 Ay Gecikenler</option>
                        <option value="4">4 Ay Gecikenler</option>
                        <option value="5+">5+ Ay Gecikenler</option>
                    </select>
                </div>
              </div>

              <div className="flex-1 pb-10">
                 {(() => {
                      const debtors = customers.map(customer => {
                          const customerRooms = rooms.filter(r => r.customerName === customer.name);
                          const { ledger, balance: finalBalance } = getCustomerLedger(customer);

                          let highestRent = 0;
            
                          customerRooms.forEach(room => {
                              const baseAmt = Number(room.monthlyFee || 0);
                              const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
                              const monthlyTotal = hasKdv ? baseAmt * 1.20 : baseAmt;
                              if (monthlyTotal > highestRent) highestRent = monthlyTotal;
                          });
            
                          let monthsOwed = 0;
                          if (finalBalance > 0) {
                              if (highestRent > 0) {
                                  monthsOwed = Math.floor(finalBalance / highestRent);
                              } else {
                                  monthsOwed = 1;
                              }
                          }
            
                          return {
                              ...customer,
                              totalDebt: finalBalance,
                              highestRent,
                              roomsCount: customerRooms.length,
                              monthsOwed
                          };
                      }).filter(c => c.totalDebt > 0);

                      let filteredDebtors = debtors.filter(c => c.name.toLowerCase().includes(debtSearchTerm.toLowerCase()));

                      if (debtMonthFilter !== 'all') {
                          if (debtMonthFilter === '5+') {
                              filteredDebtors = filteredDebtors.filter(c => c.monthsOwed >= 5);
                          } else {
                              const targetMonths = parseInt(debtMonthFilter);
                              filteredDebtors = filteredDebtors.filter(c => c.monthsOwed === targetMonths);
                          }
                      }

                      if (filteredDebtors.length === 0) return (<div className="text-center py-20 w-full"><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 shadow-sm"><Wallet size={32} /></div><h3 className="text-lg font-bold text-gray-600 mb-1">Borçlu Kaydı Bulunmuyor</h3><p className="text-sm text-gray-400 max-w-sm mx-auto">Seçilen kriterlere uygun, cari borcu bulunan bir müşteri bulunamadı.</p></div>);

                      return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                              {filteredDebtors.sort((a, b) => b.totalDebt - a.totalDebt).map((customer) => {
                                  let delayColor = 'bg-gray-100 text-gray-600 border-gray-200';
                                  if (customer.monthsOwed >= 5) delayColor = 'bg-red-500 text-white border-red-600';
                                  else if (customer.monthsOwed >= 3) delayColor = 'bg-red-100 text-red-700 border-red-200';
                                  else if (customer.monthsOwed >= 1) delayColor = 'bg-orange-100 text-orange-700 border-orange-200';

                                  return (
                                      <div key={customer.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full relative">
                                          {customer.monthsOwed >= 3 && <div className="absolute top-0 right-0 left-0 h-1.5 bg-red-500"></div>}
                                          <div className="p-5 flex-1">
                                              <div className="flex justify-between items-start mb-3">
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200 shrink-0">
                                                          {customer.name.charAt(0)}
                                                      </div>
                                                      <div>
                                                          <h3 onClick={() => setSelectedCustomerId(customer.id)} className="font-bold text-slate-800 text-[15px] leading-tight line-clamp-2 cursor-pointer hover:text-[#1bc5bd] transition-colors" title={customer.name}>{customer.name}</h3>
                                                          <span className="text-[10px] text-gray-400 font-medium">{customer.customerNo}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                                  <span className={`px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${delayColor}`}>
                                                      {customer.monthsOwed} Ay Gecikme
                                                  </span>
                                                  <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-sm flex items-center gap-1">
                                                      <Box size={10} /> {customer.roomsCount} Oda
                                                  </span>
                                              </div>

                                              <div className="bg-red-50 rounded-xl p-3 border border-red-100 mb-4">
                                                  <div className="text-[10px] font-bold text-red-400 uppercase mb-0.5">Toplam Cari Borç</div>
                                                  <div className="text-2xl font-black text-red-600">{customer.totalDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-sm font-bold">TL</span></div>
                                              </div>
                                              
                                              {customer.collectionNotes && customer.collectionNotes.length > 0 ? (
                                                  <div className="mb-4">
                                                      <div className="flex justify-between items-center mb-2">
                                                          <h4 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><History size={12}/> Tahsilat Notları</h4>
                                                          <button onClick={() => { setCollectionNoteData({ customerId: customer.id, text: '', promiseDate: '' }); setIsCollectionNoteModalOpen(true); }} className="text-yellow-600 hover:text-yellow-700 p-1 flex items-center gap-1 bg-yellow-50 rounded px-2 py-0.5 text-[9px] font-bold border border-yellow-200 shadow-sm"><Plus size={10}/> Not Ekle</button>
                                                      </div>
                                                      <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                                                          {customer.collectionNotes.map((note, idx) => (
                                                              <div key={note.id || idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 relative shadow-inner shrink-0">
                                                                  <div className="flex justify-between items-start mb-1">
                                                                      <span className="text-[9px] font-bold text-yellow-700">Not {idx + 1}</span>
                                                                      <span className="text-[9px] text-gray-400">{note.date}</span>
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
                                                          <button onClick={() => { setCollectionNoteData({ customerId: customer.id, text: '', promiseDate: '' }); setIsCollectionNoteModalOpen(true); }} className="text-yellow-600 hover:text-yellow-700 p-1 flex items-center gap-1 bg-yellow-50 rounded px-2 py-0.5 text-[9px] font-bold border border-yellow-200 shadow-sm"><Plus size={10}/> Not Ekle</button>
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
                      );
                 })()}
              </div>
            </div>
          ) : activeMenu === 'tahsilat-hareketleri' ? (
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
                  
                  // Tarihe göre yeniden eskiye sırala
                  allCollections.sort((a, b) => new Date(b.date) - new Date(a.date));

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
                                  <button onClick={() => setCollectionFilter('today')} className={`px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap ${collectionFilter === 'today' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Günlük</button>
                                  <button onClick={() => setCollectionFilter('week')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'week' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Haftalık</button>
                                  <button onClick={() => setCollectionFilter('month')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'month' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Bu Ay</button>
                                  <button onClick={() => setCollectionFilter('year')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'year' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Bu Yıl</button>
                                  <button onClick={() => setCollectionFilter('all')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors whitespace-nowrap ${collectionFilter === 'all' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Tümü</button>
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
                                                          <div className="font-bold text-gray-800">{tx.customerName}</div>
                                                          <div className="text-[10px] text-gray-400 mt-0.5">No: {tx.customerNo}</div>
                                                      </td>
                                                      <td className="px-6 py-4 font-medium text-gray-600">{tx.note}</td>
                                                      <td className="px-6 py-4 text-right font-extrabold text-green-600 text-base">{tx.amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                                                      <td className="px-6 py-4 text-center">
                                                          <div className="flex items-center justify-center gap-2">
                                                              {tx.hasEInvoice ? (
                                                                  <button onClick={() => handleViewEInvoice(tx)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm" title="E-Faturayı Görüntüle ve Yazdır">
                                                                      <FileTextIcon size={14}/> E-Fatura Gör
                                                                  </button>
                                                              ) : (
                                                                  <button onClick={() => setEInvoiceModalData(tx)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm" title="MBT Portalına E-Fatura/E-Arşiv Gönder">
                                                                      <FileTextIcon size={14}/> E-Fatura Kes
                                                                  </button>
                                                              )}
                                                              <button onClick={() => handlePrintInvoice(tx)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm" title="Tahsilat Makbuzu Yazdır">
                                                                  <Download size={14}/>
                                                              </button>
                                                              <button onClick={() => setSelectedCustomerId(tx.customerId)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">
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
          ) : activeMenu === 'gunu-gelen-odalar' ? (
            <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans / Ödeme Takibi</h1>
                  <h2 className="text-2xl font-bold text-slate-800">Günü Gelen Odalar</h2>
                  <p className="text-sm text-gray-500 mt-1">Belirlediğiniz günde ödemesi (kirası) gelen müşterilerin ve odalarının listesi.</p>
                </div>
              </div>

              {/* Date Navigation */}
              <div className="flex justify-center mb-8">
                  <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                      <button onClick={() => {
                          const d = new Date(dueRoomsDate); d.setDate(d.getDate() - 1); setDueRoomsDate(d.toISOString().split('T')[0]);
                      }} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"><ArrowLeft size={18} /></button>
                      
                      <div className="flex flex-col items-center min-w-[220px]">
                          <span className="text-lg font-black text-indigo-700 flex items-center gap-2">
                              <Calendar size={18} />
                              {(() => {
                                  const d = new Date(dueRoomsDate);
                                  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                                  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                                  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${days[d.getDay()]}`;
                              })()}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">İncelenen Tarih</span>
                      </div>

                      <button onClick={() => {
                          const d = new Date(dueRoomsDate); d.setDate(d.getDate() + 1); setDueRoomsDate(d.toISOString().split('T')[0]);
                      }} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"><ArrowLeft size={18} className="rotate-180" /></button>
                  </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                  <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm text-gray-600 min-w-[900px]">
                          <thead className="bg-indigo-50/50 border-b border-indigo-100 text-xs uppercase text-indigo-800 font-bold sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-4 w-12">#</th>
                                  <th className="px-6 py-4">Müşteri Bilgisi</th>
                                  <th className="px-6 py-4">Oda / Blok</th>
                                  <th className="px-6 py-4 text-center">Ödeme Günü</th>
                                  <th className="px-6 py-4 text-right">Aylık Kira</th>
                                  <th className="px-6 py-4 text-center w-56">İşlem</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {(() => {
                                const targetDateObj = new Date(dueRoomsDate);
                                const targetDay = targetDateObj.getDate();

                                const dueRoomsList = rooms.filter(room => {
                                    if (!room.customerName) return false;
                                    const entryD = parseDateLocal(room.entryDate || '2026-01-01');
                                    const paymentAnchorD = room.paymentDate && room.paymentDate.includes('-') ? parseDateLocal(room.paymentDate) : entryD;
                                    
                                    let pDay = paymentAnchorD.getDate();
                                    if (room.paymentDate && !room.paymentDate.includes('-')) {
                                        pDay = parseInt(room.paymentDate);
                                    }
                                    return pDay === targetDay;
                                });

                                if (dueRoomsList.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-16 text-center">
                                                <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner"><Calendar size={28} /></div>
                                                <h3 className="text-lg font-bold text-gray-700 mb-1">Bu Güne Ait Oda Bulunamadı</h3>
                                                <p className="text-gray-500 font-medium text-sm">Seçili günde (Her ayın {targetDay}. günü) kirası gelen aktif bir oda bulunmuyor.</p>
                                            </td>
                                        </tr>
                                    );
                                }

                                return dueRoomsList.map((room, index) => {
                                    const customer = customers.find(c => c.name === room.customerName);
                                    const blockInfo = blocks.find(b => b.id === room.blockId);
                                    const warehouseInfo = blockInfo ? warehouses.find(w => w.id === blockInfo.warehouseId) : null;
                                    
                                    const baseAmount = Number(room.monthlyFee || 0);
                                    const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
                                    const monthlyTotal = hasKdv ? baseAmount * 1.20 : baseAmount;

                                    return (
                                        <tr key={room.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-400">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-indigo-700 cursor-pointer hover:underline text-base" onClick={() => customer && setSelectedCustomerId(customer.id)}>{room.customerName}</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5 font-medium flex items-center gap-1"><Phone size={10}/> {customer?.phone || room.phone || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-gray-800 text-sm flex items-center gap-1.5"><Key size={14} className="text-gray-400"/> {room.name} <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-200">{room.m3}m³</span></div>
                                                <div className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-wider">{warehouseInfo?.name} / {blockInfo?.name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                                                    Her Ayın {targetDay}'i
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-extrabold text-emerald-600 text-base">{monthlyTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                                                <div className="text-[10px] text-gray-400 font-bold">KDV Dahil</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => customer && setSelectedCustomerId(customer.id)} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5">
                                                        <Settings size={14}/> Cariye Git
                                                    </button>
                                                    <button onClick={() => { setActiveMenu('depo'); setSelectedWarehouseId(warehouseInfo?.id); setSelectedBlockId(room.blockId); setSelectedRoomId(room.id); setSelectedCustomerId(null); }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm shadow-indigo-500/30 flex items-center gap-1.5">
                                                        <Box size={14}/> Odaya Git
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                             })()}
                          </tbody>
                      </table>
                  </div>
              </div>
            </div>
          ) : activeMenu === 'senesi-dolan-odalar' ? (
            <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans / Sözleşme</h1>
                  <h2 className="text-2xl font-bold text-slate-800">Senesi Dolan Odalar (Zam Yapılacaklar)</h2>
                  <p className="text-sm text-gray-500 mt-1">Seçili ay ve yıl itibarıyla depoya girişinin üzerinden 1 tam yıl veya daha fazla süre geçmiş müşteriler.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
                  <div className="relative w-full sm:w-72">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400" /></div>
                      <input type="text" placeholder="Müşteri veya Oda Ara..." value={anniversarySearchTerm} onChange={(e) => setAnniversarySearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 shadow-sm font-medium" />
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
                          <span className="text-xs font-bold text-gray-500 uppercase">İncelenen Ay:</span>
                          <select value={anniversaryMonth} onChange={(e) => setAnniversaryMonth(e.target.value)} className="py-2.5 text-sm focus:outline-none font-bold text-slate-700 bg-transparent cursor-pointer">
                              <option value="1">Ocak</option><option value="2">Şubat</option><option value="3">Mart</option><option value="4">Nisan</option>
                              <option value="5">Mayıs</option><option value="6">Haziran</option><option value="7">Temmuz</option><option value="8">Ağustos</option>
                              <option value="9">Eylül</option><option value="10">Ekim</option><option value="11">Kasım</option><option value="12">Aralık</option>
                          </select>
                      </div>
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
                          <span className="text-xs font-bold text-gray-500 uppercase">Yıl:</span>
                          <select value={anniversaryYear} onChange={(e) => setAnniversaryYear(e.target.value)} className="py-2.5 text-sm focus:outline-none font-bold text-slate-700 bg-transparent cursor-pointer">
                              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                  <option key={y} value={y}>{y}</option>
                              ))}
                          </select>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                  <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm text-gray-600 min-w-[900px]">
                          <thead className="bg-indigo-50/50 border-b border-indigo-100 text-xs uppercase text-indigo-800 font-bold sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-4">Oda / Blok</th>
                                  <th className="px-6 py-4">Müşteri Bilgisi</th>
                                  <th className="px-6 py-4 text-center">Giriş Tarihi</th>
                                  <th className="px-6 py-4 text-center">Geçen Süre</th>
                                  <th className="px-6 py-4 text-right">Mevcut Kira</th>
                                  <th className="px-6 py-4 text-center w-40">İşlem</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {(() => {
                                const rentedRooms = rooms.filter(r => r.customerName && r.entryDate);
                                const filteredAnniversaries = rentedRooms.filter(room => {
                                    const entryD = parseDateLocal(room.entryDate);
                                    const eMonth = entryD.getMonth() + 1;
                                    const eYear = entryD.getFullYear();
                                    
                                    // Sadece geçmiş yıllarda ve seçili ayda girenleri göster
                                    const isAnniversary = eMonth === parseInt(anniversaryMonth) && eYear < parseInt(anniversaryYear);
                                    const matchesSearch = room.customerName.toLowerCase().includes(anniversarySearchTerm.toLowerCase()) || room.name.toLowerCase().includes(anniversarySearchTerm.toLowerCase());
                                    
                                    return isAnniversary && matchesSearch;
                                }).map(room => {
                                    const entryD = parseDateLocal(room.entryDate);
                                    const yearsPassed = parseInt(anniversaryYear) - entryD.getFullYear();
                                    return { ...room, yearsPassed };
                                });

                                // En eski olanları en üste al (zam önceliği)
                                filteredAnniversaries.sort((a, b) => b.yearsPassed - a.yearsPassed);

                                if (filteredAnniversaries.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-16 text-center">
                                                <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner"><Calendar size={28} /></div>
                                                <h3 className="text-lg font-bold text-gray-700 mb-1">Zam Yapılacak Oda Bulunamadı</h3>
                                                <p className="text-gray-500 font-medium text-sm">Seçili ay ve yıla göre tam senesini dolduran aktif bir kiralama kaydı bulunmuyor.</p>
                                            </td>
                                        </tr>
                                    );
                                }

                                return filteredAnniversaries.map((room) => {
                                    const customer = customers.find(c => c.name === room.customerName);
                                    const blockInfo = blocks.find(b => b.id === room.blockId);
                                    const warehouseInfo = blockInfo ? warehouses.find(w => w.id === blockInfo.warehouseId) : null;
                                    
                                    const baseAmount = Number(room.monthlyFee || 0);
                                    const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
                                    const monthlyTotal = hasKdv ? baseAmount * 1.20 : baseAmount;
                                    
                                    const hasBeenIncreased = room.priceHistory?.some(ph => ph.anniversaryYear === parseInt(anniversaryYear));

                                    return (
                                        <tr key={room.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-gray-800 text-base">{room.name}</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5 font-bold uppercase tracking-wider">{warehouseInfo?.name} / {blockInfo?.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-indigo-700 cursor-pointer hover:underline" onClick={() => customer && setSelectedCustomerId(customer.id)}>{room.customerName}</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5 font-medium flex items-center gap-1"><Phone size={10}/> {customer?.phone || room.phone || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">{room.entryDate}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${room.yearsPassed > 1 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                    {room.yearsPassed}. Yılı Doldu
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-extrabold text-gray-800 text-base">{monthlyTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                                                <div className="text-[10px] text-gray-400 font-bold">KDV Dahil</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {hasBeenIncreased ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl text-xs font-bold border border-green-200 flex items-center gap-1.5"><Check size={14}/> Zam Yapıldı</span>
                                                        <button onClick={() => { setActiveMenu('depo'); setSelectedWarehouseId(warehouseInfo?.id); setSelectedBlockId(room.blockId); setSelectedRoomId(room.id); setSelectedCustomerId(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">Odaya Git</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => { setActiveMenu('depo'); setSelectedWarehouseId(warehouseInfo?.id); setSelectedBlockId(room.blockId); setSelectedRoomId(room.id); setSelectedCustomerId(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">Odaya Git</button>
                                                        <button onClick={() => handleOpenApplyIncreaseModal(room, anniversaryYear)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm shadow-indigo-500/30">Zam Yap</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                });
                             })()}
                          </tbody>
                      </table>
                  </div>
              </div>
            </div>
          ) : activeMenu === 'askida-kalan-odemeler' ? (
             <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
               <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                   <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans</h1>
                   <h2 className="text-2xl font-bold text-slate-800">Askıda Kalan Tahsilatlar</h2>
                   <p className="text-sm text-gray-500 mt-1">Kime ait olduğu tespit edilemeyen, belirsiz gelen ödemelerin havuzu.</p>
                 </div>
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
                                                      setEditPendingData({ ...tx });
                                                      setIsEditPendingModalOpen(true);
                                                  }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition-colors" title="Düzenle"><Edit size={16}/></button>
                                                  <button onClick={() => setPendingCollections(pendingCollections.filter(p => p.id !== tx.id))} className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition-colors" title="Sil"><Trash2 size={16}/></button>
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
          ) : activeMenu === 'depo' ? (
            <div className="max-w-7xl mx-auto flex flex-col h-full bg-slate-50 relative">
              {activeSizeFilter ? (
                 <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-purple-200 bg-purple-50/30">
                        <div>
                            <button onClick={() => setActiveSizeFilter(null)} className="text-xs font-bold text-gray-500 hover:text-purple-600 tracking-wider uppercase mb-1 flex items-center gap-1 transition-colors"><ArrowLeft size={14} /> Geri Dön</button>
                            <h2 className="text-2xl font-bold text-purple-900">Boş Depo Arama: {sizeFilters.find(f => f.id === activeSizeFilter)?.label}</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-6 pb-8">
                        {(() => {
                            const filterOpt = sizeFilters.find(f => f.id === activeSizeFilter);
                            const filteredEmptyRooms = rooms.filter(r => {
                                const isEmpty = !r.customerName && (!r.isReserved || r.reserveExpiryTimestamp < Date.now());
                                const m3 = Number(r.m3 || 0);
                                return isEmpty && m3 >= filterOpt.min && m3 <= filterOpt.max;
                            });

                            if (filteredEmptyRooms.length === 0) {
                                return (
                                    <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
                                        <Search size={40} className="mx-auto text-gray-300 mb-4" />
                                        <h3 className="text-lg font-bold text-gray-700">Bu Kriterlere Uygun Boş Oda Bulunamadı</h3>
                                        <p className="text-sm text-gray-500 mt-1">Seçtiğiniz m³ aralığında tamamen boş olan bir oda mevcut değil.</p>
                                    </div>
                                );
                            }

                            return filteredEmptyRooms.map((oda) => {
                                const block = blocks.find(b => b.id === oda.blockId);
                                const warehouse = warehouses.find(w => w.id === block?.warehouseId);
                                
                                return (
                                    <div key={oda.id} onClick={() => {
                                        setSelectedWarehouseId(warehouse?.id);
                                        setSelectedBlockId(block?.id);
                                        setSelectedRoomId(oda.id);
                                        setActiveSizeFilter(null);
                                    }} className="relative rounded-xl overflow-hidden shadow-sm group hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer bg-white border border-gray-300 flex flex-col">
                                        <div className="px-4 py-3 flex justify-between items-center bg-[#1bc5bd] text-white shadow-md z-10">
                                            <div className="flex flex-col min-w-0 mr-2">
                                                <h3 className="font-black text-xl tracking-wider leading-none drop-shadow-sm truncate">{oda.name}</h3>
                                                <span className="text-[9px] opacity-90 mt-1 font-medium truncate" title={`${warehouse?.name} - ${block?.name}`}>{warehouse?.name} - {block?.name}</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-black/20 px-2 py-1 rounded shadow-inner shrink-0">{oda.m3} m³</span>
                                        </div>
                                        <div className="flex-1 relative flex flex-col justify-center items-center min-h-[140px]"
                                            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #f8fafc, #f8fafc 12px, #e2e8f0 12px, #e2e8f0 14px)' }}>
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-3 bg-slate-300 border border-slate-400 rounded-sm flex items-center justify-center shadow-sm">
                                                <div className="w-3 h-1 bg-slate-500 rounded-full"></div>
                                            </div>
                                            <div className="px-3 py-2 rounded-lg border-2 shadow-sm font-bold uppercase text-[11px] text-center max-w-[90%] truncate bg-white text-teal-600 border-teal-200">
                                                BOŞ ODA
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                 </div>
              ) : !selectedWarehouseId ? (
                <>
                  <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-col sm:flex-row gap-4 sm:gap-0">
                    <h2 className="text-2xl font-bold text-slate-800">Depo Listesi</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <button onClick={() => setIsSizeFilterDropdownOpen(!isSizeFilterDropdownOpen)} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-md shadow-purple-500/30">
                                <Search size={16} /> Depo Boyutu Bul
                            </button>
                            {isSizeFilterDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsSizeFilterDropdownOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                                            <span>Boş Depo Filtreleri</span>
                                            <button onClick={() => setIsSizeFilterDropdownOpen(false)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                        {sizeFilters.map(f => (
                                            <button key={f.id} onClick={() => { setActiveSizeFilter(f.id); setIsSizeFilterDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-700 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between group">
                                                <div className="flex items-center gap-2"><Box size={16} className="text-purple-400 group-hover:text-purple-600 transition-colors" /> {f.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <button onClick={() => setIsAddWarehouseModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors shadow-sm">Depo Ekle <Plus size={16} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-8">
                  {warehouses.map((depo, index) => {
                    const stats = getWarehouseStats(depo.id);
                    const occupied = getWarehouseOccupiedM3(depo.id);
                    const capacity = getWarehouseCapacityM3(depo.id);
                    const percentage = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

                    const wColor = [
                      { border: 'border-blue-200', bg: 'bg-blue-50/30', roof: 'bg-blue-700', roofAcc: 'bg-blue-600', bar: 'bg-blue-500', hover: 'hover:border-blue-400', iconBg: 'bg-blue-100', text: 'text-blue-700' },
                      { border: 'border-emerald-200', bg: 'bg-emerald-50/30', roof: 'bg-emerald-700', roofAcc: 'bg-emerald-600', bar: 'bg-emerald-500', hover: 'hover:border-emerald-400', iconBg: 'bg-emerald-100', text: 'text-emerald-700' },
                      { border: 'border-amber-200', bg: 'bg-amber-50/30', roof: 'bg-amber-600', roofAcc: 'bg-amber-500', bar: 'bg-amber-500', hover: 'hover:border-amber-400', iconBg: 'bg-amber-100', text: 'text-amber-700' },
                      { border: 'border-purple-200', bg: 'bg-purple-50/30', roof: 'bg-purple-700', roofAcc: 'bg-purple-600', bar: 'bg-purple-500', hover: 'hover:border-purple-400', iconBg: 'bg-purple-100', text: 'text-purple-700' },
                      { border: 'border-rose-200', bg: 'bg-rose-50/30', roof: 'bg-rose-700', roofAcc: 'bg-rose-600', bar: 'bg-rose-500', hover: 'hover:border-rose-400', iconBg: 'bg-rose-100', text: 'text-rose-700' },
                      { border: 'border-cyan-200', bg: 'bg-cyan-50/30', roof: 'bg-cyan-700', roofAcc: 'bg-cyan-600', bar: 'bg-cyan-500', hover: 'hover:border-cyan-400', iconBg: 'bg-cyan-100', text: 'text-cyan-700' },
                      { border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/30', roof: 'bg-fuchsia-700', roofAcc: 'bg-fuchsia-600', bar: 'bg-fuchsia-500', hover: 'hover:border-fuchsia-400', iconBg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
                      { border: 'border-teal-200', bg: 'bg-teal-50/30', roof: 'bg-teal-700', roofAcc: 'bg-teal-600', bar: 'bg-teal-500', hover: 'hover:border-teal-400', iconBg: 'bg-teal-100', text: 'text-teal-700' },
                    ][index % 8];

                    return (
                    <div key={depo.id} onClick={() => setSelectedWarehouseId(depo.id)} className={`bg-white rounded-2xl shadow-sm hover:shadow-xl border-2 ${wColor.border} ${wColor.hover} relative transition-all duration-300 cursor-pointer group flex flex-col overflow-hidden transform hover:-translate-y-1`}>
                      {/* Çatı Görünümü */}
                      <div className={`h-4 w-full ${wColor.roof} relative`}>
                         <div className={`absolute top-0 left-4 w-12 h-6 ${wColor.roofAcc} rounded-b-md`}></div>
                         <div className={`absolute top-0 right-4 w-12 h-6 ${wColor.roofAcc} rounded-b-md`}></div>
                      </div>
                      
                      <div className={`p-6 flex-1 flex flex-col ${wColor.bg}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-14 h-14 ${wColor.iconBg} rounded-xl flex items-center justify-center border-2 border-white/50 ${wColor.text} shadow-inner`}>
                            <Home size={28} strokeWidth={1.5} />
                          </div>
                          <div className="flex gap-1.5 z-10" onClick={e => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); setEditWarehouseData({...depo}); setIsEditWarehouseModalOpen(true); }} className="bg-gray-100 hover:bg-[#1bc5bd] hover:text-white text-gray-500 p-2 rounded-lg transition-colors shadow-sm" title="Düzenle"><Edit size={14} /></button>
                            <button onClick={(e) => handleDeleteWarehouseClick(e, depo.id)} className="bg-gray-100 hover:bg-[#f64e60] hover:text-white text-gray-500 p-2 rounded-lg transition-colors shadow-sm" title="Depoyu Sil"><Trash2 size={14} /></button>
                            <div className="flex flex-col gap-1 ml-1">
                              <button onClick={(e) => moveWarehouseUp(index, e)} disabled={index === 0} className="bg-gray-100 hover:bg-gray-200 text-gray-400 p-0.5 rounded transition-colors disabled:opacity-30"><ArrowUp size={12} /></button>
                              <button onClick={(e) => moveWarehouseDown(index, e)} disabled={index === warehouses.length - 1} className="bg-gray-100 hover:bg-gray-200 text-gray-400 p-0.5 rounded transition-colors disabled:opacity-30"><ArrowDown size={12} /></button>
                            </div>
                          </div>
                        </div>
                        
                        <h3 className={`text-xl font-black ${wColor.text} uppercase tracking-tight mb-1 transition-colors`}>{depo.name}</h3>
                        {depo.address && <p className="text-[10px] text-gray-500 font-medium mb-1 line-clamp-1 flex items-center gap-1" title={depo.address}><MapPin size={10} /> {depo.address}</p>}
                        <p className="text-xs text-gray-500 font-semibold mb-6 flex items-center gap-1"><Box size={14}/> Ana Depo Merkezi</p>
                        
                        <div className="mb-6 mt-auto">
                           <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                              <span>{occupied} m³ Dolu</span>
                              <span className="text-gray-400">{capacity} m³ Kapasite</span>
                           </div>
                           <div className="h-2.5 w-full bg-white/60 rounded-full overflow-hidden shadow-inner border border-black/5">
                              <div className={`h-full ${wColor.bar} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                          <div className="bg-teal-50 rounded-lg p-2 flex flex-col items-center justify-center border border-teal-100" title="Boş Odalar">
                             <span className="text-lg font-black text-teal-600 leading-none">{stats.empty}</span>
                             <span className="text-[9px] font-bold mt-1 text-teal-600/70 uppercase">Boş</span>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-2 flex flex-col items-center justify-center border border-orange-100" title="Rezerve Odalar">
                             <span className="text-lg font-black text-orange-500 leading-none">{stats.reserved}</span>
                             <span className="text-[9px] font-bold mt-1 text-orange-500/70 uppercase">Rezerve</span>
                          </div>
                          <div className="bg-red-50 rounded-lg p-2 flex flex-col items-center justify-center border border-red-100" title="Dolu Odalar">
                             <span className="text-lg font-black text-red-600 leading-none">{stats.full}</span>
                             <span className="text-[9px] font-bold mt-1 text-red-600/70 uppercase">Dolu</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )})}
                  </div>
                </>
              ) : !selectedBlockId ? (
                <>
                  <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div><button onClick={() => setSelectedWarehouseId(null)} className="text-xs font-bold text-gray-400 hover:text-[#1bc5bd] tracking-wider uppercase mb-1 flex items-center gap-1 transition-colors"><ArrowLeft size={14} /> {warehouses.find(w => w.id === selectedWarehouseId)?.name}</button><h2 className="text-2xl font-bold text-slate-800">Blok Listesi</h2></div>
                    <button onClick={() => setIsAddBlockModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors">Blok Ekle <Plus size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-8">
                  {blocks.filter(b => b.warehouseId === selectedWarehouseId).map((blok, index, arr) => {
                    const stats = getRoomStats(blok.id);
                    const occupied = getBlockOccupiedM3(blok.id);
                    const capacity = getBlockCapacityM3(blok.id);
                    const percentage = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

                    return (
                    <div key={blok.id} onClick={() => setSelectedBlockId(blok.id)} className="bg-white rounded-xl shadow-sm hover:shadow-lg border-2 border-indigo-100 relative transition-all duration-300 cursor-pointer group flex flex-col min-h-[220px] overflow-hidden">
                      {/* Konteyner/Blok Yan Direkleri (Raf Görünümü) */}
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-indigo-500/80"></div>
                      <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-indigo-500/80"></div>
                      
                      <div className="p-5 px-7 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-2xl font-black text-indigo-900 uppercase tracking-tight flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                             <LayoutDashboard size={24} className="text-indigo-400" /> {blok.name}
                          </h3>
                          <div className="flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); setEditBlockData({...blok}); setIsEditBlockModalOpen(true); }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-1.5 rounded transition-colors" title="Düzenle"><Edit size={14} /></button>
                            <button onClick={(e) => handleDeleteBlockClick(e, blok.id)} className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded transition-colors" title="Sil"><Trash2 size={14} /></button>
                            <div className="flex flex-col gap-0.5 ml-1">
                              <button onClick={(e) => moveBlockUp(index, arr, e)} disabled={index === 0} className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-0.5 rounded transition-colors disabled:opacity-30"><ArrowUp size={10} /></button>
                              <button onClick={(e) => moveBlockDown(index, arr, e)} disabled={index === arr.length - 1} className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-0.5 rounded transition-colors disabled:opacity-30"><ArrowDown size={10} /></button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-6 mt-auto">
                           <div className="flex justify-between text-xs font-bold text-indigo-900/60 mb-2">
                              <span>{occupied} m³ / {capacity} m³</span>
                              <span>{percentage}% Dolu</span>
                           </div>
                           <div className="h-2.5 w-full bg-indigo-50 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                           </div>
                        </div>
                        
                        <div className="flex justify-between items-center border-t border-indigo-50 pt-4">
                          <div className="flex items-center gap-1.5 text-teal-600 bg-teal-50 px-2 py-1 rounded" title="Boş Odalar"><Home size={14} strokeWidth={2.5}/> <span className="font-bold text-sm">{stats.empty}</span></div>
                          <div className="flex items-center gap-1.5 text-orange-500 bg-orange-50 px-2 py-1 rounded" title="Rezerve Odalar"><Clock size={14} strokeWidth={2.5}/> <span className="font-bold text-sm">{stats.reserved}</span></div>
                          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded" title="Dolu Odalar"><Key size={14} strokeWidth={2.5}/> <span className="font-bold text-sm">{stats.full}</span></div>
                        </div>
                      </div>
                    </div>
                  )})}
                  </div>
                </>
              ) : !selectedRoomId ? (
                <>
                  <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div><button onClick={() => setSelectedBlockId(null)} className="text-xs font-bold text-gray-400 hover:text-[#1bc5bd] tracking-wider uppercase mb-1 flex items-center gap-1 transition-colors"><ArrowLeft size={14} /> {blocks.find(b => b.id === selectedBlockId)?.name}</button><h2 className="text-2xl font-bold text-slate-800">Oda Listesi</h2></div>
                    <button onClick={() => setIsAddRoomModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors">Oda Ekle <Plus size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-6 pb-8">
                    {rooms.filter(r => r.blockId === selectedBlockId).map((oda, index, arr) => {
                      let headerBg = 'bg-[#1bc5bd]'; let badgeStyle = 'bg-white text-teal-600 border-teal-200'; let statusText = 'BOŞ ODA';
                      let isValidReservation = oda.isReserved && (!oda.reserveExpiryTimestamp || oda.reserveExpiryTimestamp > Date.now());
                      
                      if (oda.customerName) { headerBg = 'bg-[#c81e3a]'; badgeStyle = 'bg-red-50 text-red-600 border-red-200'; statusText = oda.customerName; } 
                      else if (isValidReservation) { headerBg = 'bg-orange-500'; badgeStyle = 'bg-orange-50 text-orange-600 border-orange-200'; statusText = `REZERVELİ`; }

                      const currentBlock = blocks.find(b => b.id === oda.blockId);
                      const currentWarehouse = warehouses.find(w => w.id === currentBlock?.warehouseId);

                      return (
                      <div key={oda.id} onClick={() => setSelectedRoomId(oda.id)} className="relative rounded-xl overflow-hidden shadow-sm group hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer bg-white border border-gray-300 flex flex-col">
                        
                        {/* Oda Kapı Üst Pervazı (Duruma Göre Renkli) */}
                        <div className={`px-4 py-3 flex justify-between items-center ${headerBg} text-white shadow-md z-10`}>
                            <div className="flex flex-col min-w-0 mr-2">
                                <h3 className="font-black text-xl tracking-wider leading-none drop-shadow-sm truncate">{oda.name}</h3>
                                <span className="text-[9px] opacity-90 mt-1 font-medium truncate" title={`${currentWarehouse?.name} - ${currentBlock?.name}`}>{currentWarehouse?.name} - {currentBlock?.name}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-black/20 px-2 py-1 rounded shadow-inner shrink-0">{oda.m3} m³</span>
                        </div>
                        
                        {/* Oda Kapısı Dokusu (Kepenk Görünümü) */}
                        <div className="flex-1 relative flex flex-col justify-center items-center min-h-[140px]"
                             style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #f8fafc, #f8fafc 12px, #e2e8f0 12px, #e2e8f0 14px)' }}>
                             
                             {/* Kilit/Kulp Detayı */}
                             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center">
                                {oda.customerName ? (
                                    <div className="bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-600 rounded p-1 shadow-md text-amber-900" title="Dolu - Kilitli">
                                        <Lock size={16} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <div className="w-10 h-3 bg-slate-300 border border-slate-400 rounded-sm flex items-center justify-center shadow-sm">
                                       <div className="w-3 h-1 bg-slate-500 rounded-full"></div>
                                    </div>
                                )}
                             </div>

                             {/* Durum Etiketi */}
                             <div className={`px-3 py-2 rounded-lg border-2 shadow-sm font-bold uppercase text-[11px] text-center max-w-[90%] truncate ${badgeStyle}`}>
                                 {statusText}
                             </div>
                             
                             {/* Hover Aksiyonları */}
                             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={e => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); setEditRoomData({...oda}); setIsEditRoomModalOpen(true); }} className="bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded-md shadow transition-colors" title="Düzenle"><Edit size={14} /></button>
                                <button onClick={(e) => handleDeleteRoomClick(e, oda.id)} className="bg-white hover:bg-red-50 text-red-600 p-1.5 rounded-md shadow transition-colors" title="Sil"><Trash2 size={14} /></button>
                                <div className="flex flex-col gap-0.5 ml-0.5">
                                  <button onClick={(e) => moveRoomUp(index, arr, e)} disabled={index === 0} className="bg-white hover:bg-gray-100 text-gray-500 p-0.5 rounded-md shadow transition-colors disabled:opacity-30"><ArrowUp size={10} /></button>
                                  <button onClick={(e) => moveRoomDown(index, arr, e)} disabled={index === arr.length - 1} className="bg-white hover:bg-gray-100 text-gray-500 p-0.5 rounded-md shadow transition-colors disabled:opacity-30"><ArrowDown size={10} /></button>
                                </div>
                             </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 w-full animate-in fade-in duration-300 pb-16">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                       <button onClick={() => setSelectedRoomId(null)} className="text-[10px] font-bold text-gray-400 hover:text-[#1bc5bd] tracking-widest uppercase mb-1.5 flex items-center gap-1 transition-colors"><ArrowLeft size={12} /> {warehouses.find(w=>w.id===selectedWarehouseId)?.name} - {blocks.find(b=>b.id===selectedBlockId)?.name}</button>
                       <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">{selectedRoomDetail?.name} - {selectedRoomDetail?.m3}m³</h2>
                    </div>
                    {selectedRoomDetail?.customerName && (<button onClick={() => setIsRoomHistoryModalOpen(true)} className="bg-[#f64e60] hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold transition-colors shadow-sm">Depo Geçmişi</button>)}
                  </div>

                  {selectedRoomDetail?.customerName && (
                     <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm ${customerTotalBalance > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
                        <div className="mt-0.5">
                           {customerTotalBalance > 0 ? <AlertCircle size={20} /> : <Check size={20} />}
                        </div>
                        <div>
                           <h4 className="font-bold text-sm mb-1">{customerTotalBalance > 0 ? 'DİKKAT: Müşterinin Cari Borcu Bulunmaktadır!' : 'BİLGİ: Müşterinin Cari Borcu Yoktur'}</h4>
                           <p className="text-xs font-medium opacity-90 leading-relaxed">
                             {customerTotalBalance > 0
                                ? `Müşterinin güncel toplam cari bakiyesi ${customerTotalBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL'dir. Lütfen borç kapanana kadar yeni randevu oluşturmayınız veya nakliye hizmeti vermeyiniz.`
                                : 'Müşterinin şu anda herhangi bir ödenmemiş cari borcu bulunmamaktadır. İşlemlerinize sorunsuz devam edebilirsiniz.'}
                           </p>
                        </div>
                     </div>
                  )}

                  {selectedRoomDetail?.movedFrom && selectedRoomDetail?.customerName && (
                     <div className="mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm bg-indigo-50 border-indigo-200 text-indigo-700">
                        <div className="mt-0.5"><Info size={20} /></div>
                        <div>
                           <h4 className="font-bold text-sm mb-1">Oda Değişikliği Bilgisi</h4>
                           <p className="text-xs font-medium opacity-90 leading-relaxed">
                             Bu müşteri <strong>{selectedRoomDetail.movedFrom}</strong> odasından buraya taşınmıştır. Eski oda bilgileri ve işlemleri bu odaya başarıyla aktarıldı.
                           </p>
                        </div>
                     </div>
                  )}

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                     {(!selectedRoomDetail?.customerName && (!selectedRoomDetail?.isReserved || selectedRoomDetail?.reserveExpiryTimestamp < Date.now())) ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                           <div className="w-20 h-20 bg-blue-50 text-[#1bc5bd] rounded-full flex items-center justify-center mb-5"><Home size={40} strokeWidth={1.5} /></div>
                           <h3 className="text-xl font-bold text-gray-800 mb-2">Bu Oda Şu An Boş</h3><p className="text-sm text-gray-500 mb-8 max-w-md">Bu odaya henüz bir müşteri tanımlanmamış. Hemen yeni bir kiralama başlatabilir veya odayı opsiyonlayabilirsiniz.</p>
                           <div className="flex gap-4">
                              <button onClick={() => setIsRentRoomModalOpen(true)} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"><Key size={18} /> Odayı Kirala (Yeni Kayıt)</button>
                              <button onClick={() => setIsReserveRoomModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"><Calendar size={18} /> Bu Odayı Rezerve Et</button>
                              <button onClick={() => setIsRoomHistoryModalOpen(true)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><History size={18} /> Oda Geçmişini Gör</button>
                           </div>
                        </div>
                     ) : (selectedRoomDetail?.isReserved && !selectedRoomDetail?.customerName && selectedRoomDetail?.reserveExpiryTimestamp > Date.now()) ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                           <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-5"><Clock size={40} strokeWidth={1.5} /></div>
                           <h3 className="text-xl font-bold text-gray-800 mb-2">Bu Oda Rezerve Edilmiş</h3><p className="text-sm text-gray-500 mb-4 max-w-md">Bu oda <strong>{selectedRoomDetail.reservedName}</strong> ({selectedRoomDetail.reservedPhone}) adına rezerve edilmiştir. Son geçerlilik tarihi: <strong>{selectedRoomDetail.reserveExpiry}</strong></p>
                           <div className="flex gap-4 mt-4">
                              <button onClick={() => setIsRentRoomModalOpen(true)} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"><Key size={18} /> Rezerveyi Kiralamaya Çevir</button>
                              <button onClick={handleCancelReservation} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><X size={18} /> Rezerveyi İptal Et</button>
                           </div>
                        </div>
                     ) : (
                        <>
                           <div className="mb-8">
                              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">ODA BİLGİLERİ</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[11px] text-gray-500 font-semibold">Ad Soyad</label>
                                  <div onClick={() => { const cust = customers.find(c => c.name === selectedRoomDetail?.customerName); if (cust) { setSelectedCustomerId(cust.id); } }} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-[#1bc5bd] font-bold cursor-pointer hover:underline transition-all">
                                    {selectedRoomDetail?.customerName || ''}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">Giriş Tarihi</label><input type="text" readOnly value={selectedRoomDetail?.entryDate || '01.01.2026'} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium" /></div>
                                <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">Mühür Numarası</label><input type="text" readOnly value={selectedRoomDetail?.sealNo || 'MH-98421'} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium" /></div>
                                <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">Telefon Numarası</label><input type="text" readOnly value={selectedRoomDetail?.phone || '05332010610'} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium" /></div>
                                
                                {/* VEKALET EDEN BİLGİSİ (ODA EKRANI) */}
                                {(() => {
                                    const roomCustomer = customers.find(c => c.name === selectedRoomDetail?.customerName);
                                    if (roomCustomer?.hasProxy) {
                                        return (
                                            <div className="md:col-span-2 mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                                                <h4 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider border-b border-indigo-100 pb-2 flex items-center gap-2"><Shield size={14}/> Vekalet Eden Kişi (Vekil) Bilgileri</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div className="flex flex-col gap-1"><span className="text-[10px] text-indigo-400 font-bold uppercase">Ad Soyad</span><span className="text-sm font-semibold text-indigo-900">{roomCustomer.proxyName}</span></div>
                                                    <div className="flex flex-col gap-1"><span className="text-[10px] text-indigo-400 font-bold uppercase">Telefon</span><span className="text-sm font-semibold text-indigo-900">{roomCustomer.proxyPhone}</span></div>
                                                    <div className="flex flex-col gap-1"><span className="text-[10px] text-indigo-400 font-bold uppercase">TC Kimlik</span><span className="text-sm font-semibold text-indigo-900">{roomCustomer.proxyTc || '-'}</span></div>
                                                    {roomCustomer.proxyDocumentPhoto && (
                                                        <div className="md:col-span-3 mt-1">
                                                            <a href={roomCustomer.proxyDocumentPhoto} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline flex w-max gap-1 items-center"><FileTextIcon size={12}/> Vekil Kimlik Belgesini Görüntüle</a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="flex flex-col gap-1.5 md:col-span-2 mt-2"><h4 className="text-[11px] font-bold text-gray-400 uppercase border-b border-gray-200 pb-1">Ekstra Kiralama Bilgileri</h4></div>
                                <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">İşlemi Yapan Yetkili</label><input type="text" readOnly value={selectedRoomDetail?.rentedBy || 'Bilinmiyor'} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium" /></div>
                                <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">Eşyayı Getiren</label><input type="text" readOnly value={selectedRoomDetail?.broughtBy === 'sembol' ? 'Sembol Nakliyat' : 'Müşteri Kendisi'} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium" /></div>
                                <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">Hasar Durumu</label><input type="text" readOnly value={selectedRoomDetail?.hasDamage ? 'Hasar Var' : 'Hasar Yok'} className={`border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm font-bold ${selectedRoomDetail?.hasDamage ? 'text-orange-500' : 'text-teal-600'}`} /></div>
                                {selectedRoomDetail?.broughtBy === 'sembol' && <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">Görevli Ekip Listesi</label><input type="text" readOnly value={selectedRoomDetail?.teamList || '-'} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium" /></div>}
                                {selectedRoomDetail?.broughtBy === 'sembol' && <div className="flex flex-col gap-1.5"><label className="text-[11px] text-gray-500 font-semibold">Nakliye Ücreti</label><input type="text" readOnly value={selectedRoomDetail?.transportPrice ? `${selectedRoomDetail.transportPrice} TL ${selectedRoomDetail.transportHasKdv ? '(+KDV)' : ''}` : '-'} className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium" /></div>}
                                {selectedRoomDetail?.hasDamage && <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-[11px] text-gray-500 font-semibold">Hasar Açıklaması</label><textarea readOnly value={selectedRoomDetail?.damageDescription || '-'} rows="2" className="border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700 font-medium resize-none" /></div>}
                                {selectedRoomDetail?.entryPhoto && (
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                       <label className="text-[11px] text-gray-500 font-semibold">Depo İlk Giriş Görseli</label>
                                       <div className="border border-gray-200 rounded p-2 bg-white w-max"><a href={selectedRoomDetail.entryPhoto} target="_blank" rel="noreferrer"><img src={selectedRoomDetail.entryPhoto} alt="Giriş Görseli" className="h-32 object-contain rounded" /></a></div>
                                    </div>
                                )}

                                {/* GİRİŞ - ÇIKIŞ ARŞİVİ BÖLÜMÜ */}
                                {selectedRoomDetail?.entryExitHistory && selectedRoomDetail.entryExitHistory.length > 0 && (
                                    <div className="flex flex-col gap-3 md:col-span-2 mt-2 pt-4 border-t border-gray-100">
                                       <h4 className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1"><History size={14} /> Giriş - Çıkış İşlem Arşivi</h4>
                                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                           {selectedRoomDetail.entryExitHistory.map((item) => (
                                               <div key={item.id} className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/30 flex flex-col gap-2 shadow-sm">
                                                   <div className="flex justify-between items-center border-b border-indigo-100 pb-2 mb-1">
                                                       <span className="text-xs font-bold text-gray-700">{item.date}</span>
                                                       <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Mühür: {item.sealNo}</span>
                                                   </div>
                                                   <div className="flex gap-2">
                                                       {item.protocolPhoto ? (
                                                           <div className="flex-1 flex flex-col gap-1">
                                                               <span className="text-[9px] text-gray-500 text-center font-medium">Tutanak</span>
                                                               <a href={item.protocolPhoto} target="_blank" rel="noreferrer" className="block border border-gray-200 rounded overflow-hidden bg-white">
                                                                   <img src={item.protocolPhoto} alt="Tutanak" className="h-16 w-full object-cover hover:scale-105 transition-transform" />
                                                               </a>
                                                           </div>
                                                       ) : (
                                                           <div className="flex-1 flex flex-col gap-1 justify-center items-center bg-white border border-gray-200 rounded h-16 opacity-50">
                                                               <span className="text-[9px] text-gray-400">Tutanak Yok</span>
                                                           </div>
                                                       )}
                                                       {item.finalPhoto ? (
                                                           <div className="flex-1 flex flex-col gap-1">
                                                               <span className="text-[9px] text-gray-500 text-center font-medium">Son Hal</span>
                                                               <a href={item.finalPhoto} target="_blank" rel="noreferrer" className="block border border-gray-200 rounded overflow-hidden bg-white">
                                                                   <img src={item.finalPhoto} alt="Son Hal" className="h-16 w-full object-cover hover:scale-105 transition-transform" />
                                                               </a>
                                                           </div>
                                                       ) : (
                                                           <div className="flex-1 flex flex-col gap-1 justify-center items-center bg-white border border-gray-200 rounded h-16 opacity-50">
                                                               <span className="text-[9px] text-gray-400">Görsel Yok</span>
                                                           </div>
                                                       )}
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                    </div>
                                )}
                              </div>
                           </div>

                           <div className="flex flex-wrap items-center gap-2 mb-10 pb-6 border-b border-gray-100">
                             <button onClick={() => setIsEntryExitModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"><RefreshCcw size={14}/> Giriş-Çıkış İşlemi</button>
                             <button onClick={() => { 
                                setEditRentData({
                                  customerName: selectedRoomDetail.customerName || '', entryDate: selectedRoomDetail.entryDate || '', paymentDate: selectedRoomDetail.paymentDate || '', monthlyFee: selectedRoomDetail.monthlyFee || '', hasKdv: selectedRoomDetail.hasKdv !== undefined ? selectedRoomDetail.hasKdv : true, sealNo: selectedRoomDetail.sealNo || '', broughtBy: selectedRoomDetail.broughtBy || 'kendisi', teamList: selectedRoomDetail.teamList || ''
                                }); setIsEditRentModalOpen(true); 
                             }} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"><Edit size={14}/> Giriş Bilgilerini Düzenleme</button>
                             <button onClick={() => setIsChangeRoomModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"><RefreshCcw size={14}/> Oda Değiştir</button>
                             <button onClick={() => { setEndRentData({ exitDate: new Date().toISOString().split('T')[0], photo: null }); setIsEndRentModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"><LogOut size={14}/> Depodan Çıkış Yap</button>
                             
                             {/* TUTANAK GÖNDER AÇILIR MENÜSÜ */}
                             <div className="relative">
                                <button onClick={() => setIsTutanakDropdownOpen(!isTutanakDropdownOpen)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors">
                                  <FileTextIcon size={14}/> Tutanak Gönder/Bilgilendir <ChevronDown size={14} className={`transition-transform ${isTutanakDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTutanakDropdownOpen && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsTutanakDropdownOpen(false)}></div>
                                     <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2">
                                       {[
                                         { label: '1- Müşteri Kendi Alma Bilgilendirme', action: handleCustomerSelfPickupNotification },
                                         { label: '2- Odaya Giriş Çıkış Tutanağı', action: handleRoomEntryExitDocument },
                                         { label: '3- Hasar Tutanağı', action: handleDamageReportDocument },
                                         { label: '4- Vekalet Tutanağı', action: handleProxyDocument },
                                         { label: '5- Başka Nakliyeci Tarafından Giriş', action: handleExternalTransportEntry },
                                         { label: '6- Başka Nakliyeci Tarafından Çıkış', action: () => { setIsTutanakDropdownOpen(false); alert('"6- Başka Nakliyeci Tarafından Çıkış" yakında eklenecektir.'); } },
                                         { label: '7- Başka Müşteriye Teslim', action: () => { setIsTutanakDropdownOpen(false); alert('"7- Başka Müşteriye Teslim" yakında eklenecektir.'); } }
                                       ].map((tutanakObj, idx) => (
                                          <button 
                                            key={idx}
                                            onClick={tutanakObj.action}
                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-0"
                                          >
                                            {tutanakObj.label}
                                          </button>
                                       ))}
                                    </div>
                                  </>
                                )}
                             </div>

                             {selectedRoomDetail?.giftMonths > 0 ? (
                                <div className="flex items-center bg-purple-100 text-purple-700 px-3 py-2 rounded text-xs font-bold gap-1 shadow-sm border border-purple-200">
                                   <Gift size={14}/> {selectedRoomDetail.giftMonths} Ay Hediye Edildi
                                   <button onClick={() => handleSetGiftMonths(0)} className="hover:bg-purple-200 p-0.5 rounded ml-1 transition-colors" title="Hediyeyi Kaldır"><X size={14}/></button>
                                </div>
                             ) : (
                                <button onClick={() => { setGiftMonthValue(1); setIsGiftModalOpen(true); }} className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"><Gift size={14}/> Hediye Ay Ver</button>
                             )}

                             {selectedRoomDetail?.isFreeRoom ? (
                                <div className="flex items-center bg-cyan-100 text-cyan-700 px-3 py-2 rounded text-xs font-bold gap-1 shadow-sm border border-cyan-200">
                                   <Gift size={14}/> Ücretsiz Oda
                                   <button onClick={handleRemoveFreeRoom} className="hover:bg-cyan-200 p-0.5 rounded ml-1 transition-colors" title="Ücretsiz Odayı Kaldır"><X size={14}/></button>
                                </div>
                             ) : (
                                <button onClick={() => { setFreeRoomReasonInput(''); setIsFreeRoomModalOpen(true); }} className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"><Gift size={14}/> Ücretsiz Oda</button>
                             )}
                           </div>

                           {selectedRoomDetail?.isFreeRoom && (
                              <div className="mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm bg-cyan-50 border-cyan-200 text-cyan-800">
                                  <div className="mt-0.5 bg-cyan-100 p-1.5 rounded-lg"><Gift size={18} className="text-cyan-600" /></div>
                                  <div>
                                     <h4 className="font-bold text-sm mb-1 text-cyan-900">Bu Oda Ücretsiz Olarak İşaretlendi</h4>
                                     <p className="text-xs font-medium opacity-90 leading-relaxed text-cyan-800">
                                       <strong>Neden:</strong> {selectedRoomDetail.freeRoomReason}
                                     </p>
                                  </div>
                               </div>
                           )}

                           <div className="mb-6 flex justify-between items-center">
                               <h3 className="text-xl font-bold text-slate-800">Aylık Kiralama Dökümü</h3>
                               <div className="flex flex-wrap items-center gap-2">
                                   <button onClick={() => setIsPastIncreaseModalOpen(true)} className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-bold border border-orange-200 transition-colors flex items-center gap-1.5"><Edit size={14}/> Geçmiş Zamları Düzenle</button>
                                   {selectedRoomDetail?.priceHistory && selectedRoomDetail.priceHistory.length > 0 && (
                                       <button onClick={() => setIsPriceHistoryModalOpen(true)} className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold border border-indigo-200 transition-colors flex items-center gap-1.5"><TrendingUp size={14}/> Zam Geçmişi</button>
                                   )}
                                   <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">Giriş: {selectedRoomDetail?.entryDate || '01.01.2026'}</span>
                               </div>
                           </div>
                           
                           {(() => {
                               if (!selectedRoomDetail?.priceHistory || selectedRoomDetail.priceHistory.length === 0) return null;
                               const latestInc = selectedRoomDetail.priceHistory[selectedRoomDetail.priceHistory.length - 1];
                               return (
                                  <div className="mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm bg-blue-50 border-blue-200 text-blue-800">
                                      <div className="mt-0.5 bg-blue-100 p-1.5 rounded-lg"><TrendingUp size={18} className="text-blue-600" /></div>
                                      <div>
                                         <h4 className="font-bold text-sm mb-1 text-blue-900">Kira Bedeli Güncellendi ({latestInc.anniversaryYear} Yılı)</h4>
                                         <p className="text-xs font-medium opacity-90 leading-relaxed text-blue-800">
                                           Bu odanın kira bedeli {latestInc.date} tarihinde <strong>%{latestInc.percentage}</strong> oranında zamlanarak <span className="line-through opacity-70">{latestInc.oldFee} TL</span>'den <strong>{latestInc.newFee} TL</strong>'ye yükseltilmiştir.
                                         </p>
                                      </div>
                                   </div>
                               );
                           })()}

                           <div className="flex justify-center items-center gap-4 mb-8 bg-white p-2 rounded-xl border border-gray-200 w-max mx-auto shadow-sm">
                              <span className="text-sm font-semibold text-gray-500 pl-2">Gösterilen Yıl:</span>
                              <button onClick={()=>setDetailYear(detailYear-1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors font-bold text-gray-500">&lt;</button>
                              <span className="text-lg font-bold w-16 text-center text-[#1bc5bd]">{detailYear}</span>
                              <button onClick={()=>setDetailYear(detailYear+1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors font-bold text-gray-500">&gt;</button>
                           </div>

                           <div className="flex flex-col gap-4 mb-10">
                              {currentPaymentsList.length > 0 ? currentPaymentsList.map((payment) => (
                                 <div key={payment.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border rounded-2xl transition-all hover:shadow-md ${payment.isGifted ? 'bg-purple-50 border-purple-200' : (payment.isFree ? 'bg-cyan-50 border-cyan-200' : 'bg-white border-gray-200')}`}>
                                    <div className="flex items-center gap-5 mb-4 sm:mb-0">
                                       <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-lg ${payment.isGifted ? 'bg-purple-100 text-purple-600' : (payment.isFree ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-600')}`}>{payment.id + 1}</div>
                                       <div>
                                          <h4 className="font-bold text-gray-800 text-[15px] mb-1">{payment.title}</h4>
                                          <div className="flex items-center gap-2">
                                              <p className="text-xs text-gray-500 font-medium">İşlem Günü: {payment.payDay} {payment.month} {payment.year}</p>
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${payment.color}`}>{payment.status}</span>
                                          </div>
                                       </div>
                                    </div>
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 w-full sm:w-auto">
                                        <div className="flex flex-col sm:items-end">
                                          <div className="flex items-center gap-3">
                                             <span className={`font-extrabold text-2xl ${payment.isGifted ? 'text-purple-600' : (payment.isFree ? 'text-cyan-600' : 'text-gray-800')}`}>{(Number(payment.amount) || 0).toLocaleString('tr-TR', {maximumFractionDigits: 0})} TL</span>
                                             {!payment.isFree && (
                                                 <button onClick={() => {
                                                     setSpecificMonthEditData({
                                                         txId: payment.txId,
                                                         title: payment.title,
                                                         currentAmount: payment.amount,
                                                         newAmount: payment.amount,
                                                         date: payment.dateObj,
                                                         desc: `${selectedRoomDetail.name} Odası - Kira Düzenlemesi (${payment.month} ${payment.year})`
                                                     });
                                                     setIsEditSpecificMonthModalOpen(true);
                                                 }} className="bg-orange-50 hover:bg-orange-100 text-orange-600 p-2 rounded-lg transition-colors shadow-sm" title="Bu ayın kirasını düzenle"><Edit size={16}/></button>
                                             )}
                                          </div>
<span className="text-[11px] text-gray-400 font-medium mt-1">Net: {Number(payment.baseAmount).toFixed(0)} TL {payment.hasKdv && `+ KDV: ${Number(payment.kdvAmount).toFixed(0)} TL`}</span>                                       </div>
                                    </div>
                                 </div>
                              )) : (
                                 <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><Calendar size={24} className="text-gray-300" /></div>
                                    <p className="font-medium text-sm">Seçilen yıl için henüz tahakkuk eden (gelmiş) bir kira bedeli bulunmamaktadır.</p>
                                 </div>
                              )}
                           </div>

                           <div className="bg-red-50 border-2 border-red-100 rounded-xl p-6 flex items-center justify-between">
                              <div><h4 className="text-red-800 font-bold text-lg">Müşteri Toplam Cari Bakiyesi</h4><p className="text-red-500 text-sm">Müşteriye ait tüm odaların ve ekstra hizmetlerin toplam güncel borcu.</p></div>
                              <div className="text-3xl font-extrabold text-red-600">{customerTotalBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                           </div>
                        </>
                     )}
                  </div>
                </div>
              )}
            </div>
          ) : activeMenu === 'pdf-sozlesme' ? (
            <div className="max-w-5xl mx-auto pb-10">
              <div className="mb-6">
                <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Ayarlar</h1>
                <h2 className="text-2xl font-bold text-slate-800">PDF & Sözleşme Ayarları</h2>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50/50">
                  <button onClick={() => setActiveSettingsTab('iban')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeSettingsTab === 'iban' ? 'border-[#1bc5bd] text-[#1bc5bd] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>IBAN / Banka Bilgileri</button>
                  <button onClick={() => setActiveSettingsTab('maddeler')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeSettingsTab === 'maddeler' ? 'border-[#1bc5bd] text-[#1bc5bd] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Sözleşme Maddeleri</button>
                </div>

                <div className="p-6 md:p-8">
                  {activeSettingsTab === 'iban' && (
                    <div className="animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 md:col-span-2">
                           <h3 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-2 mb-2">PDF Ödeme Bilgisi - IBAN Hesabı</h3>
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-gray-600">IBAN Numarası</label>
                          <input type="text" value={contractSettings.iban} onChange={(e) => setContractSettings({...contractSettings, iban: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" />
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-gray-600">Hesap Sahibi (Sözleşme)</label>
                          <input type="text" value={contractSettings.accountHolder} onChange={(e) => setContractSettings({...contractSettings, accountHolder: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-gray-600">Banka Adı (PDF - Kısa)</label>
                          <input type="text" value={contractSettings.bankShortName} onChange={(e) => setContractSettings({...contractSettings, bankShortName: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-gray-600">Banka Adı Tam (Sözleşme)</label>
                          <input type="text" value={contractSettings.bankFullName} onChange={(e) => setContractSettings({...contractSettings, bankFullName: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" />
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-gray-600">IBAN Uyarı Metni</label>
                          <textarea rows="2" value={contractSettings.ibanWarning} onChange={(e) => setContractSettings({...contractSettings, ibanWarning: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700 resize-none"></textarea>
                        </div>
                        <div className="md:col-span-2 flex justify-end mt-4">
                          <button onClick={handleSaveContractSettings} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors">Tüm Ayarları Kaydet</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'maddeler' && (
                    <div className="animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
                        <h3 className="text-sm font-bold text-gray-700">Sözleşme Maddeleri (Düzenleyebilirsiniz)</h3>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-semibold border border-blue-100">Dinamik Alanlar: {'{{MUSTERI_AD}}, {{MUSTERI_TC}}, {{MUSTERI_NUMARASI}}'} vb.</span>
                      </div>
                      
                      <div className="flex flex-col gap-6">
                         {contractSettings.clauses.map((clause) => (
                            <div key={clause.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                               <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-bold text-gray-700 text-sm flex items-center justify-between">
                                  {clause.title}
                                  
                                  {/* Fake Editor Toolbar for Visual Fidelity */}
                                  <div className="hidden sm:flex items-center gap-1 opacity-50">
                                      <span className="w-5 h-5 flex items-center justify-center bg-white rounded border border-gray-300 text-[10px] font-bold">B</span>
                                      <span className="w-5 h-5 flex items-center justify-center bg-white rounded border border-gray-300 text-[10px] italic">I</span>
                                      <span className="w-5 h-5 flex items-center justify-center bg-white rounded border border-gray-300 text-[10px] underline">U</span>
                                  </div>
                               </div>
                               <textarea 
                                  rows={clause.id === 'm1' ? 12 : clause.id === 'm6' ? 14 : 6} 
                                  value={clause.content} 
                                  onChange={(e) => handleClauseContentChange(clause.id, e.target.value)} 
                                  className="w-full p-4 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:bg-yellow-50/20 resize-y"
                               ></textarea>
                            </div>
                         ))}
                      </div>

                      <div className="flex justify-end mt-8">
                         <button onClick={handleSaveContractSettings} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors">Değişiklikleri Kaydet</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeMenu === 'tahsilat-oranlari' ? (
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
                                 <button onClick={() => setCollectionRates({...collectionRates, isInterestActive: true})} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${collectionRates.isInterestActive ? 'bg-[#1bc5bd] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Aktif</button>
                                 <button onClick={() => setCollectionRates({...collectionRates, isInterestActive: false})} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!collectionRates.isInterestActive ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Pasif</button>
                             </div>
                         </div>
                         <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">Borcu 1 aydan fazla geciken müşteriler için aylık bazda uygulanacak gecikme faizi oranı. Pasife alındığında daha önceden yansıtılmış tüm faizler cari ekranlarından ve borç bakiyesinden otomatik olarak düşülür.</p>
                         <div className="relative md:w-1/2 pr-4 mt-2">
                             <input type="number" disabled={!collectionRates.isInterestActive} value={collectionRates.interestRate} onChange={(e) => setCollectionRates({...collectionRates, interestRate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-bold text-slate-700 disabled:bg-gray-100 disabled:opacity-60" />
                             <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
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
          ) : activeMenu === 'sistem-yedekleme' ? (
            <div className="max-w-5xl mx-auto pb-10 animate-in fade-in duration-300">
              <div className="mb-6">
                <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Sistem Ayarları</h1>
                <h2 className="text-2xl font-bold text-slate-800">Sistem Yedekleme</h2>
                <p className="text-sm text-gray-500 mt-1">Tüm veritabanını JSON olarak indirin veya geri yükleyin.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <Download size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Yedek İndir</h3>
                  <p className="text-sm text-gray-500 mb-6">Müşteriler, odalar, bloklar ve tüm sistem ayarlarını bilgisayarınıza JSON dosyası olarak indirin.</p>
                  <button onClick={handleExportJSON} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
                    <Download size={18} /> JSON Olarak İndir
                  </button>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Yedek Yükle</h3>
                  <p className="text-sm text-gray-500 mb-6">Daha önce aldığınız bir JSON yedeğini sisteme yükleyerek verileri geri getirin.</p>
                  <label className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer">
                    <Upload size={18} /> JSON Dosyası Seç
                    <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                  </label>
                </div>
              </div>
            </div>
          ) : activeMenu === 'finans-rapor' ? (
             <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
               <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                   <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans Yönetimi</h1>
                   <h2 className="text-2xl font-bold text-slate-800">Finansal Raporlar ve Analizler</h2>
                   <p className="text-sm text-gray-500 mt-1">Sistemdeki tüm tahsilatların, bekleyen borçların ve depo doluluk oranlarının özeti.</p>
                 </div>
                 
                 <div className="flex flex-wrap bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm w-full sm:w-auto">
                     <button onClick={() => setFinansReportFilter('today')} className={`px-4 py-2.5 text-sm font-bold transition-colors flex-1 sm:flex-none ${finansReportFilter === 'today' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Günlük</button>
                     <button onClick={() => setFinansReportFilter('week')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors flex-1 sm:flex-none ${finansReportFilter === 'week' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Haftalık</button>
                     <button onClick={() => setFinansReportFilter('month')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors flex-1 sm:flex-none ${finansReportFilter === 'month' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Aylık</button>
                     <button onClick={() => setFinansReportFilter('year')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors flex-1 sm:flex-none ${finansReportFilter === 'year' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Bu Sene</button>
                     <button onClick={() => setFinansReportFilter('lastYear')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors flex-1 sm:flex-none ${finansReportFilter === 'lastYear' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Geçen Yıl</button>
                     <button onClick={() => setFinansReportFilter('all')} className={`px-4 py-2.5 text-sm font-bold border-l border-gray-200 transition-colors flex-1 sm:flex-none ${finansReportFilter === 'all' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Tüm Zamanlar</button>
                 </div>
               </div>

               {(() => {
                   let startD = new Date();
                   let endD = new Date();
                   endD.setHours(23, 59, 59, 999);
                   startD.setHours(0, 0, 0, 0);

                   if (finansReportFilter === 'today') {
                       // exactly today
                   } else if (finansReportFilter === 'week') {
                       startD.setDate(startD.getDate() - 7);
                   } else if (finansReportFilter === 'month') {
                       startD.setMonth(startD.getMonth() - 1);
                   } else if (finansReportFilter === 'year') {
                       startD = new Date(startD.getFullYear(), 0, 1);
                   } else if (finansReportFilter === 'lastYear') {
                       startD = new Date(startD.getFullYear() - 1, 0, 1);
                       endD = new Date(endD.getFullYear() - 1, 11, 31, 23, 59, 59);
                   } else if (finansReportFilter === 'all') {
                       startD = new Date(2000, 0, 1);
                   }

                   let totalTahsilEdilen = 0;
                   let totalTahakkuk = 0;

                   customers.forEach(customer => {
                       const { ledger } = getCustomerLedger(customer);
                       ledger.forEach(tx => {
                           if (tx.isDummy) return; 
                           const txDate = new Date(tx.date);
                           if (txDate >= startD && txDate <= endD) {
                               if (tx.credit) totalTahsilEdilen += tx.credit;
                               if (tx.debt) totalTahakkuk += tx.debt;
                           }
                       });
                   });

                   let totalBekleyen = 0;
                   let toplamTahsilat = 0;

                   if (finansReportFilter === 'all') {
                       let exactBalance = 0;
                       customers.forEach(c => {
                           const { balance } = getCustomerLedger(c);
                           if (balance > 0) exactBalance += balance;
                       });
                       totalBekleyen = exactBalance;
                       toplamTahsilat = totalTahsilEdilen + totalBekleyen;
                   } else {
                       totalBekleyen = Math.max(0, totalTahakkuk - totalTahsilEdilen);
                       toplamTahsilat = totalTahsilEdilen + totalBekleyen;
                   }

                   let totalAskida = 0;
                   let askidaCount = 0;
                   pendingCollections.forEach(p => {
                       const pDate = new Date(p.date);
                       if (pDate >= startD && pDate <= endD) {
                           totalAskida += Number(p.amount);
                           askidaCount++;
                       }
                   });

                   const monthsStr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                   const currentYearForChart = startD.getFullYear() < 2010 ? new Date().getFullYear() : startD.getFullYear();
                   
                   const chartData = monthsStr.map((m, idx) => {
                       let gelen = 0;
                       let aylikTahakkuk = 0;
                       
                       customers.forEach(c => {
                           const { ledger } = getCustomerLedger(c);
                           ledger.forEach(tx => {
                               if (tx.isDummy) return;
                               const d = new Date(tx.date);
                               if (d.getMonth() === idx && d.getFullYear() === currentYearForChart) {
                                   if (tx.credit) gelen += tx.credit;
                                   if (tx.debt) aylikTahakkuk += tx.debt;
                               }
                           });
                       });
                       
                       const bekleyen = Math.max(0, aylikTahakkuk - gelen);
                       
                       return { 
                           label: m, 
                           gelen: gelen, 
                           gelecek: bekleyen 
                       };
                   });

                   // --- Şube Bazlı Ödemeler Hesaplaması ---
                   const getBranchPayments = () => {
                       const today = new Date();
                       const branchStartD = new Date();
                       if (branchPaymentFilter !== 'all') {
                           branchStartD.setMonth(today.getMonth() - parseInt(branchPaymentFilter));
                       } else {
                           branchStartD.setFullYear(2000); 
                       }

                       return warehouses.map(wh => {
                           const whBlocks = blocks.filter(b => b.warehouseId === wh.id).map(b => b.id);
                           const whRooms = rooms.filter(r => whBlocks.includes(r.blockId) && r.customerName);
                           
                           let tahsil = 0;
                           let bekleyen = 0;

                           whRooms.forEach(room => {
                               const entryD = parseDateLocal(room.entryDate || '2026-01-01');
                               const paymentAnchorD = room.paymentDate && room.paymentDate.includes('-') ? parseDateLocal(room.paymentDate) : entryD;
                               const baseAmt = Number(room.monthlyFee || 0);
                               const hasKdv = room.hasKdv !== undefined ? room.hasKdv : true;
                               const monthlyTotal = hasKdv ? baseAmt * 1.20 : baseAmt;

                               let loopDate = new Date(paymentAnchorD);
                               let monthCounter = 0;
                               
                               while (loopDate <= today) {
                                   if (loopDate >= branchStartD) {
                                       const key = `${loopDate.getFullYear()}-${loopDate.getMonth()}`;
                                       const isGifted = room.giftMonths && monthCounter < room.giftMonths;
                                       const isFree = room.isFreeRoom;
                                       
                                       if (!isGifted && !isFree) {
                                           if (room.paidMonths?.includes(key)) {
                                               tahsil += monthlyTotal;
                                           } else {
                                               bekleyen += monthlyTotal;
                                           }
                                       }
                                   }
                                   loopDate.setMonth(loopDate.getMonth() + 1);
                                   monthCounter++;
                               }
                           });
                           return { id: wh.id, name: wh.name, tahsil, bekleyen };
                       }).sort((a, b) => (b.tahsil + b.bekleyen) - (a.tahsil + a.bekleyen));
                   };
                   const branchPaymentsData = getBranchPayments();

                   // --- Ortalama Ciro ve Artış Azalış Tablosu (Trend) Hesaplaması ---
                   const trendYear = parseInt(avgRevenueYearFilter);
                   const filteredWhIdsForAvg = avgRevenueBranchFilter === 'all' 
                       ? warehouses.map(w => w.id) 
                       : [parseInt(avgRevenueBranchFilter)];
                   const targetBlocksForAvg = blocks.filter(b => filteredWhIdsForAvg.includes(b.warehouseId)).map(b => b.id);

                   const yearlyTrendData = monthsStr.map((m, idx) => {
                       const monthEnd = new Date(trendYear, idx + 1, 0);
                       
                       let monthRevenue = 0;
                       let monthRoomsCount = 0;
                       let monthM3 = 0;
                       let activeBranches = new Set();
                       
                       rooms.forEach(r => {
                           if (!targetBlocksForAvg.includes(r.blockId)) return;
                           if (!r.customerName || !r.entryDate) return;
                           
                           const entryD = parseDateLocal(r.entryDate);
                           if (entryD <= monthEnd) {
                               monthRoomsCount++;
                               monthM3 += Number(r.m3 || 0);
                               const baseAmt = Number(r.monthlyFee || 0);
                               const monthlyTotal = (r.hasKdv !== undefined ? r.hasKdv : true) ? baseAmt * 1.20 : baseAmt;
                               monthRevenue += monthlyTotal;
                               const whId = blocks.find(b => b.id === r.blockId)?.warehouseId;
                               if (whId) activeBranches.add(whId);
                           }
                       });

                       const odaBasi = monthRoomsCount > 0 ? (monthRevenue / monthRoomsCount) : 0;
                       const m3Basi = monthM3 > 0 ? (monthRevenue / monthM3) : 0;
                       const subeBasi = activeBranches.size > 0 ? (monthRevenue / activeBranches.size) : 0;

                       return {
                           month: m,
                           revenue: monthRevenue,
                           rooms: monthRoomsCount,
                           m3: monthM3,
                           odaBasi,
                           m3Basi,
                           subeBasi
                       };
                   });

                   // Genel Ortalamalar (İçinde bulunulan yıl ise mevcut ay, geçmiş yıl ise Aralık ayı baz alınır)
                   const targetMonthIndex = trendYear === new Date().getFullYear() ? new Date().getMonth() : 11;
                   const currentMonthData = yearlyTrendData[targetMonthIndex] || yearlyTrendData[0];

                   return (
                       <div className="flex flex-col gap-6 pb-10">
                           
                           {/* ÖZET KARTLARI */}
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tahsil Edilen</h3>
                                   <div className="text-3xl font-extrabold text-[#1bc5bd]">{totalTahsilEdilen.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-lg">₺</span></div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2">Müşterilere girdiğimiz ödemeler</p>
                               </div>
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bekleyen Tahsilat</h3>
                                   <div className="text-3xl font-extrabold text-orange-500">{totalBekleyen.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-lg">₺</span></div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2">Müşterilerin borcu olan kısım</p>
                               </div>
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Toplam (Tahsil + Bekleyen)</h3>
                                   <div className="text-3xl font-extrabold text-indigo-500">{toplamTahsilat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-lg">₺</span></div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2">Toplam beklenen ve alınan</p>
                               </div>
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Askıda Ödemeler</h3>
                                   <div className="text-3xl font-extrabold text-gray-700">{totalAskida.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-lg">₺</span></div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2">{askidaCount} kayıt eşleşmeyi bekliyor</p>
                               </div>
                           </div>

                           <div className="flex flex-col lg:flex-row gap-6">
                               
                               {/* SOL TARAF - GRAFİK */}
                               <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                       <h3 className="text-lg font-bold text-gray-800">Ciro — Tahsil Edilen ve Bekleyen Ödemeler</h3>
                                       <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">{currentYearForChart} Yılı</span>
                                   </div>

                                   <div className="flex items-center justify-center gap-6 mb-4 text-xs font-bold">
                                       <div className="flex items-center gap-2"><span className="w-8 h-3 bg-red-400/80 rounded-sm"></span> <span className="text-gray-600">Tahsil Edilen (TL)</span></div>
                                       <div className="flex items-center gap-2"><span className="w-8 h-3 bg-blue-400/80 rounded-sm"></span> <span className="text-gray-600">Bekleyen Tahsilat (TL)</span></div>
                                   </div>

                                   <div className="flex-1 border border-gray-100 rounded-xl bg-slate-50/30 p-2">
                                       <FinansAreaChart data={chartData} />
                                   </div>
                               </div>

                               {/* SAĞ TARAF - ŞUBE BAZLI ÖDEMELER TABLOSU */}
                               <div className="w-full lg:w-[450px] bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                                   <div className="flex flex-col gap-3 mb-6 border-b border-gray-100 pb-4">
                                       <h3 className="text-lg font-bold text-gray-800">Depo Şube Bazlı Ödemeler</h3>
                                       <select value={branchPaymentFilter} onChange={(e) => setBranchPaymentFilter(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400 bg-gray-50 cursor-pointer">
                                           <option value="1">Bu Ay</option>
                                           <option value="3">Son 3 Ay</option>
                                           <option value="6">Son 6 Ay</option>
                                           <option value="12">Son 12 Ay</option>
                                           <option value="all">Tüm Zamanlar (Seneler)</option>
                                       </select>
                                   </div>
                                   
                                   <div className="overflow-x-auto flex-1">
                                       <table className="w-full text-left text-sm text-gray-600">
                                           <thead className="border-b-2 border-gray-100 font-bold text-gray-700 text-xs uppercase">
                                               <tr>
                                                   <th className="pb-3 px-2">Şube</th>
                                                   <th className="pb-3 text-right px-2">Bekleyen</th>
                                                   <th className="pb-3 text-right px-2">Tahsil Edilen</th>
                                               </tr>
                                           </thead>
                                           <tbody className="divide-y divide-gray-100">
                                               {branchPaymentsData.map(bp => (
                                                   <tr key={bp.id} className="hover:bg-gray-50">
                                                       <td className="py-3 px-2 font-bold text-gray-700">{bp.name}</td>
                                                       <td className="py-3 px-2 text-right font-bold text-orange-500">{bp.bekleyen.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</td>
                                                       <td className="py-3 px-2 text-right font-black text-[#1bc5bd]">{bp.tahsil.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       </table>
                                   </div>
                               </div>

                           </div>

                           {/* YENİ: ORTALAMA CİRO VE TREND BÖLÜMÜ */}
                           <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                               <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-indigo-50/30 gap-4">
                                   <div>
                                       <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-500" /> Ortalama Ciro Analizi ve Yıllık Trend</h3>
                                       <p className="text-sm text-indigo-900/60 mt-1 font-medium">Birim başına düşen ortalama gelirler ve aylık bazda artış/azalış tablosu.</p>
                                   </div>
                                   <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                       <select value={avgRevenueYearFilter} onChange={(e) => setAvgRevenueYearFilter(e.target.value)} className="w-full sm:w-32 border border-indigo-200 rounded-lg px-4 py-2.5 text-sm font-bold text-indigo-800 focus:outline-none focus:border-indigo-400 bg-white shadow-sm cursor-pointer">
                                           {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                               <option key={y} value={y}>{y} Yılı</option>
                                           ))}
                                       </select>
                                       <select value={avgRevenueBranchFilter} onChange={(e) => setAvgRevenueBranchFilter(e.target.value)} className="w-full sm:w-64 border border-indigo-200 rounded-lg px-4 py-2.5 text-sm font-bold text-indigo-800 focus:outline-none focus:border-indigo-400 bg-white shadow-sm cursor-pointer">
                                           <option value="all">Tüm Şubeler Filtresi</option>
                                           {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                       </select>
                                   </div>
                               </div>

                               <div className="p-6 bg-slate-50 border-b border-gray-100">
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                       <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                           <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center"><Key size={24}/></div>
                                           <div>
                                               <div className="text-xs font-bold text-gray-500 uppercase">Oda Başı Ortalama Ciro</div>
                                               <div className="text-2xl font-black text-teal-700 mt-1">{currentMonthData.odaBasi.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</div>
                                           </div>
                                       </div>
                                       <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                           <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Box size={24}/></div>
                                           <div>
                                               <div className="text-xs font-bold text-gray-500 uppercase">M³ Başı Ortalama Ciro</div>
                                               <div className="text-2xl font-black text-blue-700 mt-1">{currentMonthData.m3Basi.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</div>
                                           </div>
                                       </div>
                                       <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                                           <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><Home size={24}/></div>
                                           <div>
                                               <div className="text-xs font-bold text-gray-500 uppercase">Şube Başı Ortalama Ciro</div>
                                               <div className="text-2xl font-black text-purple-700 mt-1">{currentMonthData.subeBasi.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</div>
                                           </div>
                                       </div>
                                   </div>
                               </div>

                               <div className="overflow-x-auto">
                                   <table className="w-full text-left text-sm text-gray-600 min-w-[900px]">
                                       <thead className="bg-white border-b-2 border-gray-200 text-[11px] uppercase text-gray-500 font-bold">
                                           <tr>
                                               <th className="px-6 py-4">Aylar ({trendYear})</th>
                                               <th className="px-6 py-4 text-right">Toplam Ciro (Tahakkuk)</th>
                                               <th className="px-6 py-4 text-center">Dolu Oda</th>
                                               <th className="px-6 py-4 text-center">Dolu M³</th>
                                               <th className="px-6 py-4 text-right text-teal-700">Oda Ort.</th>
                                               <th className="px-6 py-4 text-right text-blue-700">M³ Ort.</th>
                                               <th className="px-6 py-4 text-right text-purple-700">Şube Ort.</th>
                                               <th className="px-6 py-4 text-center">Trend (Aylık Ciro)</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-gray-100 bg-white">
                                           {yearlyTrendData.map((data, idx) => {
                                               const prevRevenue = idx > 0 ? yearlyTrendData[idx - 1].revenue : data.revenue;
                                               const isUp = data.revenue > prevRevenue;
                                               const isDown = data.revenue < prevRevenue;
                                               const diffPercent = prevRevenue > 0 ? ((data.revenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;

                                               return (
                                                   <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                       <td className="px-6 py-4 font-bold text-gray-800">{data.month}</td>
                                                       <td className="px-6 py-4 text-right font-black text-gray-700">{data.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</td>
                                                       <td className="px-6 py-4 text-center font-bold text-gray-600">{data.rooms}</td>
                                                       <td className="px-6 py-4 text-center font-bold text-gray-600">{data.m3}</td>
                                                       <td className="px-6 py-4 text-right font-bold text-teal-600">{data.odaBasi.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</td>
                                                       <td className="px-6 py-4 text-right font-bold text-blue-600">{data.m3Basi.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</td>
                                                       <td className="px-6 py-4 text-right font-bold text-purple-600">{data.subeBasi.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</td>
                                                       <td className="px-6 py-4 text-center">
                                                           {idx === 0 || (!isUp && !isDown) ? (
                                                               <span className="text-gray-400 font-bold">-</span>
                                                           ) : (
                                                               <span className={`inline-flex items-center gap-1 font-bold px-2 py-1 rounded text-[10px] ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                   {isUp ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                                                                   %{Math.abs(diffPercent)}
                                                               </span>
                                                           )}
                                                       </td>
                                                   </tr>
                                               );
                                           })}
                                       </tbody>
                                   </table>
                               </div>
                           </div>

                       </div>
                   );
               })()}
             </div>
          ) : activeMenu === 'depo-rapor' ? (
             <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
               <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                   <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Finans Yönetimi</h1>
                   <h2 className="text-2xl font-bold text-slate-800">Depo Raporları ve Analizler</h2>
                   <p className="text-sm text-gray-500 mt-1">Şubeler bazında doluluk oranları, aktif kira getirileri ve yeni kiralama hareketleri.</p>
                 </div>
                 <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
                     <Download size={16} /> Raporu PDF İndir
                 </button>
               </div>

               {(() => {
                   const allRooms = rooms;
                   const totalRooms = allRooms.length;
                   const totalFullRooms = allRooms.filter(r => r.customerName).length;
                   const occupancyRate = totalRooms > 0 ? Math.round((totalFullRooms / totalRooms) * 100) : 0;

                   let totalMonthlyRevenue = 0;
                   const depoDetails = warehouses.map(depo => {
                       const stats = getWarehouseStats(depo.id);
                       const capacityM3 = getWarehouseCapacityM3(depo.id);
                       const occupiedM3 = getWarehouseOccupiedM3(depo.id);
                       
                       const depoBlocks = blocks.filter(b => b.warehouseId === depo.id).map(b => b.id);
                       const depoRooms = rooms.filter(r => depoBlocks.includes(r.blockId) && r.customerName);
                       
                       let depoRevenue = 0;
                       depoRooms.forEach(r => {
                           const baseAmt = Number(r.monthlyFee || 0);
                           const hasKdv = r.hasKdv !== undefined ? r.hasKdv : true;
                           depoRevenue += hasKdv ? baseAmt * 1.20 : baseAmt;
                       });

                       totalMonthlyRevenue += depoRevenue;

                       const depoTotalRooms = stats.full + stats.empty + stats.reserved;
                       const depoOccupancyRate = depoTotalRooms > 0 ? Math.round((stats.full / depoTotalRooms) * 100) : 0;

                       return {
                           ...depo,
                           stats,
                           capacityM3,
                           occupiedM3,
                           depoRevenue,
                           depoOccupancyRate,
                           totalRooms: depoTotalRooms
                       };
                   });
                   
                   // Getiriye göre büyükten küçüğe sırala
                   depoDetails.sort((a, b) => b.depoRevenue - a.depoRevenue);

                   // Son kiralanan (yeni tutulan) odalar
                   const recentRentals = [...allRooms]
                       .filter(r => r.customerName && r.entryDate)
                       .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))
                       .slice(0, 5);

                   return (
                       <div className="flex flex-col gap-6 pb-10">
                           
                           {/* ÖZET KARTLARI */}
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group hover:border-blue-200 transition-colors">
                                   <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 text-blue-600 group-hover:scale-110 transition-transform duration-500"><Home size={120} /></div>
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Toplam Şube Sayısı</h3>
                                   <div className="text-3xl font-extrabold text-blue-600 relative z-10">{warehouses.length} <span className="text-lg font-bold text-blue-400">Depo</span></div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2 relative z-10">Aktif hizmet veren lokasyonlar</p>
                               </div>
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-200 transition-colors">
                                   <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 text-emerald-600 group-hover:scale-110 transition-transform duration-500"><Wallet size={120} /></div>
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Aylık Aktif Kira Getirisi</h3>
                                   <div className="text-3xl font-extrabold text-emerald-500 relative z-10">{totalMonthlyRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-lg">₺</span></div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2 relative z-10">Dolu odalardan beklenen aylık ciro</p>
                               </div>
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group hover:border-orange-200 transition-colors">
                                   <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 text-orange-600 group-hover:scale-110 transition-transform duration-500"><TrendingUp size={120} /></div>
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Genel Doluluk Oranı</h3>
                                   <div className="text-3xl font-extrabold text-orange-500 relative z-10">%{occupancyRate}</div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2 relative z-10">{totalFullRooms} dolu / {totalRooms} toplam oda</p>
                               </div>
                               <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group hover:border-indigo-200 transition-colors">
                                   <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 text-indigo-600 group-hover:scale-110 transition-transform duration-500"><Box size={120} /></div>
                                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Toplam Depolama Hacmi</h3>
                                   <div className="text-3xl font-extrabold text-indigo-500 relative z-10">{depoDetails.reduce((sum, d) => sum + d.capacityM3, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-lg font-bold text-indigo-400">m³</span></div>
                                   <p className="text-[10px] font-medium text-gray-400 mt-2 relative z-10">Tüm şubelerin birleşik hacmi</p>
                               </div>
                           </div>

                           {/* ŞUBE BAZLI DETAYLI TABLO */}
                           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                                   <div>
                                       <h3 className="text-lg font-bold text-gray-800">Şube Bazlı Gelir ve Doluluk Raporu</h3>
                                       <p className="text-sm text-gray-500 mt-1">Hangi deponun ne kadar ciro getirdiğini ve mevcut kapasite kullanımını inceleyin.</p>
                                   </div>
                               </div>
                               <div className="overflow-x-auto">
                                   <table className="w-full text-left text-sm text-gray-600 min-w-[900px]">
                                       <thead className="bg-white border-b border-gray-200 text-[11px] uppercase text-gray-500 font-bold">
                                           <tr>
                                               <th className="px-6 py-4">Depo Şubesi</th>
                                               <th className="px-6 py-4 text-center">Toplam Oda</th>
                                               <th className="px-6 py-4 text-center">Dolu / Boş</th>
                                               <th className="px-6 py-4 text-center">Doluluk Oranı</th>
                                               <th className="px-6 py-4 text-center">Hacim (Dolu/Top.)</th>
                                               <th className="px-6 py-4 text-right">Aylık Kira Getirisi</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-gray-100 bg-white">
                                           {depoDetails.map((depo, idx) => (
                                               <tr key={depo.id} className="hover:bg-blue-50/30 transition-colors">
                                                   <td className="px-6 py-4">
                                                       <div className="font-bold text-gray-800 text-[14px] flex items-center gap-2">
                                                           {idx === 0 && <span className="bg-yellow-100 text-yellow-700 p-1 rounded-md" title="En Yüksek Getiri">👑</span>}
                                                           {depo.name}
                                                       </div>
                                                       <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">Ciro Sırası: #{idx + 1}</div>
                                                   </td>
                                                   <td className="px-6 py-4 text-center font-bold text-gray-700 text-[15px]">{depo.totalRooms}</td>
                                                   <td className="px-6 py-4 text-center">
                                                       <div className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                                                           <span className="text-red-600 font-bold" title="Dolu">{depo.stats.full}</span>
                                                           <span className="text-gray-300">/</span>
                                                           <span className="text-teal-600 font-bold" title="Boş">{depo.stats.empty}</span>
                                                       </div>
                                                   </td>
                                                   <td className="px-6 py-4 text-center">
                                                       <div className="flex flex-col items-center gap-1.5 justify-center">
                                                           <span className="font-bold text-gray-700 text-[13px]">%{depo.depoOccupancyRate}</span>
                                                           <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                               <div className={`h-full rounded-full transition-all duration-500 ${depo.depoOccupancyRate > 80 ? 'bg-green-500' : depo.depoOccupancyRate > 40 ? 'bg-orange-400' : 'bg-red-400'}`} style={{width: `${depo.depoOccupancyRate}%`}}></div>
                                                           </div>
                                                       </div>
                                                   </td>
                                                   <td className="px-6 py-4 text-center">
                                                       <div className="text-xs font-bold text-slate-700">{depo.occupiedM3.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m³</div>
                                                       <div className="text-[10px] text-gray-400 font-medium">Toplam: {depo.capacityM3.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m³</div>
                                                   </td>
                                                   <td className="px-6 py-4 text-right">
                                                       <div className="font-black text-emerald-600 text-lg tracking-tight">{depo.depoRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                                                       <div className="text-[10px] font-bold text-gray-400">Beklenen Kazanç</div>
                                                   </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                       <tfoot className="bg-slate-50 border-t border-gray-200 font-bold text-gray-800">
                                           <tr>
                                               <td className="px-6 py-4 text-xs tracking-wider uppercase text-gray-500">Genel Toplam</td>
                                               <td className="px-6 py-4 text-center text-[15px]">{totalRooms}</td>
                                               <td className="px-6 py-4 text-center text-[15px] text-red-600">{totalFullRooms} Dolu</td>
                                               <td className="px-6 py-4 text-center text-[15px]">%{occupancyRate}</td>
                                               <td className="px-6 py-4 text-center text-[15px]">{depoDetails.reduce((sum, d) => sum + d.occupiedM3, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} m³ Dolu</td>
                                               <td className="px-6 py-4 text-right text-emerald-700 text-xl">{totalMonthlyRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
                                           </tr>
                                       </tfoot>
                                   </table>
                               </div>
                           </div>

                           {/* YENİ EKLENEN: GİRİŞ ÇIKIŞ YAPAN ODA HAREKETLERİ RAPORU */}
                           {(() => {
                               const getMovementStartDate = () => {
                                   const d = new Date();
                                   if (depoReportTimeFilter === 'aylik') d.setMonth(d.getMonth() - 1);
                                   else if (depoReportTimeFilter === '3aylik') d.setMonth(d.getMonth() - 3);
                                   else if (depoReportTimeFilter === '6aylik') d.setMonth(d.getMonth() - 6);
                                   else if (depoReportTimeFilter === 'senelik') d.setFullYear(d.getFullYear() - 1);
                                   else return new Date(2000, 0, 1); // Tüm Zamanlar
                                   return d;
                               };
                               const movementStartDate = getMovementStartDate();

                               const movementReport = warehouses.filter(w => depoReportWhFilter === 'all' || w.id.toString() === depoReportWhFilter).map(wh => {
                                   const whBlocks = blocks.filter(b => b.warehouseId === wh.id).map(b => b.id);
                                   const whRooms = allRooms.filter(r => whBlocks.includes(r.blockId));
                                   
                                   let newEntries = 0;
                                   let exits = 0;

                                   whRooms.forEach(room => {
                                       // Aktif kiralamalardaki yeni girişler
                                       if (room.customerName && room.entryDate) {
                                           const eDate = parseDateLocal(room.entryDate);
                                           if (eDate >= movementStartDate) newEntries++;
                                       }
                                       // Geçmiş arşivdeki giriş/çıkış sayıları
                                       if (room.history && room.history.length > 0) {
                                           room.history.forEach(h => {
                                               if (h.entryDate) {
                                                   const eDate = parseDateLocal(h.entryDate);
                                                   if (eDate >= movementStartDate) newEntries++;
                                               }
                                               if (h.exitDate) {
                                                   const exDate = parseDateLocal(h.exitDate);
                                                   if (exDate >= movementStartDate) exits++;
                                               }
                                           });
                                       }
                                   });
                                   
                                   return { ...wh, newEntries, exits, netChange: newEntries - exits };
                               });

                               return (
                                   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                       <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
                                           <div>
                                               <h3 className="text-lg font-bold text-gray-800">Depo Kiralama Hareketleri (Giriş - Çıkış Raporu)</h3>
                                               <p className="text-sm text-gray-500 mt-1">Seçili tarih aralığında şubelerdeki yeni kiralama ve tahliye sayıları.</p>
                                           </div>
                                           <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                               <select value={depoReportWhFilter} onChange={(e) => setDepoReportWhFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white shadow-sm cursor-pointer">
                                                   <option value="all">Tüm Şubeler</option>
                                                   {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                               </select>
                                               <select value={depoReportTimeFilter} onChange={(e) => setDepoReportTimeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white shadow-sm cursor-pointer">
                                                   <option value="aylik">Son 1 Ay (Aylık)</option>
                                                   <option value="3aylik">Son 3 Ay</option>
                                                   <option value="6aylik">Son 6 Ay</option>
                                                   <option value="senelik">Son 1 Yıl (Senelik)</option>
                                                   <option value="all">Tüm Zamanlar</option>
                                               </select>
                                           </div>
                                       </div>
                                       <div className="overflow-x-auto">
                                           <table className="w-full text-left text-sm text-gray-600 min-w-[700px]">
                                               <thead className="bg-white border-b border-gray-200 text-[11px] uppercase text-gray-500 font-bold">
                                                   <tr>
                                                       <th className="px-6 py-4">Depo Şubesi</th>
                                                       <th className="px-6 py-4 text-center">Yeni Giriş (Kiralama)</th>
                                                       <th className="px-6 py-4 text-center">Çıkış Yapan (Tahliye)</th>
                                                       <th className="px-6 py-4 text-center">Net Değişim</th>
                                                   </tr>
                                               </thead>
                                               <tbody className="divide-y divide-gray-100 bg-white">
                                                   {movementReport.map(report => (
                                                       <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                                           <td className="px-6 py-4 font-bold text-gray-800 text-[14px]">{report.name}</td>
                                                           <td className="px-6 py-4 text-center">
                                                               <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-center w-max mx-auto gap-1.5">
                                                                   <ArrowDown size={14}/> {report.newEntries} Yeni Oda
                                                               </span>
                                                           </td>
                                                           <td className="px-6 py-4 text-center">
                                                               <span className="text-rose-700 font-bold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center justify-center w-max mx-auto gap-1.5">
                                                                   <ArrowUp size={14}/> {report.exits} Çıkış
                                                               </span>
                                                           </td>
                                                           <td className="px-6 py-4 text-center">
                                                               <span className={`font-black text-sm px-4 py-1.5 rounded-full ${report.netChange > 0 ? 'text-emerald-700 bg-emerald-100' : report.netChange < 0 ? 'text-rose-700 bg-rose-100' : 'text-gray-600 bg-gray-100'}`}>
                                                                   {report.netChange > 0 ? '+' : ''}{report.netChange} Oda
                                                               </span>
                                                           </td>
                                                       </tr>
                                                   ))}
                                               </tbody>
                                               <tfoot className="bg-slate-50 border-t border-gray-200 font-bold text-gray-800">
                                                   <tr>
                                                       <td className="px-6 py-5 text-xs tracking-wider uppercase text-gray-500">Genel Toplam</td>
                                                       <td className="px-6 py-5 text-center text-emerald-700 text-[16px]">{movementReport.reduce((acc, r) => acc + r.newEntries, 0)} Toplam Giriş</td>
                                                       <td className="px-6 py-5 text-center text-rose-700 text-[16px]">{movementReport.reduce((acc, r) => acc + r.exits, 0)} Toplam Çıkış</td>
                                                       <td className="px-6 py-5 text-center text-[16px]">{movementReport.reduce((acc, r) => acc + r.netChange, 0) > 0 ? '+' : ''}{movementReport.reduce((acc, r) => acc + r.netChange, 0)} Net Oda</td>
                                                   </tr>
                                               </tfoot>
                                           </table>
                                       </div>
                                   </div>
                               );
                           })()}

                           {/* SON KİRALAMALAR / YENİ TUTULAN ODALAR */}
                           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/30">
                                   <div>
                                       <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Key size={20} className="text-indigo-500" /> Yeni Tutulan Depolar (Son Hareketler)</h3>
                                       <p className="text-sm text-indigo-900/60 mt-1 font-medium">Sisteme en son giriş yapılan aktif kiralama işlemleri.</p>
                                   </div>
                                   <button onClick={() => setActiveMenu('depo')} className="bg-white border border-indigo-100 hover:bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">Tüm Odalara Git &rarr;</button>
                               </div>
                               <div className="p-0">
                                   {recentRentals.length > 0 ? (
                                       <div className="divide-y divide-gray-100 bg-white">
                                           {recentRentals.map(r => {
                                               const block = blocks.find(b => b.id === r.blockId);
                                               const wh = warehouses.find(w => w.id === block?.warehouseId);
                                               const baseAmt = Number(r.monthlyFee || 0);
                                               const hasKdv = r.hasKdv !== undefined ? r.hasKdv : true;
                                               const fee = hasKdv ? baseAmt * 1.20 : baseAmt;
                                               
                                               return (
                                                   <div key={r.id} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-indigo-50/20 transition-colors gap-4 group">
                                                       <div className="flex items-center gap-4">
                                                           <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg border border-indigo-200 shadow-sm group-hover:scale-110 transition-transform">
                                                               {r.name.split('-')[0] || r.name.charAt(0)}
                                                           </div>
                                                           <div>
                                                               <h4 className="font-bold text-gray-800 text-[15px] cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => {const c=customers.find(c=>c.name===r.customerName); if(c) setSelectedCustomerId(c.id);}}>
                                                                   {r.customerName}
                                                               </h4>
                                                               <div className="text-xs text-gray-500 font-bold mt-1.5 flex items-center gap-2">
                                                                   <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 border border-gray-200">{r.name} Odası</span>
                                                                   <span className="text-gray-300">•</span>
                                                                   <span className="text-indigo-600">{wh?.name}</span>
                                                               </div>
                                                           </div>
                                                       </div>
                                                       <div className="flex flex-col sm:items-end">
                                                           <div className="font-black text-emerald-600 text-lg tracking-tight">{fee.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL <span className="text-[10px] text-emerald-600/60 font-bold">/AY</span></div>
                                                           <div className="text-xs text-gray-400 font-bold mt-1 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">Giriş: {r.entryDate}</div>
                                                       </div>
                                                   </div>
                                               );
                                           })}
                                       </div>
                                   ) : (
                                       <div className="p-12 text-center flex flex-col items-center justify-center">
                                           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3"><Key size={24} className="text-gray-300"/></div>
                                           <div className="text-gray-500 font-bold">Henüz bir kiralama kaydı bulunmuyor.</div>
                                       </div>
                                   )}
                               </div>
                           </div>

                       </div>
                   );
               })()}
             </div>
          ) : activeMenu === 'panel-kullanicilari' ? (
             <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
               <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                   <h1 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Sistem Hesapları</h1>
                   <h2 className="text-2xl font-bold text-slate-800">Panel Kullanıcıları</h2>
                   <p className="text-sm text-gray-500 mt-1">Sisteme giriş yapabilecek yetkili personelleri ve yöneticileri buradan yönetebilirsiniz.</p>
                 </div>
                 <button onClick={() => setIsAddUserModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-colors">
                     <Plus size={16} /> Yeni Kullanıcı Ekle
                 </button>
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                  <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-sm text-gray-600 min-w-[800px]">
                          <thead className="bg-slate-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold sticky top-0">
                              <tr>
                                  <th className="px-6 py-4">Kullanıcı Bilgileri</th>
                                  <th className="px-6 py-4">Giriş Bilgileri</th>
                                  <th className="px-6 py-4">İletişim</th>
                                  <th className="px-6 py-4 text-center">Rol / Yetki</th>
                                  <th className="px-6 py-4 text-center w-32">İşlem</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {systemUsers.map((user) => (
                                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                                                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-gray-800 text-[15px]">{user.name}</div>
                                                  {user.id === currentUserProfile.id && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-0.5 inline-block">Şu Anki Hesap</span>}
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="font-medium text-gray-700 flex items-center gap-1.5"><UserCog size={14} className="text-gray-400"/> {user.username}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="text-xs text-gray-600 font-medium flex items-center gap-1.5 mb-1"><Phone size={12} className="text-gray-400"/> {user.phone || '-'}</div>
                                          <div className="text-xs text-gray-600 font-medium flex items-center gap-1.5"><MessageCircle size={12} className="text-gray-400"/> {user.email || '-'}</div>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-sm ${user.role === 'Yönetici' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                              {user.role}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                              <button onClick={() => { setEditUserData({...user}); setIsEditUserModalOpen(true); }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors" title="Kullanıcıyı Düzenle">
                                                  <Edit size={16}/>
                                              </button>
                                              <button onClick={() => handleDeleteSystemUser(user.id)} disabled={user.id === currentUserProfile.id || systemUsers.length === 1} className="bg-red-50 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed text-red-600 p-2 rounded-lg transition-colors" title="Kullanıcıyı Sil">
                                                  <Trash2 size={16}/>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
               </div>
             </div>
          ) : activeMenu === 'kullanici-rolleri' ? (
             <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-300">
               <div className="mb-6">
                   <h2 className="text-2xl font-bold text-slate-800">Kullanıcı rolleri</h2>
               </div>

               {/* YENİ ROL EKLEME KUTUSU */}
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                   <h3 className="text-lg font-bold text-gray-800 mb-2">Yeni Rol</h3>
                   <p className="text-[11px] text-gray-400 mb-6 font-medium">Yeni bir rol oluşturun. Oluşturduktan sonra aşağıdaki listeden istediğiniz yetki (izin) kutucuklarını işaretleyebilirsiniz.</p>
                   
                   <div className="flex flex-col md:flex-row items-end gap-6 max-w-2xl">
                       <div className="flex-1 w-full">
                           <label className="text-[11px] font-bold text-gray-500 mb-1.5 block">Rol Adı</label>
                           <input type="text" placeholder="Örn. Şube Müdürü" value={newRoleInput.name} onChange={(e) => setNewRoleInput({...newRoleInput, name: e.target.value})} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                       </div>
                       <div className="w-full md:w-auto shrink-0">
                           <button onClick={handleAddRole} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 justify-center"><Plus size={16}/> Rol Ekle</button>
                       </div>
                   </div>
               </div>

               {/* ROLLERİN LİSTESİ VE İZİNLER */}
               <div className="mb-4">
                   <h3 className="text-xl font-bold text-gray-800 mb-2">Rollere göre menü ve işlem izinleri</h3>
                   <p className="text-[11px] text-gray-400 font-medium">İzinler; <span className="text-indigo-500 font-bold">Ana Menüler</span>, <span className="text-teal-500 font-bold">Sayfalar (Alt Menüler)</span> ve <span className="text-orange-500 font-bold">Kayıt İşlemleri</span> olmak üzere 3 ana gruba ayrılmıştır. Kutucukları işaretleyerek ilgili role erişim yetkisi verebilirsiniz. Süper (Yönetici) rol bu listede düzenlenmez.</p>
               </div>

               <div className="flex flex-col gap-6 pb-10 mt-4">
                   {userRoles.filter(r => !r.isSuper).map(role => (
                       <div key={role.id} className="bg-white shadow-sm border border-gray-200 p-6 rounded-lg relative">
                           <div className="flex justify-between items-center mb-6">
                               <div className="flex items-baseline gap-2">
                                   <h4 className="text-[15px] font-extrabold text-gray-800">{role.name}</h4>
                                   <span className="text-xs font-bold text-pink-500 lowercase tracking-wide">{role.code}</span>
                               </div>
                               <div className="flex items-center gap-2">
                                   <button onClick={() => handleDeleteRole(role.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"><Trash2 size={14}/> Rolü Sil</button>
                                   <button onClick={() => alert('İzinler başarıyla kaydedildi.')} className="bg-[#1bc5bd] hover:bg-teal-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors shadow-sm">İzinleri kaydet</button>
                               </div>
                           </div>

                           <div className="mb-8">
                               <h5 className="text-[11px] font-bold text-gray-800 mb-4">Ana Menü İzinleri (Sol Panel)</h5>
                               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                   {availablePermissions.mainMenus.map(perm => (
                                       <label key={perm.id} className="flex items-center gap-2 cursor-pointer group">
                                           <div className="relative flex items-center">
                                               <input 
                                                  type="checkbox" 
                                                  checked={role.permissions.mainMenus?.includes(perm.id)} 
                                                  onChange={() => handleTogglePermission(role.id, 'mainMenus', perm.id)}
                                                  className="peer shrink-0 w-4 h-4 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500 focus:ring-offset-0 transition-colors" 
                                               />
                                           </div>
                                           <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 leading-none">{perm.label}</span>
                                       </label>
                                   ))}
                               </div>
                           </div>

                           <div className="border-t border-gray-100 pt-6 mb-8">
                               <h5 className="text-[11px] font-bold text-gray-800 mb-4">Sayfalar / Alt Menü İzinleri</h5>
                               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                   {availablePermissions.pages.map(perm => (
                                       <label key={perm.id} className="flex items-center gap-2 cursor-pointer group">
                                           <div className="relative flex items-center">
                                               <input 
                                                  type="checkbox" 
                                                  checked={role.permissions.pages?.includes(perm.id)} 
                                                  onChange={() => handleTogglePermission(role.id, 'pages', perm.id)}
                                                  className="peer shrink-0 w-4 h-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500 focus:ring-offset-0 transition-colors" 
                                               />
                                           </div>
                                           <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 leading-none">{perm.label}</span>
                                       </label>
                                   ))}
                               </div>
                           </div>

                           <div className="border-t border-gray-100 pt-6">
                               <h5 className="text-[11px] font-bold text-gray-800 mb-4">Kayıt ve İşlem İzinleri (CRUD)</h5>
                               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                   {availablePermissions.actions.map(perm => (
                                       <label key={perm.id} className="flex items-center gap-2 cursor-pointer group">
                                           <div className="relative flex items-center">
                                               <input 
                                                  type="checkbox" 
                                                  checked={role.permissions.actions?.includes(perm.id)} 
                                                  onChange={() => handleTogglePermission(role.id, 'actions', perm.id)}
                                                  className="peer shrink-0 w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 focus:ring-offset-0 transition-colors" 
                                               />
                                           </div>
                                           <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 leading-none">{perm.label}</span>
                                       </label>
                                   ))}
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
             </div>
          ) : (
             <div className="flex items-center justify-center h-full text-center"><div><h2 className="text-xl font-medium text-gray-600 mb-2">Modül Hazırlanıyor</h2><p className="text-gray-400">Bu alan henüz geliştirilmemiştir.</p></div></div>
          )}
        </main>
      </div>

      {/* TÜM MODALLAR */}
      
      {/* SÖZLEŞME ÖNİZLEME VE İNDİR MODALI */}
      {isContractModalOpen && contractCustomer && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 lg:p-8">
          <div className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
             
             {/* Modal Header */}
             <div className="flex items-center justify-between p-5 border-b border-gray-300 bg-white rounded-t-2xl shrink-0 shadow-sm z-10">
                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FileTextIcon size={20} className="text-indigo-600" /> 
                    {contractCustomer.name} - Sözleşme Önizleme
                 </h3>
                 <div className="flex items-center gap-3">
                    <button onClick={handlePrintContract} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
                       <Download size={16} /> PDF Olarak İndir (Yazdır)
                    </button>
                    <button onClick={() => setIsContractModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-lg"><X size={20} /></button>
                 </div>
             </div>

{/* Modal Body - Printable Area Wrapper */}
             <div className="p-6 overflow-y-auto flex-1 flex justify-center items-start bg-gray-200">
                {/* Kağıt Simülasyonu (Ekranda Düzgün Görünmesi İçin Tablo Yerine Flex Akışı) */}
                <div id="printable-contract" className="bg-white shadow-md text-black relative flex flex-col justify-between" style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm', height: 'max-content', padding: '40px 40px 60px 40px', fontFamily: 'Arial, sans-serif' }}>
                    
                    {/* Filigran (Watermark) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[40pt] md:text-[80pt] font-bold text-black opacity-5 pointer-events-none z-0 whitespace-nowrap">Depoevim</div>
                    
{/* İçerik Kısmı */}
                        <div className="relative z-10">
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ textAlign: 'center', fontSize: '15pt', fontWeight: 'bold', marginBottom: '20px', color: '#111' }}>Eşya Depolama Sözleşmesi</div>
                            
                            {contractSettings.clauses.map(clause => (
                                <div key={clause.id} style={{ marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#111', margin: '0 0 5px 0' }}>{clause.title}</h3>
                                    {renderClauseWithData(clause.content).split('\n').map((line, idx) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) return <br key={idx} />;
                                        const colonIdx = trimmed.indexOf(':');
                                        if (colonIdx > 0 && colonIdx < 60 && trimmed.substring(0, colonIdx).split(' ').length <= 8) {
                                            return <p key={idx} style={{ margin: '0 0 3px 0', textAlign: 'justify', color: '#333', fontSize: '10pt', lineHeight: '1.55' }}><strong>{trimmed.substring(0, colonIdx)}:</strong> {trimmed.substring(colonIdx + 1)}</p>;
                                        }
                                        return <p key={idx} style={{ margin: '0 0 3px 0', textAlign: 'justify', color: '#333', fontSize: '10pt', lineHeight: '1.55' }}>{trimmed}</p>;
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Kısmı (Ekranda sadece en altta görünür) */}
                    <div className="relative z-10 mt-auto pt-6 border-t border-gray-300">
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '9pt' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '33%', verticalAlign: 'bottom', padding: 0, border: 'none' }}>
                                        <div style={{ lineHeight: '1.7' }}>
                                            <div style={{ fontWeight: 'bold' }}>HİZMET VEREN</div>
                                            <div><strong>Ad Soyad / Ünvan:</strong> {contractSettings.accountHolder}</div>
                                            <div><strong>İmza Yetkili Kişi Ad Soyad:</strong></div>
                                            <div><strong>İmza:</strong></div>
                                            <div style={{ marginTop: '6px' }}>
                                                <img src="https://www.sembolevdeneve.com/crm/uploads/ka%C5%9Fe.jpg" style={{ width: '110px', mixBlendMode: 'multiply', opacity: 0.95 }} alt="Kaşe" />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ width: '34%', verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '4px', border: 'none' }}>
                                        <img src="https://www.depoevim.com/wp-content/uploads/2025/07/cropped-logo.webp" alt="Depoevim" style={{ height: '40px', objectFit: 'contain' }} />
                                    </td>
                                    <td style={{ width: '33%', verticalAlign: 'bottom', padding: 0, border: 'none' }}>
                                        <div style={{ lineHeight: '1.7' }}>
                                            <div style={{ fontWeight: 'bold' }}>DEPOLATAN KİŞİ</div>
                                            <div><strong>Ad Soyad / Ünvan:</strong> {contractCustomer?.name}</div>
                                            <div><strong>İmza Yetkili Kişi Ad Soyad:</strong></div>
                                            <div><strong>İmza:</strong></div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                </div>
             </div>
          </div>
        </div>
      )}

      {isRentRoomModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 lg:p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50 rounded-t-2xl sticky top-0 z-10"><h3 className="text-xl font-bold text-[#1bc5bd] flex items-center gap-2"><Key size={22} /> {selectedRoomDetail?.name} Numaralı Odayı Kirala</h3><button onClick={() => setIsRentRoomModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-1.5 rounded-full shadow-sm border border-gray-200"><X size={20} /></button></div>
             <div className="p-6 md:p-8">
               <div className="mb-8">
                 <div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 rounded-full bg-[#1bc5bd] text-white flex items-center justify-center text-xs font-bold">1</div><h4 className="font-bold text-gray-800">Müşteri Seçimi</h4></div>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Sistemdeki Müşteriler (Zorunlu)</label>
                   <input type="text" placeholder="Müşteri Adı veya No ile Ara..." value={rentCustomerSearch} onChange={(e) => setRentCustomerSearch(e.target.value)} className="w-full mb-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700 bg-white" />
<select value={rentData.customerName} onChange={(e) => setRentData({...rentData, customerName: e.target.value})} className="w-full border-2 border-white shadow-sm rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-4 focus:ring-teal-50 font-medium text-slate-700 bg-white">
                     <option value="">Lütfen listeden bir müşteri seçin...</option>
                     {customers
                       .filter(c => normalizeStr(c.name).includes(normalizeStr(rentCustomerSearch)) || c.customerNo.includes(rentCustomerSearch))
                       .sort((a, b) => b.id - a.id)
                       .map((c) => (<option key={c.id} value={c.name}>{c.name} (No: {c.customerNo} - {c.phone})</option>))}
                   </select>
                   <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1"><Info size={12}/> Listede müşteri yoksa önce "Yeni Müşteri Ekle" bölümünden kayıt oluşturun.</p>
                 </div>
               </div>
               <div className="mb-8">
                 <div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 rounded-full bg-[#1bc5bd] text-white flex items-center justify-center text-xs font-bold">2</div><h4 className="font-bold text-gray-800">Kiralama Şartları</h4></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Giriş Tarihi</label><input type="date" value={rentData.entryDate} onChange={(e) => setRentData({...rentData, entryDate: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-medium text-slate-700" /></div>
                   <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">İlk Ödeme Tarihi (Döngü Başı)</label><input type="date" value={rentData.paymentDate} onChange={(e) => setRentData({...rentData, paymentDate: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-medium text-slate-700" /></div>
                   <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Aylık Oda Bedeli (TL)</label>
                     <div className="flex flex-col gap-2">
                       <input type="number" placeholder="Örn: 6600" value={rentData.monthlyFee} onChange={(e) => setRentData({...rentData, monthlyFee: e.target.value})} className="w-full border-2 border-red-200 bg-red-50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 font-bold text-red-700 text-lg" />
                       <label className="flex items-center gap-2 cursor-pointer mt-1"><input type="checkbox" checked={rentData.hasKdv} onChange={(e) => setRentData({...rentData, hasKdv: e.target.checked})} className="w-4 h-4 text-[#1bc5bd] rounded focus:ring-[#1bc5bd]"/><span className="text-sm font-medium text-gray-700">+ %20 KDV Uygula</span></label>
                       {rentData.hasKdv && rentData.monthlyFee && (<div className="text-xs font-bold text-teal-600">KDV Dahil Tahsil Edilecek: {(Number(rentData.monthlyFee) * 1.2).toFixed(0)} TL</div>)}
                     </div>
                   </div>
                   <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Mühür Numarası</label><input type="text" placeholder="Örn: MH-78451" value={rentData.sealNo} onChange={(e) => setRentData({...rentData, sealNo: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-medium text-slate-700 uppercase" /></div>
                 </div>
               </div>
               <div className="mb-4">
                 <div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 rounded-full bg-[#1bc5bd] text-white flex items-center justify-center text-xs font-bold">3</div><h4 className="font-bold text-gray-800">Taşıma Durumu</h4></div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-gray-200">
                   <label className="text-sm font-semibold text-gray-700 mb-3 block">Eşyaları Depoya Kim Getirdi?</label>
                   <div className="flex flex-col sm:flex-row gap-4 mb-2">
                     <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${rentData.broughtBy === 'kendisi' ? 'border-[#1bc5bd] bg-teal-50/30' : 'border-gray-200 bg-white hover:border-teal-200'}`}><input type="radio" name="broughtBy" value="kendisi" checked={rentData.broughtBy === 'kendisi'} onChange={() => setRentData({...rentData, broughtBy: 'kendisi'})} className="w-5 h-5 text-[#1bc5bd] focus:ring-[#1bc5bd]"/><span className={`font-medium ${rentData.broughtBy === 'kendisi' ? 'text-teal-800' : 'text-gray-600'}`}>Müşteri Kendisi Getirdi</span></label>
                     <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${rentData.broughtBy === 'sembol' ? 'border-[#1bc5bd] bg-teal-50/30' : 'border-gray-200 bg-white hover:border-teal-200'}`}><input type="radio" name="broughtBy" value="sembol" checked={rentData.broughtBy === 'sembol'} onChange={() => setRentData({...rentData, broughtBy: 'sembol'})} className="w-5 h-5 text-[#1bc5bd] focus:ring-[#1bc5bd]"/><span className={`font-medium ${rentData.broughtBy === 'sembol' ? 'text-teal-800' : 'text-gray-600'}`}>Sembol Nakliyat Getirdi</span></label>
                   </div>
                   {rentData.broughtBy === 'sembol' && (
                     <div className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                       <div className="flex flex-col gap-1.5"><label className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Görevli Ekip Listesi (Aralarına virgül koyarak yazın)</label><textarea rows="2" placeholder="Örn: Mehmet Şen, Şenol Beşinci..." value={rentData.teamList} onChange={(e) => setRentData({...rentData, teamList: e.target.value})} className="border-2 border-teal-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] resize-none font-medium text-teal-900 bg-white shadow-sm"></textarea></div>
                       
                       <div className="flex flex-col gap-1.5 p-3 bg-white rounded-lg border border-teal-100 shadow-sm">
                         <label className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Eşyada Hasar Var Mı?</label>
                         <div className="flex gap-4 mt-1">
                           <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="hasDamage" checked={rentData.hasDamage === true} onChange={() => setRentData({...rentData, hasDamage: true})} className="w-4 h-4 text-orange-500 focus:ring-orange-500"/><span className="text-sm font-medium text-gray-700">Evet, Hasar Var</span></label>
                           <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="hasDamage" checked={rentData.hasDamage === false} onChange={() => setRentData({...rentData, hasDamage: false})} className="w-4 h-4 text-[#1bc5bd] focus:ring-[#1bc5bd]"/><span className="text-sm font-medium text-gray-700">Hayır, Hasar Yok</span></label>
                         </div>
                         {rentData.hasDamage && (
                           <div className="mt-3"><label className="text-[11px] font-bold text-orange-500 uppercase tracking-wider block mb-1">Hasar Nedeni / Açıklaması</label><textarea rows="2" placeholder="Hasarın detayını yazın..." value={rentData.damageDescription} onChange={(e) => setRentData({...rentData, damageDescription: e.target.value})} className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none font-medium text-gray-700 bg-orange-50/30"></textarea></div>
                         )}
                       </div>

                       <div className="flex flex-col gap-1.5 p-3 bg-white rounded-lg border border-teal-100 shadow-sm">
                         <label className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Nakliye Fiyatı (İsteğe Bağlı)</label>
                         <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                           <input type="number" placeholder="Örn: 2500" value={rentData.transportPrice} onChange={(e) => setRentData({...rentData, transportPrice: e.target.value})} className="w-full sm:w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1bc5bd] font-bold text-slate-700" />
                           <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rentData.transportHasKdv} onChange={(e) => setRentData({...rentData, transportHasKdv: e.target.checked})} className="w-4 h-4 text-[#1bc5bd] rounded focus:ring-[#1bc5bd]"/><span className="text-sm font-medium text-gray-700">+ %20 KDV Uygula</span></label>
                         </div>
                         {rentData.transportPrice && (
                           <p className="text-[11px] font-medium text-gray-500 mt-1">Bu tutar müşterinin cari hesabına nakliye bedeli olarak eklenecektir. (Cariye yansıyacak tutar: <span className="font-bold text-gray-700">{rentData.transportHasKdv ? (Number(rentData.transportPrice) * 1.2).toFixed(0) : Number(rentData.transportPrice)} TL</span>)</p>
                         )}
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               <div className="mb-4">
                 <div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 rounded-full bg-[#1bc5bd] text-white flex items-center justify-center text-xs font-bold">4</div><h4 className="font-bold text-gray-800">Giriş Görseli Ekle (İsteğe Bağlı)</h4></div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-gray-200">
                    <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-white hover:border-[#1bc5bd] transition-colors cursor-pointer group bg-white/50">
                     {rentData.entryPhoto ? (
                       <div className="text-[#1bc5bd] font-bold flex flex-col items-center"><Check size={24} className="mb-2" /><span>Görsel Eklendi</span><img src={rentData.entryPhoto} alt="Önizleme" className="h-16 w-16 object-cover rounded mt-2 border border-gray-200"/></div>
                     ) : (
                       <><Upload size={20} className="text-gray-400 mb-2 group-hover:text-[#1bc5bd] transition-colors" /><span className="text-xs text-gray-500 font-medium">Depoya yerleşim yapıldıktan sonraki fotoğrafı yükleyin</span><span className="text-[10px] text-gray-400 mt-1">PNG, JPG formatlarında</span></>
                     )}
<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setRentData({...rentData, entryPhoto: url}); } }}/>                   </label>
                 </div>
               </div>
               
               <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6"><button onClick={() => setIsRentRoomModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold transition-colors text-sm">İptal Et</button><button onClick={handleRentRoom} disabled={!rentData.customerName || !rentData.monthlyFee} className="bg-[#1bc5bd] hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/30"><Check strokeWidth={3} size={20} /> Kiralama Kaydını Tamamla</button></div>
             </div>
          </div>
        </div>
      )}

      {isRentSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-10 text-center animate-in zoom-in duration-300"><div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Check size={50} strokeWidth={3} /></div><h3 className="text-3xl font-extrabold text-gray-800 mb-3">Oda Kiralandı!</h3><p className="text-gray-500 mb-8 font-medium leading-relaxed">Müşteri ve depo bilgileri başarıyla sisteme işlendi. Ödeme planı ve geçmiş/gelecek yıl tablosu oluşturuldu.</p><button onClick={() => setIsRentSuccessModalOpen(false)} className="bg-green-500 hover:bg-green-600 text-white w-full py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-green-500/30">Oda Detayına Git</button></div>
        </div>
      )}

      {isEditRentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 lg:p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50 rounded-t-2xl sticky top-0 z-10"><h3 className="text-xl font-bold text-[#1bc5bd] flex items-center gap-2"><Edit size={22} /> {selectedRoomDetail?.name} Numaralı Oda - Giriş Bilgilerini Düzenle</h3><button onClick={() => setIsEditRentModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-1.5 rounded-full shadow-sm border border-gray-200"><X size={20} /></button></div>
             <div className="p-6 md:p-8">
               <div className="mb-8">
                 <div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 rounded-full bg-[#1bc5bd] text-white flex items-center justify-center text-xs font-bold">1</div><h4 className="font-bold text-gray-800">Müşteri Seçimi</h4></div>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Sistemdeki Müşteriler (Zorunlu)</label>
                   <select value={editRentData.customerName} onChange={(e) => setEditRentData({...editRentData, customerName: e.target.value})} className="w-full border-2 border-white shadow-sm rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-4 focus:ring-teal-50 font-medium text-slate-700 bg-white"><option value="">Lütfen listeden bir müşteri seçin...</option>{customers.map((c) => (<option key={c.id} value={c.name}>{c.name} (No: {c.customerNo} - {c.phone})</option>))}</select>
                 </div>
               </div>
               <div className="mb-8">
                 <div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 rounded-full bg-[#1bc5bd] text-white flex items-center justify-center text-xs font-bold">2</div><h4 className="font-bold text-gray-800">Kiralama Şartları</h4></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Giriş Tarihi</label><input type="date" value={editRentData.entryDate} onChange={(e) => setEditRentData({...editRentData, entryDate: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-medium text-slate-700" /></div>
                   <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">İlk Ödeme Tarihi (Döngü Başı)</label><input type="date" value={editRentData.paymentDate} onChange={(e) => setEditRentData({...editRentData, paymentDate: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-medium text-slate-700" /></div>
                   <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Aylık Oda Bedeli (TL)</label>
                     <div className="flex flex-col gap-2">
                       <input type="number" placeholder="Örn: 6600" value={editRentData.monthlyFee} onChange={(e) => setEditRentData({...editRentData, monthlyFee: e.target.value})} className="w-full border-2 border-red-200 bg-red-50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 font-bold text-red-700 text-lg" />
                       <label className="flex items-center gap-2 cursor-pointer mt-1"><input type="checkbox" checked={editRentData.hasKdv} onChange={(e) => setEditRentData({...editRentData, hasKdv: e.target.checked})} className="w-4 h-4 text-[#1bc5bd] rounded focus:ring-[#1bc5bd]"/><span className="text-sm font-medium text-gray-700">+ %20 KDV Uygula</span></label>
                       {editRentData.hasKdv && editRentData.monthlyFee && (<div className="text-xs font-bold text-teal-600">KDV Dahil Tahsil Edilecek: {(Number(editRentData.monthlyFee) * 1.2).toFixed(0)} TL</div>)}
                     </div>
                   </div>
                   <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Mühür Numarası</label><input type="text" placeholder="Örn: MH-78451" value={editRentData.sealNo} onChange={(e) => setEditRentData({...editRentData, sealNo: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] focus:ring-1 focus:ring-[#1bc5bd] font-medium text-slate-700 uppercase" /></div>
                 </div>
               </div>
               <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6"><button onClick={() => setIsEditRentModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold transition-colors text-sm">İptal Et</button><button onClick={handleSaveEditRent} disabled={!editRentData.customerName || !editRentData.monthlyFee} className="bg-[#1bc5bd] hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/30"><Check strokeWidth={3} size={20} /> Değişiklikleri Kaydet</button></div>
             </div>
          </div>
        </div>
      )}

      {isAddWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-medium w-full text-center">Yeni Depo Ekle</h3><button onClick={()=>setIsAddWarehouseModalOpen(false)}><X size={20} className="text-gray-400"/></button></div>
             <div className="p-6">
                <input type="text" value={newDepoName} onChange={(e)=>setNewDepoName(e.target.value.toUpperCase())} placeholder="Depo Adı" className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:border-cyan-500" />
                <input type="text" value={newDepoAddress} onChange={(e)=>setNewDepoAddress(e.target.value)} placeholder="Depo Adresi" className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:border-cyan-500" />
                <input type="number" value={newDepoM3} onChange={(e)=>setNewDepoM3(e.target.value)} placeholder="Toplam Hacim (m³)" className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:border-cyan-500" />
                <button onClick={handleAddWarehouse} className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors">Kaydet</button>
             </div>
          </div>
        </div>
      )}

      {isEditWarehouseModalOpen && editWarehouseData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-medium w-full text-center">Depoyu Düzenle</h3><button onClick={()=>setIsEditWarehouseModalOpen(false)}><X size={20} className="text-gray-400"/></button></div>
             <div className="p-6">
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Depo Adı</label><input type="text" value={editWarehouseData.name} onChange={(e)=>setEditWarehouseData({...editWarehouseData, name: e.target.value.toUpperCase()})} placeholder="Depo Adı" className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:border-cyan-500" />
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Depo Adresi</label><input type="text" value={editWarehouseData.address || ''} onChange={(e)=>setEditWarehouseData({...editWarehouseData, address: e.target.value})} placeholder="Depo Adresi" className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:border-cyan-500" />
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Toplam Hacim (m³)</label><input type="number" value={editWarehouseData.m3} onChange={(e)=>setEditWarehouseData({...editWarehouseData, m3: e.target.value})} placeholder="Toplam Hacim (m³)" className="w-full border border-gray-300 rounded px-3 py-2 mb-6 focus:outline-none focus:border-cyan-500" />
                <button onClick={handleEditWarehouse} className="w-full bg-[#1bc5bd] hover:bg-teal-500 text-white px-4 py-2 rounded transition-colors font-medium">Değişiklikleri Kaydet</button>
             </div>
          </div>
        </div>
      )}

      {isAddBlockModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-medium w-full text-center">Yeni Blok Ekle</h3><button onClick={()=>setIsAddBlockModalOpen(false)}><X size={20} className="text-gray-400"/></button></div>
             <div className="p-6">
                <input type="text" value={newBlockName} onChange={(e)=>setNewBlockName(e.target.value.toUpperCase())} placeholder="Blok Adı" className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:border-cyan-500" />
                <input type="number" value={newBlockM3} onChange={(e)=>setNewBlockM3(e.target.value)} placeholder="Toplam Hacim (m³)" className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:border-cyan-500" />
                <button onClick={handleAddBlock} className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors">Kaydet</button>
             </div>
          </div>
        </div>
      )}

      {isAddRoomModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-medium w-full text-center">Yeni Oda Ekle</h3><button onClick={()=>setIsAddRoomModalOpen(false)}><X size={20} className="text-gray-400"/></button></div>
             <div className="p-6">
                <input type="text" value={newRoomName} onChange={(e)=>setNewRoomName(e.target.value.toUpperCase())} placeholder="Oda Adı" className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:border-cyan-500" />
                <input type="number" value={newRoomM3} onChange={(e)=>setNewRoomM3(e.target.value)} placeholder="Hacim (m³)" className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:border-cyan-500" />
                <button onClick={handleAddRoom} className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors">Kaydet</button>
             </div>
          </div>
        </div>
      )}

      {isEditBlockModalOpen && editBlockData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-medium w-full text-center">Bloku Düzenle</h3><button onClick={()=>setIsEditBlockModalOpen(false)}><X size={20} className="text-gray-400"/></button></div>
             <div className="p-6">
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Blok Adı</label><input type="text" value={editBlockData.name} onChange={(e)=>setEditBlockData({...editBlockData, name: e.target.value.toUpperCase()})} placeholder="Blok Adı" className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:border-cyan-500" />
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Toplam Hacim (m³)</label><input type="number" value={editBlockData.m3} onChange={(e)=>setEditBlockData({...editBlockData, m3: e.target.value})} placeholder="Toplam Hacim (m³)" className="w-full border border-gray-300 rounded px-3 py-2 mb-6 focus:outline-none focus:border-cyan-500" />
                <button onClick={handleEditBlock} className="w-full bg-[#1bc5bd] hover:bg-teal-500 text-white px-4 py-2 rounded transition-colors font-medium">Değişiklikleri Kaydet</button>
             </div>
          </div>
        </div>
      )}

      {isEditRoomModalOpen && editRoomData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-medium w-full text-center">Oda Özelliklerini Düzenle</h3><button onClick={()=>setIsEditRoomModalOpen(false)}><X size={20} className="text-gray-400"/></button></div>
             <div className="p-6">
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Oda Adı</label><input type="text" value={editRoomData.name} onChange={(e)=>setEditRoomData({...editRoomData, name: e.target.value.toUpperCase()})} placeholder="Oda Adı" className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:border-cyan-500" />
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Hacim (m³)</label><input type="number" value={editRoomData.m3} onChange={(e)=>setEditRoomData({...editRoomData, m3: e.target.value})} placeholder="Hacim (m³)" className="w-full border border-gray-300 rounded px-3 py-2 mb-6 focus:outline-none focus:border-cyan-500" />
                <button onClick={handleEditRoom} className="w-full bg-[#1bc5bd] hover:bg-teal-500 text-white px-4 py-2 rounded transition-colors font-medium">Değişiklikleri Kaydet</button>
             </div>
          </div>
        </div>
      )}

      {isEndRentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-xl font-medium text-gray-600 mx-auto w-full text-center">Depodan Çıkış Yap</h3><button onClick={() => setIsEndRentModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
             <div className="p-8">
               <div className="flex flex-col gap-4 mb-6">
                 <div className="flex flex-col gap-2"><label className="text-xs font-semibold text-gray-600">Çıkış Tarihi</label><input type="date" value={endRentData.exitDate} onChange={(e) => setEndRentData({...endRentData, exitDate: e.target.value})} className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" /></div>
                 <div className="flex flex-col gap-2 mt-2">
                   <label className="text-xs font-semibold text-gray-600">Boş Depo Görseli (İsteğe Bağlı)</label>
                   <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                     {endRentData.photo ? (<div className="text-green-500 font-bold flex flex-col items-center"><Check size={24} className="mb-2" /><span>Fotoğraf Eklendi</span></div>) : (<><Upload size={20} className="text-gray-400 mb-2 group-hover:text-cyan-500 transition-colors" /><span className="text-xs text-gray-500">Çıkış yapılan boş deponun fotoğrafını yükle</span></>)}
<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setEndRentData({...endRentData, photo: url}); } }}/>                   </label>
                 </div>
               </div>
               <div className="flex justify-end gap-3"><button onClick={() => setIsEndRentModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded text-sm font-medium">İptal</button><button onClick={handleEndRentConfirm} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded text-sm font-medium flex items-center gap-2"><LogOut size={16} /> Çıkışı Onayla</button></div>
             </div>
          </div>
        </div>
      )}

      {/* ZAM YAPMA MODALI (YENİ EKLENDİ) */}
      {isApplyIncreaseModalOpen && increaseModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2"><TrendingUp size={20} /> Zam Yap ({increaseModalData.name})</h3>
                 <button onClick={() => setIsApplyIncreaseModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 bg-white p-1 rounded shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6 md:p-8">
               <p className="text-sm text-gray-500 mb-6 text-center"><strong>{increaseModalData.customerName}</strong> müşterisinin <strong>{increaseModalData.targetYear}</strong> yılı zammını uygulamak üzeresiniz. Mevcut Kira: <strong>{increaseModalData.monthlyFee} TL</strong></p>
               
               <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="incMode" checked={increaseMode === 'percentage'} onChange={() => setIncreaseMode('percentage')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                      <span className={`text-sm font-bold ${increaseMode === 'percentage' ? 'text-indigo-700' : 'text-gray-500'}`}>Zam Oranı İle Yap</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="incMode" checked={increaseMode === 'manual'} onChange={() => setIncreaseMode('manual')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                      <span className={`text-sm font-bold ${increaseMode === 'manual' ? 'text-indigo-700' : 'text-gray-500'}`}>Yeni Tutar Belirle</span>
                   </label>
               </div>

               <div className="flex flex-col gap-5 mb-8">
                 <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Uygulanacak Zam Oranı (%)</label>
                     <div className="relative">
                         <input type="number" disabled={increaseMode !== 'percentage'} value={increasePercentage} onChange={(e) => handlePercentageInput(e.target.value)} className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none transition-colors ${increaseMode === 'percentage' ? 'border-indigo-300 focus:border-indigo-500 bg-white text-indigo-900' : 'border-gray-200 bg-gray-50 text-gray-400'}`} />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400">%</span>
                     </div>
                 </div>
                 <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Yeni Kira Bedeli (TL)</label>
                     <div className="relative">
                         <input type="number" disabled={increaseMode !== 'manual'} value={newRentAmount} onChange={(e) => handleAmountInput(e.target.value)} className={`w-full border-2 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none transition-colors ${increaseMode === 'manual' ? 'border-indigo-300 focus:border-indigo-500 bg-white text-indigo-900' : 'border-gray-200 bg-gray-50 text-gray-400'}`} />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400">TL</span>
                     </div>
                 </div>
               </div>
               
               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                   <button onClick={() => setIsApplyIncreaseModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold transition-colors">İptal</button>
                   <button onClick={handleConfirmIncrease} disabled={!newRentAmount} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 transition-colors flex items-center gap-2"><Check strokeWidth={3} size={18}/> Zammı Uygula</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {isChangeRoomModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in overflow-visible">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-xl font-medium text-gray-600 mx-auto w-full text-center">Oda Değiştir</h3><button onClick={() => setIsChangeRoomModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
             <div className="p-8">
               <p className="text-sm text-gray-500 mb-6 text-center">Müşteri ve tüm işlemleri yeni odaya taşınacaktır. Eski oda boşaltılıp geçmişine kayıt eklenecektir.</p>
               
               <div className="flex flex-col gap-4 mb-6">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold text-gray-600">Depo (Şube) Seç</label>
                   <select value={changeRoomWarehouseId} onChange={(e) => {setChangeRoomWarehouseId(e.target.value); setChangeRoomBlockId(''); setChangeRoomTargetRoomId('');}} className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none text-gray-700">
                     <option value="">Lütfen Depo Seçin</option>
                     {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                   </select>
                 </div>
                 
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold text-gray-600">Blok Seç</label>
                   <select disabled={!changeRoomWarehouseId} value={changeRoomBlockId} onChange={(e) => {setChangeRoomBlockId(e.target.value); setChangeRoomTargetRoomId('');}} className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none text-gray-700 disabled:bg-gray-100">
                     <option value="">Lütfen Blok Seçin</option>
                     {blocks.filter(b => b.warehouseId === parseInt(changeRoomWarehouseId)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                 </div>

                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-semibold text-gray-600">Oda Seç (Sadece Boş Odalar)</label>
                   <select disabled={!changeRoomBlockId} value={changeRoomTargetRoomId} onChange={(e) => setChangeRoomTargetRoomId(e.target.value)} className="border border-orange-400 focus:ring-1 focus:ring-orange-400 rounded px-3 py-2 text-sm focus:outline-none text-gray-700 disabled:bg-gray-100 disabled:border-gray-300">
                     <option value="">Lütfen Oda Seçin</option>
                     {rooms.filter(r => r.blockId === parseInt(changeRoomBlockId) && !r.customerName && (!r.isReserved || r.reserveExpiryTimestamp < Date.now())).map(r => <option key={r.id} value={r.id}>{r.name} ({r.m3}m³)</option>)}
                   </select>
                 </div>
               </div>

               <div className="flex justify-end gap-3">
                 <button onClick={() => setIsChangeRoomModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded text-sm font-medium">İptal</button>
                 <button onClick={handleChangeRoomConfirm} disabled={!changeRoomTargetRoomId} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium flex items-center gap-2"><RefreshCcw size={16}/> Odayı Değiştir</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* DİNAMİK ZAM GEÇMİŞİ MODALI */}
      {isPriceHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-in fade-in zoom-in flex flex-col max-h-[90vh]">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl shrink-0">
                 <h3 className="text-xl font-bold text-indigo-700 flex items-center gap-2"><TrendingUp size={20} /> Zam Geçmişi ({selectedRoomDetail?.name})</h3>
                 <button onClick={() => setIsPriceHistoryModalOpen(false)} className="bg-white p-1 rounded shadow-sm text-indigo-400 hover:text-indigo-600"><X size={20} /></button>
             </div>
             <div className="p-6 overflow-y-auto flex-1">
               <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-200">
                   <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">{selectedRoomDetail?.customerName?.charAt(0) || 'M'}</div>
                   <div>
                       <h4 className="font-bold text-gray-800 text-[15px] leading-tight">{selectedRoomDetail?.customerName}</h4>
                       <span className="text-[11px] text-gray-500 font-medium">İlk Giriş: {selectedRoomDetail?.entryDate}</span>
                   </div>
               </div>
               
               <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                   <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-100 border-b border-gray-200 font-bold text-gray-700 text-xs uppercase tracking-wider">
                          <tr>
                              <th className="p-4">İşlem Tarihi</th>
                              <th className="p-4">İlgili Yıl (Senesi)</th>
                              <th className="p-4 text-center">Uygulanan Zam (%)</th>
                              <th className="p-4 text-right">Eski Tutar</th>
                              <th className="p-4 text-right">Yeni Tutar</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {selectedRoomDetail?.priceHistory && selectedRoomDetail.priceHistory.length > 0 ? (
                              selectedRoomDetail.priceHistory.map((ph, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                      <td className="p-4 font-medium text-gray-800">{ph.date}</td>
                                      <td className="p-4 font-bold text-indigo-600">{ph.anniversaryYear} Yılı Zammı</td>
                                      <td className="p-4 text-center">
                                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">% {ph.percentage}</span>
                                      </td>
                                      <td className="p-4 text-right text-gray-400 font-semibold line-through">{ph.oldFee} TL</td>
                                      <td className="p-4 text-right text-emerald-600 font-extrabold">{ph.newFee} TL</td>
                                  </tr>
                              ))
                          ) : (
                              <tr>
                                  <td colSpan="5" className="p-8 text-center text-gray-500 font-medium">Bu odanın güncel kiracısına ait herhangi bir zam işlemi kaydedilmemiş.</td>
                              </tr>
                          )}
                      </tbody>
                   </table>
               </div>
             </div>
             <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end shrink-0">
                 <button onClick={() => setIsPriceHistoryModalOpen(false)} className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">Kapat</button>
             </div>
          </div>
        </div>
      )}

      {/* GEÇMİŞ ZAMLARI DÜZENLE MODALI */}
      {isPastIncreaseModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2"><Edit size={20} /> Geçmiş Zamları Düzenle</h3>
                 <button onClick={() => setIsPastIncreaseModalOpen(false)} className="text-orange-400 hover:text-orange-600 bg-white p-1 rounded shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6 md:p-8">
               <p className="text-sm text-gray-500 mb-6 text-center">Bu menüden geçmiş bir tarihe zam uygulayabilirsiniz. Belirttiğiniz tarihten itibaren <strong>1 yıl boyunca (12 ay)</strong> kira bedeli yeni girdiğiniz tutar olarak ayarlanacaktır. Öncesi ve sonrası değişmez.</p>
               
               <div className="flex flex-col gap-5 mb-8">
                 <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Zammın Geçerli Olacağı Tarih</label>
                     <input type="date" value={pastIncreaseData.date} onChange={(e) => setPastIncreaseData({...pastIncreaseData, date: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-bold text-slate-700" />
                 </div>
<div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Uygulanacak Yeni Kira Bedeli (TL)</label>
                     <div className="relative">
                         <input type="number" placeholder="Örn: 2500" value={pastIncreaseData.amount} onChange={(e) => setPastIncreaseData({...pastIncreaseData, amount: e.target.value})} className="w-full border-2 border-orange-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-orange-500 bg-orange-50/50 text-orange-900" />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-orange-400">TL</span>
                     </div>
                     <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input type="checkbox" checked={pastIncreaseData.isKdvIncluded} onChange={(e) => setPastIncreaseData({...pastIncreaseData, isKdvIncluded: e.target.checked})} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"/>
                        <span className="text-sm font-bold text-gray-700">Yazdığım Tutar KDV DAHİL Tutardır</span>
                     </label>
                 </div>               </div>
               
               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                   <button onClick={() => setIsPastIncreaseModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold transition-colors">İptal</button>
                   <button onClick={handleSavePastIncrease} disabled={!pastIncreaseData.date || !pastIncreaseData.amount} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 transition-colors flex items-center gap-2"><Check strokeWidth={3} size={18}/> Geçmiş Zammı Uygula</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* BELİRLİ AYIN KİRASINI DÜZENLE MODALI */}
      {isEditSpecificMonthModalOpen && specificMonthEditData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2"><Edit size={20} /> Kira Düzenle</h3>
                 <button onClick={() => setIsEditSpecificMonthModalOpen(false)} className="text-orange-400 hover:text-orange-600 bg-white p-1 rounded shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6">
               <p className="text-sm text-gray-500 mb-6 text-center">Sadece bu ay için geçerli olacak yeni kira tutarını belirleyin. Bu tutar cari hesaba doğrudan işlenecektir.</p>
               
               <div className="flex flex-col gap-4 mb-6">
                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                     <span className="text-xs font-bold text-gray-500 block mb-1">İlgili Dönem</span>
                     <span className="text-sm font-bold text-gray-800">{specificMonthEditData.title}</span>
                 </div>
                 <div className="flex flex-col gap-2">
                     <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Yeni Kira Tutarını Girin (TL)</label>
                     <div className="relative">
                         <input type="number" value={specificMonthEditData.newAmount} onChange={(e) => setSpecificMonthEditData({...specificMonthEditData, newAmount: e.target.value})} className="w-full border-2 border-orange-200 rounded-xl px-4 py-3 text-xl font-black focus:outline-none focus:border-orange-500 bg-orange-50/30 text-orange-900" />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-orange-400">TL</span>
                     </div>
                 </div>
               </div>
               
               <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-gray-100 w-full gap-3">
                   <button onClick={handleGiftSpecificMonth} className="w-full sm:w-auto bg-purple-50 hover:bg-purple-100 text-purple-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-purple-200 shadow-sm">
                       <Gift size={16}/> Bu Ayı Hediye Ver
                   </button>
                   <div className="flex gap-3 w-full sm:w-auto justify-end">
                       <button onClick={() => setIsEditSpecificMonthModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">İptal</button>
                       <button onClick={handleSaveSpecificMonthEdit} disabled={!specificMonthEditData.newAmount} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 transition-colors flex items-center gap-2"><Check strokeWidth={3} size={16}/> Güncelle</button>
                   </div>
               </div>
             </div>
          </div>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-bold text-red-600 w-full text-center">Tüm Sistemi Sıfırla</h3><button onClick={() => setIsResetModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
             <div className="p-6 text-center">
                <div className="mx-auto bg-red-50 text-red-500 w-12 h-12 flex items-center justify-center rounded-full mb-4"><RefreshCcw size={24} /></div>
                <p className="text-gray-600 mb-6 text-sm">Tüm odalardaki müşteriler boşaltılacak ve depo ile bloklara ait doluluk sayaçları tamamen sıfırlanacaktır. Bu işlem geri alınamaz. Onaylıyor musunuz?</p>
                <div className="flex justify-center gap-3"><button onClick={() => setIsResetModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded font-medium transition-colors text-sm">İptal</button><button onClick={handleResetAll} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-medium transition-colors flex items-center gap-2 text-sm"><RefreshCcw size={16} /> Evet, Sıfırla</button></div>
             </div>
          </div>
        </div>
      )}

      {/* HEDİYE AY VER MODALI */}
      {isGiftModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2"><Gift size={18} /> Hediye Ay Ver</h3>
                 <button onClick={() => setIsGiftModalOpen(false)}><X size={20} className="text-purple-400 hover:text-purple-600"/></button>
             </div>
             <div className="p-6">
                <p className="text-sm text-gray-500 mb-5 text-center">Müşteriye deponun ilk kaç ayını ücretsiz (hediye) vermek istiyorsunuz? Bu aylar için cari hesaba borç yansıtılmaz.</p>
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider text-center">Hediye Edilecek Ay Sayısı</label>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <button onClick={() => setGiftMonthValue(prev => Math.max(1, prev - 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-xl transition-colors">-</button>
                        <input type="number" min="1" max="12" value={giftMonthValue} onChange={(e) => setGiftMonthValue(parseInt(e.target.value) || 1)} className="w-20 border-2 border-purple-200 rounded-xl px-2 py-2 text-2xl font-black focus:outline-none focus:border-purple-500 text-center text-purple-700 bg-purple-50/50" />
                        <button onClick={() => setGiftMonthValue(prev => prev + 1)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-xl transition-colors">+</button>
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setIsGiftModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">İptal</button>
                  <button onClick={() => handleSetGiftMonths(giftMonthValue)} disabled={giftMonthValue < 1} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-colors"><Check strokeWidth={3} size={18}/> Onayla</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ÜCRETSİZ ODA YAP MODALI */}
      {isFreeRoomModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-cyan-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-cyan-700 flex items-center gap-2"><Gift size={18} /> Ücretsiz Oda Yap</h3>
                 <button onClick={() => setIsFreeRoomModalOpen(false)}><X size={20} className="text-cyan-400 hover:text-cyan-600"/></button>
             </div>
             <div className="p-6">
                <p className="text-sm text-gray-500 mb-5 text-center">Bu odayı ücretsiz yaptığınızda müşterinin cari hesabına kira borcu yansıtılmaz. Lütfen bu işlemin nedenini aşağıya yazınız.</p>
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ücretsiz Yapma Nedeni (Zorunlu)</label>
                    <textarea rows="3" value={freeRoomReasonInput} onChange={(e) => setFreeRoomReasonInput(e.target.value)} placeholder="Örn: Şirket personeli, kampanya dahilinde vb." className="w-full border-2 border-cyan-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 resize-none font-medium text-gray-700 bg-cyan-50/30"></textarea>
                </div>
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setIsFreeRoomModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">İptal</button>
                  <button onClick={handleSetFreeRoom} disabled={!freeRoomReasonInput} className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition-colors"><Check strokeWidth={3} size={18}/> Onayla</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {isReserveRoomModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 lg:p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
             <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50 rounded-t-2xl"><h3 className="text-lg font-bold text-orange-500 flex items-center gap-2"><Calendar size={20} /> Odayı Rezerve Et</h3><button onClick={() => setIsReserveRoomModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-1 rounded-full shadow-sm"><X size={20} /></button></div>
             <div className="p-6">
               <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Müşteri Ad Soyad</label><input type="text" value={reserveData.name} onChange={(e) => setReserveData({...reserveData, name: e.target.value.toUpperCase()})} placeholder="Örn: AHMET YILMAZ" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telefon Numarası</label><input type="text" value={reserveData.phone} onChange={(e) => setReserveData({...reserveData, phone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Rezerve Süresi (Maks 10 Gün)</label><input type="number" min="1" max="10" value={reserveData.days} onChange={(e) => setReserveData({...reserveData, days: e.target.value > 10 ? 10 : e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-700" /><p className="text-[10px] text-gray-400 mt-1">Sistem, belirtilen gün dolduğunda odayı otomatik olarak tekrar boş konuma düşürür.</p></div>
               </div>
               <div className="mt-8 flex justify-end gap-3"><button onClick={() => setIsReserveRoomModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold transition-colors text-sm">İptal</button><button onClick={handleReserveRoom} disabled={!reserveData.name || !reserveData.phone || !reserveData.days} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-orange-500/30 flex items-center gap-2"><Check size={18} /> Rezerveyi Kaydet</button></div>
             </div>
          </div>
        </div>
      )}

      {isRoomHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-xl font-medium text-gray-600 mx-auto w-full text-center">{selectedRoomDetail?.name || 'Seçili Oda'} - Kiralama Geçmişi</h3><button onClick={() => setIsRoomHistoryModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
             <div className="p-6 md:p-8">
               <p className="text-sm text-gray-500 mb-6 text-center">Bu odada geçmişte konaklayan müşteriler, giriş-çıkış tarihleri, uygulanan aylık kira bedelleri ve depoya ait görsel arşivler aşağıda listelenmiştir.</p>
               <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[60vh] overflow-y-auto">
                 <table className="w-full text-left text-sm text-gray-600 min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 sticky top-0">
                      <tr><th className="p-3 border-r border-gray-200">Müşteri Adı Soyadı</th><th className="p-3 border-r border-gray-200 text-center">Giriş Tarihi</th><th className="p-3 border-r border-gray-200 text-center">Çıkış Tarihi</th><th className="p-3 border-r border-gray-200 text-center">Kaldığı Süre</th><th className="p-3 border-r border-gray-200 text-center">Aylık Kira</th><th className="p-3 border-r border-gray-200 text-center">Çıkış Görseli</th><th className="p-3 border-r border-gray-200 text-center">Arşiv Belgeleri</th><th className="p-3 text-center">Durum</th></tr>
                    </thead>
                    <tbody>
                      {(selectedRoomDetail?.history || []).length > 0 ? selectedRoomDetail.history.map((h, i) => (
                        <tr key={i} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-3 border-r border-gray-200 font-medium text-gray-800">{h.customerName}</td>
                          <td className="p-3 border-r border-gray-200 text-center">{h.entryDate}</td>
                          <td className="p-3 border-r border-gray-200 text-center">{h.exitDate}</td>
                          <td className="p-3 border-r border-gray-200 text-center font-medium">{h.duration}</td>
                          <td className="p-3 border-r border-gray-200 text-center text-red-500 font-bold">{h.monthlyFee} TL</td>
                          <td className="p-3 border-r border-gray-200 text-center">{h.photo ? <a href={h.photo} target="_blank" rel="noreferrer" className="text-cyan-600 hover:text-cyan-800 underline text-xs font-semibold">Görseli İncele</a> : <span className="text-gray-400 text-xs">Yok</span>}</td>
                          <td className="p-3 border-r border-gray-200 text-center text-xs">
                            <div className="flex flex-col gap-1 items-center">
                              {h.entryPhoto ? <a href={h.entryPhoto} target="_blank" rel="noreferrer" className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"><Check size={12}/> İlk Giriş Görseli</a> : <span className="text-gray-400">Giriş Görseli Yok</span>}
                              {h.entryExitHistory && h.entryExitHistory.length > 0 && <span className="text-indigo-600 font-medium">{h.entryExitHistory.length} Giriş-Çıkış Kaydı</span>}
                            </div>
                          </td>
                          <td className="p-3 text-center"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">{h.status}</span></td>
                        </tr>
                      )) : (<tr><td colSpan="8" className="p-8 text-center text-gray-400">Bu oda için henüz geçmiş bir kayıt bulunmamaktadır.</td></tr>)}
                    </tbody>
                 </table>
               </div>
               <div className="mt-8 flex justify-end"><button onClick={() => setIsRoomHistoryModalOpen(false)} className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors">Kapat</button></div>
             </div>
          </div>
        </div>
      )}

      {isEntryExitModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-xl font-bold text-indigo-600 mx-auto w-full text-center">Giriş-Çıkış İşlemi</h3><button onClick={() => setIsEntryExitModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-red-500"><X size={20} /></button></div>
             <div className="p-6">
                <p className="text-xs text-gray-500 mb-6 text-center">Müşteri depoya giriş-çıkış yaptığında yeni mühür numarasını ve güncel görselleri kaydedin. Bu işlem müşterinin cari hesabına otomatik olarak <strong>200 TL + %20 KDV</strong> tutarında mühür ücreti yansıtacaktır.</p>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Yeni Mühür Numarası (Zorunlu)</label>
                    <input type="text" value={entryExitData.newSealNo} onChange={(e) => setEntryExitData({...entryExitData, newSealNo: e.target.value.toUpperCase()})} placeholder="Örn: YM-54321" className="border-2 border-indigo-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-bold text-slate-700 uppercase" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Giriş-Çıkış Tutanağı</label>
                      <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer h-24">
                        {entryExitData.protocolPhoto ? (<div className="text-indigo-500 font-bold flex items-center gap-1"><Check size={16}/> Eklendi</div>) : (<><Upload size={16} className="text-gray-400 mb-1"/><span className="text-[10px] text-gray-500">Tutanak Yükle</span></>)}
<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setEntryExitData({...entryExitData, protocolPhoto: url}); } }}/>                      </label>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Depo Son Hali</label>
                      <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer h-24">
                        {entryExitData.finalPhoto ? (<div className="text-indigo-500 font-bold flex items-center gap-1"><Check size={16}/> Eklendi</div>) : (<><Upload size={16} className="text-gray-400 mb-1"/><span className="text-[10px] text-gray-500">Son Halini Yükle</span></>)}
<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setEntryExitData({...entryExitData, finalPhoto: url}); } }}/>                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                  <button onClick={() => setIsEntryExitModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-bold">İptal</button>
                  <button onClick={handleEntryExitSave} disabled={!entryExitData.newSealNo} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"><Check size={16}/> Kaydet & Ücreti Yansıt</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MÜŞTERİ SİL ONAY MODALI */}
      {isDeleteCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-red-600 mx-auto w-full text-center">Müşteriyi Kalıcı Olarak Sil</h3>
                 <button onClick={() => { setIsDeleteCustomerModalOpen(false); setCustomerToDeleteId(null); }} className="absolute right-5 text-gray-400 hover:text-red-500"><X size={20} /></button>
             </div>
             <div className="p-6 text-center">
                <div className="mx-auto bg-red-50 text-red-500 w-16 h-16 flex items-center justify-center rounded-full mb-4"><AlertCircle size={32} /></div>
                <p className="text-gray-700 font-bold mb-2">Bu müşteriyi silmek istediğinizden emin misiniz?</p>
                <p className="text-gray-500 text-sm mb-6">Müşteriye ait profil bilgileri, odalardaki aktif kayıtları ve cari geçmişi tamamen silinecektir. Bu işlem geri alınamaz!</p>
                <div className="flex justify-center gap-3">
                    <button onClick={() => { setIsDeleteCustomerModalOpen(false); setCustomerToDeleteId(null); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2.5 rounded-lg font-bold transition-colors text-sm w-1/2">Hayır, İptal Et</button>
                    <button onClick={() => {
                        handleDeleteCustomer(customerToDeleteId);
                    }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm w-1/2 shadow-lg shadow-red-500/30"><Trash2 size={16} /> Evet, Sil</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* FATURALAR MODALI */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-cyan-600 flex items-center gap-2"><FileTextIcon size={20} /> Müşteri Faturaları / Belgeleri</h3>
                 <button onClick={() => setIsInvoiceModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6 overflow-y-auto flex-1 bg-white">
                
                <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 mb-6">
                    <h4 className="text-xs font-bold text-cyan-800 uppercase mb-3">Yeni Fatura / Belge Ekle</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tarih</label>
                            <input type="date" value={newInvoice.date} onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Fatura Görseli/PDF (Zorunlu)</label>
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onloadend = () => setNewInvoice({...newInvoice, file: reader.result}); reader.readAsDataURL(file); } else { setNewInvoice({...newInvoice, file: null}); } }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                        </div>
                        <div className="sm:col-span-2 flex justify-end mt-1">
                            <button onClick={handleAddInvoice} disabled={!newInvoice.date || !newInvoice.file} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap">Ekle</button>
                        </div>
                    </div>
                </div>

                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Eklenen Faturalar / Belgeler</h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-xs">
                            <tr>
                                <th className="p-3">Tarih</th>
                                <th className="p-3 text-center">Dosya</th>
                                <th className="p-3 text-center">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const cust = customers.find(c => c.id === selectedCustomerId);
                                const invs = cust?.invoices || [];
                                if (invs.length === 0) return <tr><td colSpan="3" className="p-6 text-center text-gray-400">Henüz fatura veya belge eklenmemiş.</td></tr>;
                                return invs.map(inv => (
                                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-3 font-medium text-gray-800">{new Date(inv.date).toLocaleDateString('tr-TR')}</td>
                                        <td className="p-3 text-center">
                                            {inv.file ? <a href={inv.file} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline font-medium text-xs">İncele</a> : <span className="text-gray-400 text-xs">-</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleDeleteInvoice(inv.id)} className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>

             </div>
          </div>
        </div>
      )}

      {/* MÜŞTERİ DÜZENLE MODALI */}
      {isEditCustomerModalOpen && editCustomerData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 lg:p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50 rounded-t-2xl sticky top-0 z-10">
                 <h3 className="text-xl font-bold text-[#1bc5bd] flex items-center gap-2"><Edit size={22} /> Müşteri Bilgilerini Düzenle</h3>
                 <button onClick={() => setIsEditCustomerModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-1.5 rounded-full shadow-sm border border-gray-200"><X size={20} /></button>
             </div>
             <div className="p-6 md:p-8">
                <div className="flex gap-6 mb-8 pb-4 border-b border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer group"><input type="radio" name="editCustomerType" value="bireysel" checked={editCustomerData.type === 'bireysel'} onChange={() => setEditCustomerData({...editCustomerData, type: 'bireysel'})} className="w-5 h-5 text-red-500 border-gray-300 focus:ring-red-500"/><span className={`text-sm font-bold transition-colors ${editCustomerData.type === 'bireysel' ? 'text-slate-800' : 'text-gray-500'}`}>Bireysel Müşteri</span></label>
                  <label className="flex items-center gap-2 cursor-pointer group"><input type="radio" name="editCustomerType" value="kurumsal" checked={editCustomerData.type === 'kurumsal'} onChange={() => setEditCustomerData({...editCustomerData, type: 'kurumsal'})} className="w-5 h-5 text-red-500 border-gray-300 focus:ring-red-500"/><span className={`text-sm font-bold transition-colors ${editCustomerData.type === 'kurumsal' ? 'text-slate-800' : 'text-gray-500'}`}>Kurumsal Müşteri</span></label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[#1bc5bd] uppercase tracking-wider">Müşteri Numarası</label>
                    <input type="text" readOnly value={editCustomerData.customerNo} className="border-2 border-[#1bc5bd]/20 bg-teal-50/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-semibold text-teal-700 cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{editCustomerData.type === 'bireysel' ? 'Ad Soyad' : 'Firma Adı / Yetkili Kişi'}</label><input type="text" value={editCustomerData.name} onChange={(e) => setEditCustomerData({...editCustomerData, name: e.target.value})} placeholder={editCustomerData.type === 'bireysel' ? 'Ad Soyad' : 'Firma Adı'} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{editCustomerData.type === 'bireysel' ? 'TC Kimlik Numarası' : 'Vergi Numarası / Dairesi'}</label><input type="text" value={editCustomerData.tc} onChange={(e) => setEditCustomerData({...editCustomerData, tc: e.target.value})} placeholder={editCustomerData.type === 'bireysel' ? 'TC Kimlik No' : 'Vergi No'} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telefon Numarası</label><input type="text" value={editCustomerData.phone} onChange={(e) => setEditCustomerData({...editCustomerData, phone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Alternatif Telefon</label><input type="text" value={editCustomerData.altPhone} onChange={(e) => setEditCustomerData({...editCustomerData, altPhone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Müşteri Adresi</label><input type="text" value={editCustomerData.address} onChange={(e) => setEditCustomerData({...editCustomerData, address: e.target.value})} placeholder="Tam Adres" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" /></div>
                  <div className="flex flex-col gap-1.5 md:col-span-2 mt-2">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{editCustomerData.type === 'bireysel' ? 'Kimlik Fotoğrafı (Ön ve Arka Yüz)' : 'Kurumsal Belgeler'}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* ÖN YÜZ DÜZENLE */}
                          <div className="flex flex-col gap-2">
                              <label className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer bg-slate-50 group h-full relative">
                                {editCustomerData.documentPhotoFront || editCustomerData.documentPhoto ? (
                                   <div className="flex flex-col items-center">
                                      <Check size={32} className="text-[#1bc5bd] mb-2" />
                                      <span className="text-sm font-bold text-teal-600">Ön Yüz Eklendi</span>
                                      <img src={editCustomerData.documentPhotoFront || editCustomerData.documentPhoto} alt="Ön Yüz" className="mt-4 h-24 object-contain rounded border border-gray-200" />
                                   </div>
                                ) : (
                                   <>
                                     <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Upload size={20} className="text-gray-400 group-hover:text-[#1bc5bd]" /></div>
                                     <p className="text-sm text-gray-600 mb-1 font-medium"><span className="text-[#1bc5bd]">{editCustomerData.type === 'bireysel' ? 'Ön Yüz Seç' : 'Belge 1 Seç'}</span></p>
                                   </>
                                )}
                                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setEditCustomerData({...editCustomerData, documentPhotoFront: url, documentPhoto: url}); } }} />
                              </label>
                              {(editCustomerData.documentPhotoFront || editCustomerData.documentPhoto) && (
                                  <div className="flex justify-center mt-1">
                                      <button type="button" onClick={(e) => { e.preventDefault(); setEditCustomerData({...editCustomerData, documentPhotoFront: null, documentPhoto: null}); }} className="text-xs font-bold text-red-500 hover:text-red-700">Ön Yüzü Kaldır</button>
                                  </div>
                              )}
                          </div>

                          {/* ARKA YÜZ DÜZENLE */}
                          <div className="flex flex-col gap-2">
                              <label className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer bg-slate-50 group h-full relative">
                                {editCustomerData.documentPhotoBack ? (
                                   <div className="flex flex-col items-center">
                                      <Check size={32} className="text-[#1bc5bd] mb-2" />
                                      <span className="text-sm font-bold text-teal-600">Arka Yüz Eklendi</span>
                                      <img src={editCustomerData.documentPhotoBack} alt="Arka Yüz" className="mt-4 h-24 object-contain rounded border border-gray-200" />
                                   </div>
                                ) : (
                                   <>
                                     <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Upload size={20} className="text-gray-400 group-hover:text-[#1bc5bd]" /></div>
                                     <p className="text-sm text-gray-600 mb-1 font-medium"><span className="text-[#1bc5bd]">{editCustomerData.type === 'bireysel' ? 'Arka Yüz Seç' : 'Belge 2 Seç'}</span></p>
                                   </>
                                )}
                                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setEditCustomerData({...editCustomerData, documentPhotoBack: url}); } }} />
                              </label>
                              {editCustomerData.documentPhotoBack && (
                                  <div className="flex justify-center mt-1">
                                      <button type="button" onClick={(e) => { e.preventDefault(); setEditCustomerData({...editCustomerData, documentPhotoBack: null}); }} className="text-xs font-bold text-red-500 hover:text-red-700">Arka Yüzü Kaldır</button>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Özel Notlar</label><textarea value={editCustomerData.notes} onChange={(e) => setEditCustomerData({...editCustomerData, notes: e.target.value})} rows="3" className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1bc5bd] resize-none font-medium text-slate-700"></textarea></div>
                  
                  {/* DÜZENLEME EKRANI: VEKALET BİLGİLERİ */}
                  <div className="md:col-span-2 mt-4 border-t border-gray-100 pt-6">
                      <label className="flex items-center gap-3 cursor-pointer w-max group">
                          <div className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${editCustomerData.hasProxy ? 'bg-[#1bc5bd]' : 'bg-gray-300'}`} onClick={() => setEditCustomerData({...editCustomerData, hasProxy: !editCustomerData.hasProxy})}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${editCustomerData.hasProxy ? 'translate-x-6' : ''}`}></div>
                          </div>
                          <span className="font-bold text-gray-700 group-hover:text-[#1bc5bd] transition-colors">Vekalet Eden Bilgilerini Ekle / Düzenle</span>
                      </label>
                  </div>
                  
                  {editCustomerData.hasProxy && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 md:col-span-2 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mt-2 animate-in fade-in slide-in-from-top-4">
                          <h4 className="md:col-span-2 font-bold text-indigo-800 border-b border-indigo-100 pb-3 flex items-center gap-2"><Shield size={18}/> Vekalet Eden Kişinin Bilgileri</h4>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Ad Soyad</label><input type="text" value={editCustomerData.proxyName || ''} onChange={(e) => setEditCustomerData({...editCustomerData, proxyName: e.target.value})} placeholder="Vekil Ad Soyad" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">TC Kimlik Numarası</label><input type="text" value={editCustomerData.proxyTc || ''} onChange={(e) => setEditCustomerData({...editCustomerData, proxyTc: e.target.value})} placeholder="Vekil TC Kimlik No" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Telefon Numarası</label><input type="text" value={editCustomerData.proxyPhone || ''} onChange={(e) => setEditCustomerData({...editCustomerData, proxyPhone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Yedek Telefon (İsteğe Bağlı)</label><input type="text" value={editCustomerData.proxyAltPhone || ''} onChange={(e) => setEditCustomerData({...editCustomerData, proxyAltPhone: e.target.value})} placeholder="Örn: 0555 555 55 55" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Adres</label><input type="text" value={editCustomerData.proxyAddress || ''} onChange={(e) => setEditCustomerData({...editCustomerData, proxyAddress: e.target.value})} placeholder="Tam Adres" className="border-2 border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700 bg-white" /></div>
                          
                          <div className="flex flex-col gap-1.5 md:col-span-2 mt-2">
                              <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Vekil Kimlik Fotoğrafı / Belgesi Yükle</label>
                              <label className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-indigo-50 hover:border-indigo-400 transition-colors cursor-pointer bg-white group">
                                {editCustomerData.proxyDocumentPhoto ? (
                                   <div className="flex flex-col items-center">
                                      <Check size={32} className="text-indigo-500 mb-2" />
                                      <span className="text-sm font-bold text-indigo-600">Vekalet Belgesi Eklendi</span>
                                      <img src={editCustomerData.proxyDocumentPhoto} alt="Belge" className="mt-4 h-24 object-contain rounded border border-gray-200" />
                                   </div>
                                ) : (
                                   <>
                                     <div className="w-12 h-12 bg-indigo-50 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Upload size={20} className="text-indigo-500" /></div>
                                     <p className="text-sm text-gray-600 mb-1 font-medium"><span className="text-indigo-600">Dosya seçmek için tıklayın</span> veya sürükleyip bırakın</p>
                                     <p className="text-xs text-gray-400">PNG, JPG veya PDF formatında yükleyebilirsiniz</p>
                                   </>
                                )}
<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={async (e) => { const file = e.target.files[0]; if(file) { const url = await uploadImageToServer(file); setEditCustomerData({...editCustomerData, proxyDocumentPhoto: url}); } }} />                              </label>
                              {editCustomerData.proxyDocumentPhoto && (
                                  <div className="flex justify-center mt-2">
                                      <button type="button" onClick={(e) => { e.preventDefault(); setEditCustomerData({...editCustomerData, proxyDocumentPhoto: null}); }} className="text-xs font-bold text-red-500 hover:text-red-700">Mevcut Vekil Belgesini Kaldır</button>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                   <button onClick={() => setIsEditCustomerModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold transition-colors text-sm">İptal Et</button>
                   <button onClick={handleUpdateCustomer} disabled={!editCustomerData.name} className="bg-[#1bc5bd] hover:bg-teal-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/30"><Check strokeWidth={3} size={20} /> Değişiklikleri Kaydet</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MANUEL CARİ BORÇ EKLE MODALI */}
      {isAddDebtModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-red-50 rounded-t-xl">
                 <h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Plus size={18} /> Cari Ödeme (Borç) Ekle</h3>
                 <button onClick={() => setIsAddDebtModalOpen(false)}><X size={20} className="text-red-400 hover:text-red-600"/></button>
             </div>
             <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Ödeme Bilgisi / Ne Borcu Olduğu</label>
                    <input type="text" value={newDebtData.desc} onChange={(e) => setNewDebtData({...newDebtData, desc: e.target.value})} placeholder="Örn: Ekstra Nakliye Hizmeti" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Ödeme Tutarı (TL)</label>
                    <input type="number" value={newDebtData.amount} onChange={(e) => setNewDebtData({...newDebtData, amount: e.target.value})} placeholder="Örn: 1500" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 font-bold" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input type="checkbox" checked={newDebtData.hasKdv} onChange={(e) => setNewDebtData({...newDebtData, hasKdv: e.target.checked})} className="w-4 h-4 text-red-500 rounded focus:ring-red-500"/>
                    <span className="text-sm font-medium text-gray-700">+ %20 KDV Uygula</span>
                  </label>
                  {newDebtData.hasKdv && newDebtData.amount && (
                    <div className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded">
                      Müşterinin carisine yansıyacak toplam tutar: {(Number(newDebtData.amount) * 1.2).toFixed(0)} TL
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-xs font-bold text-gray-600">Ödeme Cari Tarihi</label>
                    <input type="date" value={newDebtData.date} onChange={(e) => setNewDebtData({...newDebtData, date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsAddDebtModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">İptal</button>
                  <button onClick={handleManualAddDebt} disabled={!newDebtData.desc || !newDebtData.amount} className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm">Cariye Ekle</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MANUEL CARİ ÖDEME YAP MODALI */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-green-50 rounded-t-xl">
                 <h3 className="text-lg font-bold text-green-700 flex items-center gap-2"><Wallet size={18} /> Cari Ödeme Yap (Tahsilat)</h3>
                 <button onClick={() => setIsAddPaymentModalOpen(false)}><X size={20} className="text-green-500 hover:text-green-700"/></button>
             </div>
             <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Ödenen Tutar (TL)</label>
                    <input type="number" value={newPaymentData.amount} onChange={(e) => setNewPaymentData({...newPaymentData, amount: e.target.value})} placeholder="Örn: 6600" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 font-bold" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Ödeme Tarihi (Bankaya Gelişi)</label>
                    <input type="date" value={newPaymentData.date} onChange={(e) => setNewPaymentData({...newPaymentData, date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">İşlem Açıklaması / Dekont Notu</label>
                    <textarea value={newPaymentData.note} onChange={(e) => setNewPaymentData({...newPaymentData, note: e.target.value})} rows="3" placeholder="Örn: Ekim 2026 Kirası" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"></textarea>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsAddPaymentModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">İptal</button>
                  <button onClick={handleManualAddPayment} disabled={!newPaymentData.amount} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm">Tahsilatı İşle</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MESAJ GÖNDERİM TERCİHİ MODALI */}
      {messageModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">Mesaj Gönderim Yolu</h3>
                 <button onClick={() => setMessageModalData(null)}><X size={20} className="text-gray-500 hover:text-red-500"/></button>
             </div>
             <div className="p-6">
                <p className="text-sm text-gray-600 mb-6 text-center">Oluşturulan otomatik mesajı müşteriye hangi kanaldan göndermek istersiniz?</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => handleSendMessage('whatsapp')} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-500/30">
                    <MessageCircle size={20} /> WhatsApp İle Gönder
                  </button>
                  <button onClick={() => handleSendMessage('sms')} className="bg-blue-500 hover:bg-blue-600 text-white w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/30">
                    <Phone size={20} /> SMS İle Gönder
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* CARİ LİSTE DÜZENLEME MODALI */}
      {isEditLedgerListModalOpen && selectedCustomerId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-orange-50 rounded-t-xl shrink-0">
                 <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2"><Settings size={18} /> Cari İşlemleri Düzenle</h3>
                 <button onClick={() => setIsEditLedgerListModalOpen(false)}><X size={20} className="text-orange-500 hover:text-orange-700"/></button>
             </div>
             <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                <p className="text-sm font-medium text-gray-500 mb-4 text-center">Aşağıdaki listeden cari hareketleri silebilir veya tutar/tarih/açıklama bilgisini düzenleyebilirsiniz.</p>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-600 font-bold sticky top-0">
                         <tr>
                            <th className="px-4 py-3">Tarih</th>
                            <th className="px-4 py-3">Açıklama</th>
                            <th className="px-4 py-3 text-right">Borç (Tahakkuk)</th>
                            <th className="px-4 py-3 text-right">+ KDV Tutarı</th>
                            <th className="px-4 py-3 text-right">Alacak</th>
                            <th className="px-4 py-3 text-center w-24">İşlem</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {(() => {
                              const customer = customers.find(c => c.id === selectedCustomerId);
                              if (!customer) return null;
                              
                              const { ledger } = getCustomerLedger(customer);
                              const editableLedger = ledger;

                              if (editableLedger.length === 0) {
                                  return <tr><td colSpan="6" className="p-8 text-center text-gray-500">Düzenlenecek kayıt bulunmuyor.</td></tr>;
                              }

                              return editableLedger.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">{tx.dateStr}</td>
                                    <td className="px-4 py-3">{tx.desc}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-red-500">{tx.debt > 0 ? `${(tx.baseDebt || 0).toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL` : '-'}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-orange-500">{tx.debt > 0 ? `${(tx.kdvDebt || 0).toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL` : '-'}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-600">{tx.credit > 0 ? `${tx.credit.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 0})} TL` : '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button onClick={() => {
                                                const d = new Date(tx.date);
                                                const editDateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
                                                setEditingLedgerItem({
                                                    id: tx.id,
                                                    editDate: editDateStr,
                                                    editDesc: tx.desc,
                                                    editAmount: tx.debt > 0 ? tx.debt : tx.credit,
                                                    isDebt: tx.debt > 0
                                                });
                                            }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded transition-colors" title="Düzenle"><Edit size={14}/></button>
                                            <button onClick={() => handleDeleteLedgerItem(tx.id)} className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded transition-colors" title="Kalıcı Sil"><Trash2 size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                              ));
                         })()}
                      </tbody>
                  </table>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* CARİ KALEM DÜZENLEME ALT MODALI */}
      {editingLedgerItem && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50 rounded-t-xl">
                 <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2"><Edit size={18} /> Kaydı Düzenle</h3>
                 <button onClick={() => setEditingLedgerItem(null)}><X size={20} className="text-blue-500 hover:text-blue-700"/></button>
             </div>
             <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">İşlem Tarihi</label>
                    <input type="date" value={editingLedgerItem.editDate} onChange={(e) => setEditingLedgerItem({...editingLedgerItem, editDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">İşlem Açıklaması</label>
                    <textarea rows="2" value={editingLedgerItem.editDesc} onChange={(e) => setEditingLedgerItem({...editingLedgerItem, editDesc: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"></textarea>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-600">Tutar (TL) - {editingLedgerItem.isDebt ? 'Borç (Tahakkuk)' : 'Alacak (Tahsilat)'}</label>
                    <input type="number" value={editingLedgerItem.editAmount} onChange={(e) => setEditingLedgerItem({...editingLedgerItem, editAmount: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-bold" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setEditingLedgerItem(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">İptal</button>
                  <button onClick={handleSaveLedgerEdit} disabled={!editingLedgerItem.editAmount || !editingLedgerItem.editDesc} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm">Kaydet</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TAHSİLAT NOTU EKLEME MODALI */}
      {isCollectionNoteModalOpen && collectionNoteData.customerId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-yellow-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-yellow-700 flex items-center gap-2"><Edit size={18} /> Tahsilat Notu / Ödeme Sözü Ekle</h3>
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
                      <Check strokeWidth={3} size={18} /> Notu Kaydet
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

{/* ASKIDAKİ ÖDEMEYİ CARİYE İŞLEME MODALI */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
              <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2"><span>Show</span><select className="border border-gray-300 rounded p-1 outline-none focus:border-cyan-400"><option>10</option><option>25</option><option>50</option></select><span>entries</span></div>
                <div className="flex items-center gap-2"><span>Search:</span><input type="text" value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} className="border border-gray-300 rounded p-1.5 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 w-48 lg:w-64" /></div>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg flex-1 bg-slate-50 w-full block">
                 {(() => {
                    const displayedCustomers = activeMenu === 'mevcut-musteriler' ? customers.filter(c => rooms.some(r => r.customerName === c.name)) : customers;
                    const term = normalizeStr(customerSearchTerm);
                    const finalFiltered = displayedCustomers.filter(c => normalizeStr(c.name).includes(term));
                    if (finalFiltered.length === 0) return (<div className="flex flex-col items-center justify-center text-center py-20 w-full min-h-[300px]"><div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Users size={32} /></div><h3 className="text-lg font-bold text-gray-600 mb-1">Müşteri Kaydı Bulunmuyor</h3><p className="text-sm text-gray-400 max-w-sm mx-auto">Bu listede gösterilecek müşteri bulunamadı. Soldaki menüden "Yeni Müşteri Ekle" diyerek ekleme yapabilirsiniz.</p></div>);

                    return (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 flex justify-between items-center">
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase">Tutar</div>
                                <div className="font-black text-orange-600">{payment.amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-gray-400 uppercase">Tarih</div>
                                <div className="font-bold text-gray-700">{new Date(payment.date).toLocaleDateString('tr-TR')}</div>
                            </div>
                        </div>
                    );
                })()}

                <div className="flex flex-col gap-1.5 mb-6">
                    <label className="text-xs font-bold text-gray-600 uppercase">Müşteri Seçin</label>
                    <input type="text" placeholder="Ad Soyad, Müşteri No veya Oda Ara..." value={pendingSearchTerm} onChange={(e) => setPendingSearchTerm(e.target.value)} className="w-full mb-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-700 bg-white" />
                    <select value={assignData.customerId} onChange={(e) => setAssignData({...assignData, customerId: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 font-medium text-slate-700">
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
                            return (
                                <option key={c.id} value={c.id}>{c.name} (No: {c.customerNo}){roomText}</option>
                            );
                        })}
                    </select>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setIsAssignModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">İptal</button>
                  <button onClick={handleAssignPendingPayment} disabled={!assignData.customerId} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 transition-colors flex items-center gap-2">
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
                             <FileTextIcon size={18} /> Otomatik E-Fatura Kes
                         </h3>
                         <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">MBT E-Dönüşüm Entegrasyonu</span>
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
                                    <span>Uyarı: Müşterinin TCKN/VKN bilgisi eksik görünüyor. MBT Portalı e-fatura kesimi için 11111111111 olarak varsayılan atayacaktır.</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setEInvoiceModalData(null)} disabled={isSendingEInvoice} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                                    İptal
                                </button>
                                <button onClick={handleSendEInvoice} disabled={isSendingEInvoice} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-colors flex items-center gap-2">
                                    {isSendingEInvoice ? (
                                        <><RefreshCcw size={16} className="animate-spin" /> MBT'ye Gönderiliyor...</>
                                    ) : (
                                        <><Check strokeWidth={3} size={18} /> Faturayı Resmileştir</>
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

      {/* PROFİL AYARLARI MODALI */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in flex flex-col">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 rounded-t-2xl">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserCog size={20} className="text-[#1bc5bd]"/> Profil Ayarları</h3>
                  <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm border border-gray-200"><X size={20} /></button>
              </div>
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                  {/* Sol Taraf: Avatar */}
                  <div className="flex flex-col items-center gap-4 w-full md:w-1/3">
                      <div className="relative group cursor-pointer">
                          <div className="w-32 h-32 rounded-full border-4 border-gray-100 shadow-md overflow-hidden bg-gray-50 flex items-center justify-center">
                              {currentUserProfile.avatar ? (
                                  <img src={currentUserProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                  <span className="text-4xl font-bold text-gray-300">
                                      {currentUserProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </span>
                              )}
                          </div>
                          <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <Upload size={24} className="mb-1" />
                              <span className="text-xs font-bold mt-1">Fotoğraf<br/>Değiştir</span>
<input type="file" accept="image/*" className="hidden" onChange={async (e) => {
    const file = e.target.files[0];
    if(file) {
        const url = await uploadImageToServer(file);
        setCurrentUserProfile({...currentUserProfile, avatar: url});
    }
}}/>
                          </label>
                      </div>
                      <div className="text-center">
                          <h4 className="font-bold text-gray-800 text-lg">{currentUserProfile.name}</h4>
                          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 inline-block border border-orange-200">{currentUserProfile.role}</span>
                      </div>
                  </div>
                  
                  {/* Sağ Taraf: Form */}
                  <div className="flex-1 flex flex-col gap-6">
                      <div className="flex flex-col gap-4">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Kişisel Bilgiler</h4>
                          <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-semibold text-gray-600">Ad Soyad</label>
                              <input type="text" value={currentUserProfile.name} onChange={(e) => setCurrentUserProfile({...currentUserProfile, name: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-semibold text-gray-600">E-Posta Adresi</label>
                                  <input type="email" value={currentUserProfile.email} onChange={(e) => setCurrentUserProfile({...currentUserProfile, email: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-semibold text-gray-600">Telefon Numarası</label>
                                  <input type="text" value={currentUserProfile.phone} onChange={(e) => setCurrentUserProfile({...currentUserProfile, phone: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1bc5bd] font-medium text-slate-700" />
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-col gap-4 mt-2">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Giriş ve Şifre Ayarları</h4>
                          <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-semibold text-gray-600">Mevcut Şifre</label>
                              <input type="password" placeholder="••••••••" value={currentUserProfile.oldPassword} onChange={(e) => setCurrentUserProfile({...currentUserProfile, oldPassword: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700 bg-gray-50 focus:bg-white transition-colors" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-semibold text-gray-600">Yeni Şifre</label>
                                  <input type="password" placeholder="Yeni şifreniz" value={currentUserProfile.newPassword} onChange={(e) => setCurrentUserProfile({...currentUserProfile, newPassword: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700 bg-gray-50 focus:bg-white transition-colors" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-semibold text-gray-600">Yeni Şifre (Tekrar)</label>
                                  <input type="password" placeholder="Şifrenizi doğrulayın" value={currentUserProfile.confirmPassword} onChange={(e) => setCurrentUserProfile({...currentUserProfile, confirmPassword: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 font-medium text-slate-700 bg-gray-50 focus:bg-white transition-colors" />
                              </div>
                          </div>
                          {currentUserProfile.newPassword && currentUserProfile.newPassword !== currentUserProfile.confirmPassword && (
                              <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded border border-red-100 mt-1">Girdiğiniz yeni şifreler birbiriyle eşleşmiyor. Lütfen kontrol ediniz.</p>
                          )}
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                          <button onClick={() => setIsProfileModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">İptal Et</button>
                          <button onClick={() => {
                              if(currentUserProfile.newPassword && currentUserProfile.newPassword !== currentUserProfile.confirmPassword) return;
                              
                              // Profilden yapılan değişikliği sistem kullanıcılarına senkronize et
                              setSystemUsers(prev => prev.map(u => u.id === currentUserProfile.id ? {...currentUserProfile, password: currentUserProfile.newPassword || u.password} : u));
                              setCurrentUserProfile({...currentUserProfile, oldPassword: '', newPassword: '', confirmPassword: ''});
                              setIsProfileModalOpen(false);
                          }} disabled={currentUserProfile.newPassword && currentUserProfile.newPassword !== currentUserProfile.confirmPassword} className="bg-[#1bc5bd] hover:bg-teal-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-sm shadow-teal-500/30 transition-colors flex items-center gap-2"><Check size={16} strokeWidth={3}/> Bilgileri Kaydet</button>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* YENİ KULLANICI EKLEME MODALI */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in flex flex-col">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2"><UserCog size={20} /> Yeni Panel Kullanıcısı Ekle</h3>
                 <button onClick={() => setIsAddUserModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ad Soyad (Zorunlu)</label>
                        <input type="text" value={newUserData.name} onChange={(e) => setNewUserData({...newUserData, name: e.target.value})} placeholder="Örn: Ali Yılmaz" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Kullanıcı Adı (Zorunlu)</label>
                        <input type="text" value={newUserData.username} onChange={(e) => setNewUserData({...newUserData, username: e.target.value})} placeholder="Sisteme giriş adı" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Şifre (Zorunlu)</label>
                        <input type="text" value={newUserData.password} onChange={(e) => setNewUserData({...newUserData, password: e.target.value})} placeholder="Giriş şifresi" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Sistem Yetkisi (Rol)</label>
                        <select value={newUserData.role} onChange={(e) => setNewUserData({...newUserData, role: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-bold text-slate-700 cursor-pointer bg-white">
                            {userRoles.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telefon Numarası</label>
                        <input type="text" value={newUserData.phone} onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})} placeholder="İsteğe Bağlı" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">E-Posta Adresi</label>
                        <input type="email" value={newUserData.email} onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} placeholder="İsteğe Bağlı" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-medium text-slate-700" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                    <button onClick={() => setIsAddUserModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">İptal</button>
                    <button onClick={handleAddSystemUser} disabled={!newUserData.username || !newUserData.password || !newUserData.name} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-indigo-500/30 transition-colors flex items-center gap-2"><Check size={16} strokeWidth={3}/> Kullanıcıyı Kaydet</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* KULLANICI DÜZENLEME MODALI */}
      {isEditUserModalOpen && editUserData && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in flex flex-col">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2"><UserCog size={20} /> Panel Kullanıcısını Düzenle</h3>
                 <button onClick={() => setIsEditUserModalOpen(false)} className="text-blue-400 hover:text-blue-600 bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
             </div>
             <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ad Soyad (Zorunlu)</label>
                        <input type="text" value={editUserData.name} onChange={(e) => setEditUserData({...editUserData, name: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Kullanıcı Adı (Zorunlu)</label>
                        <input type="text" value={editUserData.username} onChange={(e) => setEditUserData({...editUserData, username: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Şifre (Zorunlu)</label>
                        <input type="text" value={editUserData.password} onChange={(e) => setEditUserData({...editUserData, password: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Sistem Yetkisi (Rol)</label>
                        <select value={editUserData.role} onChange={(e) => setEditUserData({...editUserData, role: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-bold text-slate-700 cursor-pointer bg-white">
                            {userRoles.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telefon Numarası</label>
                        <input type="text" value={editUserData.phone} onChange={(e) => setEditUserData({...editUserData, phone: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-medium text-slate-700" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">E-Posta Adresi</label>
                        <input type="email" value={editUserData.email} onChange={(e) => setEditUserData({...editUserData, email: e.target.value})} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-medium text-slate-700" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                    <button onClick={() => setIsEditUserModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">İptal</button>
                    <button onClick={handleUpdateSystemUser} disabled={!editUserData.username || !editUserData.password || !editUserData.name} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-500/30 transition-colors flex items-center gap-2"><Check size={16} strokeWidth={3}/> Değişiklikleri Kaydet</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* DEPO SİL ONAY MODALI */}
      {isDeleteWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-red-600 mx-auto w-full text-center">Şubeyi Sil</h3>
                 <button onClick={() => setIsDeleteWarehouseModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-red-500"><X size={20} /></button>
             </div>
             <div className="p-6 text-center">
                <div className="mx-auto bg-red-50 text-red-500 w-16 h-16 flex items-center justify-center rounded-full mb-4"><AlertCircle size={32} /></div>
                <p className="text-gray-700 font-bold mb-2">Bu şubeyi silmek istediğinizden emin misiniz?</p>
                <p className="text-gray-500 text-sm mb-6">Bu işlem geri alınamaz ve içerisindeki yapılar kaybolabilir!</p>
                <div className="flex justify-center gap-3">
                    <button onClick={() => setIsDeleteWarehouseModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2.5 rounded-lg font-bold transition-colors text-sm w-1/2">Hayır</button>
                    <button onClick={confirmDeleteWarehouse} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm w-1/2 shadow-lg shadow-red-500/30"><Trash2 size={16} /> Evet, Sil</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* BLOK SİL ONAY MODALI */}
      {isDeleteBlockModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-red-600 mx-auto w-full text-center">Bloku Sil</h3>
                 <button onClick={() => setIsDeleteBlockModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-red-500"><X size={20} /></button>
             </div>
             <div className="p-6 text-center">
                <div className="mx-auto bg-red-50 text-red-500 w-16 h-16 flex items-center justify-center rounded-full mb-4"><AlertCircle size={32} /></div>
                <p className="text-gray-700 font-bold mb-2">Bu bloku silmek istediğinizden emin misiniz?</p>
                <p className="text-gray-500 text-sm mb-6">Bu işlem kalıcıdır ve içerisindeki odalarla bağ kopabilir!</p>
                <div className="flex justify-center gap-3">
                    <button onClick={() => setIsDeleteBlockModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2.5 rounded-lg font-bold transition-colors text-sm w-1/2">Hayır</button>
                    <button onClick={confirmDeleteBlock} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm w-1/2 shadow-lg shadow-red-500/30"><Trash2 size={16} /> Evet, Sil</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ODA SİL ONAY MODALI */}
      {isDeleteRoomModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-red-600 mx-auto w-full text-center">Odayı Sil</h3>
                 <button onClick={() => setIsDeleteRoomModalOpen(false)} className="absolute right-5 text-gray-400 hover:text-red-500"><X size={20} /></button>
             </div>
             <div className="p-6 text-center">
                <div className="mx-auto bg-red-50 text-red-500 w-16 h-16 flex items-center justify-center rounded-full mb-4"><AlertCircle size={32} /></div>
                <p className="text-gray-700 font-bold mb-2">Bu odayı silmek istediğinizden emin misiniz?</p>
                <p className="text-gray-500 text-sm mb-6">Bu işlem kalıcıdır ve geri alınamaz!</p>
                <div className="flex justify-center gap-3">
                    <button onClick={() => setIsDeleteRoomModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2.5 rounded-lg font-bold transition-colors text-sm w-1/2">Hayır</button>
                    <button onClick={confirmDeleteRoom} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm w-1/2 shadow-lg shadow-red-500/30"><Trash2 size={16} /> Evet, Sil</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TÜM CARİLERİ (DEPO ÖDEMELERİ) GÜNCELLEME MODALI */}
      {isUpdateAllModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in overflow-hidden flex flex-col">
             {isUpdatingAll ? (
                 <div className="p-10 flex flex-col items-center justify-center text-center h-[350px]">
                     <RefreshCcw size={56} className="text-indigo-500 animate-spin mb-6" />
                     <h3 className="text-xl font-bold text-gray-800 mb-2">Hesaplar Güncelleniyor...</h3>
                     <p className="text-sm text-gray-500 leading-relaxed font-medium">Tüm odaların giriş tarihleri ve bugünün tarihi karşılaştırılarak cari hesaplar yeniden hesaplanıyor.</p>
                 </div>
             ) : (
                 <>
                     <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 flex justify-center">
                         <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                             <Check size={40} className="text-indigo-600" strokeWidth={3} />
                         </div>
                     </div>
                     <div className="p-8 text-center">
                         <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Güncelleme Tamamlandı!</h3>
                         <p className="text-sm text-gray-500 mb-6 font-medium">Sistemdeki tüm müşterilerin cari hesapları bugünün tarihi olan <strong>{updateAllStats?.date}</strong> baz alınarak tarandı ve güncel kiralar hesaplara işlendi.</p>
                         
                         <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 mb-8 flex gap-4 shadow-inner">
                             <div className="flex-1">
                                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Borçlu Müşteri</div>
                                 <div className="text-2xl font-black text-slate-700">{updateAllStats?.affectedCustomers}</div>
                             </div>
                             <div className="w-px bg-gray-200"></div>
                             <div className="flex-1">
                                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Toplam Alacak</div>
                                 <div className="text-xl font-black text-red-500 mt-1">{updateAllStats?.totalUnpaid?.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</div>
                             </div>
                         </div>
                         
                         <button onClick={() => setIsUpdateAllModalOpen(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3.5 rounded-xl font-bold transition-colors">Pencereyi Kapat</button>
                     </div>
                 </>
             )}
          </div>
        </div>
)}

{/* RANDEVU DÜZENLEME MODALI */}
      {isEditApptModalOpen && editApptData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 lg:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-indigo-50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2"><Edit size={20} /> Randevuyu Düzenle</h3>
                    <button onClick={() => setIsEditApptModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 transition-colors bg-white p-1 rounded-full shadow-sm"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600">Müşteri Ad Soyad</label>
                            <input type="text" value={editApptData?.customerName || ''} onChange={(e) => setEditApptData({...editApptData, customerName: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600">Telefon Numarası</label>
                            <input type="text" value={editApptData?.customerPhone || ''} onChange={(e) => setEditApptData({...editApptData, customerPhone: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600">Randevu Tarihi</label>
                                <input type="date" value={editApptData?.date || ''} onChange={(e) => setEditApptData({...editApptData, date: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-600">Saat Aralığı</label>
                                <select value={editApptData?.time || ''} onChange={(e) => setEditApptData({...editApptData, time: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-white cursor-pointer">
                                   <option value="09:00 - 10:00">09:00 - 10:00</option>
                                   <option value="10:00 - 11:00">10:00 - 11:00</option>
                                   <option value="11:00 - 12:00">11:00 - 12:00</option>
                                   <option value="12:00 - 13:00">12:00 - 13:00</option>
                                   <option value="13:00 - 14:00">13:00 - 14:00</option>
                                   <option value="14:00 - 15:00">14:00 - 15:00</option>
                                   <option value="15:00 - 16:00">15:00 - 16:00</option>
                                   <option value="16:00 - 17:00">16:00 - 17:00</option>
                                   <option value="17:00 - 18:00">17:00 - 18:00</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600">Randevu Amacı</label>
                            <select value={editApptData?.purpose || ''} onChange={(e) => setEditApptData({...editApptData, purpose: e.target.value})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-white cursor-pointer">
                                <option value="giris-cikis">Depoya Giriş - Çıkış</option>
                                <option value="ziyaret">Yeni Müşteri Adayı Ziyaret</option>
                                <option value="esya-getirme">Yeni Müşteri Eşya Getiriyor</option>
                                <option value="tahliye">Depodan Tüm Eşyaları Kendisi Çıkartıcak</option>
                                <option value="temizlik">Depo Temizlik</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-600">Depo Şubesi Seçimi</label>
                            <select value={editApptData?.warehouseId || ''} onChange={(e) => setEditApptData({...editApptData, warehouseId: parseInt(e.target.value) || ''})} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-white cursor-pointer">
                                <option value="">Şube Seçiniz</option>
                                {(warehouses || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                        <button onClick={() => setIsEditApptModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold transition-colors text-sm">İptal</button>
                        <button onClick={handleSaveEditAppointment} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/30"><Check size={18}/> Değişiklikleri Kaydet</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}