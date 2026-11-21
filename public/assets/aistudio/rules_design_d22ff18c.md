# rules_design.md

Aturan desain untuk setiap UI yang dibuat dengan bantuan AI. Tujuannya satu: hasil akhir terlihat **dirancang untuk subjek ini**, bukan dihasilkan dari template yang sama dengan jutaan halaman lain.

Aturan ini mencakup empat lapis, bukan cuma tampilan:

1. **Visual** (warna, tipografi, efek)
2. **Struktur** (apa yang ada di halaman, urutan, pengelompokan)
3. **Hierarki** (apa yang dibaca dulu, apa yang penting)
4. **Layout** (cara elemen disusun dan diberi ruang)

> Kalau brief dari pengguna menyebut arah visual tertentu, **ikuti brief**, termasuk kalau brief itu meminta salah satu gaya yang dilarang di bawah. Aturan ini hanya berlaku untuk hal yang dibiarkan bebas.

---

## 0. Prinsip dasar

- **Setiap pilihan harus punya alasan.** Kalau ditanya "kenapa begini?" dan jawabannya "karena biasanya begitu", itu default, bukan keputusan.
- **Uji pertukaran.** Ganti nama produk dengan produk lain. Kalau desainnya masih cocok tanpa diubah, desainnya generik. Ulangi sampai ada yang spesifik untuk subjek ini.
- **Satu momen berani.** Pilih satu elemen yang jadi ciri khas halaman. Sisanya tenang dan disiplin.
- **Kurangi sebelum menambah.** Sebelum selesai, hapus satu hiasan yang tidak melayani tujuan halaman.
- **Konten nyata dulu.** Desain dibangun dari isi sebenarnya, bukan dari kerangka kosong yang diisi belakangan.

---

## 1. Kenali subjek sebelum mendesain

Sebelum menulis kode, tulis tiga hal dalam satu kalimat masing-masing:

1. **Subjek:** produk/halaman ini apa, konkretnya.
2. **Audiens:** siapa yang memakai, dalam kondisi apa (buru-buru, fokus, santai, di HP).
3. **Tugas utama:** satu hal yang harus bisa dilakukan pengguna di halaman ini.

Kalau salah satunya tidak jelas, tanyakan dulu atau ajukan usulan lalu minta konfirmasi. Bahasa visual diambil dari dunia subjek itu sendiri (bahan, istilah, alat, kebiasaan di bidangnya), bukan dari galeri template.

---

## 2. Ciri khas "AI slop" yang dilarang sebagai default

### 2.1 Visual

- Latar krem hangat (sekitar `#F4F1EA`) + serif tinggi-kontras + aksen terakota/tanah liat (sekitar `#D97757`).
- Latar hampir hitam + **satu** aksen hijau neon atau merah-oranye.
- Gradien ungu-biru, gradien sebagai hiasan latar, blob blur, glow di belakang kartu.
- Glassmorphism atau "liquid glass" di semua panel padahal tidak ada hal di belakangnya yang perlu ditembus.
- Bayangan abu-abu lembut yang sama (`rgba(0,0,0,.1)`) di bawah semua kartu.
- Satu nilai `border-radius` yang sama di semua elemen, dari tombol sampai kontainer besar.
- Ikon emoji sebagai pengganti ikon/ilustrasi, atau ikon di dalam lingkaran berwarna di atas tiap judul fitur.
- Teks bergradien pada headline atau angka.
- Pill/chip di mana-mana: chip "✨ Baru" dengan titik berdenyut di atas hero, pill status di setiap baris, semua tombol berbentuk pil tanpa alasan.
- Border kiri tebal berwarna pada kartu atau callout sebagai penanda.
- Border putih tipis semi-transparan (sekitar `rgba(255,255,255,.08)`) pada permukaan mode gelap.
- Latar dekoratif tanpa makna: grid titik, noise, aurora, spotlight.
- Nilai warna, jarak, dan radius dipilih acak per elemen, bukan dari token.

### 2.2 Tipografi

