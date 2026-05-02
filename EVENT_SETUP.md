# Event Page Setup Guide

## Overview
This guide explains how to set up the Grand Finale event page with the 20 contestant images and manage ticket sales.

## File Structure
```
public/
├── event.html                 # Main event page
├── scripts/event.js          # Event logic and Paystack integration
├── events/                   # Contestant images folder
│   ├── contestant-01.jpg
│   ├── contestant-02.jpg
│   └── ... (up to contestant-20.jpg)
└── styles/voting.css         # Styling (shared with voting page)
```

## Setup Instructions

### 1. Upload Contestant Images

Place all 20 contestant images in the `public/events/` folder with the following naming convention:
- `contestant-01.jpg`
- `contestant-02.jpg`
- ... 
- `contestant-20.jpg`

**Image Requirements:**
- Format: JPG, PNG, or WebP
- Recommended size: 400x500px (portrait orientation)
- File size: < 500KB per image for optimal loading
- Safe to deploy on GitHub (no sensitive data)

### 2. Configure Event Details

Edit `public/scripts/event.js` to update:

```javascript
// Event configuration (top of file)
const TICKET_PRICE = 5000;                    // Price per ticket in Naira
const MAX_TICKETS_PER_CONTESTANT = 20;        // Tickets per contestant
const TICKETS_PER_PURCHASE = 5;               // Max tickets per transaction
const EVENT_DATE = new Date("2026-05-15T18:00:00+01:00"); // Event date/time
```

### 3. Configure Paystack Integration

Update the Paystack public key in `event.js`:

```javascript
// In payWithPaystack() function
key: "pk_live_YOUR_ACTUAL_PAYSTACK_PUBLIC_KEY",
```

**Where to find your Paystack key:**
1. Log in to [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to Settings → API Keys & Webhooks
3. Copy your **Live Public Key**

### 4. Update Contestant Names

The script currently generates placeholder names. To add real names, modify the `loadContestants()` function:

```javascript
const contestants = [
  { id: "contestant-01", name: "John Doe" },
  { id: "contestant-02", name: "Jane Smith" },
  // ... update all 20 names
];
```

## Features

✅ **Grid Display**: 20 contestants displayed in a responsive grid
✅ **Click to Buy**: Click any contestant image to purchase tickets
✅ **Real-time Inventory**: Firebase tracks sold tickets per contestant
✅ **Paystack Payment**: Instant payment processing
✅ **Responsive Design**: Mobile-friendly interface
✅ **Ticket Limits**: Maximum 5 tickets per purchase to prevent bulk buying

## Database Structure (Firebase)

Ticket data is stored in Firebase Realtime Database:

```
eventTickets/
├── contestant-01/
│   ├── sold: 5                          # Total sold
│   ├── ticket-id-001/                   # Individual ticket
│   │   ├── email: "buyer@example.com"
│   │   ├── name: "Buyer Name"
│   │   ├── phone: "08012345678"
│   │   ├── quantity: 1
│   │   ├── amount: 5000
│   │   ├── paymentRef: "ref_xxxxx"
│   │   ├── timestamp: 1234567890
│   │   └── status: "completed"
│   └── ... (more tickets)
└── contestant-02/
    └── ... (similar structure)
```

## Customization

### Changing Event Date
Edit in `event.js`:
```javascript
const EVENT_DATE = new Date("2026-05-15T18:00:00+01:00");
```

### Changing Ticket Price
Edit in `event.js`:
```javascript
const TICKET_PRICE = 5000; // in Naira
```

### Changing Event Name/Description
Edit in `event.html`:
- `<h1>🎭 Grand Finale Event</h1>`
- Update event details in the header section

## Payment Flow

1. **User clicks contestant image** → Modal opens
2. **User enters details** (email, name, phone, quantity)
3. **User clicks "Pay Now"** → Paystack dialog opens
4. **Payment processed** → Success callback
5. **Ticket saved to Firebase** → Inventory updated
6. **Page reloads** → Shows updated ticket counts

## Troubleshooting

### Images not loading
- Check image filenames match the pattern: `contestant-01.jpg` through `contestant-20.jpg`
- Verify images are in `public/events/` folder
- Check browser console for 404 errors

### Paystack payment failing
- Verify Paystack public key is correct
- Check that Paystack account is in "Live" mode
- Ensure user has valid email and amount

### Firebase not saving tickets
- Verify Firebase credentials in `public/firebase/setup.js`
- Check database rules allow write access
- Monitor browser console for errors

## Testing Payments

**Paystack Test Mode:**
1. Use test key from Paystack Dashboard (Settings → API Keys → Test)
2. Use test card: `4111 1111 1111 1111`
3. Any future expiry date and any CVC

**Switching to Live:**
1. Replace test key with live key
2. Clear browser cache
3. Test with real payment

## Support

For issues or questions:
- Check `public/scripts/event.js` console logs
- Review Firebase database for ticket records
- Contact Paystack support for payment issues
