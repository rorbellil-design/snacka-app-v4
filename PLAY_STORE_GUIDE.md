# 🚀 Google Play Store - Publiceringsguide för Snacka

Denna guide innehåller allt du behöver för att bygga och publicera **Snacka** på Google Play Store via Android Studio & Capacitor.

---

## 📱 1. Butikstext & Metadata (Kopiera & Klistra in i Play Console)

### **Appnamn:**
`Snacka – Röstsamtal för barn` *(30 tecken)*

### **Kort beskrivning:**
`Enkel och trygg samtalsapp för barn med godkända kontakter och föräldraläge.` *(75 tecken)*

### **Fullständig beskrivning:**
```text
Snacka är den trygga och enkla röstsamtalsappen designad speciellt för barn och deras familjer. 

Med stora tydliga knappar, glada färger och ett helt slutet nätverk kan barnet själv ringa mamma, pappa, mormor, morfar eller bästa kompisen – utan risk för kontakt med okända.

HUVUDFUNKTIONER:
⭐ Stora bildknappar: Barnet känner enkelt igen vem de vill ringa via bilder eller roliga emojis.
⭐ Slutet nätverk (White-listing): Barnet kan enbart ringa och ta emot samtal från kontakter som föräldern lagt till.
⭐ PIN-skyddat föräldraläge: Endast föräldern kan lägga till nya kontakter, ändra sovtid eller justera inställningar.
⭐ Röstbrevlåda: Missade samtal? Barnet och kontakterna kan prata in korta, roliga röstmemos.
⭐ Läggdags-läge (Sovtid): Schemalägg tider då telefonen är tyst och inte tillåter samtal.
⭐ 100 % reklamfri: Inga köp i appen, inga annonser och ingen datainsamling från barn.

SKAPAD FÖR FAMILJER:
Snacka uppfyller alla krav för Google Play Families Policy och skyddar barns integritet enligt GDPR-K och COPPA. All data sparas tryggt och krypterat.
```

### **Kategori:**
- App-kategori: **Kommunikation / Socialt / Familj**
- Taggar: **Barn, Familj, Röstsamtal, Säkerhet**

---

## 🔒 2. Integritetspolicy & Behörigheter

- **Integritetspolicy URL:** `https://<din-domän>/privacy-policy.html` (finns färdig i `/public/privacy-policy.html`)
- **Behörigheter i Android:**
  - `android.permission.RECORD_AUDIO` (Mikrofon för röstsamtal & röstmemo)
  - `android.permission.INTERNET` (För Peer-to-Peer WebRTC röstsamtal över WiFi/4G/5G)
  - `android.permission.POST_NOTIFICATIONS` (För inkommande ringsignal och samtal)

---

## 📋 3. Formulär & Certifieringar i Play Console

### **Målgrupp och innehåll (Target Audience):**
- Åldersgrupp: **Under 13 år (t.ex. 6–8 år, 9–12 år)** samt **Familj**.
- Ingår i programmet **Designad för familjer (Designed for Families)**.

### **Innehållsklassificering (IARC):**
- Våld / Skrämmande innehåll: **Nej**
- Svordomar / Olämpligt språk: **Nej**
- Reklam: **Nej**
- Tillåter kommunikation med andra: **Ja** *(Endast med användarens godkända kontakter)*
- Resultat: **PEGI 3 / All Ages**

---

## 💻 4. Byggkommandon (Från projekt till APK/AAB)

När du laddat ned projektet eller kör lokalt:

```bash
# 1. Bygg webbappen
npm run build

# 2. Skapa Android-mappen (körs en gång)
npx cap add android

# 3. Synka webb-koden till Android-projektet
npm run cap:sync

# 4. Öppna i Android Studio
npm run cap:open
```

### **I Android Studio:**
1. Välj **Build > Generate Signed Bundle / APK...**
2. Välj **Android App Bundle (.aab)**.
3. Skapa en ny Keystore-nyckel (eller välj en befintlig).
4. Välj **Release** och klicka på **Create**.
5. Den färdiga `.aab`-filen ligger nu i `android/app/release/app-release.aab` och är redo att laddas upp i Google Play Console!