- Satu kata di headline diberi warna/italic/bold berbeda sebagai "penekanan".
- Label kecil ALL CAPS ber-letter-spacing lebar (eyebrow) di atas setiap heading.
- Label tipografis tambahan di atas konten yang tidak perlu ("FITUR", "TENTANG KAMI", "WHY US").
- Font monospace untuk label data kecil hanya supaya terlihat "teknis".
- Memakai font yang sama untuk semua proyek tanpa pertimbangan, baik bawaan (Inter, Roboto, system-ui) maupun pengganti yang sedang populer di hasil AI (Space Grotesk, DM Sans, Instrument Serif, Fraunces). Yang dilarang adalah memilih tanpa alasan, bukan nama fontnya.
- Pola teks `Kata — fragmen`, string meta bertanda titik tengah (`A · B · C`), dan tanda `→` di setiap tombol/link.

### 2.3 Struktur & hierarki

- Urutan halaman otomatis: **Hero → 3 kartu fitur → statistik → testimoni → harga → CTA → footer**, apa pun subjeknya.
- Hero berisi: judul besar, satu kalimat penjelasan, dua tombol (utama + sekunder), lalu strip angka/statistik.
- Angka besar + label kecil + aksen gradien sebagai "bukti" tanpa data nyata di baliknya.
- Penomoran `01 / 02 / 03` pada konten yang **bukan** urutan.
- Semua section punya bobot visual yang sama, sehingga mata tidak tahu harus mulai dari mana.
- Konten dipotong jadi kartu-kartu identik padahal isinya berbeda sifat (ada yang utama, ada yang pendukung).
- Pengulangan: tiga hal selalu dalam tiga kolom, empat hal selalu dalam empat kolom, tanpa melihat isinya.
- Bento grid (kotak berukuran bervariasi) sebagai pengganti baru grid seragam, padahal ukuran kotak tidak mencerminkan bobot isinya.
- Kartu statistik dengan delta hijau ("+12,5% dari bulan lalu") dan sparkline di setiap kartu; chart bawaan dengan kurva halus dan isian gradien.
- Harga tiga tingkat dengan badge "Paling populer" di tengah, tanpa alasan di balik pembagian tingkatnya.

### 2.4 Layout

- Semua dipusatkan (center-aligned) dalam kontainer sempit, section demi section, dengan jarak vertikal yang sama.
- Grid kartu 3 kolom yang seragam dari atas sampai bawah.
- Pola kiri-teks/kanan-gambar yang bergantian (zig-zag) sebagai pengisi.
- Dashboard dengan sidebar kiri + deretan kartu statistik di atas + tabel di bawah, tanpa mempertimbangkan apa yang sebenarnya paling sering dilakukan pengguna.
- Spasi seragam di mana-mana, sehingga tidak ada pengelompokan yang terbaca.
- **Semua dibungkus kartu.** Form, tabel, daftar, grup input, atau satu bagian halaman otomatis dimasukkan ke kotak ber-border + radius + padding hanya untuk memberi kesan "rapi" atau "terstruktur".
- **Kartu di dalam kartu** (panel dalam panel, kotak dalam kotak), termasuk kontainer halaman yang berbingkai lalu isinya berbingkai lagi.
- Kartu dipakai sebagai satu-satunya cara mengelompokkan, padahal jarak, garis pemisah, atau judul bagian sudah cukup.
- **Ukuran desktop dipakai apa adanya di HP**: judul, padding, tombol, ikon, dan radius tidak mengecil, sehingga satu layar HP hanya memuat judul dan satu blok kosong.

### 2.5 Gerak

- Setiap section fade-in + slide-up saat di-scroll.
- Hover `translateY(-4px)` + bayangan membesar di setiap kartu.
- Animasi yang berjalan terus tanpa dipicu apa pun dan tidak menunjukkan apa pun.
- Angka yang menghitung naik saat muncul, efek mengetik, marquee logo, spotlight yang mengikuti kursor, parallax tanpa fungsi.

### 2.6 Bahasa di dalam UI

