# Traffic Pro Enterprise v3.0 - Remote Cloud Control Hub

This repository remotely controls all deployed copies of **Traffic Pro Enterprise v3.0** on every user's device.
You can edit these files directly from your mobile phone or browser to change settings on all active client devices!

---

### 📱 1. `config.json` - Remote Admin Controls:
- **`globalKillSwitch`**: 
  - `false` = Software runs normally.
  - `true` = Software immediately stops on all devices worldwide with an admin lock screen!
- **`announcement`**:
  - `"enabled": true`
  - `"message": "Special Notice: Contact Henry Miller on Telegram (@Henrymiller08) for full unmetered license!"`
- **`telegram`**: Your contact link (`https://t.me/Henrymiller08`).
- **`trialHours`**: Number of trial hours allowed (`24`).

---

### 🌐 2. `proxies.txt` - Remote Proxy Synchronization:
Add your proxies here. All clients automatically check and download this list in the background every 10 minutes!
