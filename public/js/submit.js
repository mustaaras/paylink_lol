// BuyLink (buylink.lol) - Submit Modal & Checkout Trigger

document.addEventListener('DOMContentLoaded', () => {
  initSubmitModalListeners();
});

function initSubmitModalListeners() {
  const submitModal = document.getElementById('submit-modal');
  const openBtn = document.getElementById('btn-open-submit');
  const heroSubmitBtn = document.getElementById('hero-submit-btn');
  const closeBtn = document.getElementById('submit-modal-close');
  const form = document.getElementById('submit-listing-form');
  const imgInput = document.getElementById('submit-image-url');
  const imgPreview = document.getElementById('submit-image-preview');
  const bidInput = document.getElementById('submit-bid-amount');
  const presetBtns = document.querySelectorAll('#submit-modal .preset-btn');

  if (openBtn) openBtn.addEventListener('click', openSubmitModal);
  if (heroSubmitBtn) heroSubmitBtn.addEventListener('click', openSubmitModal);
  if (closeBtn) closeBtn.addEventListener('click', closeSubmitModal);

  // Close modal when clicking backdrop
  if (submitModal) {
    submitModal.addEventListener('click', (e) => {
      if (e.target === submitModal) closeSubmitModal();
    });
  }

  const outbidModal = document.getElementById('outbid-modal');
  if (outbidModal) {
    outbidModal.addEventListener('click', (e) => {
      if (e.target === outbidModal) closeOutbidModal();
    });
  }

  // Image Preview
  if (imgInput && imgPreview) {
    imgInput.addEventListener('input', () => {
      const url = imgInput.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        imgPreview.src = url;
        imgPreview.style.display = 'block';
      } else {
        imgPreview.style.display = 'none';
      }
    });
  }

  // Bid Preset buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.val;
      if (val && bidInput) {
        bidInput.value = val;
      }
    });
  });

  if (bidInput) {
    bidInput.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
    });
  }

  // Form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('submit-form-btn');
      const title = document.getElementById('submit-title').value.trim();
      const tagline = document.getElementById('submit-tagline').value.trim();
      const buy_url = document.getElementById('submit-buy-url').value.trim();
      const image_url = imgInput ? imgInput.value.trim() : '';
      const price_tag = document.getElementById('submit-price-tag').value.trim();
      const category = document.getElementById('submit-category').value;
      const bid_amount = parseFloat(bidInput.value);
      const bidder_email = document.getElementById('submit-email').value.trim();

      if (!title || !tagline || !buy_url || !category || isNaN(bid_amount)) {
        alert('Please fill out all required fields.');
        return;
      }

      if (!buy_url.startsWith('http://') && !buy_url.startsWith('https://')) {
        alert('Checkout / Buy URL must start with http:// or https://');
        return;
      }

      if (bid_amount < 5) {
        alert('Minimum initial bid is $5.00');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating Checkout Session...';
      }

      try {
        const payload = {
          title,
          tagline,
          buy_url,
          image_url: image_url || undefined,
          price_tag: price_tag || undefined,
          category,
          bid_amount,
          bidder_email: bidder_email || undefined
        };

        const res = await fetch('/api/listings/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to initiate checkout');
        }

        // Redirect user to Stripe Checkout (or dev mock url)
        window.location.href = data.checkoutUrl;
      } catch (err) {
        alert(err.message || 'An error occurred during submission.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Proceed to Checkout ↗';
        }
      }
    });
  }
}

window.openSubmitModal = function() {
  const modal = document.getElementById('submit-modal');
  if (modal) modal.classList.add('open');
};

window.closeSubmitModal = function() {
  const modal = document.getElementById('submit-modal');
  if (modal) modal.classList.remove('open');
};