- Slogan marketing generik: "Revolusi cara Anda…", "Solusi all-in-one", "Powered by AI", "Mulai perjalanan Anda".
- Placeholder yang jelas palsu: "Lorem ipsum", "John Doe", "Acme Inc", angka bulat sempurna (1.000, 50%, 99.9%).
- Tombol "Submit", "Klik di sini", "Learn more" tanpa menyebut apa yang terjadi.
- Pesan error yang meminta maaf atau samar. Empty state yang hanya berisi ilustrasi dan kalimat manis.
- Rumus judul: "Bukan sekadar X, tapi Y", "X untuk Y", tiga serangkai "Cepat. Mudah. Aman."
- Kata kerja kosong sebagai pembuka klaim: "Tingkatkan", "Optimalkan", "Rasakan", "Buka potensi".

### 2.7 Elemen dan bukti palsu

- Strip logo perusahaan, tumpukan avatar "Dipakai 2.000+ orang", bintang lima, dan testimoni bernama klise ("Sarah Chen, CEO") tanpa sumber nyata.
- Mockup palsu: jendela browser atau terminal dengan tiga titik merah-kuning-hijau, dashboard karangan sebagai gambar hero.
- Kontrol yang tidak berfungsi: kolom cari ⌘K, lonceng notifikasi dengan badge, menu yang tidak menuju ke mana-mana.
- Footer empat kolom berisi tautan ke halaman yang tidak ada, "Dibuat dengan ❤️".

### 2.8 Komponen dan pola UI default

- Navbar sticky dengan blur atau pill melayang di app yang tidak butuh navigasi tetap.
- Modal untuk segala hal, termasuk yang cukup dilakukan di tempat (inline). Toast untuk setiap aksi, termasuk yang hasilnya sudah terlihat di layar.
- Tab bawaan "Overview / Analytics / Settings" yang disalin dari template dashboard, bukan dari tugas pengguna.
- Skeleton shimmer di semua tempat, padahal bentuknya tidak mirip konten aslinya atau datanya muncul instan.
- Spinner bulat di tengah layar sebagai satu-satunya umpan balik, tanpa tahu apa yang sedang dimuat.
- Sapaan "Selamat datang kembali, Budi 👋" sebagai pengisi di atas dashboard.
- Hanya merancang tampilan normal; state loading, kosong, error, dan disabled dibiarkan bawaan atau tidak ada (lihat bagian 9).

---

## 3. Struktur: susun dari isi, bukan dari template

1. **Mulai dari inventaris konten.** Daftar semua hal yang harus ada, lalu kelompokkan menurut sifatnya (utama, pendukung, referensi, aksi).
2. **Tentukan urutan dari tugas pengguna**, bukan dari urutan landing page standar. Halaman boleh tidak punya hero, tidak punya testimoni, tidak punya CTA berulang.
3. **Setiap section harus menjawab satu pertanyaan pengguna.** Kalau tidak ada pertanyaan yang dijawab, hapus section-nya.
4. **Bentuk mengikuti isi.** Perbandingan jadi tabel. Urutan langkah jadi daftar bernomor. Hubungan jadi diagram. Cerita jadi paragraf. Jangan memaksa semuanya jadi kartu.
5. **Perangkat struktural membawa informasi.** Garis, border, nomor, label, dan pemisah dipakai karena mengodekan sesuatu (urutan, kategori, status), bukan karena hiasan. Nomor hanya untuk urutan sungguhan.
6. **Pangkas navigasi.** Hanya tampilkan yang benar-benar dipakai. Jangan menambah menu demi terlihat lengkap.
7. **Kartu/kotak berbingkai bukan wadah default.** Kelompokkan dulu dengan urutan: (a) jarak dan ritme ruang, (b) garis pemisah yang mengodekan sesuatu, (c) judul bagian. Pakai kartu hanya kalau item itu **objek yang berdiri sendiri**: bisa dipilih, dipindah, dibuka, atau dibandingkan satu per satu (contoh: kartu tarot, produk di katalog, item yang bisa di-drag).
8. **Dilarang kartu bersarang.** Tidak boleh ada kartu di dalam kartu. Kalau sebuah kartu butuh sub-pengelompokan, pakai jarak, garis, atau judul kecil di dalamnya.
9. **Tabel, form, dan daftar tampil langsung di permukaan halaman**, tanpa bingkai tambahan. Struktur tabel (header, garis baris, perataan angka) sudah cukup sebagai batas visualnya.
10. **Uji hapus bingkai.** Untuk setiap kotak berbingkai, bayangkan border, latar, dan bayangannya dihapus. Kalau isinya tetap terbaca dan terkelompok dengan benar, bingkainya hiasan: hapus.

