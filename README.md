# Pizza Dashboard - Sunest Systems Delivery Monitoring

Aplikasi dashboard untuk monitoring delivery pizza dengan fitur upload data, analisis, dan manajemen user.

## Requirements / Prasyarat

### 1. Software yang Diperlukan

| Software | Versi Minimum | Keterangan |
|----------|---------------|-------------|
| **Node.js** | 18.x atau 20.x | Runtime JavaScript |
| **npm** | 9.x atau 10.x | Package manager |
| **SQL Server** | 2019 atau lebih baru | Database server |
| **Git** | 2.x | Version control |

### 2. Installasi Node.js

Download Node.js dari: https://nodejs.org/

Pilih LTS version (disarankan Node.js 20.x)

Verifikasi installasi:
```bash
node --version
npm --version
```

### 3. Installasi SQL Server (Windows)

1. Download SQL Server Express dari: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
2. Atau gunakan SQL Server yang sudah ada
3. Buat database baru dengan nama: `pizza_dashboard`

## Instalasi Project

### 1. Clone Repository

```bash
git clone <repository-url>
cd pizza-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env` di root folder dengan isi:

```env
# Database - Sesuaikan dengan konfigurasi SQL Server Anda
DATABASE_URL="sqlserver://localhost:1433;database=pizza_dashboard;user=sa;password=YOUR_PASSWORD;trustServerCertificate=true"

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-min-32-characters
```

**Catatan:**
- Ganti `YOUR_PASSWORD` dengan password SQL Server Anda
- Ganti `your-secret-key` dengan key acak (bisa pakai random string)
- Untuk production, gunakan `NEXTAUTH_URL` dengan domain sebenarnya

### 4. Setup Database

#### Generate Prisma Client:
```bash
npm run db:generate
```

#### Push Schema ke Database:
```bash
npm run db:push
```

#### (Opsional) Seed Data Awal:
```bash
npm run db:seed
```

### 5. Jalankan Aplikasi

```bash
npm run dev
```

Buka http://localhost:3001 di browser

## Akun Default (Setelah Seed)

| Role | Email | Password |
|------|-------|----------|
| GM | gm@sunest.com | gm123 |
| ADMIN_PUSAT | admin@sunest.com | admin123 |
| MANAGER | manager@sunest.com | manager123 |
| STAFF | staff@sunest.com | staff123 |

**Ganti password default setelah login pertama!**

## Fitur Utama

1. **Authentication** - Login/Register dengan role-based access
2. **Upload Data** - Upload file Excel/CSV untuk data delivery
3. **Dashboard** - Visualisasi data delivery dengan charts
4. **Manajemen User** - Tambah/edit user (GM & Admin)
5. **Manajemen Staff** - Kelola staff per restaurant
6. **Analitik** - Charts dan analytics delivery
7. **Riwayat** - History upload dan perubahan data

## Role & Akses

| Role | Akses |
|------|-------|
| GM | Semua fitur, manajemen user |
| ADMIN_PUSAT | Semua fitur, manajemen user |
| MANAGER | Upload, Dashboard, Staff |
| ASISTEN_MANAGER | Upload, Dashboard |
| STAFF | Upload data saja |

## Keamanan

1. **Password di-hash** menggunakan bcrypt
2. **Session** menggunakan JWT dengan expiry 30 menit
3. **Middleware** melindungi route yang memerlukan auth
4. **API routes** menggunakan authorization check
5. **Input validation** di semua form

## Tech Stack

- **Framework**: Next.js 16
- **Database**: SQL Server
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **UI**: React + Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
