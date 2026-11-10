-- PanenPasti · migrasi 2: data referensi
-- Kecamatan dan komoditas harus ada sebelum pengguna pertama mendaftar, karena
-- profiles.kecamatan_id dan listings.komoditas_id merujuk ke sini.
--
-- Daftar kecamatan dihasilkan dari data/kecamatan.csv (72 baris: Kab. Garut dan
-- Kota Bandung; sumber Wikidata, CC0). Aman dijalankan ulang (upsert), dan
-- scripts/seed-simulasi.mjs juga meng-upsert data yang sama.

insert into public.komoditas (id, nama, satuan)
values (1, 'Cabai Rawit Merah', 'kg')
on conflict (id) do update
  set nama = excluded.nama,
      satuan = excluded.satuan;

insert into public.kecamatan (id, nama, kab_kota, lat, lng)
values
  (3205010, 'Cisewu', 'Kab. Garut', -7.377341, 107.501074),
  (3205011, 'Caringin', 'Kab. Garut', -7.522987, 107.489157),
  (3205020, 'Talegong', 'Kab. Garut', -7.285278, 107.529167),
  (3205030, 'Bungbulang', 'Kab. Garut', -7.455528, 107.598524),
  (3205031, 'Mekarmukti', 'Kab. Garut', -7.544918, 107.56973),
  (3205040, 'Pamulihan', 'Kab. Garut', -7.365, 107.684722),
  (3205050, 'Pakenjeng', 'Kab. Garut', -7.4675, 107.683056),
  (3205060, 'Cikelet', 'Kab. Garut', -7.6, 107.666667),
  (3205070, 'Pameungpeuk', 'Kab. Garut', -7.626667, 107.736944),
  (3205080, 'Cibalong', 'Kab. Garut', -7.678796, 107.803731),
  (3205090, 'Cisompet', 'Kab. Garut', -7.551233, 107.811158),
  (3205100, 'Peundeuy', 'Kab. Garut', -7.547778, 107.910556),
  (3205110, 'Singajaya', 'Kab. Garut', -7.484345, 107.913113),
  (3205111, 'Cihurip', 'Kab. Garut', -7.495946, 107.858215),
  (3205120, 'Cikajang', 'Kab. Garut', -7.389444, 107.795833),
  (3205130, 'Banjarwangi', 'Kab. Garut', -7.406667, 107.883056),
  (3205140, 'Cilawu', 'Kab. Garut', -7.276832, 107.919475),
  (3205150, 'Bayongbong', 'Kab. Garut', -7.270439, 107.820447),
  (3205151, 'Cigedug', 'Kab. Garut', -7.333559, 107.805937),
  (3205160, 'Cisurupan', 'Kab. Garut', -7.307317, 107.795472),
  (3205161, 'Sukaresmi', 'Kab. Garut', -7.261495, 107.810305),
  (3205170, 'Samarang', 'Kab. Garut', -7.195278, 107.788889),
  (3205171, 'Pasirwangi', 'Kab. Garut', -7.215906, 107.784026),
  (3205181, 'Tarogong Kidul', 'Kab. Garut', -7.215111, 107.885583),
  (3205182, 'Tarogong Kaler', 'Kab. Garut', -7.190271, 107.89017),
  (3205190, 'Garut Kota', 'Kab. Garut', -7.216667, 107.9),
  (3205200, 'Karangpawitan', 'Kab. Garut', -7.205829, 107.946718),
  (3205210, 'Wanaraja', 'Kab. Garut', -7.173201, 107.981308),
  (3205211, 'Sucinaraja', 'Kab. Garut', -7.189382, 107.982618),
  (3205212, 'Pangatikan', 'Kab. Garut', -7.163477, 107.995205),
  (3205220, 'Sukawening', 'Kab. Garut', -7.157026, 108.010403),
  (3205221, 'Karangtengah', 'Kab. Garut', -7.161806, 108.03746),
  (3205230, 'Banyuresmi', 'Kab. Garut', -7.166944, 107.928611),
  (3205240, 'Leles', 'Kab. Garut', -7.108389, 107.898675),
  (3205250, 'Leuwigoong', 'Kab. Garut', -7.093018, 107.958357),
  (3205260, 'Cibatu', 'Kab. Garut', -7.101301, 107.983874),
  (3205261, 'Kersamanah', 'Kab. Garut', -7.052298, 108.038388),
  (3205270, 'Cibiuk', 'Kab. Garut', -7.064444, 107.956111),
  (3205280, 'Kadungora', 'Kab. Garut', -7.091698, 107.87893),
  (3205290, 'Balubur Limbangan', 'Kab. Garut', -7.03559, 107.983849),
  (3205300, 'Selaawi', 'Kab. Garut', -6.998889, 108.002778),
  (3205310, 'Malangbong', 'Kab. Garut', -7.059444, 108.085),
  (3273010, 'Bandung Kulon', 'Kota Bandung', -6.935556, 107.564444),
  (3273020, 'Babakan Ciparay', 'Kota Bandung', -6.938611, 107.577778),
  (3273030, 'Bojongloa Kaler', 'Kota Bandung', -6.932778, 107.590278),
  (3273040, 'Bojongloa Kidul', 'Kota Bandung', -6.941249, 107.597332),
  (3273050, 'Astanaanyar', 'Kota Bandung', -6.936944, 107.601111),
  (3273060, 'Regol', 'Kota Bandung', -6.938611, 107.611111),
  (3273070, 'Lengkong', 'Kota Bandung', -6.935, 107.625278),
  (3273080, 'Bandung Kidul', 'Kota Bandung', -6.956944, 107.626111),
  (3273090, 'Buahbatu', 'Kota Bandung', -6.960716, 107.666141),
  (3273100, 'Rancasari', 'Kota Bandung', -6.947988, 107.674948),
  (3273101, 'Gedebage', 'Kota Bandung', -6.962624, 107.68737),
  (3273110, 'Cibiru', 'Kota Bandung', -6.916667, 107.716667),
  (3273111, 'Panyileukan', 'Kota Bandung', -6.935992, 107.699671),
  (3273120, 'Ujungberung', 'Kota Bandung', -6.911944, 107.700556),
  (3273121, 'Cinambo', 'Kota Bandung', -6.92425, 107.693211),
  (3273130, 'Arcamanik', 'Kota Bandung', -6.913333, 107.68),
  (3273141, 'Antapani', 'Kota Bandung', -6.907778, 107.661944),
  (3273142, 'Mandalajati', 'Kota Bandung', -6.895057, 107.676928),
  (3273150, 'Kiaracondong', 'Kota Bandung', -6.921944, 107.65),
  (3273160, 'Batununggal', 'Kota Bandung', -6.925278, 107.636111),
  (3273170, 'Sumur Bandung', 'Kota Bandung', -6.916111, 107.616944),
  (3273180, 'Andir', 'Kota Bandung', -6.913889, 107.579444),
  (3273190, 'Cicendo', 'Kota Bandung', -6.901389, 107.580833),
  (3273200, 'Bandung Wetan', 'Kota Bandung', -6.904722, 107.620833),
  (3273210, 'Cibeunying Kidul', 'Kota Bandung', -6.902222, 107.644722),
  (3273220, 'Cibeunying Kaler', 'Kota Bandung', -6.898056, 107.632222),
  (3273230, 'Coblong', 'Kota Bandung', -6.8875, 107.616111),
  (3273240, 'Sukajadi', 'Kota Bandung', -6.887222, 107.588889),
  (3273250, 'Sukasari', 'Kota Bandung', -6.868162, 107.582399),
  (3273260, 'Cidadap', 'Kota Bandung', -6.865, 107.606944)
on conflict (id) do update
  set nama = excluded.nama,
      kab_kota = excluded.kab_kota,
      lat = excluded.lat,
      lng = excluded.lng;