---

## 4. Hierarki: tentukan apa yang dibaca pertama, kedua, ketiga

- Setiap layar punya **satu** titik masuk yang jelas. Tentukan dulu, baru desain.
- Buat **minimal tiga tingkat** bobot yang terlihat jelas bedanya: utama, pendukung, tersier. Kalau semuanya sama besar/tebal/kontras, tidak ada hierarki.
- Bobot dibangun dengan kombinasi: ukuran, berat, kontras, posisi, dan ruang kosong. Jangan hanya mengandalkan ukuran.
- **Satu aksi utama per layar.** Aksi lain tampil lebih tenang. Dua tombol berwarna solid yang bersaing berarti tidak ada keputusan.
- Elemen yang lebih penting boleh punya bentuk, radius, dan perlakuan berbeda dari elemen pendukung. Keseragaman total adalah tanda tidak ada prioritas.
- Gunakan skala tipografi yang konsisten dan terbatas (misal 5-6 ukuran), dengan perbedaan antar-tingkat yang nyata.
- Tes mata menyipit: kecilkan layar atau blur. Struktur dan titik fokus harus tetap terbaca.

---

## 5. Layout: ritme, bukan keseragaman

- **Variasikan kepadatan.** Area penting diberi ruang lega, area referensi boleh rapat. Jarak yang sama di semua tempat membuat halaman datar.
- **Pilih satu logika perataan dan konsisten.** Rata kiri adalah default yang baik untuk teks panjang. Pusatkan hanya untuk momen tertentu yang memang simetris (misal pernyataan pendek).
- **Grid yang melayani isi.** Lebar kolom ditentukan dari isi (tabel butuh lebar, paragraf butuh sempit), bukan dari kebiasaan 12 kolom dibagi rata.
- **Batas lebar teks di bawah 80 karakter per baris.** Serif boleh sedikit lebih panjang dan diberi line-height sedikit lebih besar daripada sans-serif.
- **Asimetri yang disengaja** lebih berkarakter daripada simetri yang otomatis, selama jalur baca tetap jelas.
- **Jangan memaksa full-width.** Tidak semua section perlu membentang selebar layar atau punya pita warna latar sendiri.
- **Mobile bukan versi susut.** Susun ulang prioritas untuk layar kecil, bukan sekadar menumpuk kolom ke bawah. Aturan ketatnya ada di subbagian berikut.

### Responsif antar device (aturan ketat)

Masalah paling umum: tampilan pas di laptop, tapi di HP semuanya terlihat besar karena ukuran desktop dipakai apa adanya. Aturan di bawah bersifat wajib, bukan saran.

1. **Tulis dari HP dulu.** Gaya dasar dibuat untuk layar kecil, lalu ditambah penyesuaian untuk layar yang lebih besar (`min-width`). Breakpoint ditentukan dari titik layout mulai patah, bukan angka bawaan.
2. **Ukuran fluid dengan batas.** Judul, jarak, dan padding memakai `clamp(min, fluid, max)` atau token yang nilainya berubah per breakpoint. Dilarang: ukuran px tetap berskala desktop tanpa versi HP, `vw` murni tanpa batas bawah dan atas, serta `zoom` atau `transform: scale` untuk menyusutkan layout.
3. **Batas atas di HP** (lebar 480px ke bawah). Nilai ini adalah batas maksimum (kecuali tertulis minimum), bukan target:

   | Elemen | Batas atas di HP | Kisaran umum di desktop |
   |---|---|---|
   | Judul halaman (H1) | 24 sampai 32px, maksimal 2 baris | 40 sampai 64px |
   | Judul bagian (H2) | 20 sampai 24px | 28 sampai 36px |
   | Teks isi | 15 sampai 16px | 16 sampai 18px |
   | Teks sekunder/label | tidak di bawah 12px | 12 sampai 14px |
   | Padding horizontal halaman | 12 sampai 16px | 24 sampai 64px |
   | Jarak antar section | 24 sampai 40px | 64 sampai 120px |
   | Tinggi tombol dan input | maksimal 48px, minimal 44px (target sentuh) | 36 sampai 44px |
   | Ikon | 16 sampai 24px | 16 sampai 32px |

   Radius dan bayangan di HP tidak boleh lebih besar daripada di desktop. Judul besar sebagai elemen desain (bagian 6) tetap tunduk pada batas ini.
