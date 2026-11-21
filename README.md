# Kos Puji

Aplikasi pengelolaan kamar, penghuni, pembayaran, dan pengeluaran kos.

Aplikasi aktif https://rockrocketship-cloud.github.io/kos-puji/

## Penyimpanan dan akses

Data Kos Puji disimpan pada Supabase dalam tabel kos_puji_data. Tabel kos_puji_owners membatasi akses pada akun owner yang sudah terdaftar. Login menggunakan email dan kata sandi akun owner Lokalin di proyek Supabase yang sama. Mode contoh menggunakan penyimpanan browser.

Penyimpanan memakai nomor revisi agar perubahan bersamaan dari dua perangkat tidak saling menimpa. Saat terjadi konflik, tutup formulir, muat ulang data, lalu ulangi perubahan. Muat ulang otomatis berjalan setiap 60 detik saat formulir tertutup.

Gunakan tombol Impor data lama pada browser yang sebelumnya dipakai untuk Kos Puji. Impor hanya diizinkan ketika data cloud kosong. Data dari domain lama tetap berada pada penyimpanan browser domain lama.

## Pengembangan

Jalankan server statis pada direktori ini. SDK Supabase dipin ke versi 2.49.8 pada berkas supabase-2.49.8.js. Frontend menggunakan publishable key dengan Row Level Security. Jangan memasukkan secret key atau service_role key ke frontend.

supabase-schema.sql menyimpan skema awal yang telah diterapkan ke proyek kwhtqqrzeifmntdtugvg. Jangan menjalankan ulang skema awal pada tabel yang sudah ada.
