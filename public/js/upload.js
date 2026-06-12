const form = document.getElementById('upload-form');
const feedback = document.getElementById('upload-feedback');

function showFeedback(message, status) {
  feedback.textContent = message;
  feedback.className = `status-card ${status}`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showFeedback('Publishing your listing...', 'success');

  try {
    const response = await fetch('/api/nfts', {
      method: 'POST',
      body: new FormData(form)
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to publish listing.');
    }

    showFeedback(
      `Listing published with catalog #${payload.item.catalogNumber}. Redirecting...`,
      'success'
    );
    form.reset();
    window.setTimeout(() => {
      window.location.href = `/nft.html?catalog=${payload.item.catalogNumber}`;
    }, 700);
  } catch (error) {
    showFeedback(error.message, 'error');
  }
});