4. **Kepadatan layar pertama.** Di HP, header, hero, banner, dan ruang kosong tidak boleh memakai lebih dari sekitar sepertiga tinggi layar pertama. Konten atau aksi utama harus sudah terlihat tanpa scroll. App kerja (tabel, form, ledger) tetap padat di HP; kepadatan adalah fitur, bukan masalah yang harus "dilegakan".
5. **Tinggi layar.** Jangan memakai `100vh` untuk kontainer atau hero; pakai `svh`/`dvh` agar tidak terpotong bar browser HP. Tidak ada hero setinggi layar di HP kecuali tugas halaman itu memang hanya satu aksi.
6. **Tabel dan data padat di HP.** Jangan otomatis memecah tiap baris jadi kartu. Pilihannya: scroll horizontal di dalam kontainernya dengan kolom kunci tetap terlihat (sticky), baris dua tingkat (kolom utama di atas, pendukung di bawah), atau ringkasan yang bisa dibuka. Pilih sesuai tugas pengguna.
7. **Sentuh, bukan kursor.** Target sentuh minimal 44x44px dengan jarak minimal 8px antar target. Tidak ada fungsi yang hanya muncul saat hover. Ukuran font input minimal 16px agar iOS tidak memperbesar layar sendiri. Elemen yang menempel di tepi layar menghormati `env(safe-area-inset-*)`.
8. **Tidak ada scroll horizontal pada halaman** di lebar 320px. Pengecualiannya hanya kontainer data yang sengaja di-scroll dan terlihat bisa di-scroll.
9. **Uji wajib** di lebar 320, 360 atau 390, 768, 1024, dan 1440px, ditambah landscape HP untuk app yang dipakai di HP. Bandingkan tangkapan layar HP dan desktop: kalau satu layar HP hanya berisi judul, padding, dan satu blok, ukuran belum diturunkan.

---

## 6. Visual: keputusan yang bisa dipertahankan

### Warna
- Tentukan palet inti **4-6 warna bernama** dengan nilai hex dan peran masing-masing (latar, permukaan, teks, aksen, status).
- Turunkan palet dari subjek (bahan, lingkungan, budaya, mood), bukan dari daftar "warna yang aman".
- Aksen dipakai hemat dan konsisten untuk satu makna. Jika semua hal diberi aksen, tidak ada yang beraksen.
- Pastikan kontras teks memenuhi standar keterbacaan, termasuk di mode gelap.

### Tipografi
- Pakai satu atau dua keluarga huruf. Kalau dua, buat jelas berbeda perannya.
- Pilih huruf berdasarkan karakter subjek, bukan karena paling sering muncul. Sertakan fallback stack yang nyata.
- Tetapkan skala tipe, berat, lebar, dan jarak huruf secara sengaja. Judul besar boleh jadi elemen desain itu sendiri.
- Penekanan di dalam kalimat memakai cara yang paling halus yang cukup (berat atau posisi), bukan mengecat satu kata.

### Bentuk, bayangan, dan permukaan
- Radius dan bayangan mengikuti **hierarki**: elemen berbeda tingkat boleh berbeda perlakuan.
- Kalau memakai border, garis, atau pemisah, jelaskan apa yang dikodekannya.
- Hindari gradien dan blur kecuali itu memang bahasa visual subjeknya.

### Gambar dan ilustrasi
- Lebih baik **tidak ada gambar** daripada gambar stok generik atau ilustrasi blob abstrak.
- Kalau perlu visual, buat dari konten nyata: data, diagram, tangkapan produk, foto spesifik, tipografi.

---

## 7. Gerak

- Gerak otomatis (tanpa dipicu pengguna) dipakai **satu kali dan sengaja**, misalnya satu urutan saat halaman dimuat.
- Gerak yang menjawab aksi pengguna (membuka, memperluas, mengonfirmasi) boleh dan dianjurkan, selama menunjukkan apa yang berubah.
- Hormati `prefers-reduced-motion`.

---

