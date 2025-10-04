function updateDateTime() {
  const now = new Date();

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const date = now.toLocaleDateString('en-US', options);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const time = `${hours}:${minutes}:${seconds}`;

  document.getElementById('datetime').textContent = `${date} ${time}`;
}

setInterval(updateDateTime, 1000);
