# Reddit Pro Plus Max S

Firefox, Google Chrome, Microsoft Edge ve Opera için **tek eklentide** eksiksiz Reddit araç kiti. Ayrı ayrı kurulan popüler Reddit eklentilerinin işlevlerini tek, hafif ve yüksek performanslı bir pakette bir araya getirir:

- **Reddit Enhancer** tarzı yeni arayüz sadeleştirme (gezinme, kenar çubuğu, öneriler, trendler gizleme)
- **Reddit Ad Blocker / Promoted Remover** tarzı sponsorlu içerik ve reklam temizliği
- **Reddit Comment Collapser** tarzı akıllı yorum katlama + klavye gezinmesi (`j` / `k` / `z`)
- **Readdit Later** tarzı gelişmiş kaydedilenler yöneticisi (arama, filtre, JSON/CSV dışa aktarma)
- **Redditor Reborn** tarzı toplu gönderi ve yorum temizleme (güvenli, hız sınırlamalı API silme)
- **Moderator Toolbox** tarzı moderatör araçları (yalnızca mod olduğunuz subreddit gönderilerinde hızlı "M" düğmesi, kullanıcı hover kartı, notlar, ban/mute)
- **Ekstralar**: Otomatik çeviri (`?tl=`) iptali, Reddit görsellerini doğrudan açma, subreddit/kelime/flair filtreleri, old Reddit teması

---

## Desteklenen Tarayıcılar ve Paketler

| Tarayıcı | Mağaza | Paket Dosyası | Motor |
|---|---|---|---|
| **Mozilla Firefox** | Firefox Add-ons (AMO) | `dist/reddit-pro-plus-max-s-v1.0.0-firefox.zip` / `.xpi` | Gecko MV3 (Scripts) |
| **Google Chrome** | Chrome Web Store | `dist/reddit-pro-plus-max-s-v1.0.0-chrome.zip` | Chromium MV3 (Service Worker) |
| **Microsoft Edge** | Edge Add-ons | `dist/reddit-pro-plus-max-s-v1.0.0-edge.zip` | Chromium MV3 (Service Worker) |
| **Opera** | Opera Add-ons | `dist/reddit-pro-plus-max-s-v1.0.0-opera.zip` | Chromium MV3 (Service Worker) |

---

## Yerel Geliştirici Modunda Yükleme

### 1. Firefox (ve Firefox Developer Edition)
1. `about:debugging#/runtime/this-firefox` adresine gidin.
2. **Geçici Eklenti Yükle** (Load Temporary Add-on) düğmesine tıklayın.
3. Proje dizinindeki `manifest.json` dosyasını veya `dist/reddit-pro-plus-max-s-v1.0.0-firefox.zip` dosyasını seçin.

### 2. Google Chrome
1. `chrome://extensions/` adresine gidin.
2. Sağ üstteki **Geliştirici modu** (Developer mode) anahtarını açın.
3. **Paketlenmemiş öğe yükle** (Load unpacked) düğmesine tıklayın ve `dist/build-chromium` (veya `manifest.json`'da background'u `service_worker` olan dizini) seçin. Alternatif olarak `.zip` dosyasını açıp klasörü gösterebilirsiniz.

### 3. Microsoft Edge
1. `edge://extensions/` adresine gidin.
2. Sol menüden **Geliştirici modu**nu etkinleştirin.
3. **Paketlenmemiş olanı yükle** seçeneğiyle eklenti klasörünü seçin.

### 4. Opera
1. `opera://extensions` adresine gidin.
2. Sağ üstten **Geliştirici Modu**nu açın.
3. **Paketlenmemiş yükle** düğmesiyle eklenti klasörünü yükleyin.

---

## Mağazalara Yükleme Kılavuzu

### 1. Firefox Add-ons (AMO - addons.mozilla.org)
1. [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/) sayfasına gidin ve Firefox hesabınızla giriş yapın.
2. **Submit a New Add-on** düğmesine tıklayın.
3. Dağıtım türünü seçin:
   - *On this site* (AMO mağazasında listelenir, otomatik güncellenir)
   - *On your own* (Kendi sitenizden imzalı .xpi dağıtımı için)
4. `dist/reddit-pro-plus-max-s-v1.0.0-firefox.zip` dosyasını yükleyin.
5. Otomatik doğrulama tamamlandığında açıklama, kategori ve ekran görüntülerini girip onaya gönderin.

### 2. Chrome Web Store
1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) sayfasına gidin.
2. Google hesabınızla giriş yapın (ilk defaya mahsus \$5 kayıt ücreti gereklidir).
3. **Yeni Öğe** (New Item) düğmesine tıklayın.
4. `dist/reddit-pro-plus-max-s-v1.0.0-chrome.zip` dosyasını yükleyin.
5. Formları doldurun:
   - **Gizlilik Uygulamaları (Privacy practices)**: `*://*.reddit.com/*` izin gerekçesi olarak Reddit arayüz sadeleştirme, reklam engelleme ve moderatör API işlemlerini belirtin. "Eklenti hiçbir kullanıcı verisini harici sunuculara göndermez, tüm veriler yerel storage'da tutulur" maddesini işaretleyin.
   - **Tek Amaç Politikası (Single Purpose)**: Reddit kullanıcı deneyimini iyileştirme araç seti.
6. İncelemeye gönderin (genellikle 24-72 saat içinde onaylanır).

### 3. Microsoft Edge Add-ons
1. [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) adresine gidin (Ücretsizdir, Microsoft hesabı yeterlidir).
2. **Yeni uzantı gönder** (Create new extension) seçeneğine tıklayın.
3. *İpucu:* Eğer Chrome Web Store'da yayınladıysanız, doğrudan Chrome Web Store bağlantınızı vererek tek tıkla içeri aktarabilirsiniz.
4. Doğrudan yüklemek için: `dist/reddit-pro-plus-max-s-v1.0.0-edge.zip` dosyasını yükleyin.
5. Mağaza detaylarını (açıklama, ikonlar, ekran görüntüleri) kaydedip onaya gönderin.

### 4. Opera Add-ons
1. [Opera Add-ons Developer Portal](https://addons.opera.com/developer/) adresine gidin (Ücretsizdir).
2. **Upload a new add-on** düğmesine tıklayın.
3. `dist/reddit-pro-plus-max-s-v1.0.0-opera.zip` dosyasını yükleyin.
4. İsim, açıklama ve görselleri ekleyip onaya gönderin.

---

## Kullanım ve Kısayollar

- Reddit'te herhangi bir sayfayı açın.
- **Alt+Shift+R**: Sayfa içi genişletilmiş paneli açar/kapatır.
- Araç çubuğundaki **R++** simgesi hızlı popup menüsünü açar.
- **Klavye Kısayolları (Yorumlar):**
  - `j` : Bir sonraki yoruma odaklan
  - `k` : Bir önceki yoruma odaklan
  - `z` : Aktif yorumu katla / aç
  - `Shift + Z` : Tüm üst düzey yorumları katla
  - `Shift + X` : Tüm yorumları aç
- Sağ alttaki kayan düğme ile tek tıkla `old.reddit.com` ve yeni Reddit arasında geçiş yapın.

---

## Derleme ve Test

```bash
# Bağımlılıkları yükle
npm install

# Smoke testleri çalıştır (24/24 assertion)
npm test

# Linter kontrolü
npm run lint

# Tüm tarayıcı paketlerini oluştur (Firefox, Chrome, Edge, Opera)
npm run build
```

Derleme sonucu `dist/` klasörüne her mağazaya özel ZIP ve XPI dosyaları otomatik olarak yerleştirilir.

---

## Lisans

MIT License.