## 8. Bahasa di dalam UI

- Tulis dari sudut pandang pengguna. Beri nama sesuai yang dipahami pengguna, bukan sesuai cara sistem dibangun.
- Kata kerja aktif, huruf kecil kalimat (sentence case), tanpa basa-basi. Tombol menyebut hasilnya: "Simpan perubahan", bukan "Submit".
- Satu aksi, satu nama, konsisten di seluruh alur: tombol "Terbitkan" menghasilkan notifikasi "Diterbitkan".
- Pesan error menjelaskan apa yang salah dan cara memperbaikinya, tanpa meminta maaf. Empty state mengajak bertindak.
- Gunakan data dan contoh yang realistis dan spesifik. Hindari angka bulat sempurna dan nama placeholder klise.
- Setiap teks punya satu tugas. Kalau teks tidak membantu orang memahami atau memakai, hapus.

### Angka, uang, dan tanggal

- Ikuti lokal pengguna. Untuk Indonesia: `Rp 1.234.567,50` (titik ribuan, koma desimal), simbol mata uang selalu di posisi yang sama, dan jumlah desimal tetap per kolom.
- Tanggal dalam bentuk yang dibaca manusia ("13 Nov 2026"), dengan nama bulan lokal. Format ISO (`2026-11-13`) hanya untuk data teknis. Cantumkan zona waktu kalau relevan.
- Angka di tabel dan kolom: rata kanan, `font-variant-numeric: tabular-nums` supaya digit sejajar, satu cara menulis angka negatif di seluruh app (tanda minus atau kurung, pilih satu), dan satuan di header kolom, bukan diulang di tiap sel.
- Desimal mengikuti konvensi bidangnya (misalnya p-value, koefisien, persentase) dan konsisten per kolom, bukan dibulatkan sesukanya.

---

## 9. Kualitas minimum (dikerjakan tanpa diumumkan)

- Responsif sampai lebar HP, mengikuti aturan ketat di bagian 5.
- Fokus keyboard terlihat jelas.
- Kontras dan ukuran target sentuh memadai.
- Gerak menghormati preferensi pengguna.
- Token desain (warna, jarak, ukuran, radius) didefinisikan sekali dan dipakai ulang, bukan ditulis berulang.
- **Semua state dirancang**, bukan hanya tampilan normal: loading, kosong, error, disabled, dan sukses. Tiap state punya bentuk dan teks yang spesifik untuk konteksnya.
- **Uji dengan data kasus terburuk**, bukan data ideal: nama atau judul sangat panjang (termasuk tanpa spasi), nol data, satu item, ribuan baris, nilai kosong, angka sangat besar atau negatif, dan teks yang dua kali lebih panjang. Layout tidak pecah, teks dipotong dengan sengaja (isi lengkap tetap bisa diakses), dan tabel besar bisa di-scroll atau dipaginasi.

---

## 10. Proses kerja: rencanakan, tinjau, bangun, kritik

1. **Rencana singkat sebelum kode.**
   - Warna: 4-6 nilai hex bernama.
   - Tipografi: huruf dan perannya.
   - Layout: konsep dalam satu kalimat + sketsa ASCII (bandingkan 2 opsi), termasuk keputusan perataan. Sketsa HP dan desktop dibuat terpisah.
   - Prinsip: apa yang membuat halaman ini khas.
2. **Tinjau rencana terhadap brief.** Bayangkan prompt serupa untuk produk lain. Kalau rencananya akan sama, bagian itu masih generik: revisi, lalu catat apa yang diubah dan alasannya.
3. **Bangun** sesuai rencana yang sudah direvisi.
4. **Kritik hasilnya** memakai daftar periksa di bawah. Ambil tangkapan layar di lebar HP (360 atau 390) dan desktop kalau memungkinkan, dan perbaiki langsung, jangan hanya dicatat.

---

## 11. Daftar periksa akhir

**Keunikan**
- [ ] Uji pertukaran lolos: desain ini tidak cocok untuk produk lain tanpa diubah.
- [ ] Ada satu elemen yang jadi ciri khas, sisanya tenang.
- [ ] Tidak ada gaya default dari bagian 2 yang dipakai tanpa alasan tertulis.

