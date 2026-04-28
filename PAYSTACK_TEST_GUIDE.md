# Quick Payment Test Checklist

## ✅ What Was Fixed

1. **Paystack 400 Error** - API now returns correct amount in kobo
2. **Image 404 Errors** - Use Firebase Storage URLs instead of local files
3. **Confusing Toast Messages** - Removed intermediate notifications for seamless flow

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Upload Images to Firebase Storage

```
Visit: https://www.kwaratalentsharvest.com.ng/firebase/upload-images.html
1. Select all images from public/events/ folder
2. Click "📤 Upload All Images"
3. Copy the generated JSON
```

### Step 2: Update Contestants JSON

```
Edit: public/events/contestants.json
Paste the JSON from Step 1
Push to GitHub
```

### Step 3: Test Payment End-to-End

```
Go to: https://www.kwaratalentsharvest.com.ng/event.html
1. Select a contestant
2. Enter:
   - Email: test@example.com
   - Name: Test User
   - Phone: 08012345678
   - Qty: 1
3. Click "Pay Now (Paystack)"
4. Use test card:
   - Number: 4084084084084081
   - Exp: 12/25
   - CVV: 123
5. Should see success page with PDF download
```

---

## 📋 Expected Flow

**Before Fix:**
```
Click Pay → Processing Message → Error Message → Failure
```

**After Fix:**
```
Click Pay → Paystack Opens → Pay → Auto Success Page → PDF Downloads
```

---

## 🔍 Debugging If Something Goes Wrong

Open browser console (F12) and check for:

- `Payment error:` - Check email format, amount validation
- `Payment verification error:` - Check API endpoint is working
- `Firebase save warning` - This is OK, will be fixed when Firebase rules updated

---

## 📱 What Happens After Payment

1. ✅ User redirected to Paystack
2. ✅ User completes payment
3. ✅ Paystack redirects back to event.html with `?reference=XXX`
4. ✅ Code detects reference and calls handlePaymentReturn()
5. ✅ Payment verified with backend
6. ✅ Ticket saved to Firebase
7. ✅ PDF generated and downloaded
8. ✅ Success page displayed

---

## 🆘 If Still Getting Errors

Check these in order:

1. **API Keys**
   ```
   .env file should have:
   PAYSTACK_SECRET_KEY=sk_live_xxx
   BASE_URL=https://www.kwaratalentsharvest.com.ng
   ```

2. **Firebase Images**
   - Run upload tool
   - Update contestants.json
   - Clear browser cache

3. **Email Format**
   - Must be: something@domain.com
   - Not: user (missing @domain.com)

4. **Test Card Format**
   - Number: 4084084084084081 (exactly 16 digits)
   - Expiry: Future date (12/25)
   - CVV: Any 3 digits (123)

---

## 📞 Support

If you get an error message in the alert:
1. Note the exact error text
2. Check the console (F12) for detailed logs
3. Contact Paystack support if it's a payment error

All errors will now show in a simple alert instead of confusing toast messages!
