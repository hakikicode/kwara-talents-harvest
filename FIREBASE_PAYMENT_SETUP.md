# Firebase Image Upload & Paystack Payment Setup Guide

## Problem Fixed

### 1. **Paystack Payment Error (400 Bad Request)**
- **Issue**: Backend was returning wrong amount format
- **Fix**: API now returns correct kobo amount and uses direct authorization URL
- **Result**: Seamless payment without intermediate error messages

### 2. **Image 404 Errors**
- **Issue**: Images not deployed to production server
- **Solution**: Use Firebase Storage for image hosting
- **Benefit**: Images available globally without deployment issues

### 3. **Payment Flow Simplified**
- **Before**: Multiple toast messages causing confusion, PaystackPop method issues
- **Now**: Clean redirect to Paystack → automatic return → automatic PDF generation

---

## Step-by-Step Setup

### Step 1: Upload Images to Firebase Storage

1. Open: https://www.kwaratalentsharvest.com.ng/firebase/upload-images.html
2. Click "Select Event Images" and choose all images from your local `public/events/` folder
3. Click "📤 Upload All Images"
4. Wait for upload to complete
5. Copy the generated JSON code (Firebase URLs)

### Step 2: Update Contestants JSON

1. Open: `public/events/contestants.json`
2. Replace contents with the JSON from Step 1
3. Save and commit to GitHub

### Step 3: Test Payment Flow

1. Go to: https://www.kwaratalentsharvest.com.ng/event.html
2. Select a contestant
3. Fill in email, name, phone, quantity
4. Click "Pay Now (Paystack)"
5. **Should directly open Paystack** (no processing message)
6. Complete payment in Paystack
7. **Should auto-redirect to success page** with PDF download

---

## How It Works Now

```
User Clicks Pay → Form Validation → API Initialize → Paystack Opens
↓
User Pays → Paystack Redirects Back → API Verify → Firebase Save
↓
PDF Generated → Email Sent → Success Page Shown
```

---

## File Changes Made

### Backend
- ✅ `api/initialize-payment.js` - Returns correct amount in kobo
- ✅ `api/verify-payment.js` - Processes payment verification

### Frontend  
- ✅ `public/scripts/event.js` - Simplified payment flow, Firebase URL support
- ✅ `public/firebase/upload-images.html` - New image upload tool

---

## Environment Variables Required

Make sure your `.env` or `.env.local` has:

```
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
BASE_URL=https://www.kwaratalentsharvest.com.ng
FIREBASE_PROJECT_ID=kwara-talent-harvest
FIREBASE_STORAGE_BUCKET=kwara-talent-harvest.appspot.com
```

---

## Troubleshooting

### Still Getting 400 Error?
- Check console (F12) for exact error
- Verify `PAYSTACK_SECRET_KEY` is set correctly
- Ensure email format is valid

### Images Still 404?
- Use the upload tool to send images to Firebase Storage
- Update `contestants.json` with Firebase URLs
- Clear browser cache (Ctrl+Shift+Delete)

### PDF Not Downloading?
- Check browser pop-up blocker
- Verify html2pdf library loaded (check console)
- Try different browser

---

## Testing with Test Card

Use this test card in Paystack when you see the payment form:

- **Card Number**: 4084084084084081
- **Expiry**: Any future date (e.g., 12/25)
- **CVV**: Any 3 digits (e.g., 123)

---

## Next Steps

1. ✅ Upload all event images to Firebase Storage
2. ✅ Update `public/events/contestants.json` with Firebase URLs
3. ✅ Test full payment flow end-to-end
4. ✅ Verify PDF downloads automatically
5. ✅ Check Firebase Realtime Database for ticket records

Once complete, your payment system will be fully operational! 🎉