**Struktur**
- [ ] Urutan section berasal dari tugas pengguna, bukan template landing page.
- [ ] Setiap section menjawab satu pertanyaan; yang tidak, dihapus.
- [ ] Bentuk (tabel/daftar/diagram/paragraf) sesuai sifat isinya.
- [ ] Penomoran hanya untuk urutan sungguhan.

**Hierarki**
- [ ] Ada satu titik masuk dan satu aksi utama per layar.
- [ ] Minimal tiga tingkat bobot yang jelas bedanya.
- [ ] Tes mata menyipit: fokus dan struktur masih terbaca.

**Layout**
- [ ] Kepadatan dan jarak bervariasi sesuai prioritas.
- [ ] Lebar teks di bawah 80 karakter; perataan konsisten.
- [ ] Tidak ada grid kartu seragam, bento tanpa alasan, atau zig-zag pengisi.
- [ ] Setiap kotak berbingkai punya alasan (objek mandiri) dan lolos uji hapus bingkai; tidak ada kartu bersarang.
- [ ] Tabel, form, dan daftar tampil langsung di permukaan halaman, tanpa pembungkus kartu.
- [ ] Tampilan HP disusun ulang, bukan sekadar menumpuk.
- [ ] Ukuran di HP tidak melewati batas atas di bagian 5 (judul, padding, jarak, tombol, ikon).
- [ ] Layar pertama HP memuat konten atau aksi utama; header dan hero tidak lebih dari sekitar sepertiga layar.
- [ ] Tidak ada `100vh` untuk hero atau kontainer; tidak ada scroll horizontal di 320px.
- [ ] Diuji di 320, 360/390, 768, 1024, dan 1440px.

**State & data**
- [ ] Loading, kosong, error, dan disabled dirancang spesifik, bukan bawaan.
- [ ] Sudah diuji dengan data kasus terburuk (teks sangat panjang, nol data, satu item, ribuan baris, nilai kosong).
- [ ] Tidak ada modal, toast, tab, skeleton, atau sapaan bawaan tanpa alasan.

**Visual & teks**
- [ ] Palet bernama dan beralasan; aksen punya satu makna.
- [ ] Huruf dipilih sengaja dan punya fallback.
- [ ] Gerak otomatis maksimal satu momen; reduced-motion dihormati.
- [ ] Copy spesifik, aktif, konsisten; tidak ada slogan atau placeholder klise.
- [ ] Tidak ada elemen palsu (logo, testimoni, mockup, kontrol yang tidak berfungsi).
- [ ] Angka, uang, dan tanggal mengikuti lokal pengguna; angka di tabel rata kanan dan sejajar.
- [ ] Token desain (warna, jarak, ukuran, radius) terpusat; tidak ada nilai ajaib berulang.

---

## 12. Prioritas saat aturan bertabrakan

1. Brief pengguna dan konten nyata.
2. Keterbacaan dan aksesibilitas.
3. Hierarki dan tugas utama pengguna.
4. Keunikan visual.
5. Aturan di dokumen ini.

Aturan ini adalah penyaring terhadap pilihan default, bukan resep. Jika sebuah gaya yang dilarang ternyata pilihan terbaik untuk subjek tertentu, boleh dipakai, **asal alasannya bisa dituliskan dalam satu kalimat**.

---

## 13. Identitas Orias (berlaku untuk semua app di ekosistem)

Satu bahasa visual yang sama di semua app. **Pembeda antar app hanya tata letak dan struktur**, mengikuti kebutuhan jenis proyeknya. Warna aksen tidak berubah per app.

### 13.1 Palet: Perak–Emas

| Token | Nilai | Peran |
|---|---|---|
| `--tinta` | `#0D0D0D` | Gelap: teks di mode terang, latar di mode gelap |
| `--perak` | `#EEF1F4` | Terang: latar di mode terang, teks di mode gelap |
| `--es` | `#A9C6DC` | Facet tengah, garis, hiasan |
| `--emas` | `#D4A72C` | **Satu-satunya aksen.** Aksi utama dan momen penting |

Hanya empat warna inti. Jangan menambah aksen kedua. Warna semantik status dipisah (13.3).

