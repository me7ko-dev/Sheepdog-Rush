# Как да пуснеш Sheepdog Rush в App Store и Google Play

Всичко нужно за магазините е готово в проекта:

| Какво | Къде |
|---|---|
| Икона, splash екран, Android икона | `assets/` |
| Снимки за магазина (EN и BG) | `store/screenshots/<език>/<размер>/` |
| Банер за Google Play | `store/feature-graphic-1024x500.png` |
| Икона 512×512 за Google Play | `store/icon-512.png` |
| Текстове за магазина (EN и BG) | `store/listing.md` |
| Политика за поверителност | `PRIVACY.md` (линк: https://github.com/me7ko-dev/Sheepdog-Rush/blob/main/PRIVACY.md) |
| Настройки за изграждане | `app.json`, `eas.json` |

> **Важно:** Политиката за поверителност трябва да се отваря от всеки. Затова хранилището в GitHub трябва да е **публично**. Ако не искаш кодът да е публичен, качи `PRIVACY.md` на друго място (напр. Google Sites) и смени линка в `src/config.ts` и в магазините.

---

## Стъпка 0: Тествай в Expo Go

1. Обнови **Expo Go** на телефона до последната версия.
2. В папката на проекта: `npm install`, после `npx expo start`.
3. Сканирай QR кода. Изиграй няколко нива, пробвай настройките (звук, музика, вибрация, език).

> В Expo Go иконата и splash екранът са тези на Expo Go. Истинската икона се вижда в изградената версия (стъпка 3 нататък).

## Стъпка 1: Профили (еднократно)

| Профил | Цена | Линк |
|---|---|---|
| Expo (EAS) | безплатно | https://expo.dev/signup |
| Apple Developer Program | 99 $ на година | https://developer.apple.com/programs/ |
| Google Play Console | 25 $ еднократно | https://play.google.com/console/signup |

## Стъпка 2: Идентификатор на приложението

В `app.json` е `com.me7ko.sheepdogrush` (за iOS и за Android). **Смени го сега, ако искаш друг.** След първото качване в магазина не може да се променя.

## Стъпка 3: Свържи проекта с Expo (еднократно)

```
npx eas-cli@latest login
npx eas-cli@latest init
```
`init` добавя номер на проекта в `app.json`. Запиши промяната (commit).

## Стъпка 4: iPhone (App Store)

1. Изгради:
   ```
   npx eas-cli@latest build --platform ios --profile production
   ```
   EAS ще поиска вход с Apple профила. Остави го сам да направи сертификатите (отговаряй „Yes“). Изграждането става в облака на Expo (15–30 мин).
2. Качи:
   ```
   npx eas-cli@latest submit --platform ios --latest
   ```
   Ако приложението още не съществува в App Store Connect, EAS ще го създаде.
3. Изпробвай я на телефона през **TestFlight**. Това е истинската версия, с иконата.
4. В **App Store Connect** (https://appstoreconnect.apple.com):
   - Попълни текстовете от `store/listing.md`.
   - Качи снимките от `store/screenshots/en/ios-6.9/` (и `ios-6.5/`, ако ги поиска).
   - **App Privacy:** „Data Not Collected“.
   - **Age Rating:** навсякъде „None“ → 4+.
   - **Pricing:** Free.
   - Избери билда от TestFlight → **Add for Review** → **Submit**.
5. Прегледът от Apple обикновено отнема 1–3 дни.

## Стъпка 5: Android (Google Play)

1. Изгради:
   ```
   npx eas-cli@latest build --platform android --profile production
   ```
   Ще получиш `.aab` файл (линк за сваляне).
2. В **Play Console**: Create app → име „Sheepdog Rush“, Game, Free.
3. **Първото качване е ръчно:** Testing → Internal testing → Create release → качи `.aab` файла. Следващите версии могат да се качват с `npx eas-cli@latest submit --platform android`.
4. Попълни:
   - **Store listing:** текстовете от `store/listing.md`, иконата `store/icon-512.png`, банера `store/feature-graphic-1024x500.png`, снимките от `store/screenshots/en/android/`.
   - **App content:** Privacy policy (линка), Ads: No, Data safety: нищо не се събира, Content rating: попълни въпросника (всичко „No“), Target audience.
5. Изпробвай от Internal testing → после Production → Send for review.

> Новите лични профили в Google Play често трябва първо да направят **затворен тест с поне 12 души за 14 дни**, преди да пуснат в Production. Play Console ще ти каже, ако е така.

## Само за изпробване (без магазин)

Android APK файл, който се инсталира директно на телефона:
```
npx eas-cli@latest build --platform android --profile preview
```

## Нова версия по-късно

1. Смени `"version"` в `app.json` (напр. `1.0.1`).
2. Пусни отново `build` и `submit`. Номерът на билда се увеличава автоматично.
