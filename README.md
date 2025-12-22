# HMF Demo Panel

Next.js (app router, TypeScript) + Tailwind v4 tabanlı, MongoDB ile çalışan filo yönetimi demosu.

## Özellikler
- JWT çerezli basit auth (login / logout), middleware ile koruma
- Araç ekleme ve Excel (.xlsx/.xls) ile toplu içe aktarma
- Araç listesi ve detay sayfası, detaydan yakıt kaydı ekleme
- Yakıt kayıtlarını listeleme ve plaka ile arama
- Kilitli menülerde “tam sürümde aktif” uyarısı
- Dark / light tema toggle, responsive panel tasarımı

## Kurulum
1) Bağımlılıklar  
```bash
npm install
```

2) Ortam değişkenleri  
`env.example` dosyasını `.env.local` olarak kopyalayın ve düzenleyin:
```
MONGODB_URI=mongodb://localhost:27017/hmf2
MONGODB_DB=hmf2
JWT_SECRET=guclu-bir-gizli-anahtar
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234
ADMIN_NAME=Demo Admin
```

> İlk girişte kullanıcı yoksa bu bilgilerle admin hesabı otomatik oluşturulur.

3) Geliştirme sunucusu  
```bash
npm run dev
```
Uygulama: http://localhost:3000

## Kullanım Notları
- Login sonrası dashboard ve tüm API uçları middleware ile korunur.
- Yakıt kayıtları yalnızca “Yakıt Takibi” sekmesinde listelenir.
- Excel içe aktarma beklenen sütunlar: Plaka, Marka/Model, Kilometre, Sürücü.
- Kilitli menüler: Görev Oluştur, Kullanıcı Yönetimi, Raporlama (demo mesajı gösterir).

## Teknoloji
- Next.js 15 (app router) + TypeScript
- Tailwind CSS v4
- MongoDB & Mongoose
- JWT + HttpOnly cookie oturum yönetimi