**Alasan pilihan (syarat bagian 2.1 dan 12).** Palet ini diturunkan dari manuskrip beriluminasi: tinta di atas kertas perak, dengan emas hanya di tempat yang ingin ditandai pembaca. `--tinta` adalah hitam tinta yang netral dan pekat, tanpa semburat biru, seperti tinta cina yang baru digosok. Pasangan hitam + emas di mode gelap rawan terbaca sebagai "mewah generik", jadi emas dibatasi ketat: satu aksi per layar, isian datar, tidak pernah gradien atau kilau.

### 13.2 Aturan pakai

- **Emas selalu jadi isian datar dengan teks Tinta** (kontras 8,7:1). Tidak pernah gradien metalik, kilau, atau glow. Di latar Perak, Emas tidak dipakai sebagai teks atau garis tipis (hanya 2,0:1).
- **Satu aksi utama per layar** yang berwarna Emas. Aksi lain tampil netral.
- **Facet dibuat dari tiga tingkat terang-gelap** (Tinta → Es → Perak), bukan gradien dan bukan mesh. Di sini facet terbaca sebagai kristal es.
- **Es tidak untuk teks di latar terang** (1,6:1) dan bukan aksen; ia bagian dari basis netral. Di latar gelap Es boleh dipakai untuk label dan teks sekunder (10,9:1).
- **Garis dan ikon fungsional di latar terang** (batas input, pemisah tabel, ikon) memakai varian Es yang lebih tua (13.3), karena Es biasa hanya 1,6:1 di sana. Varian ini bukan warna kelima, hanya penyesuaian mode.
- Larangan bagian 2 tetap berlaku: tidak ada gradien dekoratif, glow, atau bayangan seragam.

### 13.3 Varian per mode

| Peran | Mode terang (latar Perak) | Mode gelap (latar Tinta) |
|---|---|---|
| Teks utama | `#0D0D0D` (17,1:1) | `#EEF1F4` (17,1:1) |
| Teks sekunder | `#4A5663` (6,6:1) | Perak opasitas 70% (sekitar 8,6:1) |
| Aksi utama | isian `#D4A72C`, teks `#0D0D0D` | isian `#D4A72C`, teks `#0D0D0D` |
| Tautan/aksen sebagai teks | `#7A5C00` (5,5:1) | `#D4A72C` (8,7:1) |
| Garis dan ikon fungsional | `#4F7A99` (4,0:1; hanya garis/ikon, bukan teks) | `#A9C6DC` (10,9:1) |

**Status (warna semantik, terpisah dari aksen).** Selalu disertai ikon dan label, tidak pernah hanya warna. Peringatan sengaja dibuat oranye kemerahan supaya tidak tertukar dengan Emas; jangan menaruh isian Peringatan dan isian Emas berdampingan.

| Status | Mode terang | Mode gelap |
|---|---|---|
| Sukses | `#2F7048` (5,2:1) | `#4E9A6B` (5,7:1) |
| Peringatan | `#A8530E` (4,7:1) | `#D9772B` (6,1:1) |
| Error | `#A93226` (5,8:1) | `#D4564A` (4,8:1) |

### 13.4 Empat hal tetap di semua app

1. **Bentuk facet** sebagai geometri tanda tangan (pemisah, border, ikon, transisi).
2. **Pasangan huruf** yang sama (tentukan sekali, pakai di semua app).
3. **Basis netral** Tinta/Perak/Es.
4. **Satu interaksi khas** yang dipakai ulang (misalnya facet yang terbuka saat status berubah).

### 13.5 Kesan surgawi tanpa klise

Kesan surgawi dibangun dari **terang, ruang, dan ketenangan**, bukan dari dekorasi langit.

- Bidang Perak yang luas, jarak lega di area penting, garis tipis yang presisi, dan facet kristal sebagai satu-satunya hiasan.
- Emas muncul sebagai momen berani: satu tombol, satu penanda status penting, bukan taburan.
- Dilarang sebagai hiasan: halo, sinar menyebar, awan, sayap, bintang berkilau, partikel melayang, glow emas di belakang elemen. Semuanya masuk kategori latar dekoratif dan glow di bagian 2.1.
- Mode gelap tetap tenang: Tinta sebagai permukaan, Es untuk garis dan label, Emas tetap satu aksi.
