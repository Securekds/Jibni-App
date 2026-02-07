# Temporary Expo Setup for Quick Testing

## ⚠️ IMPORTANT WARNINGS

**Many native modules will NOT work in Expo Go:**
- ❌ `react-native-maps` - Requires custom native configuration
- ❌ `react-native-image-crop-picker` - Requires native code
- ⚠️ `react-native-geolocation-service` - Limited functionality
- ❌ `react-native-permissions` - Requires native config
- ❌ `@react-native-community/blur` - Requires native code

**This setup is for QUICK TESTING ONLY!**

---

## 📋 Setup Steps

### 1. Add Expo SDK (Temporary)

```cmd
cd "C:\Users\NexTech\Downloads\jibni-main (1)\Frontend"
add-expo-temp.bat
```

Or manually:
```cmd
npm install expo@~52.0.0 --save --legacy-peer-deps
```

### 2. Start with Expo

```cmd
npx expo start
```

Or use the npm script:
```cmd
npm run start:expo
```

### 3. Scan QR Code

- Install **Expo Go** app on your phone
- Scan the QR code shown in terminal
- App will load (but many features won't work!)

---

## 🗑️ Remove Expo (After Testing)

```cmd
cd "C:\Users\NexTech\Downloads\jibni-main (1)\Frontend"
remove-expo.bat
```

Or manually:
```cmd
npm uninstall expo
```

Then restore original `app.json`:
```json
{
  "name": "Jibni",
  "displayName": "Jibni"
}
```

---

## 🔄 Back to React Native CLI

After removing Expo, use:
```cmd
npm start
```

This uses Metro bundler (standard React Native CLI).

---

## 📝 Notes

- Expo Go is great for quick UI testing
- For full functionality, use React Native CLI with `npm start`
- Maps, image picker, and other native features require a development build
