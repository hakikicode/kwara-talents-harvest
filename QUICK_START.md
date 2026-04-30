# 🎭 Grand Finale Event Page - Quick Start

## What's Been Created

✅ **event.html** - Main event page with 20 contestant grid
✅ **event.js** - Ticket purchasing & Paystack integration  
✅ **contestants.json** - Contestant name configuration
✅ **Updated index.html** - Added Grand Finale navigation & promo section

---

## 3-Step Setup

### Step 1: Name Your Contestants
Edit: `public/events/contestants.json`

```json
[
  { "id": "contestant-01", "name": "John Doe" },
  { "id": "contestant-02", "name": "Jane Smith" },
  ...up to...
  { "id": "contestant-20", "name": "Last Contestant" }
]
```

### Step 2: Organize Images
Place 20 images in `public/events/`:
- Naming: `contestant-01.jpg` through `contestant-20.jpg`
- OR rename your existing `kth 1.jpg` → `contestant-01.jpg` etc.

### Step 3: Add Paystack Key
Edit: `public/scripts/event.js` (line 188)
```javascript
key: "pk_live_YOUR_KEY_HERE",
```
Get key from: https://dashboard.paystack.com → Settings → API Keys

---

## Live Features

✨ **Display**: 20 contestants in grid
✨ **Click**: Click any image to open ticket purchase modal
✨ **Buy**: Select quantity (1-5) and purchase via Paystack
✨ **Inventory**: Real-time ticket tracking per contestant
✨ **Database**: All purchases saved to Firebase

---

## Customization

**Change ticket price:**
```javascript
const TICKET_PRICE = 50; // Change this number
```

**Change event date:**
```javascript
const EVENT_DATE = new Date("2026-05-15T18:00:00+01:00");
```

**Change max tickets per contestant:**
```javascript
const MAX_TICKETS_PER_CONTESTANT = 20;
```

---

## Testing

```bash
# Test locally
python -m http.server 8000

# Visit
http://localhost:8000/event.html

# Production (after git push)
https://yoursite.com/event.html
```

---

## Payment Testing

**Before Live:**
1. Use Paystack Test key
2. Test card: `4111 1111 1111 1111`
3. Any future date, any CVC

**Go Live:**
1. Switch to Live key  
2. Reload page
3. Accept real payments

---

## File Locations

```
public/
├── event.html              ← Main page
├── scripts/event.js        ← Logic (update Paystack key here!)
├── events/
│   ├── contestants.json    ← Edit with real names
│   ├── contestant-01.jpg   ← Upload images here
│   ├── contestant-02.jpg
│   └── ... to contestant-20.jpg
└── styles/voting.css       ← Styling (already done)

Root/
├── GRAND_FINALE_SETUP.md   ← Full documentation
├── EVENT_SETUP.md          ← Setup guide
└── index.html              ← Updated with event links
```

---

## Verification

After setup, verify:
- [ ] Can navigate to `/event.html`
- [ ] All 20 contestant images load
- [ ] Contestant names display correctly
- [ ] Click on image opens modal
- [ ] Price calculates correctly (qty × ₦5,000)
- [ ] Paystack dialog opens on "Pay Now"
- [ ] Manual payment button shows message
- [ ] After payment, Firebase saves ticket data

---

## Navigation

**From Home Page (index.html):**
- Top Nav: "Grand Finale 🎭" button
- Promo Section: "Get Your Tickets Now" button
- Both link to `/event.html`

---

## Paystack Integration

**Real-time data flow:**
1. User enters email, name, phone, quantity
2. Clicks "Pay Now"
3. Paystack dialog opens (secure)
4. Payment processed by Paystack
5. Callback saves ticket to Firebase
6. Ticket count updates in real-time
7. User sees confirmation

---

## Database Format

Each ticket saved as:
```javascript
{
  email: "user@example.com",
  name: "Full Name",
  phone: "08012345678",
  quantity: 2,
  amount: 10000,
  paymentRef: "txn_abc123",
  timestamp: 1234567890,
  status: "completed"
}
```

Accessible in Firebase Console:
`eventTickets → contestant-01 → ticket-id-001 → [data above]`

---

## Need Help?

📖 **Full Docs**: See `GRAND_FINALE_SETUP.md`
📖 **Setup Guide**: See `EVENT_SETUP.md`
💬 **Paystack Issues**: https://paystack.com/docs
🔥 **Firebase Issues**: https://firebase.google.com/docs

---

**Ready to launch?** Complete the 3-step setup above, then push to GitHub! 🚀
